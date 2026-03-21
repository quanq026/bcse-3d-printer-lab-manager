# Enterprise Readiness And UX Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the project from a working internal app to a more enterprise-ready product by improving password/session safety, role-based UX, user feedback quality, placeholder flows, and quality gates for Student, Moderator, and Admin users.

**Architecture:** Keep the existing React + Express + SQLite structure, but harden behavior in small vertical slices. Focus each task on one user-facing outcome, preserve current patterns where possible, and only introduce narrowly-scoped new utilities when they reduce duplicated risk across pages.

**Tech Stack:** React 19, TypeScript, Vite, Express, better-sqlite3, bcryptjs, JWT, Zod, Tailwind, motion

---

## File Structure

**Likely files to modify**
- `C:\QuanNewData\bcse-3d-printer-lab-manager\server\index.ts`
  Purpose: auth/session rules, role checks, API behavior, activity log updates
- `C:\QuanNewData\bcse-3d-printer-lab-manager\server\validation.ts`
  Purpose: request schemas for password, settings, and UI-facing safe mutations
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\contexts\AuthContext.tsx`
  Purpose: current user bootstrap, logout/session refresh behavior after password changes
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\lib\api.ts`
  Purpose: typed API client for new session and UX-safe endpoints
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\App.tsx`
  Purpose: route metadata and role-aware page framing
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\Sidebar.tsx`
  Purpose: role navigation and settings discoverability
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminSettings.tsx`
  Purpose: split personal security vs admin system settings UX
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\JobDetail.tsx`
  Purpose: remove misleading placeholder UX for students
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\ModeratorQueue.tsx`
  Purpose: replace blocking alerts/confirms in a high-frequency workflow
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminUsers.tsx`
  Purpose: replace blocking alerts/confirms for user administration
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminInventory.tsx`
  Purpose: align admin feedback patterns with the new UX baseline
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminPrinters.tsx`
  Purpose: align admin feedback patterns with the new UX baseline
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\BackupPage.tsx`
  Purpose: align backup success and failure feedback with enterprise UX
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\lib\uiText.ts`
  Purpose: role-aware labels, password UX copy, status/toast copy, placeholder cleanup
- `C:\QuanNewData\bcse-3d-printer-lab-manager\package.json`
  Purpose: add lint/test/smoke scripts and fix cross-platform scripts
- `C:\QuanNewData\bcse-3d-printer-lab-manager\README.md`
  Purpose: document new operational expectations and commands
- `C:\QuanNewData\bcse-3d-printer-lab-manager\.env.example`
  Purpose: keep environment docs aligned with real behavior

**Likely new files**
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\feedback\AppToast.tsx`
  Purpose: reusable toast presenter
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\feedback\ConfirmDialog.tsx`
  Purpose: reusable non-blocking confirmation modal
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\feedback\useToast.ts`
  Purpose: small hook for page-level success/error messages
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\PasswordStrengthHint.tsx`
  Purpose: inline password rules for self-service and managed password changes
- `C:\QuanNewData\bcse-3d-printer-lab-manager\eslint.config.js` or equivalent project lint config
  Purpose: basic lint gate
- `C:\QuanNewData\bcse-3d-printer-lab-manager\vitest.config.ts`
  Purpose: lightweight unit/smoke test harness
- `C:\QuanNewData\bcse-3d-printer-lab-manager\src/lib/session.ts`
  Purpose: central token invalidation helpers if needed
- `C:\QuanNewData\bcse-3d-printer-lab-manager\tests\` or `C:\QuanNewData\bcse-3d-printer-lab-manager\src\__tests__\`
  Purpose: smoke coverage for role access, password flows, and placeholder regressions

---

### Task 1: Add Session Invalidation After Password Changes

**Files:**
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\server\index.ts`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\contexts\AuthContext.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\lib\api.ts`
- Test: `C:\QuanNewData\bcse-3d-printer-lab-manager\tests\auth\password-session.test.ts`

- [ ] **Step 1: Define the invalidation strategy**

Document and implement one minimal rule:
- store `token_version` or `password_updated_at` on users
- include it in JWT payload
- reject old tokens when the stored value no longer matches

- [ ] **Step 2: Write the failing backend session test**

```ts
it('rejects an old token after the user changes password', async () => {
  const token = await loginAsSeedUser();
  await changeOwnPassword(token, 'OldPass123', 'NewPass123');
  const res = await fetchMe(token);
  expect(res.status).toBe(401);
});
```

- [ ] **Step 3: Add the persistence field and JWT comparison**

Implement minimal server changes in `server/index.ts`:
- add migration for the chosen invalidation field
- include it in `jwt.sign`
- compare it in `requireAuth`
- bump it on `POST /api/auth/change-password`
- bump it on `PATCH /api/users/:id/password`

- [ ] **Step 4: Log the user out cleanly on self password change**

Update the frontend so a successful self password change:
- clears `lab_token`
- resets auth context
- redirects the user to login with a success explanation

- [ ] **Step 5: Keep Admin-managed password updates explicit**

When Admin resets another staff account:
- show success text that the target must log in again
- do not auto-logout the acting Admin

- [ ] **Step 6: Run verification**

Run:
```powershell
npx tsc --noEmit
npm run build
```

Expected:
- pass
- old tokens fail after password change

- [ ] **Step 7: Commit**

```powershell
git add server/index.ts src/contexts/AuthContext.tsx src/lib/api.ts tests/auth/password-session.test.ts
git commit -m "feat: invalidate sessions after password changes"
```

### Task 2: Split Settings UX Into Personal Security And Admin System Settings

**Files:**
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminSettings.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\App.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\lib\uiText.ts`
- Test: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\__tests__\AdminSettings.test.tsx`

- [ ] **Step 1: Write failing UI expectations for role framing**

```tsx
it('shows personal security framing for students', () => {
  render(<AdminSettings />, { role: 'Student' });
  expect(screen.getByText(/đổi mật khẩu cho chính bạn/i)).toBeInTheDocument();
  expect(screen.queryByText(/điều chỉnh thông tin hỗ trợ/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Separate header/content states by role**

Refactor `AdminSettings.tsx` so:
- Student sees only personal security
- Moderator sees only personal security
- Admin sees personal security first, then system settings, then managed password tools

- [ ] **Step 3: Fix page meta in `App.tsx`**

For `activePage === 'settings'`:
- if role is Student or Moderator, use profile/security note
- if role is Admin, keep system settings note

- [ ] **Step 4: Normalize strings in `uiText.ts`**

Add or revise:
- personal security eyebrow/title/note
- managed password copy
- password success/error copy
- role-aware settings note

- [ ] **Step 5: Add inline password guidance**

Display password requirements directly under the password fields instead of relying on backend errors only.

- [ ] **Step 6: Run verification**

Run:
```powershell
npx tsc --noEmit
npm run build
```

Expected:
- pass
- each role sees only the settings content that matches their scope

- [ ] **Step 7: Commit**

```powershell
git add src/pages/AdminSettings.tsx src/App.tsx src/lib/uiText.ts src/pages/__tests__/AdminSettings.test.tsx
git commit -m "feat: separate personal security from admin settings"
```

### Task 3: Replace Blocking Alerts And Confirms With Reusable Feedback Components

**Files:**
- Create: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\feedback\AppToast.tsx`
- Create: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\feedback\ConfirmDialog.tsx`
- Create: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\feedback\useToast.ts`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\ModeratorQueue.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminUsers.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminInventory.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\AdminPrinters.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\BackupPage.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\JobDetail.tsx`
- Test: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\components\feedback\__tests__\feedback.test.tsx`

- [ ] **Step 1: Implement a minimal toast API**

Create a small pattern:
- success toast
- error toast
- dismiss behavior

- [ ] **Step 2: Implement a minimal confirm modal**

Support:
- title
- body
- destructive confirm button
- cancel button
- keyboard close

- [ ] **Step 3: Replace the highest-frequency blocking flows first**

Start with:
- moderator status change
- admin delete user
- job cancel

- [ ] **Step 4: Replace remaining admin alerts**

Move backup, inventory, and printer success/error handling to toasts.

- [ ] **Step 5: Add one interaction test**

```tsx
it('shows a confirmation dialog instead of calling window.confirm', async () => {
  render(<ModeratorQueue />);
  await user.click(screen.getByRole('button', { name: /approve/i }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

- [ ] **Step 6: Run verification**

Run:
```powershell
npx tsc --noEmit
npm run build
```

Expected:
- pass
- no `alert()`/`confirm()` calls remain in the targeted pages

- [ ] **Step 7: Commit**

```powershell
git add src/components/feedback src/pages/ModeratorQueue.tsx src/pages/AdminUsers.tsx src/pages/AdminInventory.tsx src/pages/AdminPrinters.tsx src/pages/BackupPage.tsx src/pages/JobDetail.tsx
git commit -m "feat: replace blocking browser dialogs with in-app feedback"
```

### Task 4: Remove Misleading Student Placeholders In Job Detail

**Files:**
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\JobDetail.tsx`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\lib\uiText.ts`
- Test: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\pages\__tests__\JobDetail.test.tsx`

- [ ] **Step 1: Decide the safe interim UX**

Preferred approach:
- hide the `messages` and `payment` tabs until they are real
- or mark them as informational panels, not actions

Use YAGNI:
- if the backend flow is not real, do not present it as interactive functionality

- [ ] **Step 2: Write the failing student expectation**

```tsx
it('does not show unfinished payment and message tabs for students', () => {
  render(<JobDetail job={job} onBack={vi.fn()} />);
  expect(screen.queryByText(/qr code/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Refactor the tabs**

Implement one of:
- role-aware tab visibility
- feature-flag style visibility
- converted informational card with accurate language

- [ ] **Step 4: Replace placeholder wording**

If any panel remains visible, change copy from “coming soon” to exact current state, for example:
- “Use the Chat page for discussion about this request.”
- “Payment summary is shown here; online payment is not enabled.”

- [ ] **Step 5: Run verification**

Run:
```powershell
npx tsc --noEmit
npm run build
```

Expected:
- pass
- no false promise UX in Student `JobDetail`

- [ ] **Step 6: Commit**

```powershell
git add src/pages/JobDetail.tsx src/lib/uiText.ts src/pages/__tests__/JobDetail.test.tsx
git commit -m "fix: remove misleading placeholder flows from job detail"
```

### Task 5: Add Basic Quality Gates And Cross-Platform Scripts

**Files:**
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\package.json`
- Create: `C:\QuanNewData\bcse-3d-printer-lab-manager\eslint.config.js`
- Create: `C:\QuanNewData\bcse-3d-printer-lab-manager\vitest.config.ts`
- Create: `C:\QuanNewData\bcse-3d-printer-lab-manager\src\__tests__\smoke.test.ts`
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\README.md`

- [ ] **Step 1: Add cross-platform script replacements**

Replace:
- `start` Unix-only env assignment
- `clean` using `rm -rf`

With cross-platform equivalents such as:
- `cross-env NODE_ENV=production tsx server/index.ts`
- `rimraf dist`

- [ ] **Step 2: Add lint config**

Set up a minimal lint baseline:
- unused imports/variables
- accidental `console` in production code policy
- React hooks safety

- [ ] **Step 3: Add a smoke test harness**

Keep first tests small:
- one auth utility smoke
- one role-aware settings render smoke
- one job detail placeholder smoke

- [ ] **Step 4: Add scripts**

In `package.json`, add:
- `lint`
- `test`
- `test:watch` if helpful

- [ ] **Step 5: Document the local quality gate**

Update README with:
- install
- build
- lint
- test
- production start notes for Windows/PowerShell

- [ ] **Step 6: Run verification**

Run:
```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

Expected:
- all pass

- [ ] **Step 7: Commit**

```powershell
git add package.json eslint.config.js vitest.config.ts src/__tests__/smoke.test.ts README.md
git commit -m "chore: add quality gates and cross-platform scripts"
```

### Task 6: Review Student, Moderator, And Admin Happy Paths End-To-End

**Files:**
- Modify: `C:\QuanNewData\bcse-3d-printer-lab-manager\README.md`
- Create: `C:\QuanNewData\bcse-3d-printer-lab-manager\docs\role-smoke-checklist.md`
- Test: manual role checklist or Playwright notes if later automated

- [ ] **Step 1: Write a role-based smoke checklist**

Create sections for:
- Student
- Moderator
- Admin

Each should cover:
- login
- primary task
- settings/password
- one destructive or edge action
- logout

- [ ] **Step 2: Add student pain-point checks**

Explicitly verify:
- booking completion
- understanding queue status
- job detail clarity
- self password change

- [ ] **Step 3: Add moderator pain-point checks**

Explicitly verify:
- queue triage speed
- quote update
- revision request
- password change

- [ ] **Step 4: Add admin pain-point checks**

Explicitly verify:
- user moderation
- managed password reset
- settings persistence
- backup creation/download

- [ ] **Step 5: Document release readiness criteria**

Add a small “ready to ship” checklist:
- build clean
- lint clean
- tests clean
- role smoke checks complete
- no placeholder user-facing flows remain

- [ ] **Step 6: Commit**

```powershell
git add docs/role-smoke-checklist.md README.md
git commit -m "docs: add role-based release checklist"
```

## Final Verification Pass

- [ ] Run full local gate:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

- [ ] Manually validate:
- Student can change own password and sees personal settings framing
- Moderator can change own password and cannot manage others
- Admin can change own password and manage Admin/Moderator passwords
- Old tokens fail after password changes
- No critical flow uses blocking browser dialogs in targeted screens
- Student `JobDetail` no longer implies unsupported functionality

- [ ] Prepare concise rollout notes in:
`C:\QuanNewData\bcse-3d-printer-lab-manager\README.md`

## Notes For The Implementer

- Keep changes vertical and role-focused; do not refactor the whole backend yet.
- Avoid broad `server/index.ts` surgery unless needed for the current task.
- Do not introduce heavy state management libraries for toast/dialog UX.
- Prefer additive smoke tests over ambitious full e2e coverage in the first pass.
- Preserve existing visual language; improve clarity, not theme identity.
