const Router = require('koa-router');
const apiController = require('../controllers/api');

const router = new Router();

// 获取文章列表
router.get('/posts', apiController.getPosts);

// 获取单篇文章
router.get('/posts/:id', apiController.getPost);

// 获取分类列表
router.get('/categories', apiController.getCategories);

// 获取分类树
router.get('/category-tree', apiController.getCategoryTree);

// 获取标签列表
router.get('/tags', apiController.getTags);

// 获取博客信息
router.get('/info', apiController.getBlogInfo);

module.exports = router; 