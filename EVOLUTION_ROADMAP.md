> 迁移说明：此文档保留早期迭代的测试与审查证据，现项目为独立仓库 `AIPMAndy/FreeRedact`。历史托管路径不代表当前网站；新版本需重新验收。

# EVOLUTION_ROADMAP — FreeRedact
2026-10-31. PR candidate, no automatic recurring work enabled.

**Five-step record:** (1) Question feature creep; focus on actual safe screenshot sharing. (2) Remove filename privacy risk and avoid new OCR dependencies. (3) Simplify with one gesture cancellation helper and image generations. (4) Fix five testable races/cancel bugs and rerun tests. (5) Introduce project CI after stabilizing baseline.

**Next work, by marginal user value**
1. Real HTTP browser smoke and iOS Safari/Android Chrome test; ensure CI green before merge/deploy.
2. Manual check warning for QR code, notification banners, avatars and filenames; test actual first-use completion.
3. Optional locally bundled Chinese OCR only after reliable recall benchmark, license and resource review.
4. Keyboard mask movement + accessibility check.
5. 4K–30MP mobile memory & P50/P95 export benchmark, recovery from failures.
6. Distinct product brand and independent repo after owner permission.

Any claim of 'global best' requires same-device multi-product benchmarks, user outcomes and independent safety review. No formal release without explicit user approval.

## Iteration 2 outcomes and next highest-value steps

- Verified stale-PNG bug when masks change during pending export; guarded exports with edit and image revision checks.
- Added 3 delayed-race tests plus synthetic mobile-touch/export and PNG metadata regression to CI. No additional runtime library dependency.
- **Next release gate:** complete PR CI; then obtain real iOS Safari and Android Chrome evidence for paste, drag, cancellation, download/share, large images and focus order.
- **Second gate:** evaluate memory peaks at 4K, 8K and max dimensions; implement safe limits based on empirical device observations.
- **Third gate:** independent reviewer (human/separate execution) and realistic user task studies; track mask misses and incomplete-redaction rate on consented fictional/authorized data.
- **Deferred:** local Chinese OCR and keyboard editing after the safety gates; evaluate model weight/license and OCR false-negative rates before proposing release.
- **Distribution:** no automatic merge/deploy. Existing main GitHub Pages tool remains v0.1 until owner approves a tested release.

## Current deployment after launch

v0.3 merged and GitHub Pages deployment successful on 2026-10-31. First next improvement is genuine external HTTP and iOS Safari/Android validation, then controlled maximum-size memory benchmarks. Independent security review remains an open release-hardening action; preserve all test fixtures and privacy warnings.
