module.exports = {
  // 数据库配置
  database: {
    path: './data/blog.db'
  },
  
  // 博客基本信息
  blog: {
    title: '我的个人博客',
    description: '一个基于Koa2的个人博客系统',
    author: '博主',
    pageSize: 10 // 每页显示的文章数量
  },
  
  // 管理员信息
  admin: {
    username: 'admin',
    password: '123456' // 实际应用中应该使用加密的密码
  }
}; 