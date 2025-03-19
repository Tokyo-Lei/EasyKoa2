const Page = require('../models/page');
const { markdownToHtml } = require('../utils/markdown');

/**
 * 显示单页内容
 */
async function showPage(ctx) {
  try {
    const slug = ctx.params.slug;
    
    // 获取单页内容
    const page = await Page.getBySlug(slug);
    if (!page) {
      ctx.status = 404;
      return await ctx.render(`${ctx.FRONTEND_DIR}/error`, {
        message: '页面不存在',
        error: { status: 404 }
      });
    }
    
    // 转换Markdown为HTML
    const content = markdownToHtml(page.content || '');
    
    // 更新浏览量
    await Page.updateViews(page.id);
    
    // 渲染页面
    await ctx.render(`${ctx.FRONTEND_DIR}/page`, {
      title: page.title,
      page: {
        ...page,
        content
      }
    });
  } catch (error) {
    console.error('单页渲染失败:', error);
    ctx.status = 500;
    await ctx.render(`${ctx.FRONTEND_DIR}/error`, {
      message: '服务器错误',
      error: { status: 500, stack: error.stack }
    });
  }
}

module.exports = {
  showPage
}; 