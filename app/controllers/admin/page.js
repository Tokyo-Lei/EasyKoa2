const Page = require('../../models/page');
const { titleToUrl } = require('../../utils/urlConverter');

/**
 * 单页列表
 */
async function pageList(ctx) {
  try {
    const { items: pages, total, totalPages } = await Page.getList({
      page: parseInt(ctx.query.page) || 1,
      pageSize: 10
    });

    await ctx.render('admin/page/list', {
      title: '单页管理',
      pages,
      pagination: {
        current: parseInt(ctx.query.page) || 1,
        total: totalPages
      }
    });
  } catch (error) {
    console.error('获取单页列表失败:', error);
    ctx.status = 500;
    await ctx.render('error', {
      message: '获取单页列表失败',
      error: { status: 500, stack: error.stack }
    });
  }
}

/**
 * 编辑单页
 */
async function editPage(ctx) {
  try {
    const id = ctx.params.id;
    let page = null;

    if (id) {
      page = await Page.getById(id);
      if (!page) {
        ctx.status = 404;
        return await ctx.render('error', {
          message: '单页不存在',
          error: { status: 404 }
        });
      }
    }

    await ctx.render('admin/page/edit', {
      title: id ? '编辑单页' : '新建单页',
      page
    });
  } catch (error) {
    console.error('编辑单页失败:', error);
    ctx.status = 500;
    await ctx.render('error', {
      message: '编辑单页失败',
      error: { status: 500, stack: error.stack }
    });
  }
}

/**
 * 保存单页
 */
async function savePage(ctx) {
  try {
    const id = ctx.params.id;
    const { title, content, show_on_home } = ctx.request.body;
    
    console.log('接收到的保存单页请求:', {
      id: id || '新建',
      title: title,
      contentLength: content ? content.length : 0,
      show_on_home: show_on_home
    });
    
    // 数据验证
    if (!title || !content) {
      console.error('保存单页失败: 标题或内容为空');
      if (ctx.request.accepts('json')) {
        ctx.status = 400;
        ctx.body = { 
          success: false, 
          message: '标题和内容不能为空' 
        };
      } else {
        ctx.status = 400;
        await ctx.render('error', {
          message: '保存单页失败: 标题和内容不能为空',
          error: { status: 400 }
        });
      }
      return;
    }
    
    // 检查首页显示状态
    const showOnHome = show_on_home === '1' || show_on_home === 1 || show_on_home === true;
    if (showOnHome) {
      const { exists, pageId } = await Page.checkHomePageExists();
      if (exists && (!id || parseInt(pageId) !== parseInt(id))) {
        if (ctx.request.accepts('json')) {
          ctx.status = 400;
          ctx.body = { 
            success: false, 
            message: '已有其他单页设置为首页显示，请先取消' 
          };
        } else {
          ctx.status = 400;
          await ctx.render('error', {
            message: '保存单页失败: 已有其他单页设置为首页显示，请先取消',
            error: { status: 400 }
          });
        }
        return;
      }
    }
    
    // 生成URL别名
    const slug = titleToUrl(title);
    
    if (id) {
      // 更新单页
      console.log(`准备更新单页 ID:${id}`);
      await Page.update(id, {
        title,
        content,
        slug,
        show_on_home: showOnHome
      });
      console.log(`单页更新成功 ID:${id}`);
    } else {
      // 创建新单页
      console.log('准备创建新单页');
      const newId = await Page.create({
        title,
        content,
        slug,
        show_on_home: showOnHome
      });
      console.log(`新单页创建成功 ID:${newId}`);
    }

    // 根据请求类型返回不同响应
    if (ctx.request.accepts('json')) {
      ctx.body = { 
        success: true, 
        message: id ? '单页更新成功' : '单页创建成功'
      };
    } else {
      ctx.redirect('/admin/pages');
    }
  } catch (error) {
    console.error('保存单页失败:', error);
    
    // 根据请求类型返回不同错误响应
    if (ctx.request.accepts('json')) {
      ctx.status = 500;
      ctx.body = { 
        success: false, 
        message: '保存单页失败: ' + error.message 
      };
    } else {
      ctx.status = 500;
      await ctx.render('error', {
        message: '保存单页失败',
        error: { status: 500, stack: error.stack }
      });
    }
  }
}

/**
 * 删除单页
 */
async function deletePage(ctx) {
  try {
    const id = ctx.params.id;
    await Page.delete(id);
    
    if (ctx.request.method === 'DELETE') {
      ctx.body = { success: true };
    } else {
      ctx.redirect('/admin/pages');
    }
  } catch (error) {
    console.error('删除单页失败:', error);
    if (ctx.request.method === 'DELETE') {
      ctx.status = 500;
      ctx.body = { success: false, message: '删除单页失败' };
    } else {
      ctx.status = 500;
      await ctx.render('error', {
        message: '删除单页失败',
        error: { status: 500, stack: error.stack }
      });
    }
  }
}

/**
 * 检查是否有单页设置为首页显示
 */
async function checkHomePageStatus(ctx) {
  try {
    const result = await Page.checkHomePageExists();
    ctx.body = result;
  } catch (error) {
    console.error('检查首页显示状态失败:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '检查失败: ' + error.message };
  }
}

/**
 * 切换单页首页显示状态
 */
async function toggleHomePageStatus(ctx) {
  try {
    const id = ctx.params.id;
    const updatedPage = await Page.toggleHomePageStatus(id);
    
    ctx.body = { 
      success: true, 
      message: updatedPage.show_on_home ? '已设置为首页显示' : '已取消首页显示',
      page: updatedPage
    };
  } catch (error) {
    console.error('切换首页显示状态失败:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
}

module.exports = {
  pageList,
  editPage,
  savePage,
  deletePage,
  checkHomePageStatus,
  toggleHomePageStatus
}; 