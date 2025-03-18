const Router = require('koa-router');
const indexController = require('../controllers/index');
const { extractIdFromUrl } = require('../utils/urlConverter');

const router = new Router();

// 测试路由
router.get('/test', async (ctx) => {
  ctx.body = { success: true, message: 'Route system is working', time: new Date().toISOString() };
});

// 首页
router.get('/', indexController.home);

// 文章详情页 - 传统方式 (保留兼容性)
router.get('/post/:id', indexController.postDetail);

// 文章详情页 - 基于标题拼音的URL模式 (.html后缀在htmlExtension中间件中处理)
router.get(/^\/[\w\-]+-(\d+)(\.html)?$/, async (ctx, next) => {
  // 从URL中提取ID
  const id = ctx.params[0];
  
  // 更新请求参数
  ctx.params.id = id;
  
  // 调用相同的控制器方法
  await indexController.postDetail(ctx, next);
});

// 分类页
router.get('/category/:id', indexController.categoryPage);

// 标签页
router.get('/tag/:name', indexController.tagPage);

// 文章列表页
router.get('/article', indexController.articleList);

module.exports = router; 