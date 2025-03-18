const Setting = require('../../models/setting');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

/**
 * 显示设置页面
 */
async function index(ctx) {
  try {
    // 获取所有设置
    const settings = await Setting.getAll();
    
    // 转换为键值对对象，方便在模板中使用
    const settingsMap = {};
    const customSettings = [];
    
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
      
      // 收集自定义设置（假设自定义设置键名以'custom_'开头）
      if (setting.key.startsWith('custom_')) {
        customSettings.push({
          key: setting.key.substring(7), // 去掉'custom_'前缀
          value: setting.value
        });
      }
    });
    
    // 获取用户信息
    const User = require('../../models/user');
    let userInfo = null;
    
    if (ctx.session && ctx.session.user && ctx.session.user.id) {
      userInfo = await User.findById(ctx.session.user.id);
    }
    
    await ctx.render('admin/settings', {
      title: '高级设置',
      settings: settingsMap,
      customSettings: customSettings,
      currentPath: ctx.path,
      user: userInfo || ctx.session.user || {} // 提供用户信息到模板
    });
  } catch (error) {
    console.error('加载设置页面失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '加载设置失败: ' + error.message
    };
  }
}

/**
 * 保存基本设置
 */
async function saveBasic(ctx) {
  try {
    const { 
      site_title, 
      site_subtitle, 
      site_description, 
      site_keywords, 
      site_copyright,
      customSettings
    } = ctx.request.body;
    
    // 验证必填字段
    if (!site_title) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '站点标题不能为空'
      };
      return;
    }
    
    // 批量更新设置
    const settings = {
      site_title,
      site_subtitle,
      site_description,
      site_keywords,
      site_copyright
    };
    
    await Setting.setMultiple(settings);
    
    // 处理自定义设置
    if (customSettings) {
      try {
        const customSettingsArray = JSON.parse(customSettings);
        
        // 先删除所有现有的自定义设置
        await Setting.deleteByPrefix('custom_');
        
        // 保存新的自定义设置
        const customSettingsObj = {};
        customSettingsArray.forEach(item => {
          if (item.key) {
            customSettingsObj[`custom_${item.key}`] = item.value || '';
          }
        });
        
        if (Object.keys(customSettingsObj).length > 0) {
          await Setting.setMultiple(customSettingsObj);
        }
      } catch (error) {
        console.error('处理自定义设置失败:', error);
        // 继续执行，不中断整个保存过程
      }
    }
    
    ctx.body = {
      success: true,
      message: '基本设置保存成功'
    };
  } catch (error) {
    console.error('保存基本设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '保存设置失败: ' + error.message
    };
  }
}

/**
 * 保存显示设置
 */
async function saveDisplay(ctx) {
  try {
    const { articles_per_page } = ctx.request.body;
    
    // 验证数字格式
    const perPage = parseInt(articles_per_page, 10);
    if (isNaN(perPage) || perPage < 1) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '每页文章数量必须是大于0的数字'
      };
      return;
    }
    
    // 更新设置
    await Setting.setValue('articles_per_page', perPage.toString());
    
    ctx.body = {
      success: true,
      message: '显示设置保存成功'
    };
  } catch (error) {
    console.error('保存显示设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '保存设置失败: ' + error.message
    };
  }
}

/**
 * 保存缓存设置
 */
async function saveCache(ctx) {
  try {
    const { enable_cache, cache_duration, cache_exclude } = ctx.request.body;
    
    // 验证缓存时间
    const duration = parseInt(cache_duration, 10);
    if (isNaN(duration) || duration < 1 || duration > 1440) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缓存时间必须是1-1440之间的数字'
      };
      return;
    }
    
    // 批量更新设置
    const settings = {
      enable_cache: enable_cache === 'true' || enable_cache === true ? 'true' : 'false',
      cache_duration: duration.toString(),
      cache_exclude: cache_exclude || ''
    };
    
    await Setting.setMultiple(settings);
    
    ctx.body = {
      success: true,
      message: '缓存设置保存成功'
    };
  } catch (error) {
    console.error('保存缓存设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '保存设置失败: ' + error.message
    };
  }
}

/**
 * 清除所有缓存
 */
async function clearCache(ctx) {
  try {
    // 更新缓存刷新时间戳
    await Setting.setValue('cache_last_cleared', Date.now().toString());
    
    // 清除缓存文件
    const path = require('path');
    const fs = require('fs');
    const cacheDir = path.join(__dirname, '../../../data/cache');
    
    // 如果缓存目录存在，遍历并删除所有缓存文件
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.html')) {
          try {
            fs.unlinkSync(path.join(cacheDir, file));
            deletedCount++;
          } catch (err) {
            console.error(`删除缓存文件 ${file} 失败:`, err);
          }
        }
      }
      
      console.log(`共清除了 ${deletedCount} 个缓存文件`);
    } else {
      console.log('缓存目录不存在，无需清除');
    }
    
    ctx.body = {
      success: true,
      message: '缓存已成功清除'
    };
  } catch (error) {
    console.error('清除缓存失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '清除缓存失败: ' + error.message
    };
  }
}

/**
 * 上传站点Logo
 */
async function uploadLogo(ctx) {
  try {
    const file = ctx.request.files.logo;
    if (!file) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '未找到上传的文件'
      };
      return;
    }
    
    // 获取上传设置
    const maxLogoSizeSetting = await Setting.getValue('max_logo_size');
    const allowedImageTypesSetting = await Setting.getValue('allowed_image_types');
    
    // 最大文件大小限制（MB）
    const maxLogoSizeMB = parseInt(maxLogoSizeSetting) || 2; // 默认2MB
    const maxLogoSize = maxLogoSizeMB * 1024 * 1024; // 转换为字节
    
    // 获取允许的文件类型
    let allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedImageTypesSetting) {
      // 如果数据库中有设置，则使用数据库中的设置
      allowedTypes = allowedImageTypesSetting.split(',');
    }
    console.log('Logo允许的文件类型:', allowedTypes);
    console.log('Logo最大文件大小:', maxLogoSizeMB, 'MB');
    
    // 验证文件类型
    if (!allowedTypes.includes(file.mimetype)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `只允许上传${allowedTypes.includes('image/jpeg') ? 'JPG、' : ''}${allowedTypes.includes('image/png') ? 'PNG、' : ''}${allowedTypes.includes('image/gif') ? 'GIF、' : ''}${allowedTypes.includes('image/svg+xml') ? 'SVG' : ''}格式的图片`
      };
      return;
    }
    
    // 验证文件大小
    if (file.size > maxLogoSize) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `Logo文件大小不能超过${maxLogoSizeMB}MB`
      };
      return;
    }
    
    // 生成文件名和保存路径
    const timestamp = Date.now();
    const ext = path.extname(file.originalFilename);
    const filename = `logo_${timestamp}${ext}`;
    
    // 确保上传目录存在
    const uploadDir = path.join(__dirname, '../../../app/public/uploads');
    console.log('Logo上传目录:', uploadDir);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const targetPath = path.join(uploadDir, filename);
    const relativePath = `/uploads/${filename}`;
    
    // 读取文件内容
    const fileContent = await fs.readFileSync(file.filepath);
    
    // 写入到目标路径
    await writeFileAsync(targetPath, fileContent);
    console.log('Logo保存成功:', targetPath);
    
    // 删除临时文件
    await unlinkAsync(file.filepath);
    
    // 获取旧Logo并删除
    const oldLogo = await Setting.getValue('site_logo');
    if (oldLogo && oldLogo.startsWith('/uploads/')) {
      const oldFileName = path.basename(oldLogo);
      const oldPath = path.join(uploadDir, oldFileName);
      
      if (fs.existsSync(oldPath)) {
        await unlinkAsync(oldPath);
        console.log('已删除旧Logo:', oldPath);
      }
    }
    
    // 保存新Logo路径到数据库
    await Setting.setValue('site_logo', relativePath);
    
    ctx.body = {
      success: true,
      message: 'Logo上传成功',
      logo: relativePath
    };
  } catch (error) {
    console.error('上传Logo失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '上传Logo失败: ' + error.message
    };
  }
}

/**
 * 上传用户头像
 */
async function uploadAvatar(ctx) {
  try {
    console.log('开始处理头像上传...');
    console.log('请求体类型:', ctx.request.type);
    console.log('ctx.request.files:', JSON.stringify(ctx.request.files, null, 2));
    console.log('ctx.request.body:', JSON.stringify(ctx.request.body, null, 2));
    
    // 基本会话验证
    if (!ctx.session || !ctx.session.user || !ctx.session.user.id) {
      console.error('会话验证失败');
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未登录或会话已过期'
      };
      return;
    }

    const userId = ctx.session.user.id;
    console.log(`用户ID: ${userId} 正在上传头像`);
    
    // 获取上传的文件 - 处理不同的文件结构
    let file = null;
    if (ctx.request.files) {
      if (ctx.request.files.avatar) {
        // koa-body 结构
        file = ctx.request.files.avatar;
      } else if (ctx.request.files.file) {
        // koa-multer 结构
        file = ctx.request.files.file;
      } else if (Array.isArray(ctx.request.files) && ctx.request.files.length > 0) {
        // 数组结构
        file = ctx.request.files[0];
      } else {
        // 尝试查找第一个可用的文件
        const fileKeys = Object.keys(ctx.request.files);
        if (fileKeys.length > 0) {
          file = ctx.request.files[fileKeys[0]];
        }
      }
    }
    
    // 如果仍然没有文件，检查一些常见的备选位置
    if (!file && ctx.req && ctx.req.file) {
      file = ctx.req.file; // Express multer 风格
    }
    
    if (!file && ctx.request.body && ctx.request.body.avatar) {
      file = ctx.request.body.avatar; // 有些中间件会将文件放在body中
    }
    
    console.log('找到的文件对象:', JSON.stringify(file, null, 2));
    
    if (!file) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '未找到上传的文件'
      };
      return;
    }
    
    // 获取上传设置
    const maxAvatarSizeSetting = await Setting.getValue('max_avatar_size');
    const allowedImageTypesSetting = await Setting.getValue('allowed_image_types');
    
    // 最大文件大小限制（MB）
    const maxAvatarSizeMB = parseInt(maxAvatarSizeSetting) || 2; // 默认2MB
    const maxAvatarSize = maxAvatarSizeMB * 1024 * 1024; // 转换为字节
    
    // 获取允许的文件类型
    let allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedImageTypesSetting) {
      // 如果数据库中有设置，则使用数据库中的设置
      allowedTypes = allowedImageTypesSetting.split(',');
    }
    console.log('头像允许的文件类型:', allowedTypes);
    console.log('头像最大文件大小:', maxAvatarSizeMB, 'MB');
    
    // 检查文件属性 - 增加完整的属性名称记录
    console.log('文件对象所有属性:', Object.keys(file));
    
    // 获取文件扩展名
    let ext = '.jpg'; // 默认扩展名
    let originalFilename = 'unknown.jpg'; // 默认文件名
    
    // 尝试从各种可能的属性中获取文件名
    if (file.originalFilename) {
      originalFilename = file.originalFilename;
    } else if (file.name) {
      originalFilename = file.name;
    } else if (file.filename) {
      originalFilename = file.filename;
    } else if (file.originalname) {
      originalFilename = file.originalname;
    }
    
    console.log('获取到的原始文件名:', originalFilename);
    
    // 尝试从文件名获取扩展名
    if (originalFilename && typeof originalFilename === 'string') {
      ext = path.extname(originalFilename) || ext;
    } else if (file.filepath && typeof file.filepath === 'string') {
      // 从临时文件路径中尝试获取扩展名
      ext = path.extname(file.filepath) || ext;
    }
    
    console.log('获取到的文件扩展名:', ext);
    
    // 获取文件类型和路径
    const mimetype = file.mimetype || file.type || 'image/jpeg';
    const filePath = file.filepath || file.path;
    const fileSize = file.size || 0;
    
    if (!filePath) {
      console.error('文件路径未找到');
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '文件结构无效，无法读取文件路径'
      };
      return;
    }
    
    // 验证文件类型
    if (!allowedTypes.includes(mimetype)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `只允许上传${allowedTypes.includes('image/jpeg') ? 'JPG、' : ''}${allowedTypes.includes('image/png') ? 'PNG、' : ''}${allowedTypes.includes('image/gif') ? 'GIF、' : ''}${allowedTypes.includes('image/svg+xml') ? 'SVG' : ''}格式的图片`
      };
      return;
    }
    
    // 验证文件大小
    if (fileSize > maxAvatarSize) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `头像文件大小不能超过${maxAvatarSizeMB}MB`
      };
      return;
    }
    
    // 生成文件名和保存路径
    const timestamp = Date.now();
    const filename = `avatar_${userId}_${timestamp}${ext}`;
    
    // 确保目录存在
    const avatarDir = path.join(__dirname, '../../../app/public/uploads/avatars');
    console.log('头像上传目录:', avatarDir);
    
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    
    // 保存文件
    const targetPath = path.join(avatarDir, filename);
    const relativePath = `/uploads/avatars/${filename}`;
    
    console.log(`保存头像到: ${targetPath}`);
    
    try {
      // 读取和写入文件
      const fileContent = fs.readFileSync(filePath);
      fs.writeFileSync(targetPath, fileContent);
      console.log('文件保存成功');
      
      // 删除临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('临时文件已删除');
      }
    } catch (fileError) {
      console.error('文件处理错误:', fileError);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '文件处理失败: ' + fileError.message
      };
      return;
    }
    
    // 更新数据库
    console.log('更新用户头像路径在数据库中');
    try {
      const User = require('../../models/user');
      await User.updateAvatar(userId, relativePath);
      console.log('数据库更新成功');
    } catch (dbError) {
      console.error('数据库更新失败，但文件已保存:', dbError);
      // 即使数据库更新失败，我们也继续，因为文件已上传成功
    }
    
    // 更新会话中的头像路径
    ctx.session.user.avatar = relativePath;
    console.log('会话中的头像路径已更新');
    
    // 返回成功
    ctx.body = {
      success: true,
      message: '头像上传成功',
      avatar: relativePath
    };
    
  } catch (error) {
    console.error('上传头像失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '上传头像失败: ' + error.message
    };
  }
}

/**
 * 更新用户名
 */
async function updateUsername(ctx) {
  try {
    // Check if user session exists
    if (!ctx.session || !ctx.session.user || !ctx.session.user.id) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未登录或会话已过期'
      };
      return;
    }
    
    const { username } = ctx.request.body;
    
    if (!username || username.trim() === '') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户名不能为空'
      };
      return;
    }
    
    const User = require('../../models/user');
    
    // 检查用户名是否已存在（除了当前用户）
    const existingUser = await User.findByUsername(username);
    if (existingUser && existingUser.id !== ctx.session.user.id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该用户名已被使用'
      };
      return;
    }
    
    // 更新用户名
    await User.updateUsername(ctx.session.user.id, username);
    
    // 更新会话中的用户信息
    ctx.session.user.username = username;
    
    ctx.body = {
      success: true,
      message: '用户名更新成功',
      requiresRelogin: false
    };
  } catch (error) {
    console.error('更新用户名失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新用户名失败: ' + error.message
    };
  }
}

/**
 * 更新用户密码
 */
async function updatePassword(ctx) {
  try {
    console.log('开始更新密码...');
    // Check if user session exists
    if (!ctx.session || !ctx.session.user || !ctx.session.user.id) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未登录或会话已过期'
      };
      return;
    }
    
    const { currentPassword, newPassword, confirmPassword } = ctx.request.body;
    
    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '所有密码字段都为必填项'
      };
      return;
    }
    
    if (newPassword !== confirmPassword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '新密码和确认密码不匹配'
      };
      return;
    }
    
    if (newPassword.length < 6) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '新密码长度至少6位'
      };
      return;
    }
    
    const User = require('../../models/user');
    
    // 验证当前密码
    console.log('查找用户信息:', ctx.session.user.id);
    const user = await User.findById(ctx.session.user.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    console.log('检查密码...');
    
    // 使用配置文件中的管理员密码或加密后的密码进行验证
    let isPasswordValid = false;
    
    // 如果用户是管理员，允许使用配置文件中的管理员密码
    const config = require('../../../config/config');
    if (user.id === 1 && ctx.session.user.username === config.admin.username) {
      isPasswordValid = currentPassword === config.admin.password;
    }
    
    // 如果不是管理员或管理员密码不匹配，尝试使用加密密码匹配
    if (!isPasswordValid && user.password && user.password.includes(':')) {
      isPasswordValid = User.verifyPassword(currentPassword, user.password);
    }
    
    if (!isPasswordValid) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '当前密码不正确'
      };
      return;
    }
    
    // 更新密码
    console.log('更新密码...');
    await User.updatePassword(ctx.session.user.id, newPassword);
    
    ctx.body = {
      success: true,
      message: '密码更新成功',
      requiresRelogin: true
    };
  } catch (error) {
    console.error('更新密码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新密码失败: ' + error.message
    };
  }
}

/**
 * 保存上传设置
 */
async function saveUpload(ctx) {
  try {
    const { 
      max_file_size, 
      allowed_image_types,
      max_avatar_size,
      max_logo_size
    } = ctx.request.body;
    
    // 验证数字格式
    const maxFileSize = parseInt(max_file_size, 10);
    if (isNaN(maxFileSize) || maxFileSize < 1) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '最大文件大小必须是大于0的数字'
      };
      return;
    }
    
    const maxAvatarSize = parseInt(max_avatar_size, 10) || 2; // 默认2MB
    const maxLogoSize = parseInt(max_logo_size, 10) || 2; // 默认2MB
    
    // 检查允许的图片类型
    if (!allowed_image_types || allowed_image_types.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '至少选择一种允许的图片类型'
      };
      return;
    }
    
    // 批量更新设置
    const settings = {
      max_file_size: maxFileSize.toString(),
      allowed_image_types: Array.isArray(allowed_image_types) ? allowed_image_types.join(',') : allowed_image_types,
      max_avatar_size: maxAvatarSize.toString(),
      max_logo_size: maxLogoSize.toString()
    };
    
    await Setting.setMultiple(settings);
    
    ctx.body = {
      success: true,
      message: '上传设置保存成功'
    };
  } catch (error) {
    console.error('保存上传设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '保存设置失败: ' + error.message
    };
  }
}

module.exports = {
  index,
  saveBasic,
  saveDisplay,
  saveCache,
  clearCache,
  uploadLogo,
  uploadAvatar,
  updateUsername,
  updatePassword,
  saveUpload
}; 