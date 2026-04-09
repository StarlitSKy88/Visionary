# AI需求翻译官

> 小微实体店专属 AI 需求翻译工具

将商家的口语痛点 → 一键翻译成可用 AI 数字员工配置

## 🚀 功能特性

- ✅ **口语识别** - 自动识别行业、岗位、业务约束
- ✅ **专业翻译** - 生成结构化 AI 配置描述
- ✅ **多平台导出** - 支持 Coze/Dify/飞书CLI/本地AI
- ✅ **ROI 预估** - 智能测算节省成本
- ✅ **隐私保护** - 所有数据本地处理，- ✅ **永久授权** - 一次激活，终身使用

## 📦 安装

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 打包 Electron 应用
npm run electron:build
```

## 🏗 项目结构

```
ai-demand-translator/
├── electron/              # Electron 主进程
│   ├── main.js
│   └── preload.js
├── src/                   # 前端源码
│   ├── views/            # 页面组件
│   ├── engine/           # 翻译引擎
│   ├── export/           # 导出模块
│   ├── store/            # 状态管理
│   └── assets/           # 静态资源
├── config/               # 配置文件
│   ├── industries.json   # 行业规则库
│   └── blacklist.json    # 黑名单
└── package.json
```

## 🔧 配置

### 行业规则库

编辑 `config/industries.json` 添加新行业:

### 黑名单

编辑 `config/blacklist.json` 调整拦截规则

### 定价

编辑 `src/views/HomePage.vue` 修改定价信息

## 🔒 隐私声明

- 所有用户输入仅在本地处理
- 不上传任何数据到云端
- 不收集任何个人信息
- API Key 由用户自行管理

## 📜 许可

本软件为商业软件， 需购买激活码后使用

---

**版本**: 1.0.0  
**作者**: AI需求翻译官团队
