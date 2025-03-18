const db = require('../utils/db');
const crypto = require('crypto');

/**
 * 用户模型
 */
class User {
  /**
   * 密码哈希方法 - 使用crypto替代bcrypt
   * @param {string} password 明文密码
   * @returns {string} 哈希后的密码
   */
  static hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * 验证密码
   * @param {string} password 明文密码
   * @param {string} hashedPassword 哈希后的密码
   * @returns {boolean} 是否匹配
   */
  static verifyPassword(password, hashedPassword) {
    const [salt, storedHash] = hashedPassword.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return storedHash === hash;
  }

  /**
   * 根据ID查找用户
   * @param {number} id 用户ID
   * @returns {Promise<Object|null>} 用户对象或null
   */
  static async findById(id) {
    try {
      console.log(`尝试查找用户ID: ${id}`);
      if (!id) {
        console.warn('查找用户时提供的ID为空');
        return { id: 0, username: 'anonymous', avatar: null };
      }
      
      const sql = `SELECT * FROM users WHERE id = ?`;
      const user = await db.get(sql, [id]);
      
      if (user) {
        console.log(`找到用户: ${user.username}, ID: ${user.id}`);
        return user;
      } else {
        console.warn(`未找到ID为 ${id} 的用户`);
        // 如果是管理员ID，返回一个基本的管理员对象
        if (id === 1) {
          return { id: 1, username: 'admin', avatar: null };
        }
        return null;
      }
    } catch (error) {
      console.error(`查找用户(ID: ${id})失败:`, error);
      // 返回一个基本的用户对象，避免空引用错误
      return { id: id || 0, username: 'error_user', avatar: null };
    }
  }

  /**
   * 根据用户名查找用户
   * @param {string} username 用户名
   * @returns {Promise<Object|null>} 用户对象或null
   */
  static async findByUsername(username) {
    try {
      console.log(`尝试查找用户名: ${username}`);
      if (!username) {
        console.warn('查找用户时提供的用户名为空');
        return null;
      }
      
      const sql = `SELECT * FROM users WHERE username = ?`;
      const user = await db.get(sql, [username]);
      
      if (user) {
        console.log(`找到用户名为 ${username} 的用户, ID: ${user.id}`);
        return user;
      } else {
        console.warn(`未找到用户名为 ${username} 的用户`);
        return null;
      }
    } catch (error) {
      console.error(`查找用户(用户名: ${username})失败:`, error);
      // 返回null而不是抛出异常
      return null;
    }
  }

  /**
   * 更新用户头像
   * @param {number} id 用户ID
   * @param {string} avatarPath 头像路径
   * @returns {Promise<boolean>} 是否成功
   */
  static async updateAvatar(id, avatarPath) {
    try {
      console.log(`更新用户(ID: ${id})头像为: ${avatarPath}`);
      
      // 检查用户是否存在
      const user = await this.findById(id);
      if (!user) {
        console.error(`用户(ID: ${id})不存在，无法更新头像`);
        return false;
      }
      
      const sql = `UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const result = await db.run(sql, [avatarPath, id]);
      
      console.log(`头像更新结果:`, result);
      return true;
    } catch (error) {
      console.error(`更新用户头像失败:`, error);
      // 抛出错误但允许调用者处理
      return false;
    }
  }

  /**
   * 更新用户名
   * @param {number} id 用户ID
   * @param {string} username 新用户名
   * @returns {Promise<boolean>} 是否成功
   */
  static async updateUsername(id, username) {
    try {
      console.log(`更新用户(ID: ${id})用户名为: ${username}`);
      
      // 检查用户是否存在
      const user = await this.findById(id);
      if (!user) {
        console.error(`用户(ID: ${id})不存在，无法更新用户名`);
        return false;
      }
      
      const sql = `UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const result = await db.run(sql, [username, id]);
      
      console.log(`用户名更新结果:`, result);
      return true;
    } catch (error) {
      console.error(`更新用户名失败:`, error);
      // 返回false而不是抛出异常
      return false;
    }
  }

  /**
   * 更新用户密码
   * @param {number} id 用户ID
   * @param {string} password 新密码（明文）
   * @returns {Promise<boolean>} 是否成功
   */
  static async updatePassword(id, password) {
    try {
      console.log(`更新用户(ID: ${id})密码`);
      
      // 检查用户是否存在
      const user = await this.findById(id);
      if (!user) {
        console.error(`用户(ID: ${id})不存在，无法更新密码`);
        return false;
      }
      
      // 密码加密
      const hashedPassword = this.hashPassword(password);
      console.log('密码已加密');
      
      const sql = `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const result = await db.run(sql, [hashedPassword, id]);
      
      console.log(`密码更新结果:`, result);
      return true;
    } catch (error) {
      console.error(`更新密码失败:`, error);
      // 返回false而不是抛出异常
      return false;
    }
  }

  /**
   * 验证用户密码
   * @param {string} username 用户名
   * @param {string} password 密码（明文）
   * @returns {Promise<Object|null>} 用户对象或null
   */
  static async authenticate(username, password) {
    try {
      console.log(`验证用户: ${username}`);
      
      const user = await this.findByUsername(username);
      if (!user) {
        console.log(`用户 ${username} 不存在`);
        return null;
      }
      
      // 如果用户没有密码字段或密码格式不正确(不含:)，返回null
      if (!user.password || !user.password.includes(':')) {
        console.log(`用户 ${username} 没有有效的密码格式`);
        return null;
      }
      
      const isMatch = this.verifyPassword(password, user.password);
      console.log(`密码验证结果: ${isMatch ? '成功' : '失败'}`);
      
      return isMatch ? user : null;
    } catch (error) {
      console.error(`用户验证失败:`, error);
      // 返回null而不是抛出异常
      return null;
    }
  }
}

module.exports = User; 