const Router = require('koa-router');
const adminController = require('../controllers/admin');
const resourcesController = require('../controllers/admin/resources');
const navigationController = require('../controllers/admin/navigation');
const auth = require('../middleware/auth');
const settingController = require('../controllers/admin/setting');

const router = new Router({
  prefix: '/admin'
});

// 登录相关
router.get('/login', adminController.loginPage);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

// 需要登录验证的路由
router.use(auth);

// 后台首页
router.get('/', adminController.dashboard);

// 文章管理
router.get('/posts', adminController.postList);
router.get('/posts/new', adminController.editPost);
router.get('/posts/edit/:id', adminController.editPost);
router.post('/posts/save', adminController.savePost);
router.post('/posts/save/:id', adminController.savePost);
router.post('/posts/status/:id', adminController.updatePostStatus);
router.post('/posts/top/:id', adminController.updatePostTopStatus);
router.delete('/posts/:id', adminController.deletePost);
router.post('/posts/delete/:id', adminController.deletePost);

// 分类管理
router.get('/categories', adminController.categoryList);
router.post('/categories/save', adminController.saveCategory);
router.post('/categories/save/:id', adminController.saveCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// 导航管理
router.get('/navigation', navigationController.index);
router.post('/navigation/save', navigationController.save);
router.post('/navigation/save/:id', navigationController.save);
router.post('/navigation/delete/:id', navigationController.remove);

// 资源管理
router.get('/resources', resourcesController.index);
router.get('/resources/list', resourcesController.list);
router.post('/resources/upload', resourcesController.upload);
router.post('/resources/replace/:id', resourcesController.replace);
router.delete('/resources/:id', resourcesController.delete);
router.post('/resources/delete/:id', resourcesController.delete);

// 设置管理路由
router.get('/settings', settingController.index);
router.post('/settings/basic', settingController.saveBasic);
router.post('/settings/display', settingController.saveDisplay);
router.post('/settings/cache', settingController.saveCache);
router.post('/settings/upload', settingController.saveUpload);
router.post('/settings/clear-cache', settingController.clearCache);
router.post('/settings/upload-logo', settingController.uploadLogo);
router.post('/settings/upload-avatar', settingController.uploadAvatar);
router.post('/settings/update-username', settingController.updateUsername);
router.post('/settings/update-password', settingController.updatePassword);

module.exports = router; 