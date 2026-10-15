# Deploying Campus Lost & Found Backend to Render with PostgreSQL

This guide walks you through deploying your Spring Boot backend on **Render** with a managed **PostgreSQL** database, and linking it to your Vercel frontend at `https://lost-and-found-frontend-chi.vercel.app/`.

---

## Architecture Overview

```
+------------------------------------------+
|  Frontend (Vercel)                       |
|  https://lost-and-found-frontend-chi.    |
|  vercel.app                              |
+--------------------+---------------------+
                     |
                     | HTTPS REST API (CORS enabled)
                     v
+--------------------+---------------------+
|  Backend (Render Web Service)            |
|  https://<your-backend>.onrender.com     |
+--------------------+---------------------+
                     |
                     | JDBC (SSL / internal connection)
                     v
+--------------------+---------------------+
|  Database (Render PostgreSQL)            |
|  campus_lost_and_found                   |
+------------------------------------------+
```

---

## Method 1: Automated 1-Click Deployment (Render Blueprint)

We have created [`render.yaml`](file:///c:/Users/D%20Akshay/OneDrive/Desktop/tt-prp/render.yaml) at the root of your project.

1. **Commit and Push to GitHub**:
   ```cmd
   git add .
   git commit -m "feat: configure PostgreSQL and Render deployment files"
   git push origin main
   ```

2. **Open Render Dashboard**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** > **Blueprint**.
   - Connect your GitHub repository (`Lost-and-Found`).
   - Render will detect `render.yaml` and show:
     - **Database**: `lost-and-found-db` (PostgreSQL, Free)
     - **Web Service**: `lost-and-found-backend` (Docker, Free)
   - Click **Apply**.
   - Render will automatically create the PostgreSQL database and build the Docker container!

---

## Method 2: Manual Setup via Render Dashboard

If you prefer setting up the services manually in Render:

### Step 1: Create PostgreSQL Database on Render
1. On the Render Dashboard, click **New +** > **PostgreSQL**.
2. Fill in the details:
   - **Name**: `campus-lost-and-found-db`
   - **Database**: `campus_lost_and_found`
   - **User**: `campus_user`
   - **Region**: Choose closest to you (e.g. `Oregon (US West)` or `Frankfurt`)
   - **Instance Type**: `Free`
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g., `postgresql://campus_user:pass@dpg-xxx-a/campus_lost_and_found`).

---

### Step 2: Create Web Service on Render
1. On the Render Dashboard, click **New +** > **Web Service**.
2. Select your GitHub repository.
3. Configure the service:
   - **Name**: `lost-and-found-backend`
   - **Region**: (Choose the same region as your database)
   - **Language / Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context**: `.`
   - **Instance Type**: `Free`
4. Expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Activates production profile |
| `DATABASE_URL` | Paste your **Internal Database URL** | Render Postgres URI (automatically parsed by `DatabaseConfig`) |
| `CORS_ALLOWED_ORIGINS` | `https://lost-and-found-frontend-chi.vercel.app,https://lost-and-found-frontend-chi.vercel.app/` | Authorizes your Vercel frontend |
| `JWT_SECRET` | `c2VjdXJlQ2FtcHVzTG9zdEFuZEZvdW5kSldUU2VjcmV0S2V5MjAyNkZvckFjYWRlbWljUHJvamVjdERlcGxveW1lbnQ=` | Secret key for signing JWT tokens |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Automatically creates tables on first startup |

5. Under **Health Check Path**, enter: `/api/health`.
6. Click **Create Web Service**.

---

## Step 3: Connect Frontend on Vercel

Once Render completes deploying your backend:
1. Copy your Render Backend URL (e.g., `https://lost-and-found-backend.onrender.com`).
2. Verify the backend health in your browser:
   `https://<your-app>.onrender.com/api/health`
   Should return: `{"status":"UP","database":"CONNECTED","databaseProductName":"PostgreSQL"}`.
3. Go to [vercel.com](https://vercel.com) > your project (`lost-and-found-frontend-chi`).
4. Go to **Settings** > **Environment Variables**.
5. Add or update:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://<your-app>.onrender.com/api` (replace with your Render backend URL, including `/api`)
6. Go to **Deployments** > click the three dots on the latest deployment > **Redeploy**.

---

## Verification Checklist

- [ ] Backend health endpoint (`/api/health`) returns HTTP 200 with `"database":"CONNECTED"`.
- [ ] Open `https://lost-and-found-frontend-chi.vercel.app/register` and register a new campus user.
- [ ] Post a Lost or Found item and verify it persists in PostgreSQL.
- [ ] Verify smart matching displays potential matches between items.
