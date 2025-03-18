const db = require('./db');

class Category {
  // 创建分类
  static async create(name, parentId = 0, sortOrder = 0) {
    try {
      const result = await db.runAsync(
        'INSERT INTO categories (name, parent_id, sort_order) VALUES (?, ?, ?)', 
        [name, parentId, sortOrder]
      );
      return result.lastID;
    } catch (err) {
      console.error('创建分类失败:', err);
      throw err;
    }
  }

  // 更新分类
  static async update(id, { name, parentId, sortOrder }) {
    try {
      return await db.runAsync(
        'UPDATE categories SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?',
        [name, parentId, sortOrder, id]
      );
    } catch (err) {
      console.error('更新分类失败:', err);
      throw err;
    }
  }

  // 删除分类
  static async delete(id) {
    try {
      // 首先获取所有子分类
      const children = await this.getChildCategories(id);
      
      // 删除所有子分类
      for (const child of children) {
        await db.runAsync('DELETE FROM categories WHERE id = ?', [child.id]);
      }
      
      // 删除当前分类
      await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
      
      return true;
    } catch (err) {
      console.error('删除分类失败:', err);
      throw err;
    }
  }

  // 获取单个分类
  static async getById(id) {
    try {
      return await db.getAsync('SELECT * FROM categories WHERE id = ?', [id]);
    } catch (err) {
      console.error('获取分类失败:', err);
      throw err;
    }
  }

  // 获取所有分类
  static async getAll() {
    try {
      return await db.queryAsync('SELECT * FROM categories ORDER BY sort_order, id');
    } catch (err) {
      console.error('获取所有分类失败:', err);
      return [];
    }
  }

  // 获取分类树
  static async getCategoryTree() {
    try {
      const categories = await this.getAll();
      return this.buildTree(categories);
    } catch (err) {
      console.error('获取分类树失败:', err);
      return [];
    }
  }

  // 构建分类树
  static buildTree(categories, parentId = 0) {
    const tree = [];
    
    categories.forEach(category => {
      if (category.parent_id === parentId) {
        const children = this.buildTree(categories, category.id);
        
        if (children.length > 0) {
          category.children = children;
        }
        
        tree.push(category);
      }
    });
    
    return tree;
  }

  // 获取子分类
  static async getChildCategories(parentId) {
    try {
      return await db.queryAsync('SELECT * FROM categories WHERE parent_id = ?', [parentId]);
    } catch (err) {
      console.error('获取子分类失败:', err);
      return [];
    }
  }

  // 获取所有子分类ID（包括子分类的子分类等）
  static async getAllChildIds(parentId) {
    try {
      const allIds = [];
      const categories = await this.getAll();
      
      const getChildIds = (pid) => {
        categories.forEach(category => {
          if (category.parent_id === pid) {
            allIds.push(category.id);
            getChildIds(category.id);
          }
        });
      };
      
      getChildIds(parentId);
      return allIds;
    } catch (err) {
      console.error('获取所有子分类ID失败:', err);
      return [];
    }
  }
}

module.exports = Category; 