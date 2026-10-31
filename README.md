<div align="center">

<img src="og-cover.svg" alt="FreeRedact：截图可以分享，隐私留给自己" width="720">

# 🛡️ FreeRedact CN

**免费开源的截图隐私保护工具 · 浏览器本地处理 · 不透明实心遮挡 · 无需注册**

[![License: MIT](https://img.shields.io/github/license/AIPMAndy/FreeRedact?style=flat-square&color=blue)](LICENSE)
[![Stars](https://img.shields.io/github/stars/AIPMAndy/FreeRedact?style=flat-square&color=f5b301)](https://github.com/AIPMAndy/FreeRedact/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/AIPMAndy/FreeRedact?style=flat-square)](https://github.com/AIPMAndy/FreeRedact/commits/main)
[![CI](https://img.shields.io/github/actions/workflow/status/AIPMAndy/FreeRedact/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/AIPMAndy/FreeRedact/actions/workflows/ci.yml)
[![Pages](https://img.shields.io/github/actions/workflow/status/AIPMAndy/FreeRedact/deploy-pages.yml?branch=main&style=flat-square&label=Pages)](https://github.com/AIPMAndy/FreeRedact/actions/workflows/deploy-pages.yml)
![JavaScript](https://img.shields.io/badge/JavaScript-原生-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/图片不上传-本地处理-10B981?style=flat-square)

[**🌐 在线使用**](https://aipmandy.github.io/FreeRedact/) · [📘 部署与验收指南](docs/DEPLOYMENT.md) · [🐛 问题反馈](https://github.com/AIPMAndy/FreeRedact/issues)

</div>

---

在浏览器上传、拖入或粘贴 PNG/JPG/WebP 截图，拖动不透明色块覆盖敏感区域，再导出新的、扁平化的 PNG 文件。

> **重要：** 手动遮挡前后都要检查手机号、身份证、聊天头像、二维码、家庭地址和其他敏感内容。本产品的浏览器原生 OCR 检测为实验性能力，可能漏检，不能作为安全保证。

## 🚀 本地启动

```bash
git clone https://github.com/AIPMAndy/FreeRedact.git
cd FreeRedact
python3 -m http.server 8000
```

浏览器打开 http://localhost:8000/ 。可以先点击「使用示例图」体验，示例数据完全虚构。

## ✨ 已实现

- 📥 文件上传、拖入及剪贴板粘贴；支持 25MB、最多 3000 万像素的源图（具体内存开销受设备限制）
- 🖱️ 通过鼠标/触摸绘制、移动、删除遮挡框
- ↩️ 撤销、重做、清空；下载 PNG 和部分浏览器支持的剪贴板复制
- 🧹 在独立 Canvas 中直接替换原图相应像素，导出时不继承原图 EXIF/GPS 等元数据
- ⏱️ 异步任务取消与状态版本隔离，防止切换图片或修改遮挡框后下载过期文件
- 🔒 本地处理、无账户与服务端图片上传功能；页面设置禁止第三方网络连接的 CSP
- 📱 简体中文、移动端响应式产品首页、无第三方广告追踪 SDK

> **限制：** 自动文字检测依赖实验性 `TextDetector` API，不能确保所有设备可用，也不能识别所有敏感数据。务必人工确认。老旧浏览器/大图可能导出失败，原图应自行保留。尚未完成全面的真机兼容与独立安全审计。

## 🧪 自动测试

```bash
npm run check
npm test
python3 -m pip install playwright pillow
python3 -m playwright install chromium
python3 tests/offline_browser_regression.py
python3 tests/export_integrity.py
python3 tests/mobile_touch_offline.py
python3 tests/metadata_integrity.py
python3 tests/browser_smoke.py
```

CI 会在 GitHub Actions 自动执行同样的核心测试。浏览器用例包含遮挡像素、状态竞态、虚构 PNG 元数据和 Chromium 手机仿真；真实手机测试仍需单独验证。

## 🧱 技术栈

| 部分 | 说明 |
|---|---|
| 前端 | 原生 HTML / CSS / JavaScript（`app.js`、`detector.js`），Canvas 像素级遮挡 |
| 文字检测 | 浏览器实验性 `TextDetector` API（可选，可能不可用） |
| 测试 | Node.js 内置 test runner + Python Playwright（Chromium，含手机仿真） |
| 部署 | GitHub Actions + GitHub Pages，无后端、无构建依赖 |

## 📦 GitHub Pages 部署

独立仓库根目录直接包含网页源码。推送到 `main` 后，`.github/workflows/deploy-pages.yml` 自动构建和发布，目标地址为 https://aipmandy.github.io/FreeRedact/ 。第一次使用时，可能需要在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

详见 [部署与验收指南](docs/DEPLOYMENT.md)。

## 📄 项目审计与开源许可

[PRODUCT_SCORECARD](PRODUCT_SCORECARD.md) · [COMPETITOR_BENCHMARK](COMPETITOR_BENCHMARK.md) · [RED_TEAM_REPORT](RED_TEAM_REPORT.md) · [EVOLUTION_ROADMAP](EVOLUTION_ROADMAP.md)

这些审计文档记录前期开发的可复现证据，尚不构成全球领先或真实环境绝对安全的声明。

本项目使用 [MIT License](LICENSE)，外部参考与许可证说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。FreeRedact 与第三方同名产品无关联。

---

## 👤 作者

<div align="center">

**AI 酋长 Andy** · 星觉科技

前腾讯/百度 AI 产品负责人 → 大模型公司 VP → AI 创业者

[![GitHub](https://img.shields.io/badge/GitHub-AIPMAndy-181717?style=flat-square&logo=github)](https://github.com/AIPMAndy)
[![X](https://img.shields.io/badge/X-@AIPMAndy-000000?style=flat-square&logo=x)](https://x.com/AIPMAndy)
![WeChat](https://img.shields.io/badge/微信-AIPMAndy-07C160?style=flat-square&logo=wechat&logoColor=white)
[![Website](https://img.shields.io/badge/官网-metaver.vip-111827?style=flat-square)](https://metaver.vip/)

觉得有用，欢迎点个 ⭐ Star，也欢迎提 Issue / PR 一起改进。

</div>
