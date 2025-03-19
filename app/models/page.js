const db = require('./db');

class Page {
  /**
   * 获取单页列表
   * @param {Object} options 查询选项
   * @param {number} options.page 页码
   * @param {number} options.pageSize 每页数量
   * @returns {Promise<Object>} 返回单页列表和分页信息
   */
  static async getList({ page = 1, pageSize = 10 }) {
    const offset = (page - 1) * pageSize;
    
    // 获取总数
    const [totalResult] = await db.queryAsync('SELECT COUNT(*) as total FROM pages');
    const total = totalResult.total;
    const totalPages = Math.ceil(total / pageSize);
    
    // 获取列表数据
    const items = await db.queryAsync(
      'SELECT * FROM pages ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    
    return {
      items,
      total,
      totalPages
    };
  }
  
  /**
   * 根据ID获取单页
   * @param {number} id 单页ID
   * @returns {Promise<Object|null>} 返回单页数据或null
   */
  static async getById(id) {
    const [page] = await db.queryAsync('SELECT * FROM pages WHERE id = ?', [id]);
    return page || null;
  }
  
  /**
   * 根据别名获取单页
   * @param {string} slug 页面别名
   * @returns {Promise<Object|null>} 返回单页数据或null
   */
  static async getBySlug(slug) {
    const [page] = await db.queryAsync('SELECT * FROM pages WHERE slug = ?', [slug]);
    return page || null;
  }
  
  /**
   * 创建新单页
   * @param {Object} data 单页数据
   * @param {string} data.title 标题
   * @param {string} data.content 内容
   * @param {string} data.slug 别名
   * @param {number} data.show_on_home 是否在首页显示
   * @returns {Promise<number>} 返回新创建的单页ID
   */
  static async create(data) {
    const { title, content, slug, show_on_home } = data;
    const now = new Date();
    
    const result = await db.queryAsync(
      'INSERT INTO pages (title, content, slug, show_on_home, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, slug, show_on_home, now, now]
    );
    
    return result.insertId;
  }
  
  /**
   * 更新单页
   * @param {number} id 单页ID
   * @param {Object} data 更新数据
   * @returns {Promise<void>}
   */
  static async update(id, data) {
    const { title, content, slug, show_on_home } = data;
    const now = new Date();
    
    await db.queryAsync(
      'UPDATE pages SET title = ?, content = ?, slug = ?, show_on_home = ?, updated_at = ? WHERE id = ?',
      [title, content, slug, show_on_home, now, id]
    );
  }
  
  /**
   * 删除单页
   * @param {number} id 单页ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await db.queryAsync('DELETE FROM pages WHERE id = ?', [id]);
  }
  
  /**
   * 获取所有在首页显示的单页
   * @returns {Promise<Array>} 返回单页列表
   */
  static async getHomePages() {
    return await db.queryAsync('SELECT * FROM pages WHERE show_on_home = 1 ORDER BY created_at DESC');
  }
  
  /**
   * 更新页面浏览量
   * @param {number} id 单页ID
   * @returns {Promise<void>}
   */
  static async updateViews(id) {
    await db.queryAsync('UPDATE pages SET views = views + 1 WHERE id = ?', [id]);
  }
  
  /**
   * 检查是否已有单页设置为首页显示
   * @returns {Promise<Object>} 返回检查结果 {exists: boolean, pageId: number|null}
   */
  static async checkHomePageExists() {
    const result = await db.queryAsync('SELECT id FROM pages WHERE show_on_home = 1 LIMIT 1');
    if (result && result.length > 0) {
      return { exists: true, pageId: result[0].id };
    }
    return { exists: false, pageId: null };
  }
  
  /**
   * 切换单页的首页显示状态
   * @param {number} id 单页ID
   * @returns {Promise<Object>} 返回更新后的单页信息
   */
  static async toggleHomePageStatus(id) {
    // 首先获取当前单页的状态
    const [page] = await db.queryAsync('SELECT * FROM pages WHERE id = ?', [id]);
    if (!page) {
      throw new Error('单页不存在');
    }
    
    // 如果当前单页未设置为首页显示，但有其他单页已设置为首页显示，则抛出错误
    if (!page.show_on_home) {
      const { exists, pageId } = await this.checkHomePageExists();
      if (exists && pageId !== parseInt(id)) {
        throw new Error('已有其他单页设置为首页显示，请先取消');
      }
    }
    
    // 切换状态
    const newStatus = page.show_on_home ? 0 : 1;
    await db.queryAsync(
      'UPDATE pages SET show_on_home = ?, updated_at = ? WHERE id = ?',
      [newStatus, new Date(), id]
    );
    
    // 返回更新后的单页信息
    const [updatedPage] = await db.queryAsync('SELECT * FROM pages WHERE id = ?', [id]);
    return updatedPage;
  }
  
  /**
   * 获取设置为首页显示的单页内容
   * @returns {Promise<Object|null>} 返回单页数据或null
   */
  static async getHomePageContent() {
    const [page] = await db.queryAsync('SELECT * FROM pages WHERE show_on_home = 1 LIMIT 1');
    return page || null;
  }
}

module.exports = Page; 