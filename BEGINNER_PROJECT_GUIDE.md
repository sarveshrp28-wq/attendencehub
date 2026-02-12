# Attendance Hub: Beginner Project Guide

This file explains the codebase in plain language, so even if you are new to coding you can understand:

- what this app does
- which technologies it uses
- how data flows through it
- how each folder and file fits together

## 1. What this app is

Attendance Hub is a role-based web app for college attendance.

- Admin can manage students and attendance.
- Student can only see their own profile and attendance.
- Unknown users are blocked.

The app uses Supabase for:

- login/authentication
- database
- optional serverless functions (edge functions)

## 2. Tech stack (simple explanation)

- `React`:
  Frontend UI library. All pages/components are React files (`.jsx`).
- `Vite`:
  Fast development server + build tool.
- `Tailwind CSS`:
  Utility-first CSS framework for styling.
- `Supabase`:
  Backend platform (PostgreSQL database + Auth + Edge Functions).
- `React Router`:
  Page routing (`/admin/...`, `/student/...`).
- `React Hook Form + Yup`:
  Form handling and validation in admin forms.
- `date-fns`:
  Date formatting and date calculations.

## 3. High-level architecture

1. Browser loads `index.html`.
2. `src/main.jsx` mounts React app.
3. `AuthProvider` checks current login session from Supabase.
4. App decides user role:
   - admin
   - student
   - unknown
   - not logged in
5. React Router allows only matching routes using `ProtectedRoute`.
6. Pages call API helpers in `src/lib/api.js`.
7. API helpers talk to Supabase tables/views/RPC/functions.
8. Supabase RLS policies enforce final security at DB level.

## 4. Folder structure and purpose

```
ATTENDENCE HUB/
  index.html                  # HTML entry shell
  package.json                # scripts + dependencies
  vite.config.js              # Vite config
  tailwind.config.cjs         # Tailwind theme + colors + fonts
  postcss.config.cjs          # Tailwind/PostCSS setup
  README.md                   # quick setup notes
  ATTENDENCEHUB_PLAN.md       # planning document

  scripts/
    doctor.mjs                # environment + DB + function diagnostic script
    bootstrap-admin.mjs       # checks Google OAuth and prints login URL

  supabase/
    schema.sql                # tables, RLS, views, RPC functions
    functions/
      create-student/index.ts
      delete-student/index.ts
      send-password-reset/index.ts
      README.md

  src/
    main.jsx                  # React entry
    App.jsx                   # route definitions
    index.css                 # global styles, utility classes

    context/
      AuthContext.jsx         # login/session/role logic

    lib/
      supabaseClient.js       # Supabase client setup
      constants.js            # constants (roles, statuses, admin email)
      api.js                  # all backend calls + fallback logic
      attendance.js           # attendance helper logic
      formatters.js           # date/percent formatting helpers

    components/
      ProtectedRoute.jsx      # route guard by role
      LoadingScreen.jsx
      RoleGate.jsx
      layout/
        AdminLayout.jsx
        StudentLayout.jsx
      ui/
        Button.jsx
        Card.jsx
        EmptyState.jsx
        Pagination.jsx
        SectionHeader.jsx
        StatCard.jsx
        StatusPill.jsx

    pages/
      Login.jsx
      ForgotPassword.jsx
      ResetPassword.jsx
      Unauthorized.jsx
      NotFound.jsx
      admin/
        Dashboard.jsx
        Students.jsx
        StudentAdd.jsx
        StudentEdit.jsx
        StudentView.jsx
        Attendance.jsx
        AttendanceHistory.jsx
        Reports.jsx
      student/
        Dashboard.jsx
        Profile.jsx
        Attendance.jsx
        AttendanceCalendar.jsx
        Reports.jsx
        Settings.jsx

    utils/
      csv.js                  # CSV export utility
```

## 5. Authentication and role logic

Main role logic is in `src/context/AuthContext.jsx`.

### How role is detected

1. Load Supabase session.
2. If email matches `VITE_ADMIN_EMAIL`, role = `admin`.
3. Else find matching student where `students.user_id = auth user id`.
4. If not found, call DB RPC `claim_student_profile()`:
   - links first matching pre-created student row by email to this user id
   - supports first-time Google login
5. If still not found, role = `unknown`.

### Sign-in methods in code

- Google OAuth: `signInWithGoogle()`
- Email+password: `signInWithPassword()`

Note:
`README.md` describes Google-only access as the intended model, but UI currently includes both password and Google sign-in on `src/pages/Login.jsx`.

## 6. Routing and access control

All routes are in `src/App.jsx`.

- Public routes:
  - `/login`
  - `/forgot-password`
  - `/reset-password`
  - `/unauthorized`
- Admin protected routes under `/admin/...`
- Student protected routes under `/student/...`

`src/components/ProtectedRoute.jsx` blocks unauthorized access:

- if not logged in -> redirect `/login`
- if role mismatch -> redirect role home or `/unauthorized`

## 7. Database model (Supabase SQL)

Defined in `supabase/schema.sql`.

### Tables

- `public.students`
  - student profile
  - optional `user_id` link to `auth.users`
  - unique email, register number
- `public.attendance`
  - per-student, per-day attendance status
  - unique `(student_id, date)`

### Views/functions

- View `student_attendance_stats`
  - computed totals and percentage per student
- RPC `get_my_attendance()`
  - returns stats for logged-in student
- RPC `get_monthly_attendance(p_user_id, p_month)`
  - monthly stats (admin can query others; student gets own)
- RPC `claim_student_profile()`
  - link first matching email row to logged-in user
- Function `is_admin()`
  - checks JWT email against admin email

### Security (RLS)

- RLS is enabled on `students` and `attendance`.
- Admin has full CRUD via policies.
- Student can only `SELECT` own profile + own attendance.
- Student has no insert/update/delete permissions on attendance.

## 8. API layer in frontend

`src/lib/api.js` is the central place for data operations.

Examples:

- students:
  - `listStudents()`, `getStudentById()`, `createStudent()`, `updateStudent()`, `deleteStudent()`
- attendance:
  - `listAttendanceForDate()`, `upsertAttendance()`, `listAttendanceHistory()`
- stats:
  - `listStats()`, `getMyStats()`, `getMonthlyStats()`

### Smart fallback behavior

For some operations, code tries edge functions first, then falls back if function is not deployed:

- `create-student`
- `delete-student`
- `send-password-reset`

Fallback mode works, but has limits:

- deleting student may not remove auth user
- some flows rely on client-side alternatives

## 9. Edge functions

In `supabase/functions/*`.

- `create-student`:
  - admin-only
  - creates auth user + inserts student profile
  - optional welcome/reset email
- `delete-student`:
  - admin-only
  - deletes student row and linked auth user
- `send-password-reset`:
  - admin-only endpoint to trigger reset email

All functions validate requester email against `ADMIN_EMAIL`.

## 10. UI system

Styling comes from:

- `src/index.css` (custom component classes like `btn-primary`, `glass-panel`)
- Tailwind config in `tailwind.config.cjs` (theme colors, fonts, shadows)

Reusable UI components are in `src/components/ui/`.

Examples:

- `StatusPill` color-codes Present/Absent/Late/Excused
- `StatCard` for dashboard summary cards
- `Pagination` used on student attendance history

## 11. Feature walkthrough by role

### Admin features

- Dashboard (`src/pages/admin/Dashboard.jsx`)
  - total students
  - overall attendance
  - today summary
  - recent activity
- Students (`src/pages/admin/Students.jsx`)
  - list, search, view, edit, delete
  - send password reset
- Add Student (`src/pages/admin/StudentAdd.jsx`)
  - validation with React Hook Form + Yup
  - optional auto-generated password
  - optional welcome/reset email
- Edit Student (`src/pages/admin/StudentEdit.jsx`)
  - update profile fields
- Student View (`src/pages/admin/StudentView.jsx`)
  - profile + attendance snapshot + recent records
- Mark Attendance (`src/pages/admin/Attendance.jsx`)
  - set status per student per date
  - upsert saves unique row per day
- Attendance History (`src/pages/admin/AttendanceHistory.jsx`)
  - filters by date/class/status
- Reports (`src/pages/admin/Reports.jsx`)
  - summary + CSV export

### Student features

- Dashboard (`src/pages/student/Dashboard.jsx`)
  - attendance percentage
  - present days
  - streak
  - monthly stats
  - low attendance alert (<75%)
- Profile (`src/pages/student/Profile.jsx`)
  - read-only student details
- Attendance (`src/pages/student/Attendance.jsx`)
  - paginated attendance table
  - month filter
- Calendar (`src/pages/student/AttendanceCalendar.jsx`)
  - month grid with color-coded statuses
- Reports (`src/pages/student/Reports.jsx`)
  - monthly comparison vs previous month
  - CSV export for selected month
- Settings (`src/pages/student/Settings.jsx`)
  - change password
  - local notification preference (stored in browser localStorage)

## 12. Scripts and developer utilities

In `package.json`:

- `npm run dev` -> start Vite dev server
- `npm run build` -> production build
- `npm run preview` -> preview built output
- `npm run doctor` -> verify env + DB + RPC + edge functions + OAuth
- `npm run admin:bootstrap` -> verify Google OAuth and print sign-in URL
- `npm run supabase:deploy:functions` -> deploy edge functions via Supabase CLI

## 13. Environment variables

From `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`
- `VITE_SITE_URL`

Without the first two values, app fails on startup (`src/lib/supabaseClient.js`).

## 14. Important beginner notes

- `node_modules` and `dist` are generated folders; you usually do not read/edit them manually.
- DB security is not only frontend logic. RLS in SQL is the real protection layer.
- Role checks happen in both frontend and backend.
- If edge functions are missing, app can still run in fallback mode.
- Admin email must stay consistent across:
  - `.env` (`VITE_ADMIN_EMAIL`)
  - SQL `public.is_admin()`
  - edge function `ADMIN_EMAIL` secret

## 15. Mental model to remember

Think of this project as 3 layers:

1. React UI layer (`src/pages`, `src/components`)
2. Frontend service layer (`src/lib/api.js`)
3. Supabase backend layer (`supabase/schema.sql`, Auth, edge functions)

When a feature is broken, debug in this order:

1. UI event/form
2. API helper function
3. Supabase response / RLS / SQL function

