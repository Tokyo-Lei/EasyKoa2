const marked = require('marked');

/**
 * 自定义渲染器，增强图片和链接处理
 */
function createCustomRenderer() {
  const renderer = new marked.Renderer();
  
  // 增强图片渲染
  renderer.image = function(href, title, text) {
    // 图片路径处理
    if (href && !href.startsWith('http')) {
      // 对于相对路径图片，确保以/开头
      if (!href.startsWith('/')) {
        href = '/' + href;
      }
    }
    
    // 添加img-fluid类实现响应式图片
    let out = `<img src="${href}" alt="${text || ''}" class="img-fluid example"`;
    
    if (title) {
      out += ` title="${title}"`;
    }
    
    out += '>';
    
    // 如果有标题，添加图片说明
    if (title) {
      out = `<figure class="figure">
        ${out}
        <figcaption class="figure-caption text-center">${title}</figcaption>
      </figure>`;
    }
    
    return out;
  };
  
  // 增强链接渲染
  renderer.link = function(href, title, text) {
    // 外部链接添加target="_blank"
    const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    
    let out = `<a href="${href}"${target}`;
    
    if (title) {
      out += ` title="${title}"`;
    }
    
    out += `>${text}</a>`;
    
    return out;
  };
  
  return renderer;
}

/**
 * 将Markdown文本转换为HTML
 * @param {string} markdownText Markdown格式的文本
 * @returns {string} 转换后的HTML
 */
function markdownToHtml(markdownText) {
  if (!markdownText) return '';

  // 配置marked选项
  marked.setOptions({
    gfm: true, // GitHub风格的Markdown
    breaks: true, // 转换回车符为<br>
    sanitize: false, // 不净化输出
    smartLists: true, // 使用更智能的列表行为
    smartypants: true, // 使用更智能的标点符号
    xhtml: true, // 使用自闭合标签
    renderer: createCustomRenderer() // 使用自定义渲染器
  });

  return marked.parse(markdownText);
}

/**
 * 截取Markdown文本的摘要
 * @param {string} markdownText Markdown格式的文本
 * @param {number} length 摘要长度
 * @returns {string} 纯文本摘要
 */
function getExcerpt(markdownText, length = 200) {
  if (!markdownText) return '';

  // 将Markdown转换为HTML，然后去除HTML标签
  const html = markdownToHtml(markdownText);
  const text = html.replace(/<[^>]+>/g, '');
  
  // 截取指定长度
  if (text.length <= length) {
    return text;
  }
  
  return text.substring(0, length) + '...';
}

module.exports = {
  markdownToHtml,
  getExcerpt
}; 