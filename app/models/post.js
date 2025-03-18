const db = require('./db');
const Category = require('./category');

class Post {
  // 创建文章
  static async create({ title, content, category_id, is_published = 1, tags = [] }) {
    try {
      console.log('创建文章数据:', { title: title.substring(0, 20), category_id, is_published });
      
      // 插入文章
      const postResult = await db.runAsync(
        'INSERT INTO posts (title, content, category_id, is_published) VALUES (?, ?, ?, ?)',
        [title, content, category_id, is_published]
      );
      const postId = postResult.lastID;

      // 处理标签
      if (tags && tags.length > 0) {
        await this.updatePostTags(postId, tags);
      }

      return postId;
    } catch (err) {
      console.error('创建文章失败:', err);
      throw err;
    }
  }

  /**
   * 更新文章
   * @param {number} id 文章ID
   * @param {Object} data 更新的数据
   * @returns {Promise<void>}
   */
  static async update(id, data) {
    const { title, content, category_id, is_published, tags } = data;
    
    console.log('更新文章数据:', { id, title: title.substring(0, 20), category_id, is_published });
    
    // 首先获取文章当前的置顶状态
    const currentPost = await db.getAsync('SELECT is_top FROM posts WHERE id = ?', [id]);
    const is_top = currentPost ? currentPost.is_top : 0;
    
    // 更新文章基本信息，保留原有的置顶状态
    await db.runAsync(
      `UPDATE posts 
       SET title = ?, content = ?, category_id = ?, is_published = ?, is_top = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [title, content, category_id, is_published, is_top, id]
    );
    
    // 如果提供了标签，更新标签
    if (tags) {
      await this.updatePostTags(id, tags);
    }
  }

  // 更新文章发布状态
  static async updatePublishStatus(id, isPublished) {
    try {
      await db.runAsync(
        'UPDATE posts SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isPublished ? 1 : 0, id]
      );
      return true;
    } catch (err) {
      console.error('更新文章发布状态失败:', err);
      throw err;
    }
  }

  // 更新文章置顶状态
  static async updateTopStatus(id, isTop) {
    try {
      await db.runAsync(
        'UPDATE posts SET is_top = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isTop ? 1 : 0, id]
      );
      return true;
    } catch (err) {
      console.error('更新文章置顶状态失败:', err);
      throw err;
    }
  }

  // 删除文章
  static async delete(id) {
    try {
      // 删除文章标签关联
      await db.runAsync('DELETE FROM post_tags WHERE post_id = ?', [id]);
      
      // 删除文章
      await db.runAsync('DELETE FROM posts WHERE id = ?', [id]);
      
      return true;
    } catch (err) {
      console.error('删除文章失败:', err);
      throw err;
    }
  }

  // 获取单篇文章
  static async getById(id, includeContent = true) {
    try {
      let query = `
        SELECT p.*, c.name as category_name
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `;
      
      const post = await db.getAsync(query, [id]);
      
      if (post) {
        // 获取文章标签
        post.tags = await this.getPostTags(id);
      }
      
      return post;
    } catch (err) {
      console.error('获取文章失败:', err);
      throw err;
    }
  }

  // 增加阅读次数
  static async incrementViews(id) {
    try {
      return await db.runAsync('UPDATE posts SET views = views + 1 WHERE id = ?', [id]);
    } catch (err) {
      console.error('增加阅读次数失败:', err);
      throw err;
    }
  }

  // 获取文章列表
  static async getList({ 
    page = 1, 
    pageSize = 10, 
    categoryId = null, 
    tag = null,
    publishedOnly = true
  }) {
    try {
      let params = [];
      let whereClause = publishedOnly ? 'WHERE p.is_published = 1' : 'WHERE 1=1';
      
      // 根据分类筛选
      if (categoryId) {
        // 获取所有子分类ID
        const childIds = await Category.getAllChildIds(categoryId);
        const allCategoryIds = [parseInt(categoryId), ...childIds];
        
        if (allCategoryIds.length > 0) {
          whereClause += ` AND p.category_id IN (${allCategoryIds.join(',')})`;
        }
      }
      
      // 根据标签筛选
      if (tag) {
        whereClause += ' AND p.id IN (SELECT post_id FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.name = ?)';
        params.push(tag);
      }
      
      // 计算总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM posts p
        ${whereClause}
      `;
      
      const totalResult = await db.getAsync(countQuery, params);
      const total = totalResult ? totalResult.total : 0;
      
      // 计算分页
      const offset = (page - 1) * pageSize;
      
      // 获取列表，按置顶和创建时间排序
      const listQuery = `
        SELECT p.id, p.title, p.category_id, p.views, p.created_at, p.updated_at, p.is_published, p.is_top,
               c.name as category_name
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY p.is_top DESC, p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const listParams = [...params, pageSize, offset];
      const posts = await db.queryAsync(listQuery, listParams);
      
      // 获取每篇文章的标签
      for (const post of posts) {
        post.tags = await this.getPostTags(post.id);
      }
      
      return {
        items: posts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (err) {
      console.error('获取文章列表失败:', err);
      throw err;
    }
  }

  // 更新文章标签
  static async updatePostTags(postId, tags) {
    try {
      // 删除现有标签关联
      await db.runAsync('DELETE FROM post_tags WHERE post_id = ?', [postId]);
      
      // 添加新标签
      if (tags && tags.length > 0) {
        // 获取或创建标签
        const tagIds = [];
        for (const tagName of tags) {
          let tag = await db.getAsync('SELECT id FROM tags WHERE name = ?', [tagName]);
          
          if (!tag) {
            const result = await db.runAsync('INSERT INTO tags (name) VALUES (?)', [tagName]);
            tagIds.push(result.lastID);
          } else {
            tagIds.push(tag.id);
          }
        }
        
        // 创建文章-标签关联
        for (const tagId of tagIds) {
          await db.runAsync('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
        }
      }
    } catch (err) {
      console.error('更新文章标签失败:', err);
      throw err;
    }
  }

  // 获取文章标签
  static async getPostTags(postId) {
    try {
      const query = `
        SELECT t.id, t.name
        FROM tags t
        JOIN post_tags pt ON t.id = pt.tag_id
        WHERE pt.post_id = ?
      `;
      
      return await db.queryAsync(query, [postId]);
    } catch (err) {
      console.error('获取文章标签失败:', err);
      return [];
    }
  }

  // 获取所有标签及其使用计数
  static async getAllTags() {
    try {
      const query = `
        SELECT t.id, t.name, COUNT(pt.post_id) as count
        FROM tags t
        LEFT JOIN post_tags pt ON t.id = pt.tag_id
        GROUP BY t.id
        ORDER BY count DESC, t.name
      `;
      
      return await db.queryAsync(query);
    } catch (err) {
      console.error('获取所有标签失败:', err);
      return [];
    }
  }
}

module.exports = Post; 