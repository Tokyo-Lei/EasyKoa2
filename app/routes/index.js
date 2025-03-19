const Router = require('koa-router');
const indexController = require('../controllers/index');
const pageController = require('../controllers/page');
const { extractIdFromUrl } = require('../utils/urlConverter');
const demoController = require('../controllers/demo');

const router = new Router();

// 测试路由
router.get('/test', async (ctx) => {
  ctx.body = { success: true, message: 'Route system is working', time: new Date().toISOString() };
});

// 首页
router.get('/', indexController.home);

// 文章列表
router.get('/article', indexController.articleList);

// 文章详情
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

// 单页
router.get('/page/:slug', pageController.showPage);

// 演示页面 - 展示如何调用各种数据
router.get('/demo', demoController.index);

module.exports = router; 