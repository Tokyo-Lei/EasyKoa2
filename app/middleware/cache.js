const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Setting = require('../models/setting');

/**
 * 页面缓存中间件
 * 根据后台配置的缓存设置来决定是否缓存响应内容
 */
module.exports = async (ctx, next) => {
  try {
    // 初始化一个标志来跟踪是否已经从缓存提供了响应
    let responseServedFromCache = false;
    
    // 跳过管理员页面和API请求
    if (ctx.path.startsWith('/admin') || ctx.path.startsWith('/api')) {
      await next();
      return;
    }

    // 获取缓存设置
    const enableCache = await Setting.getValue('enable_cache');
    const cacheDuration = await Setting.getValue('cache_duration');
    const cacheExclude = await Setting.getValue('cache_exclude');
    const cacheLastCleared = await Setting.getValue('cache_last_cleared');

    // 如果缓存未启用，直接跳过缓存逻辑
    if (enableCache !== 'true') {
      console.log('页面缓存已禁用');
      await next();
      return;
    }

    // 缓存持续时间（分钟）
    const duration = parseInt(cacheDuration, 10) || 60;
    
    // 检查当前路径是否在排除列表中
    const excludeList = cacheExclude ? cacheExclude.split('\n').map(item => item.trim()) : [];
    const shouldExclude = excludeList.some(pattern => {
      if (pattern.includes('*')) {
        // 简单的通配符匹配
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(ctx.path);
      }
      return ctx.path === pattern;
    });

    // 如果当前路径在排除列表中，跳过缓存
    if (shouldExclude) {
      console.log(`路径 ${ctx.path} 在缓存排除列表中`);
      await next();
      return;
    }

    // 生成缓存键
    const cacheKey = generateCacheKey(ctx);
    
    // 缓存目录设置
    const cacheDir = path.join(__dirname, '../../data/cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cacheFile = path.join(cacheDir, `${cacheKey}.html`);
    
    // 检查缓存文件是否存在且未过期
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const fileTime = stats.mtime.getTime();
      const now = Date.now();
      
      // 检查缓存是否已被手动清除
      const clearTime = cacheLastCleared ? parseInt(cacheLastCleared, 10) : 0;
      const cacheAge = (now - fileTime) / 1000 / 60; // 缓存年龄（分钟）
      
      // 如果缓存未过期且未被手动清除，则使用缓存
      if (cacheAge < duration && fileTime > clearTime) {
        console.log(`从缓存中获取 ${ctx.path}`);
        const cachedContent = fs.readFileSync(cacheFile, 'utf8');
        const cachedData = JSON.parse(cachedContent);
        
        // 设置响应头和内容
        Object.keys(cachedData.headers).forEach(key => {
          ctx.set(key, cachedData.headers[key]);
        });
        
        ctx.status = cachedData.status;
        ctx.body = cachedData.body;
        
        // 添加调试信息（仅当DEBUG环境变量为true时）
        const showDebugInfo = process.env.DEBUG === 'true';
        if (showDebugInfo) {
          // 为页面添加缓存信息
          ctx.state = ctx.state || {};
          ctx.state.cacheInfo = {
            fromCache: true,
            cachedTime: new Date(fileTime).toLocaleString(),
            age: Math.round(cacheAge * 10) / 10
          };
        }
        
        // 标记响应已从缓存提供
        responseServedFromCache = true;
      } else {
        // 如果缓存已过期，删除它
        try {
          fs.unlinkSync(cacheFile);
        } catch (err) {
          console.error('删除过期缓存失败:', err);
        }
      }
    }
    
    // 如果没有从缓存提供响应，则继续处理请求
    if (!responseServedFromCache) {
      await next();
      
      // 只缓存成功的HTML响应
      if (ctx.status === 200 && ctx.response.type && ctx.response.type.includes('html')) {
        // 添加调试信息（仅当DEBUG环境变量为true时）
        const showDebugInfo = process.env.DEBUG === 'true';
        if (showDebugInfo) {
          // 为页面添加缓存信息
          ctx.state = ctx.state || {};
          ctx.state.cacheInfo = {
            fromCache: false
          };
        }
      
        // 创建缓存
        try {
          const cacheData = {
            status: ctx.status,
            type: ctx.response.type,
            headers: ctx.response.headers,
            body: ctx.body
          };
          
          fs.writeFileSync(cacheFile, JSON.stringify(cacheData), 'utf8');
          console.log(`缓存创建成功: ${ctx.path}`);
        } catch (err) {
          console.error('创建缓存失败:', err);
        }
      }
    }
  } catch (error) {
    console.error('缓存中间件错误:', error);
    // 如果缓存处理出错，确保请求继续被处理
    await next();
  }
};

/**
 * 生成缓存键
 * @param {Object} ctx Koa上下文
 * @returns {string} 缓存键
 */
function generateCacheKey(ctx) {
  const { method, path, query } = ctx;
  const queryString = Object.keys(query).sort().map(key => `${key}=${query[key]}`).join('&');
  const data = `${method}:${path}?${queryString}`;
  return crypto.createHash('md5').update(data).digest('hex');
} 