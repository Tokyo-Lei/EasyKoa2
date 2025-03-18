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
  // 处理/admin/前缀的资源请求
  if (ctx.path.startsWith('/admin/') && !ctx.path.includes('.html')) {
    // 检查是否是静态资源请求(css, js, images, fonts等)
    const isStaticRequest = /\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(ctx.path);
    
    if (isStaticRequest) {
      // 尝试从public目录中提供文件
      const filePath = path.join(staticDir, ctx.path);
      const alternativePath = path.join(staticDir, ctx.path.replace('/admin/', '/'));
      
      console.log('尝试访问静态资源:', ctx.path);
      console.log('映射到文件路径:', filePath);
      console.log('替代文件路径:', alternativePath);
      
      if (fs.existsSync(filePath)) {
        // 如果文件存在于请求的路径
        console.log('文件存在于原始路径');
        ctx.type = path.extname(filePath);
        ctx.body = fs.createReadStream(filePath);
        return;
      } else if (fs.existsSync(alternativePath)) {
        // 如果文件存在于替代路径
        console.log('文件存在于替代路径');
        ctx.type = path.extname(alternativePath);
        ctx.body = fs.createReadStream(alternativePath);
        return;
      }
    }
  }
  
  await next();
});

// 添加专门的上传文件静态访问调试中间件
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/uploads/')) {
    console.log('请求上传文件:', ctx.path);
    const filePath = path.join(staticDir, ctx.path);
    console.log('对应的文件路径:', filePath);
    console.log('文件是否存在:', fs.existsSync(filePath));
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
app.use(adminRouter.routes()).use(adminRouter.allowedMethods());

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