const db = require('./db');

class Tag {
  /**
   * 获取所有标签
   */
  static async getAll() {
    try {
      const query = `
        SELECT tags.id, tags.name, COUNT(post_tags.post_id) as post_count
        FROM tags
        LEFT JOIN post_tags ON tags.id = post_tags.tag_id
        GROUP BY tags.id
        ORDER BY post_count DESC
      `;
      const result = await db.all(query);
      return result || [];
    } catch (error) {
      console.error('获取标签列表失败:', error);
      return [];
    }
  }
  
  /**
   * 通过文章ID获取标签
   */
  static async getByPostId(postId) {
    try {
      const query = `
        SELECT tags.id, tags.name
        FROM tags
        JOIN post_tags ON tags.id = post_tags.tag_id
        WHERE post_tags.post_id = ?
        ORDER BY tags.name
      `;
      const result = await db.all(query, [postId]);
      return result || [];
    } catch (error) {
      console.error(`获取文章(ID:${postId})的标签失败:`, error);
      return [];
    }
  }
  
  /**
   * 通过标签ID获取标签
   */
  static async findById(id) {
    try {
      const query = `
        SELECT id, name
        FROM tags
        WHERE id = ?
      `;
      const result = await db.get(query, [id]);
      return result;
    } catch (error) {
      console.error(`获取标签(ID:${id})失败:`, error);
      return null;
    }
  }
  
  /**
   * 通过标签名获取标签
   */
  static async findByName(name) {
    try {
      const query = `
        SELECT id, name
        FROM tags
        WHERE name = ?
      `;
      const result = await db.get(query, [name]);
      return result;
    } catch (error) {
      console.error(`获取标签(名称:${name})失败:`, error);
      return null;
    }
  }
  
  /**
   * 获取特定标签的文章
   */
  static async getPostsByTagId(tagId, options = {}) {
    try {
      const { limit = 10, offset = 0 } = options;
      
      // 获取标签关联的已发布文章
      const query = `
        SELECT posts.id, posts.title, posts.summary, posts.cover, posts.created_at, posts.updated_at
        FROM posts
        JOIN post_tags ON posts.id = post_tags.post_id
        WHERE post_tags.tag_id = ? AND posts.status = 'published'
        ORDER BY posts.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM posts
        JOIN post_tags ON posts.id = post_tags.post_id
        WHERE post_tags.tag_id = ? AND posts.status = 'published'
      `;
      
      const posts = await db.all(query, [tagId, limit, offset]);
      const result = await db.get(countQuery, [tagId]);
      const total = result ? result.total : 0;
      
      return { posts, total };
    } catch (error) {
      console.error(`获取标签(ID:${tagId})的文章失败:`, error);
      return { posts: [], total: 0 };
    }
  }
}

module.exports = Tag; 