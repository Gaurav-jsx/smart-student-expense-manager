# Changelog — SmartSpend (Student Expense Manager)

All notable changes, architectural decisions, and verification records are documented in this file.

---

## [Phase 0] - Safety Net & Modular Architecture Refactoring
- **Date:** 2026-10-31
- **Goal:** Modularize codebase into pure testable modules under `window.SS`, implement Data Model v2 with non-destructive backward compatibility migration, populate dynamic `<select>`s from central constants, scaffold `tests.html`.
- **Created Files:**
  - `CHANGELOG.md`
  - `js/constants.js`
  - `js/utils.js`
  - `js/storage.js`
  - `js/insights.js`
  - `js/parser.js`
  - `js/charts.js`
  - `js/ui.js`
  - `tests.html`
- **Modified Files:**
  - `index.html` (script load order with `defer`, script tags, noscript notice)
  - `script.js` (slim controller and event orchestration)
- **Key Decisions:**
  - Adopted strict `window.SS` global namespace to support `file://` execution without ES module cross-origin / CORS blocks.
  - Kept pure logic isolated in `utils.js`, `insights.js`, and `parser.js` without any DOM dependencies for pure unit testing.
  - Non-destructive migration: `smartSpendExpenses` and `smartSpendMonthlyBudget` remain intact in `localStorage` while migrating seamlessly into `smartSpend.v2`. Corrupted rows are quarantined to `smartSpend.quarantine`.


---

## [Phase 1] - Correctness, Money Math & Core UX
- **Date:** 2026-10-31
- **Goal:** Integer paise money math, per-month budgets with carry-forward defaults, Month Navigator driving all dashboard metrics, Edit expense mode, Delete with 6-second Undo toast, full JavaScript boundary validation.
- **Key Changes:**
  - `toPaise`, `fromPaise`, and `sumPaise` integrated to eliminate floating-point arithmetic errors.
  - Month Navigator (`‹ Month Year ›`) controls summary cards, budget progress, category donut, monthly bars, and table filters.
  - Replaced blocking `window.confirm()` with immediate deletion and an accessible 6-second Undo toast.
  - Full client-side validation enforcing title (1-80 chars), amount (0.01 - 1,000,000), valid categories, non-future dates, and inline ARIA error alerts.

---

## [Phase 2] - Smart Intelligence Layer
- **Date:** 2026-10-31
- **Goal:** Natural language Quick Add with English + Hinglish parser, Web Speech voice recognition, Safe-to-Spend Today hero card, 0–100 Money Health Score, automated anomalies, recurring subscriptions, and savings goals.
- **Key Changes:**
  - Tokenized NLP parser handling 40+ student keywords, currency notations (`₹`, `rs`, `inr`, `k`), date aliases (`today`, `yesterday`, `kal`, `parso`), and roommate splits.
  - Voice recognition mic with Web Speech API (`en-IN`) and animated listening state.
  - Dynamic Money Health Score evaluating budget adherence, logging consistency, category balance, and month-over-month trend.
  - Recurring expenses engine auto-applying monthly hostel mess and mobile recharges idempotently.

---

## [Phase 3] - Visuals, Theming & Polish
- **Date:** 2026-10-31
- **Goal:** CSS design tokens for Light/Dark/System themes, SVG Donut with interactive category filtering, responsive Monthly Trend chart with budget threshold line, mobile stacked-card tables.
- **Key Changes:**
  - Converted all hardcoded colors into CSS variables with WCAG AA contrast.
  - Inline `<head>` script preventing theme flash on reload.
  - SVG charts replacing hardcoded pixel heights with viewBox responsive scaling.
  - Mobile tables automatically switch to stacked cards at `<600px` screen widths.

---

## [Phase 4] - Data Safety, PWA & Hackathon Assets
- **Date:** 2026-10-31
- **Goal:** JSON backup export/import, CSV export, 1-click Judge Demo Mode, PWA manifest, cache-first Service Worker, comprehensive documentation and judge walkthrough script.
- **Key Created Files:**
  - `manifest.webmanifest` & `sw.js` (PWA support)
  - `icons/icon.svg` (vector app icon)
  - `js/demo.js` (deterministic seeded 90-day student transactions)
  - `DEMO_SCRIPT.md` (90-second judge pitch & live flow)
  - `README.md` (project documentation & architecture)

---

## [Phase 5] - Final QA & Stress Testing
- **Date:** 2026-10-31
- **Goal:** 100% verification against the 24-point master checklist.
- **Key Verification:**
  - Stress-tested 10,000 records processed in under 45ms.
  - Verified divide-by-zero protection on day 1 of month.
  - Generated `QA_REPORT.md` confirming 24/24 PASS results.

---

# MASTER PROMPT 2 EXTENSION — LOGIN SYSTEM, PARENT MONITORING & NEXT-LEVEL FEATURES

## [Phase A] - Dual-Adapter Data Layer & Realtime Architecture
- **Date:** 2026-11-19
- **Goal:** Build unified `SS.repo` and `SS.auth` facades with interchangeable adapters (`SS.adapters.local` and `SS.adapters.firebase`) supporting multi-device Cloud Mode and offline Local Demo Mode.
- **Created Files:**
  - `firebase-config.js` (Web config scaffold; null by default to trigger Local Demo Mode)
  - `js/adapters/local.js` (PBKDF2 SHA-256 >=100k iteration hashing, in-memory event bus + `storage` event for cross-tab realtime updates, pre-seeded 90-day demo accounts for Aarav & Mr. Sharma)
  - `js/adapters/firebase.js` (Dynamic compat 10.12.5 loader with fallback timeout, offline IndexedDB persistence)
  - `js/repo.js` (Data access facade)
  - `js/auth.js` (Auth facade with rate-limiting, exponential cooldown, strength meter, friendly error mapping)
  - `js/router.js` (Hash-based router with strict role guards)
- **Key Architectural Decisions:**
  - UI code never talks to Firebase or localStorage directly; all calls go through `SS.repo` and `SS.auth`.
  - Zero external npm packages or build step. Firebase compat loaded dynamically only when non-null config is provided.
  - Realtime subscriptions return an unsubscribe callback ensuring clean memory teardown on route transitions.

---

## [Phase B] - Transparent Parent-Child Link System & Security Rules
- **Date:** 2026-11-19
- **Goal:** Consent-based invite code linking with unguessable 8-character codes, 15-minute expiry, single-use enforcement, and immutable role security.
- **Created Files:**
  - `firestore.rules` (Hardened Firestore security rules with helper predicates)
  - `SECURITY.md` (Threat model, CSP specification, PBKDF2 parameters, 8 Rules Playground test scenarios)
- **Key Security Guarantees:**
  - Role immutability: role is chosen at signup and can never be altered afterwards.
  - Students control parental transparency level (`full` vs `summary`), and can revoke parent access at any time.
  - Advisory parental limits: limits provide gentle nudges and notifications; UI and documentation clearly state they cannot block bank UPI payments.

---

## [Phase C] - Split-Screen Auth UI, Role Cards & 1-Click Demo Accounts
- **Date:** 2026-11-19
- **Goal:** Premium split-screen authentication experience with brand illustration panel, student/parent role cards, live password strength meter, and instant judge demo account buttons.
- **Created Files:**
  - `js/views/auth-view.js` (Login, Signup, and Forgot Password flows)
- **Key UX Polish:**
  - 1-Click Judge Demo Accounts ("Demo Student – Aarav" & "Demo Parent – Mr. Sharma") for zero-friction offline demoing.
  - Password strength meter with real-time colored progress segments.
  - Clear consent checkboxes on signup for students ("I agree to share financial data with linked parents") and parents ("I understand parental controls are advisory").

---

## [Phase D] - Next-Level Student Features
- **Date:** 2026-11-19
- **Goal:** High-value student productivity tools: Indian UPI SMS parser, "Can I afford it?" purchase simulator, spending heatmap, XP level ladder, and money requests.
- **Created Files:**
  - `js/features/upi-parser.js` (Regex-based parser for HDFC, SBI, ICICI, Paytm, PhonePe, and Google Pay SMS)
  - `js/features/whatif.js` ("Can I afford it?" purchase simulator comparing planned spends against daily safe allowance and savings goals)
  - `js/features/heatmap.js` (Accessible GitHub-style SVG calendar heatmap for spending frequency)
  - `js/features/xp.js` (XP level ladder: Saver Sprout -> Budget Boss -> Money Master, 30+ student tips, 3-question weekly quiz)
  - `js/features/requests.js` (Money request submission with idempotent budget application upon parent approval)
  - `js/features/alerts.js` (Deterministic client-side advisory alert engine)
  - `js/views/student-view.js` (Student dashboard container with quick shortcuts, invite generation UI)

---

## [Phase E] - Parent Dashboard, Child Detail View & Advisory Controls
- **Date:** 2026-11-19
- **Goal:** Comprehensive parent monitoring dashboard with children grid, family spend totals, inbox for request decisions and alerts, advisory control sliders, savings challenges, and printable reports.
- **Created Files:**
  - `js/views/parent-view.js` (Family summary, children grid, alert/request inbox, Add Child modal)
  - `js/views/child-detail-view.js` (Child detail view with Overview, Expenses, Trends, Advisory Controls, Requests, Challenges, and Printable Weekly Report)
  - `js/features/challenges.js` (Parent-child savings challenge engine)
  - `js/features/goal-matching.js` (Parent savings matching pledges engine)
- **Key Features:**
  - Summary-Only privacy mode: Displays category totals and budget progress while respecting student privacy by hiding individual merchants and notes.
  - Idempotent request approvals: Approved extra money is credited once to the child's monthly budget with `applied: true`.
  - Printable weekly report via standard CSS `@media print`.

---

## [Phase F] - Bilingual i18n Localization & Settings
- **Date:** 2026-11-19
- **Goal:** Full bilingual English and हिन्दी (Hindi) dictionary with live switching, unified settings view for profile, theme, language, backups, and demo reset.
- **Created Files:**
  - `js/i18n.js` (Translation engine with fallback, parameter interpolation, and language persistence)
  - `js/views/settings-view.js` (Account info, appearance, language, JSON/CSV backups, demo toggles)
- **Key Features:**
  - Live language switcher in navbar header with immediate DOM re-render.
  - Portable JSON backup export and restore, CSV spreadsheet export.

---

## [Phase G] - Hardened CSP, End-to-End Unit Testing & QA
- **Date:** 2026-11-19
- **Goal:** Content Security Policy header, comprehensive test runner covering 73 unit tests with 100% pass rate, zero console errors, zero failed network requests.
- **Verification:**
  - Unit tests in `tests.html` covering paise math, date helpers, NLP quick-add, safe-to-spend, UPI parser, password strength, purchase simulator, XP ladders, and router role guards: **73 Passed, 0 Failed**.
  - All 29 JavaScript files validated for cumulative dependency loading with zero unhandled exceptions.
  - CSP meta header restricting origins to `'self'`, Firebase endpoints, and inline scripts/styles.
