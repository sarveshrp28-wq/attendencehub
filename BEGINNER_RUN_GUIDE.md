# Attendance Hub: Beginner Run Guide

This guide is a practical step-by-step setup and run manual.
It includes the exact Windows PowerShell method used in your environment.

## 1. Prerequisites

Install these first:

- Node.js 18+ (includes npm)
- A Supabase project (free tier is enough)
- Git (optional, if cloning from repo)

Check versions:

```powershell
node -v
npm -v
```

## 2. Open project folder

```powershell
cd "c:\Users\sarvesh\Downloads\attendencehub\ATTENDENCE HUB"
```

## 3. Install dependencies

In normal shells:

```bash
npm install
```

If PowerShell blocks npm scripts (common on Windows), use:

```powershell
npm.cmd install
```

## 4. Create `.env`

Copy `.env.example` to `.env`, then fill values.

Required keys:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ADMIN_EMAIL=attendencehub@gmail.com
VITE_SITE_URL=http://localhost:5173
```

Where to get values:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase project settings.
- `VITE_ADMIN_EMAIL` should be your admin login email.
- `VITE_SITE_URL` is your app URL during development.

## 5. Configure Supabase database

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.

This creates:

- `students` table
- `attendance` table
- RLS policies
- stats view
- RPC functions used by app

## 6. Configure Supabase Auth

Minimum:

- Enable Email auth (password sign-in).

If using Google sign-in:

- Enable Google provider in Supabase Auth.
- Add redirect/site URL:
  - `http://localhost:5173` for local dev

## 7. Optional but recommended checks

Run environment diagnostics:

```powershell
npm.cmd run doctor
```

Run OAuth bootstrap helper:

```powershell
npm.cmd run admin:bootstrap
```

## 8. Optional: deploy edge functions

App can run without these (fallback mode), but full automation is better with deployment.

Set required secrets in Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL` (optional override)

Then deploy:

```powershell
npm.cmd run supabase:deploy:functions
```

## 9. Start dev server (exact method used here)

In this environment, PowerShell blocked `npm` (`npm.ps1` execution policy issue), so this command was used:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Then open:

- `http://127.0.0.1:5173`

## 10. Login and test quickly

### Admin test

1. Log in with admin email (`VITE_ADMIN_EMAIL`).
2. Go to `/admin/students`.
3. Add a student.
4. Go to `/admin/attendance` and mark attendance.

### Student test

1. Log in using the student account.
2. Check `/student/dashboard`.
3. Check `/student/attendance`.

## 11. Other useful commands

Build production files:

```powershell
npm.cmd run build
```

Preview production build locally:

```powershell
npm.cmd run preview
```

## 12. How to stop the running app

If running in current terminal, press:

- `Ctrl + C`

If started in background and you know PID:

```powershell
Stop-Process -Id <PID>
```

## 13. Common errors and fixes

### Error: `npm.ps1 cannot be loaded because running scripts is disabled`

Use:

```powershell
npm.cmd run dev
```

instead of:

```powershell
npm run dev
```

### Error: Missing Supabase config

Cause:
- `.env` missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.

Fix:
- fill correct values and restart dev server.

### Error: Unauthorized / redirected to `/unauthorized`

Cause:
- user email is not admin and not linked to a student row.

Fix:
- add student in admin panel with exact same email used for login.

### Student deletion warning about fallback mode

Cause:
- edge function `delete-student` not deployed.

Fix:
- deploy edge functions (recommended), or accept limited fallback behavior.

## 14. One-command quick start summary (after `.env` and SQL are ready)

```powershell
npm.cmd install
npm.cmd run doctor
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

