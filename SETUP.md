# SSYG Fund Manager - Setup Guide

## Running Locally (Dev Server)

```powershell
cd C:\Users\BhagyaShah_Local\projects\sambhav-funds
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx next dev
```

Open http://localhost:3000 in your browser.

---

## Supabase Setup (One-Time)

### 1. Create Project

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Name: `sambhav-funds`
4. Set a database password (save it)
5. Region: South Asia (Mumbai) or closest
6. Wait for provisioning to complete

### 2. Run Database Migration

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Open `supabase/migrations/001_initial_schema.sql` from this project
4. Copy-paste the entire content into the SQL editor
5. Click **Run** — this creates all tables, indexes, RLS policies, and seed data

### 3. Create Your Admin User

1. Go to **Authentication → Users** in Supabase dashboard
2. Click **Add user → Create new user**
3. Set email and password (this is your login)
4. After user is created, copy the User UID shown
5. Go to **SQL Editor** and run:

```sql
INSERT INTO members (name, email, phone, role, auth_user_id)
VALUES (
  'Your Name',
  'your-email@example.com',
  '9876543210',
  'admin',
  'paste-the-user-uid-here'
);
```

### 4. Update Environment Variables

1. Go to **Settings → API** in Supabase dashboard
2. Copy "Project URL" and "anon public" key
3. Edit `.env.local` in this project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key
```

4. Restart the dev server (Ctrl+C, then `npx next dev`)

### 5. Test Login

1. Open http://localhost:3000
2. Login with the email/password you created in step 3
3. You should see the dashboard

---

## Adding Viewer Members

As admin, you can add more members:
1. Create user in Supabase Auth (same as step 3)
2. Insert member row with `role = 'viewer'`
3. Share login credentials with them

---

## Deploy to Vercel (Free)

1. Initialize git: `git init && git add . && git commit -m "Initial commit"`
2. Push to GitHub (create a new repo)
3. Go to https://vercel.com → Import project from GitHub
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy — you'll get a free `.vercel.app` URL
