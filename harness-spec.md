# 产品规格文档 - AI Agent Generator V1.0

## 项目概述

**项目名称**：小微实体企业定制AI Agent生成平台

**核心价值**：口语描述经营痛点 → AI自动生成专属AI数字员工配置方案

**目标用户**：小微企业主（10-50人规模，零售/餐饮/制造/服务业）

**技术栈**：
- 前端：Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- 后端：Express.js + SQLite (sql.js)
- AI：OpenRouter API (nvidia/nemotron-3-super-120b-a12b:free)

---

## 功能列表（MUST/SHOULD/COULD HAVE）

### MUST HAVE（第1-3轮迭代）

#### 1. UI样式修复（P0）
**描述**：修复所有页面UI样式问题，确保视觉一致性

**验收标准**：
- [ ] Button组件variant映射完整（primary/secondary/outline/ghost）
- [ ] 所有页面响应式布局正常
- [ ] 无样式错乱或布局溢出
- [ ] 颜色主题一致性（primary: purple-600）

**技术方案**：
- 修复 `src/components/ui/button.tsx` 的variant定义
- 统一使用 Tailwind CSS 变量（hsl(var(--primary))）
- 添加移动端断点适配

#### 2. 数据库持久化（P0）
**描述**：将内存数据迁移到SQLite，实现真实持久化

**验收标准**：
- [ ] 用户注册后数据保存到SQLite
- [ ] Agent生成记录持久化
- [ ] 服务重启后数据不丢失
- [ ] 数据库文件路径：`data/database.sqlite`

**技术方案**：
- 修改 `server/routes/auth.js`，使用SQLite替代内存Map
- 实现CRUD操作封装
- 添加数据库连接错误处理

#### 3. 安全性加固（P0）
**描述**：移除硬编码敏感信息，使用环境变量管理

**验收标准**：
- [ ] 无硬编码API Key
- [ ] 创建 `.env` 文件模板
- [ ] 添加 `.env` 到 `.gitignore`
- [ ] 启动时校验必需环境变量

**技术方案**：
- 创建 `.env.example` 模板
- 使用 `dotenv` 包加载环境变量
- 修改 `server/lib/ai-service.js` 使用 `process.env.OPENROUTER_API_KEY`

#### 4. 完整错误处理（P1）
**描述**：添加全局错误处理和用户友好提示

**验收标准**：
- [ ] 前端Error Boundary组件
- [ ] API统一错误响应格式
- [ ] 用户友好的错误提示（Toast）
- [ ] 错误日志记录

**技术方案**：
- 添加 `src/components/ErrorBoundary.tsx`
- 统一API响应格式：`{ success, data, error }`
- 使用 `sonner` 或自定义Toast组件

#### 5. 支付功能（P1）
**描述**：集成微信支付V3模拟实现

**验收标准**：
- [ ] 支付页面UI完整
- [ ] 创建订单接口
- [ ] 支付成功回调模拟
- [ ] 订单状态管理（pending/paid/failed）

**技术方案**：
- 前端：支付确认弹窗 + 支付状态展示
- 后端：`server/routes/orders.js` 实现订单CRUD
- 模拟支付：5秒后自动标记为paid（测试环境）

#### 6. Agent聊天界面（P1）
**描述**：用户可与生成的Agent对话

**验收标准**：
- [ ] 聊天UI组件（消息列表 + 输入框）
- [ ] 消息历史记录
- [ ] Markdown渲染支持
- [ ] 流式响应（可选）

**技术方案**：
- 创建 `src/app/chat/[agentId]/page.tsx`
- 使用 `react-markdown` 渲染Markdown
- 调用 `POST /api/agents/:id/chat` 接口

---

### SHOULD HAVE（第4-6轮迭代）

#### 7. 邀请退款逻辑（P2）
**描述**：邀请3人全额退款

**验收标准**：
- [ ] 邀请码生成和展示
- [ ] 邀请进度追踪
- [ ] 达到3人后自动退款
- [ ] 退款记录

**技术方案**：
- 注册时关联邀请码
- 实现邀请统计接口
- 退款状态更新逻辑

#### 8. 导出功能（P2）
**描述**：导出Agent配置为JSON/YAML

**验收标准**：
- [ ] 导出按钮UI
- [ ] JSON格式导出
- [ ] YAML格式导出（可选）
- [ ] 文件下载功能

**技术方案**：
- 前端：使用 `file-saver` 库
- 后端：生成标准格式的配置文件

#### 9. 管理后台（P2）
**描述**：管理员可查看用户和订单数据

**验收标准**：
- [ ] 管理员登录
- [ ] 用户列表
- [ ] 订单列表
- [ ] Agent统计

**技术方案**：
- 创建 `src/app/admin/page.tsx`
- 实现管理员认证中间件
- 数据可视化图表（可选）

---

### COULD HAVE（第7-10轮迭代）

#### 10. 用户体验优化（P3）
**描述**：提升整体UX

**验收标准**：
- [ ] 加载动画优化
- [ ] 骨架屏
- [ ] 操作引导
- [ ] 响应速度优化

#### 11. 代码质量优化（P3）
**描述**：提升代码可维护性

**验收标准**：
- [ ] TypeScript类型完整（无any）
- [ ] 单元测试覆盖率>50%
- [ ] ESLint无警告
- [ ] 代码注释完善

---

## 开发计划（Sprint划分）

### Sprint 1（第1轮迭代）：基础修复
- UI样式修复
- 数据库持久化
- 安全性加固

### Sprint 2（第2轮迭代）：核心功能
- 完整错误处理
- 支付功能（模拟）
- Agent聊天界面

### Sprint 3（第3轮迭代）：增值功能
- 邀请退款逻辑
- 导出功能
- 管理后台

### Sprint 4-10（第4-10轮迭代）：持续优化
- 用户体验优化
- 代码质量优化
- 性能优化
- 安全加固
- Bug修复

---

## 技术方向

### 前端架构
```
src/
├── app/                    # Next.js 14 App Router
│   ├── page.tsx           # 首页
│   ├── login/             # 登录页
│   ├── register/          # 注册页
│   ├── create-agent/      # 创建Agent页
│   ├── chat/[id]/         # 聊天页
│   ├── dashboard/         # 用户中心
│   └── admin/             # 管理后台
├── components/            # 组件库
│   ├── ui/               # 基础UI组件
│   └── sections.tsx      # 页面区块组件
└── lib/                  # 工具库
    └── utils.ts          # 工具函数
```

### 后端架构
```
server/
├── index.js              # Express入口
├── db/
│   └── init.js           # 数据库初始化
├── routes/
│   ├── auth.js           # 认证路由
│   ├── agents.js         # Agent路由
│   ├── orders.js         # 订单路由
│   └── admin.js          # 管理路由
├── lib/
│   └── ai-service.js     # AI服务
└── agents/
    └── engine.js         # Agent引擎
```

### 数据库设计
```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  industry TEXT,
  scale TEXT,
  role TEXT,
  invite_code TEXT UNIQUE,
  invite_progress INTEGER DEFAULT 0,
  refunded INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent表
CREATE TABLE agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  config TEXT,
  score INTEGER,
  skills TEXT,
  constraints TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 订单表
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  agent_id INTEGER,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  trade_no TEXT,
  pay_time DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 验收标准

### 整体验收
- [ ] 用户可完成完整流程：注册 → 创建Agent → 聊天 → 支付 → 导出
- [ ] 数据持久化正常，重启不丢失
- [ ] 无硬编码敏感信息
- [ ] 响应式布局正常（桌面端 + 移动端）
- [ ] 错误处理完善，无白屏或崩溃

### 性能指标
- 首页加载时间 < 3秒
- API响应时间 < 2秒
- AI生成时间 < 30秒（6轮推理）

### 安全指标
- 无SQL注入漏洞
- 无XSS漏洞
- 敏感信息加密存储
- API Key不暴露到前端

---

## 风险与缓解

### 技术风险
1. **AI API调用失败**
   - 缓解：添加重试机制和降级方案（备用模型）

2. **数据库并发问题**
   - 缓解：SQLite适用于低并发场景，后续可迁移到PostgreSQL

3. **支付集成复杂度**
   - 缓解：先实现模拟支付，验证流程后再接入真实支付

### 业务风险
1. **用户转化率低**
   - 缓解：优化首页引导文案，降低使用门槛

2. **退款滥用**
   - 缓解：邀请用户需完成注册 + 创建Agent才算有效邀请

---

## 文档更新

- README.md：项目介绍和启动指南
- API文档：所有接口的Swagger文档
- 部署文档：生产环境部署步骤
- 用户手册：功能使用说明
