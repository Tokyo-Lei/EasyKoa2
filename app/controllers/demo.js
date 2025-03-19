/**
 * 前台演示控制器
 * 用于展示如何在前台页面调用后台数据
 */

const Setting = require('../models/setting');
const User = require('../models/user');
const Category = require('../models/category');
const Post = require('../models/post');
const Tag = require('../models/tag');
const Page = require('../models/page');

/**
 * 演示页面 - 展示各种数据调用
 */
async function index(ctx) {
  try {
    console.log('加载演示页面');
    
    // 获取站点设置
    const settingsList = await Setting.getAll();
    const settings = {};
    settingsList.forEach(setting => {
      settings[setting.key] = setting.value;
    });

    // 获取管理员用户信息
    const adminUser = await User.findById(1);
    
    // 获取分类列表
    const categories = await Category.getAll();
    
    // 获取文章列表（最新10篇）
    const page = parseInt(ctx.query.page) || 1;
    const limit = parseInt(settings.articles_per_page) || 10;
    const offset = (page - 1) * limit;
    
    const { items: posts, total } = await Post.getList({
      page,
      pageSize: limit,
      publishedOnly: true
    });
    
    // 生成分页数据
    const totalPages = Math.ceil(total / limit);
    // 创建页码数组，最多显示5个页码
    const pageNumbers = [];
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);
    
    if (endPage - startPage < 4 && endPage < totalPages) {
      endPage = Math.min(startPage + 4, totalPages);
    }
    if (endPage - startPage < 4 && startPage > 1) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    const pagination = {
      current: page,
      total: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      pageNumbers
    };
    
    // 获取标签列表
    let tags = [];
    try {
      tags = await Tag.getAll() || [];
      // 确保标签数据格式正确
      tags = tags.filter(tag => tag && typeof tag === 'object' && tag.id);
      console.log(`获取到${tags.length}个标签`);
    } catch (error) {
      console.error('获取标签列表失败:', error);
      // 提供一些示例标签数据以防错误
      tags = [
        { id: 1, name: '示例标签1', post_count: 5 },
        { id: 2, name: '示例标签2', post_count: 3 },
        { id: 3, name: '示例标签3', post_count: 1 }
      ];
    }
    
    // 获取单页列表 - 使用getList而不是getAll
    const { items: pages } = await Page.getList({ page: 1, pageSize: 100 });
    
    // 获取首页单页内容
    const homePage = await Page.getHomePageContent();
    
    // 获取一篇示例文章详情
    let samplePost = null;
    if (posts.length > 0) {
      samplePost = await Post.getById(posts[0].id);
      if (samplePost) {
        // 获取文章的标签信息
        try {
          samplePost.tags = await Tag.getByPostId(samplePost.id) || [];
        } catch (error) {
          console.error('获取文章标签失败:', error);
          samplePost.tags = [];
        }
      }
    }
    
    await ctx.render('demo', {
      title: '前台数据调用示例',
      settings,
      adminUser,
      categories,
      posts,
      pagination,
      tags,
      pages,
      homePage,
      samplePost
    });
  } catch (error) {
    console.error('演示页面出错:', error);
    ctx.body = {
      success: false,
      message: '加载演示页面失败',
      error: error.message
    };
  }
}

module.exports = {
  index
}; 