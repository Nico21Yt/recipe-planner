# 菜谱规划 · 新手备菜清单

给做菜新手用的菜谱网站：AI 一键生成菜谱，提前规划「明天吃什么」，做完拍照记进「做饭日记」。
基于 React + Vite，**数据存云端、所有人共享同一份**；AI 与云端读写都通过 Vercel Serverless 后端，密钥只在环境变量里（不进仓库）。

## 三个主页面

打开先看到首页，三个大入口：

- **菜谱**：输入菜名，**AI 自动生成新手菜谱**（材料、步骤、小贴士），可再手动编辑；支持搜索、筛选、状态管理、上传成品照
- **明天吃什么**：自动按当前日期，默认排「明天」（也可切「今天」）。输入新菜名会**用 AI 生成菜谱并自动加入菜谱库**，再排进当天计划
- **做饭日记**：按日期回顾做过的菜（过期的计划自动归入），并贴上当天拍的照片

## AI 是怎么接的（安全说明）

为了**给别人用也不泄露 Key**，AI 调用走一个后端代理：

- 前端 → 调用本项目的 `/api/generate-recipe`
- 该 Serverless 函数（`api/generate-recipe.js`）在服务器端读取环境变量 `OPENAI_API_KEY` 去请求 OpenAI
- **Key 只存在部署平台的环境变量里，源码和 git 仓库中都没有**（`.env` 已被忽略）

## 数据怎么共享

所有菜谱、计划、照片都存在云端，**所有人读写同一份**，所以谁打开都看到一样的内容：

- 文字数据（菜谱 + 计划）整体存进 **Upstash Redis**（`api/data.js` 读写）
- 照片上传到 **Vercel Blob**，数据里只存图片 URL（`api/upload.js`）

> 注：完全共享、无登录——任何能打开网址的人都能增删改。多人同时改时是「后保存覆盖先保存」。

## 部署到 Vercel（含 AI + 云端共享）

1. 把代码推到 GitHub
2. 打开 [vercel.com](https://vercel.com) → New Project → 导入这个仓库（自动识别为 Vite）
3. 先 **Deploy** 一次（会成功，但 AI / 云端还没配）
4. 进项目 **Storage** 标签，创建两个存储（会自动把环境变量注入项目）：
   - **Redis**（Marketplace 里的 Upstash）→ 注入 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`
   - **Blob** → 注入 `BLOB_READ_WRITE_TOKEN`
5. 进 **Settings → Environment Variables** 添加：
   - `OPENAI_API_KEY` = 你的 OpenAI key（**必填**）
   - `OPENAI_MODEL` = `gpt-5.4`（可选，默认就是它）
6. 回到 **Deployments**，对最新一条点 ⋯ → **Redeploy**（让新环境变量生效）

完成后访问 Vercel 给的地址，AI 生成 + 云端共享都可用。之后每次 push 会自动重新部署。

## 本地开发

```bash
npm install

# 只调前端界面（AI 接口不可用，点生成会提示连不上）
npm run dev

# 连同后端一起本地跑（需要先 `npm i -g vercel` 并登录）
vercel link            # 关联到你的 Vercel 项目
vercel env pull        # 拉取环境变量到本地 .env
vercel dev
```

## 目录结构

```
api/
  generate-recipe.js     # 后端：调用 OpenAI 生成菜谱（Key 走环境变量）
  data.js                # 后端：读写云端共享数据（Upstash Redis）
  upload.js              # 后端：照片上传到 Vercel Blob
src/
  ai.js                  # 前端调用 AI 接口 + 把结果归一化成菜谱结构
  cloud.js               # 前端读写云端数据 / 上传照片
  storage.js             # 计划、日期工具、图片压缩、常量
  components/
    Home.jsx             # 首页三入口
    RecipeCard.jsx       # 菜谱卡片（带成品照封面）
    RecipeDetail.jsx     # 菜谱详情（材料勾选 + 步骤 + 成品记录）
    RecipeForm.jsx       # 编辑菜谱表单
    MealPlan.jsx         # 明天吃什么（今天/明天 + AI 生成新菜）
    Diary.jsx            # 做饭日记（按日期 + 照片）
  App.jsx                # 主界面、标签页与状态管理
```

> 注：本项目用 Vercel 部署（同时托管前端和 `/api` 后端）。GitHub Pages 是纯静态、跑不了后端、AI 无法工作，因此未启用。
