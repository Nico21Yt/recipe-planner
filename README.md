# 🍳 菜谱规划 · 新手备菜清单

一个给做菜新手用的菜谱网站：提前规划想尝试的菜，整理材料、步骤和心得。
基于 React + Vite，纯前端，可免费部署到 GitHub Pages。

## 功能

- **菜谱卡片列表**：菜名、分类、难度、耗时、份数一目了然
- **三种状态**：想试 / 正在做 / 做过，方便规划进度
- **搜索与筛选**：按菜名、食材、标签搜索，按状态/分类过滤
- **详情页**：材料清单可勾选（买菜对照），步骤分步展示，记录小贴士
- **添加 / 编辑**：动态增减材料和步骤、自定义标签
- **数据通过 Git 同步**：导出 / 导入 JSON，配合 GitHub 仓库多设备同步

## 本地运行

```bash
npm install
npm run dev      # 打开 http://localhost:5173
```

## 数据怎么存、怎么同步

平时编辑的数据保存在**浏览器本地（localStorage）**，关掉页面也不会丢。

要在多设备/多浏览器之间同步，走 Git：

1. 在网页上点 **导出 JSON**，下载 `recipes.json`
2. 用它替换仓库里的 `src/data/recipes.json`
3. `git add . && git commit -m "更新菜谱" && git push`
4. 其他设备拉取后，点 **恢复仓库版** 即可加载最新数据

> `src/data/recipes.json` 是「仓库基准数据」。**恢复仓库版** 会丢弃本地修改、加载它；**导入** 则是从任意 JSON 文件读入。

## 部署到 GitHub Pages

仓库已内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`）：

1. 把代码推到 GitHub（分支 `main`）
2. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**
3. 之后每次 push 到 `main` 会自动构建并发布
4. 访问地址类似 `https://<用户名>.github.io/recipe-planner/`

`vite.config.js` 里 `base: './'` 用相对路径，部署到任何子路径都能正常加载。

## 目录结构

```
src/
  data/recipes.json     # 仓库基准菜谱数据（通过 git 同步）
  storage.js            # 数据读写 / 导入导出 / 常量
  components/
    RecipeCard.jsx       # 列表卡片
    RecipeDetail.jsx     # 详情页（材料勾选 + 步骤）
    RecipeForm.jsx       # 添加/编辑表单
  App.jsx                # 主界面与状态管理
```
