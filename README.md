# EasyKoa2 Blog 轻量级博客系统

一个基于 Koa2 的轻量级博客系统，使用 SQLite 作为数据库，结合 art-template 模板引擎提供灵活的前端展示。系统支持文章管理、分类管理、标签管理、单页管理等功能，适合个人或小型团队快速搭建博客网站。

## 功能特点

- **轻量级架构**：基于 Koa2 构建，资源占用低，启动迅速
- **零配置数据库**：使用 SQLite 存储数据，无需额外数据库配置
- **响应式设计**：前端界面基于 Bootstrap 5，支持移动端和桌面端
- **SEO 友好**：自定义页面标题、描述、关键词，文章 URL 支持拼音别名
- **内容管理**：
  - 文章管理：支持发布、编辑、删除、分类与标签关联
  - 分类管理：支持多级分类结构和自定义排序
  - 标签管理：灵活标记文章，方便内容归类和查找
  - 单页管理：独立页面（如"关于我们"）的创建与编辑，支持设置首页展示
- **文件上传**：支持图片上传，自动生成缩略图
- **系统管理**：
  - 站点设置：自定义站点名称、描述、关键词等
  - 数据备份：支持数据库备份和恢复
  - 缓存管理：提高系统响应速度

## 安装与部署

### 系统要求

- Node.js 14.0 或更高版本
- 支持 SQLite 的操作系统环境

### 安装步骤

1. 克隆代码库：

```bash
git clone https://github.com/yourusername/web5.git
cd web5
```

2. 安装依赖：

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

3. 配置环境变量：

复制 `.env.example` 文件（如果存在）为 `.env`，或创建新的 `.env` 文件，并根据需要修改配置：

```
# 应用环境
NODE_ENV=development

# 端口
PORT=3000

# 前端视图目录名称
FRONTEND_DIR=tokyo

# 后台访问路径（默认为admin，可自定义修改提高安全性）
ADMIN_PATH=admin
```

4. 启动应用：

```bash
# 开发模式
npm run dev

# 或生产模式
npm start
```

5. 访问应用：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin

### Docker 部署（可选）

如果您偏好使用 Docker，可以按照以下步骤部署：

```bash
# 构建镜像
docker build -t web5-blog .

# 运行容器
docker run -p 3000:3000 -d web5-blog
```

## 使用说明

### 后台管理

1. 访问 `http://localhost:3000/admin` 进入管理界面
2. 默认账号密码为 admin/admin（首次使用请立即修改）
3. 通过管理界面可以：
   - 管理文章：发布、编辑、删除文章
   - 管理分类：创建、编辑分类结构
   - 管理标签：创建、编辑、删除标签
   - 单页管理：创建独立页面，如"关于我们"、"联系方式"等
   - 系统设置：修改站点信息、管理员账号等

### 前台功能

- 首页展示最新文章
- 分类浏览：按分类查看文章
- 标签浏览：按标签查看相关文章
- 文章详情：查看完整文章内容
- 单页浏览：查看独立页面内容

## 开发指南

### 目录结构

```
web5/
├── app/                  # 应用核心代码
│   ├── controllers/      # 控制器
│   ├── models/           # 数据模型
│   ├── public/           # 静态资源
│   ├── routes/           # 路由配置
│   ├── utils/            # 工具函数
│   └── views/            # 视图模板
├── config/               # 配置文件
├── data/                 # 数据存储（SQLite 数据库文件）
├── node_modules/         # 依赖库
├── .editorconfig         # 编辑器配置
├── .env                  # 环境变量
├── .gitattributes        # Git 属性配置
├── .gitignore            # Git 忽略配置
├── app.js                # 应用入口
├── package.json          # 项目配置
└── README.md             # 项目说明
```

### 扩展开发

1. 添加新路由：在 `app/routes/` 目录下创建或修改路由文件
2. 开发新控制器：在 `app/controllers/` 目录下创建控制器文件
3. 添加新模型：在 `app/models/` 目录下创建模型文件
4. 创建新视图：在 `app/views/` 目录下创建模板文件

## 配置文件说明

项目根目录下的点(.)开头文件是各种配置文件，它们的作用如下：

- **`.env`**: 环境变量配置文件，包含应用的基本配置，如端口、环境和管理路径等。
- **`.gitignore`**: Git 版本控制忽略规则，指定不纳入版本控制的文件和目录。
- **`.editorconfig`**: 编辑器配置文件，确保不同编辑器下保持一致的代码风格。
- **`.gitattributes`**: Git 属性配置，定义文件的属性，如行尾处理、二进制文件识别等。
- **`.pnp.cjs` 和 `.pnp.loader.mjs`**: Yarn 的 Plug'n'Play 功能相关文件，用于优化依赖管理。
- **`.yarn/`**: Yarn 相关的缓存和配置目录，包含依赖的二进制文件和插件。

## 数据库管理

系统使用 SQLite 数据库，数据文件存储在 `data/` 目录下。

### 备份与恢复

1. 备份数据：在后台管理界面中使用备份功能，或直接复制 `data/` 目录下的数据库文件。
2. 恢复数据：在后台管理界面上传备份文件，或直接替换 `data/` 目录下的数据库文件。

## 贡献指南

欢迎贡献代码或提交问题：

1. Fork 本项目
2. 创建您的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 联系方式

如有任何问题或建议，请通过以下方式联系：

- 项目问题跟踪：[GitHub Issues](https://github.com/yourusername/web5/issues)
- 邮箱：your.email@example.com
