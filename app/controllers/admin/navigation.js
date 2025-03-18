const Navigation = require('../../models/navigation');

// 导航列表页
async function index(ctx) {
  const navigations = await Navigation.getAll();
  
  await ctx.render('admin/navigation', {
    title: '导航管理 - 管理后台',
    user: ctx.session.user,
    navigations,
    currentPath: ctx.path
  });
}

// 保存导航
async function save(ctx) {
  try {
    const id = ctx.params.id ? parseInt(ctx.params.id) : null;
    const { title, alias, icon, url, is_external, sort_order } = ctx.request.body;
    
    // 验证必填字段
    if (!title || !alias || !url) {
      ctx.status = 400;
      ctx.body = { error: '标题、别名和地址不能为空' };
      return;
    }
    
    const data = {
      title,
      alias,
      icon,
      url,
      is_external: is_external === 'true' || is_external === true,
      sort_order: parseInt(sort_order) || 0
    };
    
    if (id) {
      await Navigation.update(id, data);
    } else {
      await Navigation.create(data);
    }
    
    ctx.body = { success: true };
  } catch (error) {
    console.error('保存导航失败:', error);
    ctx.status = 500;
    ctx.body = { error: '保存导航失败: ' + error.message };
  }
}

// 删除导航
async function remove(ctx) {
  try {
    const id = parseInt(ctx.params.id);
    await Navigation.delete(id);
    ctx.body = { success: true };
  } catch (error) {
    console.error('删除导航失败:', error);
    ctx.status = 500;
    ctx.body = { error: '删除导航失败: ' + error.message };
  }
}

module.exports = {
  index,
  save,
  remove
}; 