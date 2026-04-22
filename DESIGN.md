# Design System — SBTI 山海经精怪版

## 🔴 反AI设计原则

> 这是"反AI设计圣经"的具体实现规范。所有设计决策必须遵循以下原则。

### 绝对禁止

- 禁止所有元素完美居中对齐
- 禁止使用标准整数倍字体大小
- 禁止使用标准圆角(8px/12px/16px)
- 禁止AI默认配色方案
- 禁止Lucide图标（使用emoji代替）
- 禁止所有卡片大小完全相同
- 禁止纯黑/纯白背景
- 禁止死板对称布局
- 禁止按钮同时有文字和箭头图标

### 必须实现

- 所有元素有轻微偏移和不对称
- 非标准字体大小（13px/17px/21px/29px）
- 非标准圆角（6px/9px/14px）
- 背景噪点纹理
- 文字透明度/字重变化
- 卡片大小/阴影差异
- 装饰性线条/点/几何图形
- 慢速柔和动画
- 使用衬线字体增强文化感

---

## Product Context

- **What this is:** SBTI（山海经精怪版老板人格测试）— 24道融合题测试，同时收集人格（D1-D5）和生意维度数据
- **Who it's for:** 中国中小老板群体
- **Space/industry:** AI 商业咨询 / 人格测试 / 分享裂变营销
- **Project type:** 移动优先 H5 + 管理后台

## Aesthetic Direction

- **Direction:** 新中式神话 · 双面国风
- **Decoration level:** Intentionally layered — 淡淡云纹背景 + 精怪线条轮廓 + 毛玻璃卡片
- **Mood:** 白天墨韵（明)，夜晚异兽（暗）—— 一产品双面孔，山海经文化的当代诠释
- **Reference:** 站酷山海经品牌设计、OPPO/VIVO 山海青配色、16Personalities 专业感

## Typography

### Font Stack

| Role | Font | Fallback | Purpose |
|------|------|----------|---------|
| **Display/精怪名** | Noto Serif SC + Playfair Display | serif | 精怪名称，大标题 |
| **Body/正文** | Noto Serif SC | serif | 界面文字、选项（改用衬线字体增强文化感） |
| **Classic/戳心文案** | Ma Shan Zheng | cursive | 精怪slogan等需要古典感的场景 |
| **Mono/数据** | JetBrains Mono | monospace | 统计数字、进度、分享计数 |

### Loading Strategy

```css
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@400;500;700&family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Type Scale（非标准尺寸，打破AI对称美）

```css
--text-xs: 13px;      /* 标签、次要说明 */
--text-sm: 15px;      /* 卡片副标题、注释 */
--text-base: 17px;    /* 正文、选项 */
--text-lg: 21px;      /* 小标题 */
--text-xl: 24px;      /* 页面标题 */
--text-2xl: 29px;     /* 精怪名称 */
--text-3xl: 35px;     /* 大标题 */
--text-hero: 45px;    /* 英雄文字 */
```

## Color

### Approach

双色系统：亮色模式（墨韵新生）+ 暗色模式（异兽觉醒）

### Light Mode — 墨韵新生

```css
/* 背景层次 */
--bg-primary: #f5f3ef;      /* 浅云白 - 主背景 */
--bg-secondary: #ebe8e0;    /* 云烟灰 - 卡片背景 */
--bg-elevated: #ffffff;     /* 纯白 - 浮起元素 */

/* 文字层次 */
--text-primary: #1a1a1a;     /* 墨黑 - 主文字 */
--text-secondary: #4a4a4a;  /* 淡墨 - 次要文字 */
--text-muted: #8a8a8a;      /* 浅灰 - 弱化文字 */

/* 品牌色 */
--accent-primary: #2d4a3e;   /* 青墨 - 主强调 */
--accent-gold: #c9a962;      /* 古铜金 - 精怪名/标题高亮 */
--accent-danger: #c73e3a;    /* 朱红 - 隐藏款/警告 */
--accent-emerald: #10b981;   /* 翡翠绿 - 点缀 */

/* 语义色 */
--success: #3d6b4f;         /* 苔绿 */
--warning: #b8860b;         /* 暗金 */
--error: #c73e3a;           /* 朱红 */

/* 边框 */
--border: #d4d0c8;
--border-accent: #c9a962;
```

### Dark Mode — 异兽觉醒

```css
/* 背景层次 */
--bg-primary: #0d0d0d;      /* 深渊黑 - 主背景 */
--bg-secondary: #1a1a1f;     /* 玄墨 - 卡片背景 */
--bg-elevated: #242428;      /* 玄武灰 - 浮起元素 */

/* 文字层次 */
--text-primary: #f5f3ef;     /* 浅云白 - 主文字 */
--text-secondary: #b8b5ad;  /* 烟灰 - 次要文字 */
--text-muted: #6a6a6a;      /* 深灰 - 弱化文字 */

/* 品牌色 */
--accent-primary: #3a5a8a;   /* 幽蓝 - 主强调 */
--accent-gold: #d4af37;      /* 荧光金 - 高亮 */
--accent-danger: #c73e3a;    /* 朱红 - 隐藏款 */
--accent-emerald: #10b981;   /* 翡翠绿 - 点缀 */

/* 发光效果（暗色模式专属） */
--card-glow: 0 0 20px rgba(212,175,55,0.3);
--secret-glow: radial-gradient(circle, #c73e3a 0%, transparent 70%);
```

### 36种精怪专属色系

| 系别 | 主色 | 辅色 | 示例精怪 |
|------|------|------|---------|
| **龙系** | #1a4a6e | #3a8aaa | 青龙、应龙、烛龙、螭龙 |
| **凤系** | #8b3a3a | #c96a6a | 凤凰、朱雀、鸾鸟 |
| **兽系** | #5a5a3a | #9a9a5a | 白虎、麒麟、驳、猰貐 |
| **狐系** | #6a4a7a | #aa7acd | 九尾狐 |
| **水系** | #2a5a6a | #5a9aaa | 共工、鲲、蠃鱼 |
| **其他** | #4a5a3a | #7a8a5a | 其他精怪 |
| **隐藏款** | #c73e3a | #ff6b6b | H1-H4 |

## Spacing

- **Base unit:** 8px（但允许轻微偏移打破对称）
- **Density:** comfortable（移动端友好）

```css
--space-1: 4px;    /* xs - 标签内边距 */
--space-2: 7px;    /* sm - 小间距（非标准8px） */
--space-3: 13px;    /* md - 标准间距（非标准16px） */
--space-4: 21px;    /* lg - 卡片内边距（非标准24px） */
--space-5: 29px;    /* xl - 区块间距（非标准32px） */
--space-6: 47px;    /* 2xl - 大区块（非标准48px） */
--space-7: 61px;    /* 3xl - 页面级（非标准64px） */
```

## Layout

- **Approach:** Mobile-first responsive grid with intentional asymmetry
- **Max width:** 480px（答题流程）/ 1200px（展示页面）
- **Grid breakpoints:** 640px / 768px / 1024px

### 非对称原则

```
错误示例（AI感）：           正确示例（反AI）：
  ┌───┐ ┌───┐ ┌───┐         ┌──┐   ┌───┐   ┌─┐
  │ A │ │ B │ │ C │         │A │   │ B │   │C│
  └───┘ └───┘ └───┘         └──┘   └───┘   └─┘
  完全居中等宽对称            错落有致大小不一
```

### Border Radius（非标准圆角）

```css
--radius-sm: 6px;     /* 标签、小按钮（非标准4px） */
--radius-md: 9px;     /* 按钮、输入框（非标准8px） */
--radius-lg: 14px;    /* 卡片（非标准16px） */
--radius-xl: 21px;    /* 大区块、分享卡片（非标准24px） */
--radius-full: 9999px; /* 胶囊按钮 */
```

## Motion

- **Approach:** Minimal-functional with personality moments
- **Design principle:** 动效服务情感反馈，不为炫技

### Timing

```css
--duration-fast: 150ms;   /* 微交互：hover、active */
--duration-normal: 300ms;   /* 标准过渡：展开、淡入 */
--duration-slow: 500ms;    /* 页面级动画 */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### Key Animations

| 场景 | 动画 | 时长 |
|------|------|------|
| 卡片入场 | fade + scale(0.95→1) stagger | 500ms |
| 选项出现 | fade-in stagger(80ms) | 200ms per item |
| 进度条填充 | width transition | 300ms |
| 结果揭晓 | 异兽觉醒效果（暗色） | 600ms |
| 隐藏款解锁 | 粒子爆发 + 震动 | 800ms |
| 分享解锁成功 | 金光四射 | 500ms |

## Components

### 装饰性元素

为了打破AI的对称美，添加以下装饰元素：

```
角落装饰线条     页面中央偏左
    ╱                ╲
   ╱                  ╲
  ══════          ══════
       点缀         几何图形
```

- 页面角落添加半透明装饰线条
- 使用emoji代替Lucide图标
- 卡片添加随机方向的小箭头或点

### Cards（非对称卡片）

**精怪卡片结构：**
```
┌─────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │  ← 顶部4px渐变条（精怪专属色）
│                           │
│     🐉 (emoji)           │  ← 精怪emoji
│     貔貅 (name)          │  ← 精怪名（gold色）
│     铁公鸡里的战斗机      │  ← 称号（muted）
│                           │
│ ┌─────────────────────┐ │
│ │ "你赚的每分钱都是..." │ │  ← 戳心文案（Ma Shan Zheng）
│ └─────────────────────┘ │
│                           │
│ [💰只进不出] [👐事必躬亲]  │  ← 标签
│                           │
│ [  解锁完整报告  ]         │  ← CTA按钮
└─────────────────────────┘
```

**卡片大小差异规则：**
- 第一个卡片：width 100%
- 第二个卡片：width 95%，向左偏移 2%
- 第三个卡片：width 92%，向右偏移 1%

**隐藏款卡片：**
- 虚线边框 + 朱红色
- 右上角 🔒 标签
- 暗色模式下发光效果

### Question Options

```
┌─────────────────────────────────┐
│ [A]  选项文字内容              │
└─────────────────────────────────┘
```
- 未选中：灰边框 + 白底
- 悬停：accent-primary边框
- 选中：gold边框 + 浅灰背景 + key变gold

### Progress Bar

```
████████████████████░░░░  17/24  71%
```
- 填充色：accent-primary → accent-gold 渐变
- 轨道色：bg-secondary
- 高度：6px，圆角3px

### Share Unlock Card

- 背景：accent-primary → accent-gold 渐变
- 进度指示器：白底 + 填充动画
- CTA按钮：白色背景 + 深色文字 + 悬停放大

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-21 | 初始设计系统创建 | 基于山海经神话主题 + 新中式美学 |
| 2026-04-21 | 双色系统 | 明/暗模式完全不同的视觉语言 |
| 2026-04-21 | Ma Shan Zheng 戳心文案 | 手写楷体增强情感冲击力 |
| 2026-04-21 | 36种精怪专属色 | 每种人格独特视觉识别 |
| 2026-04-22 | 反AI设计圣经 | 消除AI生成页面的对称美死板感 |
| 2026-04-22 | 衬线字体替代无衬线 | 增强东方文化感 |
| 2026-04-22 | 非标准尺寸 | 打破AI对称美学的整数倍偏好 |
