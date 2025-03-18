const db = require('./db');

class Navigation {
  // 获取所有导航
  static async getAll() {
    try {
      const query = `
        SELECT * FROM navigation 
        ORDER BY sort_order ASC, created_at DESC
      `;
      return await db.queryAsync(query);
    } catch (err) {
      console.error('获取导航列表失败:', err);
      throw err;
    }
  }

  // 获取单个导航
  static async getById(id) {
    try {
      const query = 'SELECT * FROM navigation WHERE id = ?';
      return await db.getAsync(query, [id]);
    } catch (err) {
      console.error('获取导航失败:', err);
      throw err;
    }
  }

  // 创建导航
  static async create(data) {
    try {
      const { title, alias, icon, url, is_external, sort_order } = data;
      const query = `
        INSERT INTO navigation (title, alias, icon, url, is_external, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const result = await db.runAsync(query, [
        title,
        alias,
        icon,
        url,
        is_external ? 1 : 0,
        sort_order || 0
      ]);
      return result.lastID;
    } catch (err) {
      console.error('创建导航失败:', err);
      throw err;
    }
  }

  // 更新导航
  static async update(id, data) {
    try {
      const { title, alias, icon, url, is_external, sort_order } = data;
      const query = `
        UPDATE navigation 
        SET title = ?, alias = ?, icon = ?, url = ?, is_external = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await db.runAsync(query, [
        title,
        alias,
        icon,
        url,
        is_external ? 1 : 0,
        sort_order || 0,
        id
      ]);
      return true;
    } catch (err) {
      console.error('更新导航失败:', err);
      throw err;
    }
  }

  // 删除导航
  static async delete(id) {
    try {
      const query = 'DELETE FROM navigation WHERE id = ?';
      await db.runAsync(query, [id]);
      return true;
    } catch (err) {
      console.error('删除导航失败:', err);
      throw err;
    }
  }
}

module.exports = Navigation; 