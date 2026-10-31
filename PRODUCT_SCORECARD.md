> 迁移说明：此文档保留早期迭代的测试与审查证据，现项目为独立仓库 `AIPMAndy/FreeRedact`。历史托管路径不代表当前网站；新版本需重新验收。

# PRODUCT_SCORECARD — FreeRedact v0.2 PR candidate
2026-10-31. No world ranking or synthetic overall quality score.

Weights: core correctness 30%, privacy & reliability 30%, UX/accessibility 20%, performance 10%, maintainability 10%.

Baseline code: v0.1.0, commit 12f3a5b. Candidate v0.2 unmerged branch.
Reproduction: Node 22.16, Python 3.13.5, headless Chromium, 960×610 fictional image, one mask; offline fixture via Playwright page.set_content because local HTTP/file navigation blocked by runner.

| Targeted assertion | Baseline | Candidate |
|---|---|---|
| Escape rollback | FAIL | PASS |
| pointercancel rollback | FAIL | PASS |
| Flattened opaque mask PNG | PASS | PASS |
| Reject old OCR after image swap | FAIL | PASS |
| Reject old image decode | FAIL | PASS |
| Reject old in-progress export | FAIL | PASS |
| Detector tests | 5/5 | 5/5 |

**1/6 → 6/6 targeted browser assertions**, not a field success rate. P50/P95 export timing on 30 runs had high variance between runs, so no speed improvement claimed. Actual HTTP/CSP, mobile device and memory benchmarks remain unverified.

Run: `npm test && npm run check && python tests/offline_browser_regression.py`; full HTTP smoke: `python tests/browser_smoke.py`. Python playwright, Pillow and Chromium required.

Verdict: conditional code-review pass; NO release approval.

## Iteration 2 — export integrity (2026-10-31)

Newly reproduced on v0.2 before patch: **an in-flight PNG export still completed after all masks were cleared**, so exported content no longer matched the latest preview. Added `editVersion` invalidation on drawing, clearing, undo and redo. Export now cancels if either image or mask revision changed. Asynchronous clipboard writes that have already started cannot be revoked; the UI warns users if the preview changes before clipboard completion.

Additional **local synthetic Chromium** checks: 3/3 race fixtures (clear masks; add mask; clipboard swap warning); one mobile Chromium 390px emulated touch→PNG pixel test PASS; one PNG metadata/filename stripping test PASS. Prior 6/6 state-safety fixtures and 5/5 detector unit tests remain passing locally. These tests validate **11 focused browser scenarios**, not production recall, usability or throughput.

Run: `python tests/export_integrity.py`, `python tests/mobile_touch_offline.py`, `python tests/metadata_integrity.py`. Use Chromium with `CHROMIUM_BIN=/usr/bin/chromium` when system-installed. GitHub PR CI additionally loads real `http://127.0.0.1:18763/`, subject to its runner. A mobile Chromium emulator is **not** a real iPhone Safari or Android device. New memory/latency measurements: **not performed**. No overall score assigned.

## Release status 2026-10-31

v0.3 website and v0.2 safety changes merged in PR #1 at commit `41f2caa`. FreeRedact candidate CI and parent checks passed. GitHub Pages workflow 41178095898 concluded success. These establish deployment execution, **not** independent external availability or real-device privacy success. No statistically valid global score assigned.
