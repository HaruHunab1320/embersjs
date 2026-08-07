# REPORT_EMBERS — the one question
Date: 2026-08-06 · `main` 2f5b373, clean, pushed

- **Diagnosis CONFIRMED, both halves.** *Derived:* `computeDepth(practice, nowMs)`
  (`src/practices/depth.ts:55-58`) folds `substrate.artifacts` with recency decay and a
  pressure bonus (`:40-49`) — a pure fold over an append-only artifact list, called from 12
  sites (`metabolism/metabolize.ts:51`, `being/lifecycle.ts:78,98`, `practices/resolve.ts:53,76`,
  `practices/query.ts:17,37,48,62`, `being/self-model.ts:59`, `being/describe.ts:57`,
  `practices/attempt.ts:115,151`). *Stored:* `Drive.level` is a carried scalar advanced by
  `tickDrives` (`src/drives/tick.ts:16-29`, `applyDrift` per step) and `satiateDrives`
  (`src/drives/satiate.ts:21`), with one true in-place mutation at
  `src/being/apply-state.ts:74` (`targetDrive.level = sourceDrive.level`). Precise framing:
  `tickDrives`/`satiateDrives` are *pure step functions*, not sloppy mutation — the defect is
  that `level` is **stored rather than derived**, so there is no log to replay and `foldTo(t)`
  is impossible for drives while trivial for practices.

- **Event types drive-folding would need** (from `docs/design/v0.3/intention.md:345-356`, which
  already specifies this): a satiation event `{driveId, amount, source: event|action, atMs}`,
  a drift/tick event `{driveId, dtMs}` at a **declared step granularity**, and the
  `apply-state` transplant as an explicit event. Wear folds too — `chronicLoad` has the same
  defect (`:357`).

- **The repo is NOT parked — the gating work is done.** `src/golden.test.ts` (474 lines,
  24 cases, committed today as 2f5b373) exists *specifically* to gate this refactor; its
  header states it pins current behavior "so that folding that state over an event log (v0.3)
  can be proven behavior-preserving," and it deliberately pins exact values because "a golden
  test that tolerates drift cannot detect it." **This is the golden-fixture discipline
  mythopia still lacks.**

- **Embers holds the sharpest evidence for the platform's biggest open risk.**
  `intention.md:365-390` quantifies it: drifting 0.8 at −0.02/h for 30h gives
  `0.19999999999999959` incrementally vs `0.20000000000000007` closed-form — agreeing to ten
  decimals, falling on **opposite sides** of the 0.2 threshold, moving `chronicLoad` from
  19/24 to 18/24. Conclusion at `:388-390`: "any event-sourced projection over a clamped or
  thresholded numeric is sensitive to replay granularity, and the sensitivity is invisible to
  approximate comparison." This bears directly on `CHANGE_RECORD_SPEC` §12.2 (`clampedNumeric`
  non-commutativity) **and refutes the sufficiency of §8.3's `1e-9` tolerance**. The doc
  already files it against the spec at `:358-362` ("this is the same problem and should be
  settled once").

- **Is anything else blocked on it?** Within embers, yes: `intention.md:347-350` makes drive
  folding the prerequisite for the attribution chain ("why did it do that" → intention → drive
  at 0.3 → *dead end*), i.e. the v0.3 `latent/surfaced/committed` work. Outside embers, nothing
  imports it. **But the reverse dependency is the real one: the spec's `clampedNumeric`
  disposition should be settled using embers' numbers before mythopia's fold is extracted.**
  Recommend un-parking to the extent of feeding `intention.md:352-390` into the F1 disposition.
