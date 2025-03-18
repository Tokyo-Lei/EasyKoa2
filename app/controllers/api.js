const Post = require('../models/post');
const Category = require('../models/category');
const config = require('../../config/config');
const { markdownToHtml, getExcerpt } = require('../utils/markdown');

// 获取文章列表
async function getPosts(ctx) {
  const page = parseInt(ctx.query.page) || 1;
  const pageSize = parseInt(ctx.query.pageSize) || config.blog.pageSize;
  const categoryId = ctx.query.categoryId ? parseInt(ctx.query.categoryId) : null;
  const tag = ctx.query.tag || null;
  
  const { items: posts, total, totalPages } = await Post.getList({
    page,
    pageSize,
    categoryId,
    tag
  });
  
  // 处理文章摘要，移除完整内容
  posts.forEach(post => {
    post.excerpt = getExcerpt(post.content, 200);
    delete post.content;
  });
  
  ctx.body = {
    success: true,
    data: {
      posts,
      pagination: {
        current: page,
        pageSize,
        total,
        totalPages
      }
    }
  };
}

// 获取单篇文章
async function getPost(ctx) {
  const id = parseInt(ctx.params.id);
  const post = await Post.getById(id);
  
  if (!post) {
    ctx.status = 404;
    return ctx.body = {
      success: false,
      error: '文章不存在'
    };
  }
  
  // 增加阅读次数
  await Post.incrementViews(id);
  
  // 处理Markdown内容
  post.htmlContent = markdownToHtml(post.content);
  
  ctx.body = {
    success: true,
    data: { post }
  };
}

// 获取分类列表
async function getCategories(ctx) {
  const categories = await Category.getAll();
  
  ctx.body = {
    success: true,
    data: { categories }
  };
}

// 获取分类树
async function getCategoryTree(ctx) {
  const categoryTree = await Category.getCategoryTree();
  
  ctx.body = {
    success: true,
    data: { categoryTree }
  };
}

// 获取标签列表
async function getTags(ctx) {
  const tags = await Post.getAllTags();
  
  ctx.body = {
    success: true,
    data: { tags }
  };
}

// 获取博客信息
async function getBlogInfo(ctx) {
  ctx.body = {
    success: true,
    data: {
      title: config.blog.title,
      description: config.blog.description,
      author: config.blog.author
    }
  };
}

module.exports = {
  getPosts,
  getPost,
  getCategories,
  getCategoryTree,
  getTags,
  getBlogInfo
}; 