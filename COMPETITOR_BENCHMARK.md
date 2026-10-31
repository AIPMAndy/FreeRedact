> 迁移说明：此文档保留早期迭代的测试与审查证据，现项目为独立仓库 `AIPMAndy/FreeRedact`。历史托管路径不代表当前网站；新版本需重新验收。

# COMPETITOR_BENCHMARK — FreeRedact
2026-10-31. Only product pages and source/documentation reviewed; **no head-to-head benchmarks**.

| Product | Documentation/source | Confirmable distinction |
|---|---|---|
| RedactShot (MIT) | https://github.com/darkzOGx/RedactShot | On-device OCR/detection and browser extension; input to conservative code design |
| Arrowbox | https://arrowbox.app/ | Browser crop/annotations/flat redaction, no-upload claim |
| CleanShot X | https://cleanshot.com/screenshots | Premium Mac capture, annotations and redaction |
| Flameshot GPL-3.0 | https://github.com/flameshot-org/flameshot | Screenshot UI and redaction warnings; no GPL code included in MIT app |
| OpenScreenShot MIT | https://github.com/pghqdev/OpenScreenShot | Full-page browser capture, annotate/export |

FreeRedact opportunity: Mandarin, no-install, paste/draw/solid-export job with verifiable local data processing. Current gaps: unreliable native TextDetector availability, untested accessibility, mobile memory and real-device UX. No validated performance/security/ranking comparison. Any third-party code needs license review.

## Iteration 2 validation note

This cycle fixes a user-facing safety invariant (**never export a prior masking state as current**) and adds synthetic mobile/metadata checks. No competitor was rerun in an identical browser/hardware benchmark; previous capability comparison remains qualitative. Before any 'global leader' claim, measure one shared data set and identical workflow on the named products, with reproducible scripts and privacy/failure evidence. In particular, avoid comparing FreeRedact's synthetic test pass counts with competitors' marketing claims.

## Release evidence update

The FreeRedact v0.3 site is published via the repository's GitHub Pages workflow (success). No new competitor runtime head-to-head test was executed, so rankings and comparative performance conclusions remain unverified.
