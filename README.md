# 智慧档案馆管理系统（全栈版）

数字档案馆学课程设计。在第一阶段纯前端原型的基础上，接入真实的 MySQL 数据库，
升级为**前后端分离的全栈应用**：浏览器 → Node.js/Express 后端 REST API → MySQL。

## 一、系统架构

```
浏览器（HTML/CSS/JS，fetch 异步请求）
        │  HTTP / JSON
        ▼
Node.js + Express 后端（REST API + 规则引擎 + 静态托管）
        │  mysql2 连接池（SQL）
        ▼
MySQL 数据库（smart_archives，4 张表，utf8mb4）
```

关键设计：四性检测、规则引擎匹配、档号生成、事务归档等**业务逻辑放在后端**，
前端只负责展示与交互，更贴近真实档案馆系统，也对应《电子文件自动鉴定》作业的架构。

## 二、目录结构

```
智慧档案馆系统/
├── index.html            前端页面（5 大模块容器）
├── styles.css            现代浅色主题（冷灰底 + 白面板 + 青绿主色）
├── app.js                前端逻辑（fetch 调用后端，已不依赖 data.js）
├── data.js               第一阶段静态数据（保留作备份，不再被引用）
└── server/
    ├── server.js         Express 主入口（路由 + 静态托管）
    ├── db.js             MySQL 连接池
    ├── db.config.js      数据库连接配置（含密码，已 gitignore，勿提交）
    ├── mappers.js        数据库行 → 前端对象 映射
    ├── services.js       四性检测、规则引擎、档号生成
    ├── schema.sql        建库建表脚本
    ├── seed.sql          种子数据脚本
    └── .gitignore
```

## 三、环境要求

- Node.js（已验证 v22，npm 10）
- MySQL Server 8.0（服务名 MySQL80，端口 3306）
- 依赖：express、mysql2、cors（已安装在 server/node_modules）

## 四、启动步骤

1. 确认 MySQL 服务正在运行（服务管理器中 MySQL80 为“正在运行”）。
2. 如在新机器上运行，先建库并导入数据（已执行过可跳过）：
   ```powershell
   # 用 PowerShell 管道方式执行（避免 source 命令的中文路径问题）
   Get-Content server/schema.sql -Raw -Encoding utf8 | mysql -u root -p
   Get-Content server/seed.sql   -Raw -Encoding utf8 | mysql -u root -p
   ```
3. 检查 `server/db.config.js` 中的数据库名、账号、密码与本机一致。
4. 启动后端（同时托管前端）：
   ```powershell
   cd server
   node server.js
   ```
5. 浏览器访问 **http://localhost:3000**。

## 五、数据库表

| 表 | 含义 | 初始行数 |
|---|---|---|
| retention_rules | 保管期限规则库 | 8 |
| intake_files | 预归档文件（含四性检测列、状态） | 8 |
| archived_files | 正式档案库 | 6 |
| loan_records | 借阅记录 | 3 |

## 六、REST API 清单

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | /api/stats | 工作台统计（总量/永久/待鉴定/借阅中） |
| GET | /api/rules | 规则列表 |
| GET | /api/intake、/api/intake/:id | 预归档列表 / 详情 |
| POST | /api/appraisal/:id/run | 运行四性检测 + 规则匹配 |
| POST | /api/intake/:id/archive | 事务归档（写正式库 + 更新状态） |
| POST | /api/intake/:id/return | 退回文件 |
| GET | /api/archives | 档案列表，支持 keyword、retention 检索 |
| GET | /api/archives/:id | 档案详情 |
| GET | /api/loans | 借阅记录 |
| POST | /api/archives/:id/borrow | 申请借阅（借出 +14 天应还） |

## 七、关于 GitHub Pages 的边界（重要）

- GitHub Pages 只能托管**静态页面**，无法运行 Node.js 后端，也无法连接 MySQL。
- 因此**全栈版只在本地完整可用**；线上 Pages 地址里的页面若请求 `/api` 会失败。
- 线上演示可继续展示第一阶段的界面与交互逻辑；若要让线上版也能跑数据库，
  需要把后端部署到支持 Node 的云服务器（或云数据库 + Serverless 平台），属于后续扩展。

## 八、后续可扩展方向

- 用户登录与权限（鉴定岗、借阅岗、管理员）。
- 电子文件原件上传与在线预览、四性检测接入真实校验工具。
- 规则库管理界面（增删改规则）、借阅到期提醒与归还操作。
- 接入真实 AI（如 NLP 自动抽取文种/事由、智能标引），对应课程第三阶段。
