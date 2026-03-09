# ChoirConnect: Hosting with PostgreSQL (Neon)

This guide documents how to host ChoirConnect on Render with a free PostgreSQL database on Neon. Data persists across deploys and there is no expiration date on Neon's free tier (unlike Render's free Postgres).

---

## Overview

| Component | Provider | Purpose |
|-----------|----------|---------|
| Web app (ChoirConnect) | Render | Serves the Node/Express backend and React frontend |
| Database | Neon | Free PostgreSQL; persistent, no expiration |

---

## Step 1: Create a Neon database

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub, Google, or email).
2. Click **New Project**.
3. Configure:
   - **Project name:** `choirconnect` (or any name)
   - **Postgres version:** 17 (default)
   - **Cloud provider:** AWS
   - **Region:** Choose closest to your Render region (e.g. US East 1 if Render is in Oregon).
   - **Neon Auth:** Leave off.
4. Click **Create project**.
5. After creation, open **Connect** (or the connection string card) and copy the full connection string. It looks like:
   ```
   postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   Click **Copy snippet** or **Show password** then copy the full string. Store it securely.

---

## Step 2: Migrate local data to Neon

Run the migration script once from your PC (where your local `choir.db` has data):

1. Open PowerShell and go to the project folder:
   ```powershell
   cd c:\path\to\ChoirConnect
   ```

2. Set the Neon connection string (paste your actual URL):
   ```powershell
   $env:DATABASE_URL = "postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

3. Run the migration:
   ```powershell
   node scripts/migrate-sqlite-to-postgres.js
   ```

4. You should see:
   - `Found: X users, Y members, ...`
   - `Inserted X users`, `Inserted Y members`, etc.
   - `Migration completed successfully.`

**Mac/Linux:**
```bash
export DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.../neondb?sslmode=require"
node scripts/migrate-sqlite-to-postgres.js
```

---

## Step 3: Configure Render

1. In the [Render dashboard](https://dashboard.render.com), open your **ChoirConnect** web service.
2. Go to **Environment** (left sidebar under MANAGE).
3. Add or edit the **DATABASE_URL** variable:
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the same Neon connection string from Step 1.
   - **Important:** If the URL splits into multiple rows when pasted, wrap it in **double quotes** so it stays as one value:
     ```
     "postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
     ```
4. Click **Save**. Render will trigger a deploy.

---

## Step 4: Verify

1. Wait for the deploy to finish (Events → **Deploy live**).
2. Open your app URL (e.g. `https://choirconnect-p259.onrender.com`).
3. Log in (e.g. admin / admin).
4. Confirm members, attendance, and expenses appear.

---

## Troubleshooting

### Paste splits into 2 rows on Render

- Wrap the entire connection string in **double quotes** in the VALUE field.
- Ensure the value is a single line (no line breaks).

### "Duplicate keys are not allowed"

- Remove extra `DATABASE_URL` rows so only one remains. Use the trash icon on duplicates.

### Migration fails: "relation does not exist"

- The script creates tables automatically. If it still fails, run it again; tables may have been created on a previous run.

### Migration fails: "invalid input syntax for type date:"

- Fixed in the migration script: empty strings are converted to `null` for date columns. Ensure you have the latest `scripts/migrate-sqlite-to-postgres.js`.

### Deploy fails with connection error

- Verify the Neon connection string is correct: `username:password@host/database?sslmode=require`.
- Use the **pooler** URL from Neon (contains `-pooler` in the hostname) for serverless/connection pooling.

---

## Optional: Remove Render Postgres

If you created a PostgreSQL database on Render (`choirconnect-db`) before switching to Neon, you can delete it to avoid the April 8 expiration notice:

1. In Render, open the PostgreSQL service (**choirconnect-db**).
2. Go to **Settings** (or the database info page).
3. Click **Delete Database** when you no longer need it.

---

## Neon free tier limits

- **0.5 GB** storage
- **Scales to zero** when inactive (first request may be slower)
- **10 branches** per project

For a typical choir app, this is sufficient. Upgrade only if you need more storage or higher throughput.
