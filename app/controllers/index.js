const Post = require('../models/post');
const Category = require('../models/category');
const config = require('../../config/config');
const { markdownToHtml, getExcerpt } = require('../utils/markdown');
const Navigation = require('../models/navigation');
const Setting = require('../models/setting');
const { buildArticleUrl } = require('../utils/urlConverter');
const Page = require('../models/page');

// 首页
async function home(ctx) {
  try {
    // 获取页码
    const page = parseInt(ctx.query.page) || 1;
    
    // 获取设置的每页文章数量
    let pageSize = config.blog.pageSize; // 默认值
    const articlesPerPage = await Setting.getValue('articles_per_page');
    if (articlesPerPage) {
      pageSize = parseInt(articlesPerPage, 10);
    }
    
    // 获取首页显示的单页内容
    let homePages = await Page.getHomePages();
    
    // 处理单页内容，转换Markdown为HTML
    if (homePages && homePages.length > 0) {
      homePages = homePages.map(page => {
        if (page.content) {
          page.content = markdownToHtml(page.content);
        }
        return page;
      });
    }
    
    // 获取文章列表
    const { items: posts, total, totalPages } = await Post.getList({ 
      page, 
      pageSize
    });
    
    // 处理文章摘要和URL
    posts.forEach(post => {
      post.excerpt = getExcerpt(post.content, 200);
      post.articleUrl = buildArticleUrl(post.title, post.id);
    });
    
    // 获取分类树
    const categoryTree = await Category.getCategoryTree();
    
    // 获取标签列表
    const tags = await Post.getAllTags();
    
    // 获取导航数据
    const navigations = await Navigation.getAll();
    
    // 生成页码数组
    const pageNumbers = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    await ctx.render(`${ctx.FRONTEND_DIR}/index`, {
      title: config.blog.title,
      description: config.blog.description,
      homePages, // 添加转换后的单页内容
      posts,
      pagination: {
        current: page,
        total: totalPages,
        pageNumbers,
        navigations: navigations
      },
      categoryTree,
      tags,
      currentPath: ctx.path,
      navigations: navigations
    });
  } catch (error) {
    console.error('首页渲染失败:', error);
    ctx.status = 500;
    await ctx.render(`${ctx.FRONTEND_DIR}/error`, {
      message: '服务器错误',
      error: { status: 500, stack: error.stack }
    });
  }
}

// 文章详情
async function postDetail(ctx) {
  console.log('======== 进入文章详情函数 ========');
  const id = parseInt(ctx.params.id);
  console.log(`尝试获取文章ID: ${id}`);
  console.log(`请求路径: ${ctx.path}`);
  console.log(`请求参数: ${JSON.stringify(ctx.params)}`);
  
  try {
    const post = await Post.getById(id);
    
    console.log(`文章获取结果: ${post ? '成功' : '未找到'}`);
    if (post) {
      console.log(`文章标题: ${post.title}`);
      console.log(`文章分类: ${post.category_name} (ID: ${post.category_id})`);
      console.log(`文章标签: ${JSON.stringify(post.tags)}`);
    }
    
    if (!post) {
      console.log(`404错误: 文章 ${id} 不存在`);
      ctx.status = 404;
      return await ctx.render(`${ctx.FRONTEND_DIR}/error`, {
        message: `文章不存在 (ID: ${id})`,
        currentPath: ctx.path
      });
    }
    
    // 增加阅读次数
    await Post.incrementViews(id);
    
    // 处理Markdown内容
    post.htmlContent = markdownToHtml(post.content);
    
    // 获取分类树
    const categoryTree = await Category.getCategoryTree();
    
    // 获取标签列表
    const tags = await Post.getAllTags();
    
    // 获取导航数据
    const navigations = await Navigation.getAll();
    
    // 生成文章URL - 用于分享或其他引用
    post.articleUrl = buildArticleUrl(post.title, post.id);
    
    await ctx.render(`${ctx.FRONTEND_DIR}/post`, {
      title: `${post.title} - ${config.blog.title}`,
      post,
      categoryTree,
      tags,
      currentPath: ctx.path,
      navigations: navigations
    });
    console.log('======== 文章详情页渲染成功 ========');
  } catch (err) {
    console.error(`获取文章出错 (ID: ${id}):`, err);
    ctx.status = 500;
    return await ctx.render(`${ctx.FRONTEND_DIR}/error`, {
      message: `获取文章时发生错误: ${err.message}`,
      currentPath: ctx.path
    });
  }
}

// 分类页
async function categoryPage(ctx) {
  const categoryId = parseInt(ctx.params.id);
  const page = parseInt(ctx.query.page) || 1;
  
  // 获取设置的每页文章数量
  let pageSize = config.blog.pageSize; // 默认值
  const articlesPerPage = await Setting.getValue('articles_per_page');
  if (articlesPerPage) {
    pageSize = parseInt(articlesPerPage, 10);
  }
  
  // 获取分类信息
  const category = await Category.getById(categoryId);
  
  if (!category) {
    ctx.status = 404;
    return await ctx.render(`${ctx.FRONTEND_DIR}/error`, {
      message: '分类不存在',
      currentPath: ctx.path
    });
  }
  
  // 获取分类下的文章
  const { items: posts, total, totalPages } = await Post.getList({
    page,
    pageSize,
    categoryId
  });
  
  // 处理文章摘要
  posts.forEach(post => {
    post.excerpt = getExcerpt(post.content, 200);
    post.articleUrl = buildArticleUrl(post.title, post.id);
  });
  
  // 获取分类树
  const categoryTree = await Category.getCategoryTree();
  
  // 获取标签列表
  const tags = await Post.getAllTags();

    // 获取导航数据
    const navigations = await Navigation.getAll();
  
  // 生成页码数组
  const pageNumbers = [];
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i);
  }
  
  await ctx.render(`${ctx.FRONTEND_DIR}/category`, {
    title: `${category.name} - ${config.blog.title}`,
    category,
    posts,
    pagination: {
      current: page,
      total: totalPages,
      pageNumbers
    },
    categoryTree,
    tags,
    currentPath: ctx.path,
    navigations: navigations
  });
}

// 标签页
async function tagPage(ctx) {
  const tagName = ctx.params.name;
  const page = parseInt(ctx.query.page) || 1;
  
  // 获取设置的每页文章数量
  let pageSize = config.blog.pageSize; // 默认值
  const articlesPerPage = await Setting.getValue('articles_per_page');
  if (articlesPerPage) {
    pageSize = parseInt(articlesPerPage, 10);
  }
  
  // 获取标签下的文章
  const { items: posts, total, totalPages } = await Post.getList({
    page,
    pageSize,
    tag: tagName
  });
  
  // 处理文章摘要
  posts.forEach(post => {
    post.excerpt = getExcerpt(post.content, 200);
    post.articleUrl = buildArticleUrl(post.title, post.id);
  });
  
  // 获取分类树
  const categoryTree = await Category.getCategoryTree();
  
  // 获取标签列表
  const tags = await Post.getAllTags();
  
  // 获取导航数据
  const navigations = await Navigation.getAll();
  
  // 生成页码数组
  const pageNumbers = [];
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i);
  }
  
  await ctx.render(`${ctx.FRONTEND_DIR}/tag`, {
    title: `标签: ${tagName} - ${config.blog.title}`,
    tagName,
    posts,
    pagination: {
      current: page,
      total: totalPages,
      pageNumbers
    },
    categoryTree,
    tags,
    currentPath: ctx.path,
    navigations: navigations
  });
}

// 文章列表页
async function articleList(ctx) {
  try {
    console.log('开始加载文章列表页...');
    const page = parseInt(ctx.query.page) || 1;
    console.log('页码:', page);
    
    // 获取设置的每页文章数量
    let pageSize = config.blog.pageSize; // 默认值
    console.log('默认每页文章数量:', pageSize);
    
    try {
      console.log('尝试从设置中获取每页文章数量...');
      const articlesPerPage = await Setting.getValue('articles_per_page');
      console.log('从设置获取到的每页文章数量:', articlesPerPage);
      if (articlesPerPage) {
        pageSize = parseInt(articlesPerPage, 10);
        console.log('使用设置中的每页文章数量:', pageSize);
      }
    } catch (settingError) {
      console.error('获取每页文章数量设置失败:', settingError);
      // 继续使用默认值
    }
    
    console.log('开始获取文章列表...');
    const { items: posts, total, totalPages } = await Post.getList({ 
      page, 
      pageSize
    });
    console.log(`获取到 ${posts.length} 篇文章, 总页数: ${totalPages}`);
    
    // 处理文章摘要
    console.log('处理文章摘要...');
    posts.forEach(post => {
      post.excerpt = getExcerpt(post.content, 200);
      post.articleUrl = buildArticleUrl(post.title, post.id);
    });
    
    // 获取分类树
    console.log('获取分类树...');
    const categoryTree = await Category.getCategoryTree();
    console.log(`获取到 ${categoryTree.length} 个分类`);
    
    // 获取标签列表
    console.log('获取标签列表...');
    const tags = await Post.getAllTags();
    console.log(`获取到 ${tags.length} 个标签`);
    
    // 获取导航数据
    console.log('获取导航数据...');
    const navigations = await Navigation.getAll();
    console.log(`获取到 ${navigations.length} 个导航项`);
    
    // 生成页码数组
    console.log('生成分页数据...');
    const pageNumbers = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    console.log(`生成页码数组: [${pageNumbers.join(', ')}]`);
    
    console.log('开始渲染文章列表页...');
    await ctx.render(`${ctx.FRONTEND_DIR}/article`, {
      title: '文章列表',
      posts,
      pagination: {
        current: page,
        total: totalPages,
        pageNumbers
      },
      categoryTree,
      tags,
      currentPath: ctx.path,
      navigations: navigations
    });
    console.log('文章列表页渲染完成');
  } catch (error) {
    console.error('加载文章列表失败, 详细错误信息:', error);
    console.error('错误堆栈:', error.stack);
    ctx.status = 500;
    await ctx.render(`${ctx.FRONTEND_DIR}/error`, {
      message: '加载文章列表失败',
      error: { status: 500, stack: error.stack }
    });
  }
}

module.exports = {
  home,
  postDetail,
  categoryPage,
  tagPage,
  articleList
}; 