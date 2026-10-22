# Bilsem Junior question-bank release — 22 October 2026

Published the owner-authorized, automatically verified batch `owner-20261022-complete` to the active Bilsem Junior database. Each grade has 2,000 questions covering all 44 topics and every difficulty allowed for that grade (2 / 3 / 4 / 6 levels). This is 2,000 total per grade, not 2,000 per topic or difficulty.

The batch was imported in the preceding task and was still in review. Its canonical database fingerprint matched the independently audited source before publication. Publication ran atomically with a content/revision guard, preserved the other 397 records byte for byte, and wrote a security event. After publication, a normalized content fingerprint still matched the source. The database contains 8,397 records: 8,000 published, 100 under review, and 297 drafts.

Automated acceptance: 8,000 independent solution and rendered-option checks, 8,000 unique stems/visuals/stimuli, 4,128 arithmetic checks and 3,520 selection scenarios; no failures. Topic-specific tests use the available distinct pool when fewer than the requested count exist. Mixed sessions can generate independently verified variants. Counts and limits are in `question-bank-release-20261022.json`.

Fixed a separate production failure: beginner verbal generation had only three short words (18 displayed permutations), so 30/45-question verbal sessions exhausted the pool. The expanded reading vocabulary uses the version `workshop-reading-1` and w4 question IDs. Saved workshop-3 content retains its original vocabulary and deterministic proof. The modern selector accepts the new version only for word_scramble_logic. Cryptogram generation is unchanged.

Regression coverage includes 30/45-question verbal sessions at both beginner levels and mixed difficulty, modern/older rendering formats, distinct displayed puzzles, exact difficulty quotas, old saved-question proofs and forged-version rejection. General tests: 438/438. Build gates: 73 startup tests, real Auth connectivity, 164 question tests and TypeScript. No paid AI requests were made.

This owner-authorized release does not assert individual educator review. Every released record retains `editorReview: pending`, `individualHumanReview: false` and no `reviewedBy`. V2 pilot records remain under review; PR #76 remains separate. SMTP delivery and authenticated real-account purchase flows are outside this release.
