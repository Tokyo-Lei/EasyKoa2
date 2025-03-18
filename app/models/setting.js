const db = require('../utils/db');

/**
 * 设置模型
 */
class Setting {
  /**
   * 获取所有设置
   * @returns {Promise<Array>} 设置列表
   */
  static async getAll() {
    try {
      const sql = `SELECT * FROM settings ORDER BY key ASC`;
      const settings = await db.all(sql);
      return settings;
    } catch (error) {
      console.error('获取所有设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取设置值
   * @param {string} key 设置键名
   * @returns {Promise<string|null>} 设置值
   */
  static async getValue(key) {
    try {
      const sql = `SELECT value FROM settings WHERE key = ?`;
      const result = await db.get(sql, [key]);
      return result ? result.value : null;
    } catch (error) {
      console.error(`获取设置 ${key} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取多个设置值
   * @param {Array<string>} keys 设置键名数组
   * @returns {Promise<Object>} 设置键值对对象
   */
  static async getMultiple(keys) {
    try {
      // 创建占位符
      const placeholders = keys.map(() => '?').join(',');
      const sql = `SELECT key, value FROM settings WHERE key IN (${placeholders})`;
      
      const results = await db.all(sql, keys);
      
      // 转换为对象格式
      const settings = {};
      results.forEach(item => {
        settings[item.key] = item.value;
      });
      
      return settings;
    } catch (error) {
      console.error('获取多个设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新设置值
   * @param {string} key 设置键名
   * @param {string} value 设置值
   * @returns {Promise<boolean>} 是否成功
   */
  static async setValue(key, value) {
    try {
      const sql = `
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE 
        SET value = ?, updated_at = CURRENT_TIMESTAMP
      `;
      await db.run(sql, [key, value, value]);
      return true;
    } catch (error) {
      console.error(`更新设置 ${key} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量更新设置
   * @param {Object} settings 设置键值对对象
   * @returns {Promise<boolean>} 是否成功
   */
  static async setMultiple(settings) {
    const connection = await db.getConnection();
    
    try {
      await connection.run('BEGIN TRANSACTION');
      
      const sql = `
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE 
        SET value = ?, updated_at = CURRENT_TIMESTAMP
      `;
      
      for (const [key, value] of Object.entries(settings)) {
        await connection.run(sql, [key, value, value]);
      }
      
      await connection.run('COMMIT');
      return true;
    } catch (error) {
      await connection.run('ROLLBACK');
      console.error('批量更新设置失败:', error);
      throw error;
    } finally {
      connection.close();
    }
  }

  /**
   * 删除指定前缀的所有设置
   * @param {string} prefix 设置键名前缀
   * @returns {Promise<boolean>} 是否成功
   */
  static async deleteByPrefix(prefix) {
    try {
      const sql = `DELETE FROM settings WHERE key LIKE ?`;
      await db.run(sql, [`${prefix}%`]);
      return true;
    } catch (error) {
      console.error(`删除前缀为 ${prefix} 的设置失败:`, error);
      throw error;
    }
  }
}

module.exports = Setting; 