const fs = require('fs');
const path = require('path');
const config = require('../../../config/config');

// 定义上传目录路径
const uploadDir = path.join(__dirname, '../../../app/public/uploads');

// 确保上传目录存在
console.log('资源上传目录:', uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 资源列表页面
async function index(ctx) {
  try {
    // 获取目录中的所有文件（包括子目录）
    let resources = [];
    
    if (fs.existsSync(uploadDir)) {
      // 递归获取所有文件
      resources = getAllFiles(uploadDir);
      
      // 按更新时间倒序排序
      resources.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // 格式化资源信息用于显示
      resources.forEach(resource => {
        // 添加格式化的文件大小
        resource.size_formatted = formatFileSize(resource.size);
        
        // 格式化创建时间
        const created = resource.createdAt || new Date();
        resource.created_at = new Date(created).toISOString().replace('T', ' ').substring(0, 19);
        
        // 格式化更新时间
        const updated = resource.updatedAt || new Date();
        resource.updated_at = new Date(updated).toISOString().replace('T', ' ').substring(0, 19);
        
        // 确保URL是绝对路径
        if (!resource.url.startsWith('http')) {
          resource.url = `${ctx.protocol}://${ctx.host}${resource.url}`;
        }
      });
    }
    
    // 获取上传设置
    const Setting = require('../../models/setting');
    const maxFileSizeSetting = await Setting.getValue('max_file_size');
    const allowedImageTypesSetting = await Setting.getValue('allowed_image_types');
    
    // 最大文件大小限制（MB）
    const maxFileSizeMB = parseInt(maxFileSizeSetting) || 5; // 默认5MB
    
    // 获取允许的文件类型
    let allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedImageTypesSetting) {
      // 如果数据库中有设置，则使用数据库中的设置
      allowedTypes = allowedImageTypesSetting.split(',');
    }
    
    // 格式化允许的文件类型为友好显示
    const fileTypeMap = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/svg+xml': 'SVG'
    };
    
    const allowedTypeLabels = allowedTypes.map(type => fileTypeMap[type] || type);
    
    await ctx.render('admin/resources', {
      title: '资源管理 - 管理后台',
      user: ctx.session.user,
      currentPath: ctx.path,
      resources: resources, // 传递资源列表到模板
      pagination: { current: 1, total: 1 }, // 简单分页
      uploadSettings: {
        maxFileSize: maxFileSizeMB,
        allowedTypes: allowedTypes,
        allowedTypeLabels: allowedTypeLabels.join('、')
      }
    });
  } catch (error) {
    console.error('加载资源管理页面失败:', error);
    await ctx.render('admin/resources', {
      title: '资源管理 - 管理后台',
      user: ctx.session.user,
      currentPath: ctx.path,
      error: '加载资源列表失败: ' + error.message
    });
  }
}

// 获取资源列表
async function list(ctx) {
  try {
    // 获取目录中的所有文件（包括子目录）
    let resources = [];
    
    if (fs.existsSync(uploadDir)) {
      // 递归获取所有文件
      resources = getAllFiles(uploadDir);
    }
    
    // 按更新时间倒序排序
    resources.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    ctx.body = {
      success: true,
      resources
    };
  } catch (error) {
    console.error('获取资源列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: '获取资源列表失败'
    };
  }
}

// 递归获取目录中的所有文件
function getAllFiles(dir) {
  let results = [];
  
  // 读取目录内容
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat && stat.isDirectory()) {
      // 如果是目录，递归调用
      results = results.concat(getAllFiles(fullPath));
    } else {
      // 如果是文件，添加到结果中
      // 计算相对于uploadDir的路径，用于URL
      const relativePath = path.relative(uploadDir, fullPath);
      const urlPath = relativePath.split(path.sep).join('/'); // 确保URL使用正斜杠
      
      try {
        const fileUrl = `/uploads/${urlPath}`;
        console.log('图片文件信息:', {
          file: file,
          fullPath: fullPath,
          relativePath: relativePath,
          url: fileUrl
        });
        
        results.push({
          id: relativePath, // 使用相对路径作为ID
          originalname: file,
          url: fileUrl,
          size: stat.size,
          createdAt: stat.birthtime,
          updatedAt: stat.mtime,
          directory: path.dirname(relativePath) !== '.' ? path.dirname(relativePath) : '' // 文件所在目录
        });
      } catch (err) {
        console.error(`读取文件 ${file} 失败:`, err);
      }
    }
  });
  
  return results;
}

// 上传资源
async function upload(ctx) {
  try {
    console.log('资源上传开始...');
    console.log('请求体类型:', ctx.request.type);
    console.log('ctx.request.files:', ctx.request.files);
    console.log('ctx.request.body:', ctx.request.body);
    
    // 获取上传设置
    const Setting = require('../../models/setting');
    const maxFileSizeSetting = await Setting.getValue('max_file_size');
    const allowedImageTypesSetting = await Setting.getValue('allowed_image_types');
    
    // 最大文件大小限制（MB）
    const maxFileSizeMB = parseInt(maxFileSizeSetting) || 5; // 默认5MB
    const maxFileSize = maxFileSizeMB * 1024 * 1024; // 转换为字节
    
    // 获取允许的文件类型
    let allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedImageTypesSetting) {
      // 如果数据库中有设置，则使用数据库中的设置
      allowedTypes = allowedImageTypesSetting.split(',');
    }
    console.log('允许的文件类型:', allowedTypes);
    console.log('最大文件大小:', maxFileSizeMB, 'MB');
    
    // 检查是否指定了目标目录
    let targetSubDir = '';
    if (ctx.request.body && ctx.request.body.directory) {
      // 清理目录名称，防止路径遍历攻击
      targetSubDir = ctx.request.body.directory.replace(/\.\./g, '').replace(/[\/\\]/g, path.sep);
      console.log('指定的目标目录:', targetSubDir);
    }
    
    // 构建完整的目标目录路径
    const targetDirPath = targetSubDir ? path.join(uploadDir, targetSubDir) : uploadDir;
    
    // 确保目标目录存在
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
      console.log('已创建目标目录:', targetDirPath);
    }
    
    const files = ctx.request.files;
    if (!files) {
      throw new Error('请求中没有文件对象');
    }
    
    // 检测不同的文件字段结构
    let uploadedFiles = [];
    
    if (files.images) {
      uploadedFiles = Array.isArray(files.images) ? files.images : [files.images];
    } else {
      // 尝试查找任何可用的文件
      const fileKeys = Object.keys(files);
      if (fileKeys.length > 0) {
        const firstKey = fileKeys[0];
        uploadedFiles = Array.isArray(files[firstKey]) ? files[firstKey] : [files[firstKey]];
      }
    }
    
    if (uploadedFiles.length === 0) {
      throw new Error('没有上传文件');
    }
    
    console.log(`找到 ${uploadedFiles.length} 个文件`);
    
    const resources = [];
    const errors = [];

    for (const file of uploadedFiles) {
      console.log('处理文件:', file.originalFilename || file.name);
      
      // 确保文件路径字段名称正确
      const filepath = file.filepath || file.path;
      const originalFilename = file.originalFilename || file.name;
      const fileType = file.mimetype || file.type;
      const fileSize = file.size;
      
      if (!filepath || !originalFilename) {
        console.error('文件缺少必要属性:', file);
        errors.push(`文件 ${originalFilename || '未知'} 缺少必要属性`);
        continue;
      }
      
      // 验证文件类型
      if (!allowedTypes.includes(fileType)) {
        console.error('不支持的文件类型:', fileType);
        errors.push(`文件 ${originalFilename} 类型 ${fileType} 不受支持，只允许 ${allowedTypes.join(', ')}`);
        continue;
      }
      
      // 验证文件大小
      if (fileSize > maxFileSize) {
        console.error('文件过大:', formatFileSize(fileSize));
        errors.push(`文件 ${originalFilename} 大小为 ${formatFileSize(fileSize)}，超过了限制的 ${maxFileSizeMB}MB`);
        continue;
      }
      
      try {
        const timestamp = Date.now();
        const filename = `${timestamp}-${originalFilename}`;
        
        // 构建相对路径和完整路径
        let relativePath;
        let targetFilePath;
        
        if (targetSubDir) {
          relativePath = path.join(targetSubDir, filename);
          targetFilePath = path.join(targetDirPath, filename);
        } else {
          relativePath = filename;
          targetFilePath = path.join(uploadDir, filename);
        }
        
        // 确保URL使用正斜杠
        const urlPath = relativePath.split(path.sep).join('/');
        
        // 直接复制文件
        const fileContent = fs.readFileSync(filepath);
        fs.writeFileSync(targetFilePath, fileContent);
        
        console.log(`文件已保存到: ${targetFilePath}`);
        
        // 删除临时文件
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log('临时文件已删除');
        }
        
        resources.push({
          id: relativePath,
          originalname: originalFilename,
          url: `/uploads/${urlPath}`,
          size: file.size,
          directory: targetSubDir,
          type: fileType
        });
      } catch (fileError) {
        console.error('文件处理错误:', fileError);
        errors.push(`处理文件 ${originalFilename} 时出错: ${fileError.message}`);
        // 继续处理其他文件
      }
    }

    ctx.body = {
      success: resources.length > 0,
      resources,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('上传资源失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: '上传资源失败: ' + error.message
    };
  }
}

// 替换资源
async function replace(ctx) {
  try {
    console.log('开始替换资源...');
    console.log('ctx.request.files:', ctx.request.files);
    
    const id = ctx.params.id;
    const oldFilePath = path.join(uploadDir, id);
    
    // 检查旧文件是否存在
    if (!fs.existsSync(oldFilePath)) {
      throw new Error(`资源不存在: ${id}`);
    }
    
    // 获取上传设置
    const Setting = require('../../models/setting');
    const maxFileSizeSetting = await Setting.getValue('max_file_size');
    const allowedImageTypesSetting = await Setting.getValue('allowed_image_types');
    
    // 最大文件大小限制（MB）
    const maxFileSizeMB = parseInt(maxFileSizeSetting) || 5; // 默认5MB
    const maxFileSize = maxFileSizeMB * 1024 * 1024; // 转换为字节
    
    // 获取允许的文件类型
    let allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedImageTypesSetting) {
      // 如果数据库中有设置，则使用数据库中的设置
      allowedTypes = allowedImageTypesSetting.split(',');
    }
    console.log('允许的文件类型:', allowedTypes);
    console.log('最大文件大小:', maxFileSizeMB, 'MB');
    
    // 提取目标目录（相对于uploadDir）
    const targetDir = path.dirname(id);
    const fullTargetDir = path.dirname(oldFilePath);
    
    // 查找文件
    let file = null;
    if (ctx.request.files) {
      if (ctx.request.files.file) {
        file = ctx.request.files.file;
      } else {
        // 尝试查找第一个可用的文件
        const fileKeys = Object.keys(ctx.request.files);
        if (fileKeys.length > 0) {
          file = ctx.request.files[fileKeys[0]];
        }
      }
    }
    
    if (!file) {
      throw new Error('没有上传文件');
    }
    
    console.log('找到的文件对象:', file);
    
    // 确保文件路径和名称字段正确
    const filepath = file.filepath || file.path;
    const originalFilename = file.originalFilename || file.name;
    const fileType = file.mimetype || file.type;
    const fileSize = file.size || 0;
    
    if (!filepath || !originalFilename) {
      throw new Error('文件缺少必要属性');
    }
    
    // 验证文件类型
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`不支持的文件类型: ${fileType}，只允许 ${allowedTypes.join(', ')}`);
    }
    
    // 验证文件大小
    if (fileSize > maxFileSize) {
      throw new Error(`文件大小超过限制: ${formatFileSize(fileSize)}，最大允许 ${maxFileSizeMB}MB`);
    }

    // 生成新文件名，保持原始文件扩展名
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const newFilename = `${timestamp}${ext}`;
    
    // 构建完整的新文件路径
    let newFilePath;
    if (targetDir === '.') {
      // 如果文件在根目录
      newFilePath = path.join(uploadDir, newFilename);
    } else {
      // 如果文件在子目录
      newFilePath = path.join(fullTargetDir, newFilename);
    }
    
    // 计算相对路径用于URL
    const relativePath = path.relative(uploadDir, newFilePath);
    const urlPath = relativePath.split(path.sep).join('/');

    // 删除旧文件
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log('已删除旧文件:', oldFilePath);
    }

    // 保存新文件
    const fileContent = fs.readFileSync(filepath);
    fs.writeFileSync(newFilePath, fileContent);
    console.log('新文件已保存到:', newFilePath);
    
    // 删除临时文件
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('临时文件已删除');
    }

    ctx.body = {
      success: true,
      resource: {
        id: relativePath,
        originalname: originalFilename,
        url: `/uploads/${urlPath}`,
        size: file.size,
        directory: targetDir !== '.' ? targetDir : ''
      }
    };
  } catch (error) {
    console.error('替换资源失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: '替换资源失败: ' + error.message
    };
  }
}

// 删除资源
async function deleteResource(ctx) {
  try {
    // 获取资源ID
    const id = ctx.params.id;
    console.log('收到删除资源请求，资源ID:', id);
    
    if (!id) {
      console.error('删除资源失败：资源ID为空');
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: '资源ID不能为空'
      };
      return;
    }
    
    // 构建文件路径
    const filePath = path.join(uploadDir, id);
    console.log('尝试删除文件:', filePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error('删除失败：文件不存在', filePath);
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: '资源不存在或已被删除'
      };
      return;
    }
    
    try {
      // 删除文件
      fs.unlinkSync(filePath);
      console.log('成功删除文件:', filePath);
      
      // 检查目录是否为空（不包括根目录），如果为空则删除
      const dirPath = path.dirname(filePath);
      if (dirPath !== uploadDir && fs.existsSync(dirPath)) {
        const dirContents = fs.readdirSync(dirPath);
        if (dirContents.length === 0) {
          try {
            fs.rmdirSync(dirPath);
            console.log('已删除空目录:', dirPath);
          } catch (dirError) {
            console.error('删除空目录失败:', dirError);
            // 继续执行，不影响删除文件的结果
          }
        }
      }
      
      ctx.body = {
        success: true,
        message: '资源已成功删除'
      };
    } catch (fileError) {
      console.error('删除文件时出错:', fileError);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '删除文件失败: ' + fileError.message
      };
    }
  } catch (error) {
    console.error('删除资源失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: '删除资源失败: ' + error.message
    };
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

module.exports = {
  index,
  list,
  upload,
  replace,
  delete: deleteResource
}; 