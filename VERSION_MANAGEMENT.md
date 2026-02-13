# 版本管理方案

## 当前推荐方案：子目录管理（最简单）

### 目录结构
```
gh-pages/
├── index.html              # 最新版（当前：v2）
├── v1/index.html           # v1 版本（基本版）
├── v2/index.html           # v2 版本（导航路径版，当前最新）
└── index-nav.html          # 版本导航页面
```

### 访问地址
- 最新版：https://cappuccinozbc.github.io/aman-accessibility-map/
- v1 版本：https://cappuccinozbc.github.io/aman-accessibility-map/v1/
- v2 版本：https://cappuccinozbc.github.io/aman-accessibility-map/v2/

### 创建新版本步骤
1. 创建新目录：
   ```bash
   mkdir -p v3
   cp index.html v3/
   ```

2. 修改 v3/index.html 中的版本标识

3. 提交并推送：
   ```bash
   git add v3/
   git commit -m "Add v3 version"
   git push origin gh-pages
   ```

---

## 方案2：多分支部署（适合并行开发）

### 分支结构
- `main` - 主分支（最新开发）
- `v1` - 版本1稳定分支
- `v2` - 版本2稳定分支
- `gh-pages` - 部署分支

### 工作流
1. 在对应分支开发/修复
2. 推送分支会自动触发部署
3. 通过 URL 访问不同版本

### 需要配置
- 已创建 `.github/workflows/deploy-multi.yml`
- 需要在 GitHub Pages 设置中启用 Actions

---

## 方案3：版本导航页面

创建一个导航页面，列出所有可用版本：

```html
<!DOCTYPE html>
<html>
<head>
    <title>aman-accessibility-map 版本导航</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>aman-accessibility-map 版本导航</h1>
    <ul>
        <li><a href="./">最新版 (v2)</a> - 导航路径可视化</li>
        <li><a href="./v1/">v1 版本</a> - 基础功能</li>
    </ul>
</body>
</html>
```

---

## 建议

对于你的项目，我建议使用 **方案1（子目录）**，原因：

✅ 简单直接，无需额外配置
✅ URL 清晰易记
✅ 易于维护和切换
✅ 适合静态网站部署

需要我帮你实现具体的版本管理方案吗？
