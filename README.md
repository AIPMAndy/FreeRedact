# FreeRedact CN · 免费开源的截图隐私保护工具

**独立项目** · 浏览器本地处理 · 不透明实心遮挡 · 无需注册

- [在线网站](https://aipmandy.github.io/FreeRedact/)
- [GitHub 源码](https://github.com/AIPMAndy/FreeRedact)
- [问题反馈](https://github.com/AIPMAndy/FreeRedact/issues)
- [开发者 Andy](https://metaver.vip/)

在浏览器上传、拖入或粘贴 PNG/JPG/WebP 截图，拖动不透明色块覆盖敏感区域，再导出新的、扁平化的 PNG 文件。

> **重要：** 手动遮挡前后都要检查手机号、身份证、聊天头像、二维码、家庭地址和其他敏感内容。本产品的浏览器原生 OCR 检测为实验性能力，可能漏检，不能作为安全保证。

## 本地启动

```bash
git clone https://github.com/AIPMAndy/FreeRedact.git
cd FreeRedact
python3 -m http.server 8000
```

浏览器打开 http://localhost:8000/ 。可以先点击「使用示例图」体验，示例数据完全虚构。

## 已实现

- 文件上传、拖入及剪贴板粘贴；支持 25MB、最多 3000 万像素的源图（具体内存开销受设备限制）
- 通过鼠标/触摸绘制、移动、删除遮挡框
- 撤销、重做、清空；下载 PNG 和部分浏览器支持的剪贴板复制
- 在独立 Canvas 中直接替换原图相应像素，导出时不继承原图 EXIF/GPS 等元数据
- 异步任务取消与状态版本隔离，防止切换图片或修改遮挡框后下载过期文件
- 本地处理、无账户与服务端图片上传功能；页面设置禁止第三方网络连接的 CSP
- 简体中文、移动端响应式产品首页、无第三方广告追踪 SDK

**限制：** 自动文字检测依赖实验性 `TextDetector` API，不能确保所有设备可用，也不能识别所有敏感数据。务必人工确认。老旧浏览器/大图可能导出失败，原图应自行保留。尚未完成全面的真机兼容与独立安全审计。

## 自动测试

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

## GitHub Pages 部署

独立仓库根目录直接包含网页源码。推送到 `main` 后，`.github/workflows/deploy-pages.yml` 自动构建和发布，目标地址为 https://aipmandy.github.io/FreeRedact/ 。第一次使用时，可能需要在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

详见 [部署与验收指南](docs/DEPLOYMENT.md)。

## 项目审计与开源许可

[PRODUCT_SCORECARD](PRODUCT_SCORECARD.md) · [COMPETITOR_BENCHMARK](COMPETITOR_BENCHMARK.md) · [RED_TEAM_REPORT](RED_TEAM_REPORT.md) · [EVOLUTION_ROADMAP](EVOLUTION_ROADMAP.md)

这些审计文档记录前期开发的可复现证据，尚不构成全球领先或真实环境绝对安全的声明。

本项目使用 [MIT License](LICENSE)，外部参考与许可证说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。FreeRedact 与第三方同名产品无关联。
