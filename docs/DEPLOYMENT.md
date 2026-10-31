# 独立 FreeRedact 部署与验收

仓库：https://github.com/AIPMAndy/FreeRedact
网站：https://aipmandy.github.io/FreeRedact/

1. 打开仓库 Settings → Pages，部署来源选 **GitHub Actions**。
2. 检查 Actions 中 **FreeRedact CI** 与 **Deploy FreeRedact Website** 均运行成功。
3. 在线检查首页、隐私说明、图片上传、虚构示例图、拖框遮挡、撤销、下载，以及输出 PNG 的实际像素。
4. 分别在 iOS Safari、Android Chrome 上验收触摸、文件选择、剪贴板、下载和大图处理。
5. 如遇 `Pages not enabled` 或 `Resource not accessible by integration`，检查 Pages 来源、GitHub Actions 权限与仓库设置。

**隐私边界：** CI 通过不代表自动检测不会漏掉敏感信息，分享前始终要人工逐处核查。部署流程成功不代表独立跨地区访问已核验。
