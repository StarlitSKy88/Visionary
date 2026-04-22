## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do not answer directly, do not use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

---

# 🔴 反AI设计圣经 — 山海经老板测试

## 绝对禁止（出现任何一条直接重写）

- **绝对禁止**所有元素都完美居中对齐
- **绝对禁止**使用标准的12px/16px/24px/32px等整数倍字体大小
- **绝对禁止**使用8px/12px/16px等标准圆角
- **绝对禁止**使用"浅灰色背景+深灰色文字+蓝色按钮"的AI默认配色
- **绝对禁止**使用Lucide的默认图标（使用emoji代替）
- **绝对禁止**所有卡片大小完全相同
- **绝对禁止**纯黑色或纯白色背景
- **绝对禁止**没有任何重叠、偏移、倾斜的死板布局
- **绝对禁止**按钮上同时有文字和箭头图标
- **绝对禁止**所有元素都是同一种透明度

## 必须做到

- 所有元素都要有轻微的偏移和不对称
- 使用非标准的字体大小（如13px、17px、21px、29px）
- 使用非标准的圆角（如6px、9px、14px）
- 背景必须有细微的噪点纹理
- 文字要有不同的透明度和字重变化
- 卡片要有不同的大小和阴影深度
- 要有装饰性的线条、点、几何图形
- 动画要慢、要柔和，不要生硬的过渡
- 使用衬线字体(Noto Serif SC)增强文化感

## 风格定位

- **主题：** 神秘、复古、东方玄学，山海经
- **主色调：** 深墨绿色(#0f172a) 代替 纯黑色
- **点缀色：** 青绿色(#10b981) + 朱砂红(#ef4444)
- **字体：** 使用"Noto Serif SC"衬线字体，不要用无衬线字体

---

## Key design tokens

- Light mode bg: #f5f3ef (浅云白), Dark mode bg: #0d0d0d (深渊黑)
- Accent gold: #c9a962 (亮) / #d4af37 (暗)
- Primary accent: #2d4a3e (亮) / #3a5a8a (暗)
- Font: Ma Shan Zheng (戳心文案), Noto Serif SC (正文/标题), JetBrains Mono (数据)
- 36 personality types each have 专属色卡
