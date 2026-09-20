# 我的经验知识库（MkDocs Material 静态网站）

这是一个用 [MkDocs](https://www.mkdocs.org/) + [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) 构建的个人知识库网站，最终免费部署到 GitHub Pages。

## 目录结构

```
knowledge-site/
├─ .venv/                 # Python 虚拟环境（已装好，勿删，已被 git 忽略）
├─ docs/                  # ← 所有文章都写在这里面（Markdown）
│  ├─ index.md            # 网站首页
│  ├─ 手机/               # 手机
│  ├─ 电脑/
│  │  └─ 装机/            # CPU/显卡/主板等硬件（硬件.md）+ 装机流程
│  ├─ 外设/               # 键盘/鼠标/显示器
│  ├─ 音频与HiFi/         # 耳机/音箱/耳放/监听
│  ├─ 游戏攻略/
│  ├─ assets/             # 图片、样式等静态资源
│  └─ 写作指南.md         # 怎么写文章、支持哪些排版
├─ .github/workflows/     # GitHub 自动构建部署流水线（已备好）
├─ mkdocs.yml             # 站点配置 + 导航菜单（新增文章后在此登记）
├─ requirements.txt       # 依赖清单
├─ 启动本地预览.bat        # 双击即可在本机预览网站
└─ 构建网站.bat            # 双击生成静态网页到 site/ 目录
```

## 常用操作

### 1. 本地预览（写内容时最常用）

双击 `启动本地预览.bat`，然后浏览器打开 <http://127.0.0.1:8000>；文章保存后网页自动刷新。按 `Ctrl+C` 停止。

命令行等价操作：

```powershell
.venv\Scripts\activate
mkdocs serve
```

### 2. 构建静态网站

双击 `构建网站.bat`，产物在 `site/` 目录（纯 HTML/CSS/JS，可放任何静态托管）。

### 3. 新增一篇文章

1. 在 `docs/` 对应分类下新建 `.md` 文件；
2. 打开 `mkdocs.yml`，在 `nav:` 对应位置登记一行；
3. 保存，预览窗口自动更新。排版语法见站内《写作指南》。

### 4. 发布到 GitHub Pages（后续步骤）

方式 A（推荐，已配好流水线）：在 GitHub 建仓库 → 推送代码 → 仓库 Settings → Pages → Source 选 **GitHub Actions**，之后每次 push 自动更新网站。

方式 B（手动）：`mkdocs gh-deploy` 一键推送到 gh-pages 分支。

> 部署的具体操作等内容准备得差不多时，我们一起完成。
