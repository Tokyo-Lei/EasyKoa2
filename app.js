// 加载环境变量
require('dotenv').config();

const Koa = require('koa');
const path = require('path');
const Router = require('koa-router');
const { koaBody } = require('koa-body');
const static = require('koa-static');
const logger = require('koa-logger');
const render = require('koa-art-template');
const session = require('koa-session');
const fs = require('fs'); // 确保fs模块在上下文中可用

// 获取环境变量配置
const FRONTEND_DIR = process.env.FRONTEND_DIR || 'tokyo';
const ADMIN_PATH = process.env.ADMIN_PATH || 'admin';

// 引入路由和模型
const indexRouter = require('./app/routes/index');
const apiRouter = require('./app/routes/api');
const adminRouter = require('./app/routes/admin');
const Setting = require('./app/models/setting');

// 引入自定义中间件
const cacheMiddleware = require('./app/middleware/cache');
const htmlExtensionMiddleware = require('./app/middleware/htmlExtension');

const app = new Koa();
const router = new Router();

// 配置session
app.keys = ['some secret hurr'];
const CONFIG = {
  key: 'koa:sess',
  maxAge: 86400000, // 24小时
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
};
app.use(session(CONFIG, app));

// 配置art-template
render(app, {
  root: path.join(__dirname, 'app/views'),
  extname: '.art',
  debug: process.env.NODE_ENV !== 'production',
  imports: {
    // 添加辅助函数，用于在模板中获取当前年份
    getCurrentYear: () => new Date().getFullYear()
  }
});

// 添加全局变量，供路由使用
app.context.FRONTEND_DIR = FRONTEND_DIR;
app.context.ADMIN_PATH = ADMIN_PATH;

// 中间件
app.use(logger());
app.use(koaBody({
  multipart: true, // 支持文件上传
  formidable: {
    maxFileSize: 200 * 1024 * 1024, // 设置上传文件大小最大限制，默认2M
    keepExtensions: true, // 保持文件的后缀
    uploadDir: path.join(__dirname, 'app/public/uploads/temp'), // 使用app/public下的目录
    onFileBegin: (name, file) => {
      // 确保上传目录存在
      const uploadDir = path.join(__dirname, 'app/public/uploads/temp');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    }
  }
}));

// 静态资源目录配置
const staticDir = path.join(__dirname, 'app/public');
console.log('配置静态资源目录:', staticDir);
app.use(static(staticDir));

// 添加额外的静态资源映射，用于处理前端代码中的路径问题
app.use(async (ctx, next) => {
  // 处理/admin/及其子目录的资源请求
  if (ctx.path.startsWith('/admin/') && !ctx.path.includes('.html')) {
    // 检查是否是静态资源请求(css, js, images, fonts等)
    const isStaticRequest = /\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(ctx.path);
    
    if (isStaticRequest) {
      // 尝试从public目录中提供文件
      const filePath = path.join(staticDir, ctx.path);
      
      // 处理几种可能的替代路径
      // 1. 直接从admin前缀中移除
      const alternativePath1 = path.join(staticDir, ctx.path.replace('/admin/', '/'));
      
      // 2. 从子目录路径中移除子目录部分 (例如 /admin/page/xxx.jpg -> /xxx.jpg)
      const pathParts = ctx.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const alternativePath2 = path.join(staticDir, fileName);
      
      // 3. 检查是否是上传目录的内容
      const uploadPath = path.join(staticDir, '/uploads/', fileName);
      
      console.log('尝试访问静态资源:', ctx.path);
      console.log('映射到原始文件路径:', filePath);
      console.log('替代路径1:', alternativePath1);
      console.log('替代路径2:', alternativePath2);
      console.log('上传目录路径:', uploadPath);
      
      // 按优先级尝试访问不同路径
      if (fs.existsSync(filePath)) {
        // 如果文件存在于请求的原始路径
        console.log('文件存在于原始路径');
        ctx.type = path.extname(filePath);
        ctx.body = fs.createReadStream(filePath);
        return;
      } else if (fs.existsSync(alternativePath1)) {
        // 如果文件存在于替代路径1
        console.log('文件存在于替代路径1');
        ctx.type = path.extname(alternativePath1);
        ctx.body = fs.createReadStream(alternativePath1);
        return;
      } else if (fs.existsSync(alternativePath2)) {
        // 如果文件是直接从根目录访问
        console.log('文件存在于替代路径2');
        ctx.type = path.extname(alternativePath2);
        ctx.body = fs.createReadStream(alternativePath2);
        return;
      } else if (fs.existsSync(uploadPath)) {
        // 如果文件位于上传目录
        console.log('文件存在于上传目录');
        ctx.type = path.extname(uploadPath);
        ctx.body = fs.createReadStream(uploadPath);
        return;
      }
    }
  }
  
  await next();
});

// 直接处理/uploads/目录下的文件请求，简化图片访问
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/uploads/') && !ctx.path.includes('..')) {
    // 提取文件名
    const fileName = path.basename(ctx.path);
    console.log('尝试直接访问上传文件:', fileName);
    
    // 先检查主上传目录
    const mainUploadPath = path.join(staticDir, 'uploads', fileName);
    if (fs.existsSync(mainUploadPath)) {
      console.log('文件存在于主上传目录');
      ctx.type = path.extname(mainUploadPath);
      ctx.body = fs.createReadStream(mainUploadPath);
      return;
    }
    
    // 再检查临时上传目录
    const tempUploadPath = path.join(staticDir, 'uploads/temp', fileName);
    if (fs.existsSync(tempUploadPath)) {
      console.log('文件存在于临时上传目录');
      ctx.type = path.extname(tempUploadPath);
      ctx.body = fs.createReadStream(tempUploadPath);
      return;
    }
    
    // 最后检查完整路径
    const fullPath = path.join(staticDir, ctx.path);
    if (fs.existsSync(fullPath)) {
      console.log('文件存在于完整路径:', fullPath);
      ctx.type = path.extname(fullPath);
      ctx.body = fs.createReadStream(fullPath);
      return;
    }
    
    console.log('找不到文件:', fileName);
  }
  
  await next();
});

// 特殊处理子目录中对uploads资源的引用
app.use(async (ctx, next) => {
  // 检查是否是来自admin子目录对上传资源的请求
  if (ctx.path.includes('/uploads/')) {
    console.log('检测到对上传资源的请求:', ctx.path);

    // 从路径中提取文件名
    const pathParts = ctx.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    // 构建可能的文件路径
    const originalPath = path.join(staticDir, ctx.path);
    const uploadDirPath = path.join(staticDir, 'uploads', fileName);
    
    console.log('原始资源路径:', originalPath);
    console.log('简化上传路径:', uploadDirPath);
    
    if (!fs.existsSync(originalPath) && fs.existsSync(uploadDirPath)) {
      console.log('使用简化上传路径提供文件');
      ctx.type = path.extname(uploadDirPath);
      ctx.body = fs.createReadStream(uploadDirPath);
      return;
    }
  }
  
  // 处理可能错误解析的图片路径（例如 /admin/page/uploads/...）
  if (ctx.path.includes('/page/uploads/') || ctx.path.includes('/admin/page/uploads/')) {
    // 尝试从错误的路径中提取正确的资源路径
    let correctPath;
    if (ctx.path.includes('/page/uploads/')) {
      correctPath = ctx.path.substring(ctx.path.indexOf('/page/uploads/') + 6); // 移除 /page 前缀
    } else if (ctx.path.includes('/admin/page/uploads/')) {
      correctPath = ctx.path.substring(ctx.path.indexOf('/admin/page/uploads/') + 11); // 移除 /admin/page 前缀
    }
    
    console.log('检测到可能的子目录资源路径错误:', ctx.path);
    console.log('尝试修正为:', correctPath);
    
    if (correctPath) {
      const correctedFilePath = path.join(staticDir, correctPath);
      
      if (fs.existsSync(correctedFilePath)) {
        console.log('使用修正后的路径提供文件:', correctedFilePath);
        ctx.type = path.extname(correctedFilePath);
        ctx.body = fs.createReadStream(correctedFilePath);
        return;
      }
      
      // 进一步尝试只使用文件名
      const fileName = path.basename(correctPath);
      const uploadDirPath = path.join(staticDir, 'uploads', fileName);
      
      if (fs.existsSync(uploadDirPath)) {
        console.log('使用文件名匹配提供文件:', uploadDirPath);
        ctx.type = path.extname(uploadDirPath);
        ctx.body = fs.createReadStream(uploadDirPath);
        return;
      }
    }
  }
  
  await next();
});

// 添加请求调试中间件
app.use(async (ctx, next) => {
  console.log('============ 请求开始 ============');
  console.log(`请求方法: ${ctx.method}`);
  console.log(`请求路径: ${ctx.path}`);
  console.log(`请求参数: ${JSON.stringify(ctx.params)}`);
  console.log(`请求查询: ${JSON.stringify(ctx.query)}`);
  console.log(`请求IP: ${ctx.ip}`);
  console.log(`请求头: ${JSON.stringify(ctx.headers, null, 2)}`);
  
  try {
    await next();
    console.log(`响应状态: ${ctx.status}`);
    console.log('============ 请求结束 ============');
  } catch (err) {
    console.error('请求处理错误:', err);
    throw err;
  }
});

// 为模板引擎添加全局变量
app.use(async (ctx, next) => {
  // 在ctx.state中添加全局变量，这些变量会自动传递给模板
  ctx.state.currentPath = ctx.path;
  
  // 添加用户信息到state，确保所有视图都能访问
  if (ctx.session && ctx.session.user) {
    ctx.state.user = ctx.session.user;
  } else if (ctx.path.startsWith('/admin') && ctx.path !== '/admin/login') {
    // 对于管理后台页面，如果没有用户信息，提供一个默认的管理员用户
    // 仅用于开发和测试目的
    ctx.state.user = {
      username: 'admin',
      isAdmin: true
    };
  }
  
  await next();
});

// 加载系统设置
app.use(async (ctx, next) => {
  try {
    // 获取系统基本设置
    const basicSettings = ['site_title', 'site_subtitle', 'site_logo', 'site_description', 'site_keywords', 'site_copyright'];
    const settings = await Setting.getMultiple(basicSettings);
    
    // 将设置添加到state，确保所有视图都能访问
    ctx.state.siteSettings = settings;
    
    await next();
  } catch (error) {
    console.error('加载系统设置失败:', error);
    await next();
  }
});

// 应用缓存中间件
app.use(cacheMiddleware);

// 应用HTML扩展名中间件，处理带.html后缀的URL
app.use(htmlExtensionMiddleware());

// 直接使用各个路由
app.use(indexRouter.routes()).use(indexRouter.allowedMethods());
app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

// 修改admin路由前缀为环境变量配置的路径
const adminRoutes = adminRouter.routes();
const adminMethods = adminRouter.allowedMethods();
router.use(`/${ADMIN_PATH}`, adminRoutes, adminMethods);
app.use(router.routes()).use(router.allowedMethods());

// 错误处理
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx);
});

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'app/public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 