> 迁移说明：此文档保留早期迭代的测试与审查证据，现项目为独立仓库 `AIPMAndy/FreeRedact`。历史托管路径不代表当前网站；新版本需重新验收。

# RED_TEAM_REPORT — FreeRedact v0.2
2026-10-31. Builder and reviewer phases were separated within one assistant; NOT independent autonomous agents.

| Finding | Severity | Evidence | Status |
|---|---|---|---|
| FR01 Cancel move with Esc leaves moved mask | High | Chromium fixture before FAIL | FIXED / PASS |
| FR02 pointercancel commits moved mask | High | Chromium fixture before FAIL | FIXED / PASS |
| FR03 OCR from replaced image leaks suggestions into new image | High | Delayed Promise fixture FAIL | FIXED / PASS |
| FR04 Old image decode overwrites newer image | High | Delayed bitmap fixture FAIL | FIXED / PASS |
| FR05 Old async export completes after image change | High | Delayed toBlob fixture FAIL | FIXED / PASS |
| FR06 Original filename may contain personal data | Low | Direct source review | FIXED: generic filename |
| FR07 Browser TextDetector absent/false negatives | High | Experimental API only | OPEN / manual covers |
| FR08 Mobile OOM and keyboard accessibility | Medium | No quantitative data | OPEN |
| FR09 Real HTTP/CSP and production clipboard path | High release gate | Local navigation blocked | OPEN |

Offline regression old 1/6 → candidate 6/6, 5/5 existing unit tests, 0 observed JS errors in tested fixture contexts. Not representative real-world security effectiveness. Separate human review, CI real navigation, mobile and privacy-leak testing still required. Judge: conditional code-review pass; release NOT approved.

## Iteration 2 supplemental red-team review

| Finding | Severity | Reproduction & evidence | Status |
|---|---|---|---|
| FR10 stale export after mask edit | High | Delay `toBlob`, click Clear, release callback; old v0.2 produces downloadable outdated image | FIXED; delayed-export regression PASS locally |
| FR11 stale export after newly added mask | High | Begin PNG export, draw a second mask, release delayed `toBlob` | FIXED; no download, error notice shown |
| FR12 clipboard asynchronous completion | Medium | Start clipboard write, switch source, resolve write | PARTIAL; warns that clipboard may contain stale image; native write cannot be canceled once invoked |
| FR13 PNG source metadata/filename | Privacy check | Upload synthetic PNG containing private text chunk & sensitive filename; download | PASS; output contains neither original metadata nor filename |
| FR14 emulated touch redraw/export | Compatibility check | 390px Chromium mobile viewport, CDP touch drag, export and pixel verify | PASS in emulator only; real devices OPEN |

Judge phase: implementation and local regression support the fix, but this remains a single-assistant phased review. Shipping remains blocked on actual user/device validation, independent review and explicit owner approval. Do not represent a Chrome emulator as iPhone/Safari test.

## Post-release notes (2026-10-31)

PR #1 passed its synthetic and localhost browser checks and was owner-authorized to merge. Published through GitHub Pages success workflow. Open issues remain: independent security review, real iPhone Safari, real Android Chrome, and high-pixel-count memory/latency. Do not infer these have passed from CI.
