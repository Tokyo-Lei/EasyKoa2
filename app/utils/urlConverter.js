const pinyin = require('pinyin');

/**
 * 将文章标题转换为URL友好的拼音格式
 * @param {string} title 文章标题
 * @returns {string} 拼音格式的URL
 */
function titleToUrl(title) {
  if (!title) return '';

  try {
    // 检查pinyin是否为函数
    if (typeof pinyin !== 'function') {
      console.error('Pinyin is not a function, using simple fallback');
      // 使用简单的回退处理
      return title.toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^\w\-]/g, '') || 'post';
    }

    // 将标题转换为拼音数组
    const pinyinArray = pinyin(title, {
      style: pinyin.STYLE_NORMAL || 0, // 普通风格，不带声调
      heteronym: false // 不启用多音字
    });

    // 将拼音数组转换为字符串，用短横线连接
    const url = pinyinArray
      .flat() // 扁平化数组
      .join('-') // 用短横线连接
      .toLowerCase() // 转小写
      .replace(/[^\w\-]/g, ''); // 移除非字母数字短横线的字符

    return url || 'post'; // 如果转换后为空，返回'post'作为默认值
  } catch (error) {
    console.error('拼音转换出错:', error);
    // 出错时返回安全的默认值
    return title.toLowerCase()
               .replace(/\s+/g, '-')
               .replace(/[^\w\-]/g, '') || 'post';
  }
}

/**
 * 构建带.html后缀的文章URL
 * @param {string} title 文章标题
 * @param {number} id 文章ID
 * @returns {string} 完整的文章URL
 */
function buildArticleUrl(title, id) {
  const urlTitle = titleToUrl(title);
  return `/${urlTitle}-${id}.html`; // 格式：/title-id.html
}

/**
 * 从URL中提取文章ID
 * @param {string} url URL路径
 * @returns {number|null} 文章ID或null
 */
function extractIdFromUrl(url) {
  // 匹配类似 /xxx-123.html 的URL
  const match = url.match(/\/(.+)-(\d+)\.html$/);
  if (match && match[2]) {
    return parseInt(match[2], 10);
  }
  return null;
}

module.exports = {
  titleToUrl,
  buildArticleUrl,
  extractIdFromUrl
}; 