---
type: feature-map
status: draft
feature: confirm-dialog
created: 2026-09-05
updated: 2026-09-05
source: crout-automations/src/app/components/confirm-dialog
---

# Feature Map: confirm-dialog

## Entry points

- `crout-automations/src/app/components/confirm-dialog/confirm-dialog.component.ts:1` — `ConfirmDialogComponent`, standalone Angular component, selector `ca-confirm-dialog`. Injects `ConfirmDialogService` (`confirm-dialog.component.ts:13`) and exposes it to the template as `dialog`.
- `crout-automations/src/app/components/confirm-dialog/confirm-dialog.component.html:1` — template. Renders only when `dialog.state()` is truthy (`*ngIf="dialog.state()"`, line 2). Backdrop click and Escape key both call `dialog.cancel()` (lines 7–8); a click inside the modal stops propagation (line 10) so it doesn't dismiss.
- `crout-automations/src/app/components/confirm-dialog/confirm-dialog.component.scss:1` — styles for backdrop/modal/buttons; no logic.
- Single mount point in the whole app: `crout-automations/src/app/app.component.ts:22` (`<ca-confirm-dialog />`), imported at `app.component.ts:9,15`. This is the only place the component is instantiated — one dialog instance serves the whole app via the shared service's signal state.

## Data flow

- State/service: `crout-automations/src/app/services/confirm-dialog.service.ts:11` — `ConfirmDialogService`, `providedIn: 'root'` singleton. Holds a single `signal<ConfirmDialogState | null>` (`confirm-dialog.service.ts:12`).
- `ConfirmDialogState` shape (`confirm-dialog.service.ts:3-8`): `title`, `message`, `confirmLabel`, and a `resolve` callback captured from the Promise executor.
- `open(title, message, confirmLabel = 'Delete')` (`confirm-dialog.service.ts:14-18`) returns a `Promise<boolean>` and sets `state` — this is the only way to trigger the dialog; there is no queueing, so a second `open()` call while one is pending overwrites `state` and orphans the first Promise (never resolved/rejected).
- `confirm()` (`confirm-dialog.service.ts:20-23`) resolves the pending promise `true` and clears `state` to `null`.
- `cancel()` (`confirm-dialog.service.ts:25-28`) resolves `false` and clears `state`.
- Consumers all follow the same pattern: `const confirmed = await this.confirm.open(title, message[, confirmLabel]); if (!confirmed) return; /* proceed with destructive action */`.
- Callers (4 found via `inject(ConfirmDialogService)`):
  - `crout-automations/src/app/pages/admin/companies/admin-companies.component.ts:21` (injected as `confirm`), used at `admin-companies.component.ts:141-144` in `onDelete()` — deletes a company, default `confirmLabel` ('Delete').
  - `crout-automations/src/app/pages/admin/users/admin-users.component.ts:21` (injected as `confirm`), used at `admin-users.component.ts:121-124` in `onDelete()` — deletes a user, default `confirmLabel`.
  - `crout-automations/src/app/pages/admin/dev-management/admin-dev-management.component.ts:29` (injected as `confirm`), used at `admin-dev-management.component.ts:202-205` in `onDelete()` — deletes a dev-service assignment, default `confirmLabel`.
  - `crout-automations/src/app/pages/admin/release-notes/admin-release-notes.component.ts:22` (injected as `confirmDialog`), used at `admin-release-notes.component.ts:103-107` in `deleteReleaseNote()` — deletes a release note, explicit `confirmLabel: 'Delete'` passed as 3rd arg.
- All four call sites are "delete" confirmations gating an HTTP call via `AdminService` (`.subscribe({ next, error })`); none pass a custom `confirmLabel` other than the release-notes one, which passes the same default value explicitly.

## External dependencies

- `@angular/core` — `Component`, `inject`, `Injectable`, `signal` (`confirm-dialog.component.ts:1`, `confirm-dialog.service.ts:1`).
- `@angular/common` — `CommonModule` for `*ngIf` (`confirm-dialog.component.ts:2,8`).
- No HTTP, no router, no third-party UI library involvement inside the confirm-dialog feature itself — it's decoupled from what triggers it. Note `admin-release-notes.component.ts` also uses Angular Material's `MatDialog` (`admin-release-notes.component.ts:23`) for a *different*, unrelated dialog (`ReleaseNotesDialogComponent`/`ReleaseNoteFormDialogComponent` via `footer.component.ts:49` and `admin-release-notes.component.ts:70,84`) — do not conflate that with `ca-confirm-dialog`.

## Riskiest files

- `crout-automations/src/app/services/confirm-dialog.service.ts` — single global `state` signal with no queue/stack. If two callers call `open()` in quick succession (e.g., a double-click before the first dialog resolves), the first Promise's `resolve` is silently dropped when `state` is overwritten, leaking a never-settled Promise and desyncing the caller's `await`. `[UNVERIFIED]` whether any current caller can trigger this in practice — no evidence of concurrent `open()` calls in the 4 sites found, but nothing in the code prevents it.
- `confirm-dialog.component.html` — the dialog's only escape hatches are Escape key and backdrop click, both mapped to `cancel()`; there's no focus trap or `autofocus` on the buttons `[UNVERIFIED]` (not present in template — worth checking if accessibility/keyboard-tab behavior matters for your update).
- Each of the 4 call sites duplicates the same `await ... ; if (!confirmed) return;` boilerplate — a systemic pattern, so a signature change to `open()` (e.g., adding a param) touches all 4 files identically.

## TODO/FIXME clusters

None found.

## Dead-code candidates

None found — component, service, and all 4 consumers are wired and reachable; the single mount in `app.component.ts:22` is live (rendered in `AppComponent`'s template, which bootstraps the whole app shell).
