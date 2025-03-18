const crypto = require('crypto');
const config = require('../../config/config');

/**
 * 权限验证模型
 */
class Auth {
  /**
   * 验证用户身份
   * @param {string} username 用户名
   * @param {string} password 密码
   * @returns {boolean} 验证是否通过
   */
  static verify(username, password) {
    const adminConfig = config.admin || {};
    const configUsername = adminConfig.username || 'admin';
    const configPassword = adminConfig.password || 'admin';
    
    return username === configUsername && password === configPassword;
  }
  
  /**
   * 验证会话是否有效
   * @param {Object} user 用户会话对象
   * @returns {boolean} 会话是否有效
   */
  static validateSession(user) {
    const adminConfig = config.admin || {};
    const configUsername = adminConfig.username || 'admin';
    
    // 验证管理员会话或普通用户会话
    return (user && user.isAdmin === true) && 
           (user.username === configUsername || user.id > 0);
  }

  /**
   * 生成会话令牌
   * @returns {string} 会话令牌
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 创建中间件，用于验证用户是否已登录
   * @returns {Function} Koa中间件
   */
  static authMiddleware() {
    return async (ctx, next) => {
      // 检查会话中是否有用户信息
      if (!ctx.session || !ctx.session.user) {
        // 如果请求的是API，返回401错误
        if (ctx.path.startsWith('/api')) {
          ctx.status = 401;
          ctx.body = { error: '未授权访问' };
          return;
        }
        
        // 否则重定向到登录页
        return ctx.redirect('/admin/login');
      }
      
      await next();
    };
  }
}

module.exports = Auth; 