const Post = require('../models/post');
const Category = require('../models/category');
const Auth = require('../models/auth');
const config = require('../../config/config');

// 登录页面
async function loginPage(ctx) {
  // 如果已登录，则重定向到后台首页
  if (ctx.session && ctx.session.user) {
    return ctx.redirect('/admin');
  }
  
  await ctx.render('admin/login', {
    title: '登录 - 管理后台',
    error: null,
    currentPath: ctx.path
  });
}

// 处理登录请求
async function login(ctx) {
  const { username, password } = ctx.request.body;
  
  if (!username || !password) {
    return await ctx.render('admin/login', {
      title: '登录 - 管理后台',
      error: '请输入用户名和密码',
      currentPath: ctx.path
    });
  }
  
  try {
    // 首先尝试使用配置文件中的管理员凭据
    const adminConfig = config.admin || {};
    const isAdminLogin = username === adminConfig.username && password === adminConfig.password;
    
    // 如果管理员登录成功或通过Auth服务验证
    if (isAdminLogin || Auth.verify(username, password)) {
      // 设置会话
      ctx.session.user = {
        id: 1, // 管理员ID设为1
        username,
        isAdmin: true
      };
      
      return ctx.redirect('/admin');
    }
    
    // 尝试通过用户模型验证（如果bcrypt可用）
    try {
      const User = require('../models/user');
      const user = await User.authenticate(username, password);
      
      if (user) {
        // 设置会话
        ctx.session.user = {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          isAdmin: true
        };
        
        return ctx.redirect('/admin');
      }
    } catch (userAuthError) {
      console.error('用户模型认证失败:', userAuthError);
      // 继续执行，尝试其他方式登录
    }
    
    // 如果所有认证方式都失败
    await ctx.render('admin/login', {
      title: '登录 - 管理后台',
      error: '用户名或密码错误',
      currentPath: ctx.path
    });
  } catch (error) {
    console.error('登录处理失败:', error);
    await ctx.render('admin/login', {
      title: '登录 - 管理后台',
      error: '登录失败，请稍后再试',
      currentPath: ctx.path
    });
  }
}

// 退出登录
async function logout(ctx) {
  ctx.session = null;
  ctx.redirect('/admin/login');
}

// 后台首页
async function dashboard(ctx) {
  // 获取最近10篇文章
  const { items: recentPosts } = await Post.getList({
    page: 1,
    pageSize: 10,
    publishedOnly: false
  });
  
  // 获取文章总数
  const { total: postCount } = await Post.getList({
    page: 1,
    pageSize: 1
  });
  
  // 获取分类总数
  const categories = await Category.getAll();
  const categoryCount = categories.length;
  
  // 获取标签总数
  const tags = await Post.getAllTags();
  const tagCount = tags.length;
  
  await ctx.render('admin/dashboard', {
    title: '控制面板 - 管理后台',
    user: ctx.session.user,
    recentPosts,
    stats: {
      postCount,
      categoryCount,
      tagCount
    },
    currentPath: ctx.path
  });
}

// 文章列表页
async function postList(ctx) {
  const page = parseInt(ctx.query.page) || 1;
  const { items: posts, total, totalPages } = await Post.getList({
    page,
    pageSize: 10,
    publishedOnly: false
  });
  
  // 生成页码数组
  const pageNumbers = [];
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i);
  }
  
  await ctx.render('admin/posts', {
    title: '文章管理 - 管理后台',
    user: ctx.session.user,
    posts,
    pagination: {
      current: page,
      total: totalPages,
      pageNumbers
    },
    currentPath: ctx.path
  });
}

// 新建/编辑文章页
async function editPost(ctx) {
  const id = ctx.params.id ? parseInt(ctx.params.id) : null;
  let post = null;
  
  if (id) {
    post = await Post.getById(id);
    
    if (!post) {
      ctx.status = 404;
      return await ctx.render('admin/error', {
        message: '文章不存在',
        currentPath: ctx.path
      });
    }
  }
  
  // 获取分类树
  const categoryTree = await Category.getCategoryTree();
  
  // 获取所有标签
  const allTags = await Post.getAllTags();
  
  await ctx.render('admin/post-edit', {
    title: id ? '编辑文章 - 管理后台' : '新建文章 - 管理后台',
    user: ctx.session.user,
    post,
    categoryTree,
    allTags,
    currentPath: ctx.path
  });
}

// 保存文章
async function savePost(ctx) {
  try {
    // 获取表单数据
    const { title, content, categoryId, tags, isPublished } = ctx.request.body;
    // 首先尝试从请求体获取ID，然后从URL参数获取
    const postId = ctx.request.body.id ? parseInt(ctx.request.body.id) : 
                   ctx.params.id ? parseInt(ctx.params.id) : null;
    
    // 详细日志
    console.log('保存文章请求数据:', {
      title: title ? title.substring(0, 20) + '...' : null,
      content: content ? content.substring(0, 50) + '...' : null,
      categoryId,
      categoryIdType: typeof categoryId,
      tags,
      postId,
      urlParamId: ctx.params.id,
      bodyId: ctx.request.body.id,
      isPublished
    });
    
    // 表单验证
    if (!title.trim()) {
      ctx.status = 400;
      ctx.body = { error: '标题不能为空' };
      return;
    }
    
    if (!content.trim()) {
      ctx.status = 400;
      ctx.body = { error: '内容不能为空' };
      return;
    }
    
    // 发布状态下必须有分类
    const publishStatus = isPublished ? 1 : 0;
    
    // 严格检查分类
    if (publishStatus === 1) {
      if (categoryId === undefined || categoryId === null || categoryId === '' || categoryId === '0' || categoryId === 0) {
        console.error('分类验证失败：', { categoryId, type: typeof categoryId, publishStatus });
        ctx.status = 400;
        ctx.body = { error: '发布文章必须选择分类' };
        return;
      }
    }
    
    // 处理分类ID
    let categoryIdValue = null;
    if (categoryId && categoryId !== '') {
      // 确保categoryId是整数
      categoryIdValue = parseInt(categoryId);
      if (isNaN(categoryIdValue)) {
        console.error('分类ID无效:', categoryId);
        ctx.status = 400;
        ctx.body = { error: '分类ID无效' };
        return;
      }
    }
    
    // 构建文章数据对象
    const postData = {
      title,
      content,
      category_id: categoryIdValue, // 使用处理后的分类ID
      is_published: publishStatus
    };
    
    console.log('构建的文章数据:', postData);
    
    // 处理标签
    if (tags) {
      postData.tags = Array.isArray(tags) ? tags : [tags];
    }
    
    let savedId;
    if (postId) {
      // 更新文章
      await Post.update(postId, postData);
      savedId = postId;
      console.log('文章更新成功:', postId, '发布状态:', postData.is_published);
    } else {
      // 创建新文章
      savedId = await Post.create(postData);
      console.log('新文章创建成功:', savedId, '发布状态:', postData.is_published);
    }
    
    ctx.body = {
      success: true,
      post: { id: savedId }
    };
  } catch (error) {
    console.error('保存文章出错:', error);
    ctx.status = 500;
    ctx.body = { error: '服务器错误: ' + error.message };
  }
}

// 删除文章
async function deletePost(ctx) {
  const id = parseInt(ctx.params.id);
  
  try {
    await Post.delete(id);
    
    ctx.body = {
      success: true
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message || '删除文章失败'
    };
  }
}

// 更新文章发布状态
async function updatePostStatus(ctx) {
  try {
    const id = parseInt(ctx.params.id);
    const { status } = ctx.request.body;
    
    // 记录详细信息
    console.log('更新文章状态请求:', { id, status, statusType: typeof status });
    
    // 验证ID
    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = { error: '无效的文章ID' };
      return;
    }
    
    // 处理状态值
    let publishStatus = 0;
    if (status === true || status === 'true' || status === 1 || status === '1') {
      publishStatus = 1;
    }
    
    // 如果要发布，检查文章是否有分类
    if (publishStatus === 1) {
      const post = await Post.getById(id);
      
      if (!post) {
        ctx.status = 404;
        ctx.body = { error: '文章不存在' };
        return;
      }
      
      console.log('文章状态检查:', { 
        id, 
        currentStatus: post.is_published,
        hasCategory: !!post.category_id,
        categoryId: post.category_id 
      });
      
      if (!post.category_id) {
        ctx.status = 400;
        ctx.body = { error: '发布文章必须有分类，请先编辑文章添加分类' };
        return;
      }
    }
    
    // 更新状态
    await Post.updatePublishStatus(id, publishStatus);
    
    ctx.body = { 
      success: true, 
      message: publishStatus === 1 ? '文章已发布' : '文章已转为草稿',
      status: publishStatus 
    };
  } catch (error) {
    console.error('更新文章状态失败:', error);
    ctx.status = 500;
    ctx.body = { error: '服务器错误: ' + error.message };
  }
}

// 更新文章置顶状态
async function updatePostTopStatus(ctx) {
  try {
    const id = parseInt(ctx.params.id);
    const { isTop } = ctx.request.body;
    
    // 记录详细信息
    console.log('更新文章置顶状态请求:', { id, isTop, isTopType: typeof isTop });
    
    // 验证ID
    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = { error: '无效的文章ID' };
      return;
    }
    
    // 处理置顶状态值
    const topStatus = isTop === true || isTop === 'true' || isTop === 1 || isTop === '1';
    
    // 更新状态
    await Post.updateTopStatus(id, topStatus);
    
    ctx.body = { 
      success: true, 
      message: topStatus ? '文章已置顶' : '文章已取消置顶',
      isTop: topStatus 
    };
  } catch (error) {
    console.error('更新文章置顶状态失败:', error);
    ctx.status = 500;
    ctx.body = { error: '服务器错误: ' + error.message };
  }
}

// 分类列表页
async function categoryList(ctx) {
  const categoryTree = await Category.getCategoryTree();
  
  await ctx.render('admin/categories', {
    title: '分类管理 - 管理后台',
    user: ctx.session.user,
    categoryTree,
    currentPath: ctx.path
  });
}

// 保存分类
async function saveCategory(ctx) {
  const id = ctx.params.id ? parseInt(ctx.params.id) : null;
  const { name, parentId, sortOrder } = ctx.request.body;
  
  // 简单验证
  if (!name) {
    ctx.status = 400;
    return ctx.body = {
      success: false,
      error: '分类名称不能为空'
    };
  }
  
  try {
    if (id) {
      // 更新分类
      await Category.update(id, {
        name,
        parentId: parentId ? parseInt(parentId) : 0,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0
      });
    } else {
      // 创建新分类
      id = await Category.create(
        name,
        parentId ? parseInt(parentId) : 0,
        sortOrder ? parseInt(sortOrder) : 0
      );
    }
    
    ctx.body = {
      success: true,
      data: { id }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message || '保存分类失败'
    };
  }
}

// 删除分类
async function deleteCategory(ctx) {
  const id = parseInt(ctx.params.id);
  
  try {
    await Category.delete(id);
    
    ctx.body = {
      success: true
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message || '删除分类失败'
    };
  }
}

module.exports = {
  loginPage,
  login,
  logout,
  dashboard,
  postList,
  editPost,
  savePost,
  deletePost,
  updatePostStatus,
  updatePostTopStatus,
  categoryList,
  saveCategory,
  deleteCategory
}; 