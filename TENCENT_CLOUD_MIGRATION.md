# CEO-TI 项目迁移到腾讯云开发指南

## 📋 概述

本文档说明如何将现有的 CEO-TI 项目迁移到腾讯云开发环境。

## 🏗️ 架构对比

### 当前架构（Next.js + 独立服务器）
```
前端: Next.js (部署在 Vercel/其他)
后端: Express 服务器 (独立服务器)
数据库: Supabase PostgreSQL
```

### 目标架构（腾讯云开发）
```
前端: 腾讯云静态托管
后端: 云函数 (SCF)
数据库: 云数据库 MongoDB
支付: 微信支付 Native
```

---

## 🚀 部署步骤

### 第一步：创建腾讯云环境

1. 访问 https://cloud.tencent.com/product/tcb
2. 登录腾讯云账号（建议用微信扫码）
3. 点击「立即开通」
4. 选择「按量计费」- 个人使用免费额度足够
5. 创建环境，记住 **环境ID**

### 第二步：开通所需服务

在云开发控制台开通：
- ✅ 静态网站托管
- ✅ 云函数
- ✅ 云数据库 MongoDB

### 第三步：配置云函数

1. 在腾讯云控制台创建「云函数」
2. 选择「从头开始创建」
3. 设置函数名称：`sbti-api`
4. 选择运行环境：`Node.js 14.x`
5. 上传代码（使用 `/cloud-functions` 目录）

### 第四步：配置数据库

在云数据库中创建以下集合：
- `sbti_sessions` - 存储测试会话
- `sbti_shares` - 存储分享状态
- `sbti_payments` - 存储支付订单

### 第五步：配置环境变量

在云函数配置中添加以下环境变量：
```
WECHAT_MINI_APPID=wxbd555f94c0301a61
WECHAT_MINI_APPSECRET=7de5c0cf846928465b53f8576a7c459e
WECHAT_PAY_MCHID=1632505758
WECHAT_PAY_API_KEY=kNdLP5ObGYatddENHwEVZj/Zvwge+mRSMGYke9PAll0=
```

### 第六步：配置微信支付回调

1. 在微信商户后台配置支付回调地址
2. 回调地址格式：`https://{环境ID}.env.{自定义域名}/sbti/callback`

---

## 📁 项目文件结构

```
cloud-functions/
├── index.js              # 云函数入口（路由分发）
├── config.js             # 配置文件
├── package.json          # 依赖
├── sbti/
│   ├── start.js          # 开始测试
│   ├── answer.js         # 答题
│   ├── complete.js       # 完成测试 + 支付
│   └── callback.js       # 支付回调
└── share-status.js       # 分享状态
```

---

## 🔧 常用命令

### 本地测试云函数
```bash
# 使用腾讯云 CLI
tcb fn invoke sbti-api --params '{"action":"start","body":"{}"}'
```

### 查看日志
```bash
tcb fn log sbti-api
```

---

## ⚠️ 注意事项

1. **域名备案**：使用云开发静态托管需要已备案的域名
2. **HTTPS**：微信支付要求必须使用 HTTPS
3. **超时配置**：云函数默认超时 10 秒，如需更长请在控制台调整
4. **免费额度**：
   - 云函数：每月 40万 GB-秒
   - 云数据库：每月 2GB 存储
   - 静态托管：每月 5GB 带宽

---

## 📞 获取帮助

- 腾讯云文档：https://cloud.tencent.com/document/product/583
- 云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html