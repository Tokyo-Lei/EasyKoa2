/**
 * HTML扩展名中间件
 * 允许访问带.html后缀的URL，但使用不带后缀的路由处理
 * 保持URL中的.html后缀显示，提供更好的SEO和兼容性
 */
module.exports = function() {
  return async function htmlExtension(ctx, next) {
    try {
      const originalUrl = ctx.url;
      
      // 检查URL是否包含.html（考虑查询参数的情况）
      if (originalUrl.includes('.html')) {
        // 记录原始请求信息
        console.log(`检测到.html后缀请求: ${originalUrl}`);
        
        // 分离路径和查询参数
        const [path, query] = originalUrl.split('?');
        
        // 只替换路径部分的.html
        if (path.endsWith('.html')) {
          const cleanPath = path.replace(/\.html$/, '');
          // 重新组合URL
          const newUrl = query ? `${cleanPath}?${query}` : cleanPath;
          
          // 保存原始URL以供后续可能需要的重定向
          ctx.state.originalHtmlUrl = originalUrl;
          
          // 临时修改URL以匹配路由
          ctx.url = newUrl;
          
          console.log(`将请求 ${originalUrl} 内部重定向到 ${newUrl}`);
        }
      }
      
      // 继续处理请求，确保只调用一次
      await next();
    } catch (error) {
      console.error('HTML扩展中间件错误:', error);
      // 如果发生错误，确保请求继续处理
      ctx.status = 500;
      ctx.body = {
        error: '服务器内部错误',
        message: error.message
      };
    }
  };
}; 