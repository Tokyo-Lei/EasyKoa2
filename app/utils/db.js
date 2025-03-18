const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbPath = path.join(__dirname, '../../data/blog.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建新的数据库连接
function createConnection() {
  const newDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('连接数据库失败:', err.message);
      throw err;
    }
  });
  return newDb;
}

// 为每个操作创建一个新的连接，避免使用已关闭的连接
function getConnection() {
  return createConnection();
}

/**
 * 执行SQL查询，返回所有结果
 * @param {string} sql SQL语句
 * @param {Array} params 查询参数
 * @returns {Promise<Array>} 查询结果数组
 */
function all(sql, params = []) {
  const db = getConnection();
  
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      // 查询完成后关闭连接
      db.close();
      
      if (err) {
        console.error('查询出错:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * 执行SQL查询，返回第一个结果
 * @param {string} sql SQL语句
 * @param {Array} params 查询参数
 * @returns {Promise<Object|undefined>} 查询结果对象
 */
function get(sql, params = []) {
  const db = getConnection();
  
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      // 查询完成后关闭连接
      db.close();
      
      if (err) {
        console.error('查询出错:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * 执行SQL语句，不返回结果
 * @param {string} sql SQL语句
 * @param {Array} params 查询参数
 * @returns {Promise<Object>} 执行结果
 */
function run(sql, params = []) {
  const db = getConnection();
  
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      // 执行完成后关闭连接
      db.close();
      
      if (err) {
        console.error('执行SQL出错:', err);
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
}

/**
 * 执行多条SQL语句
 * @param {string} sql SQL语句
 * @param {Array<Array>} paramsArray 参数数组的数组
 * @returns {Promise<void>}
 */
async function batch(sql, paramsArray = []) {
  const db = getConnection();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const stmt = db.prepare(sql);
      
      try {
        for (const params of paramsArray) {
          stmt.run(params);
        }
        
        stmt.finalize();
        db.run('COMMIT', (err) => {
          // 事务完成后关闭连接
          db.close();
          
          if (err) {
            console.error('提交事务失败:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (error) {
        stmt.finalize();
        db.run('ROLLBACK', () => {
          // 回滚后关闭连接
          db.close();
          
          console.error('回滚事务:', error);
          reject(error);
        });
      }
    });
  });
}

module.exports = {
  getConnection,
  all,
  get,
  run,
  batch
}; 