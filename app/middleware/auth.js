const Auth = require('../models/auth');

/**
 * 验证用户是否已登录的中间件
 */
module.exports = async (ctx, next) => {
  // 检查用户是否已登录
  if (!ctx.session || !ctx.session.user) {
    // 如果未登录，重定向到登录页面
    return ctx.redirect('/admin/login');
  }
  
  // 验证用户是否有效
  if (!Auth.validateSession(ctx.session.user)) {
    // 如果会话无效，清除会话并重定向到登录页面
    ctx.session = null;
    return ctx.redirect('/admin/login');
  }
  
  // 通过认证检查，继续执行后续中间件
  await next();
}; 