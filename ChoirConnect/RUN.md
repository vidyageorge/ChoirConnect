# ChoirConnect – Run commands

How to run the ChoirConnect application.

## Prerequisites

- **Node.js** (v16 or later recommended)
- **npm** (comes with Node.js)

## Quick start (Windows)

From the `ChoirConnect` folder, double-click:

```
run.bat
```

Or in a terminal:

```bat
cd ChoirConnect
run.bat
```

`run.bat` will install dependencies if needed, then start the app.

---

## Run with npm

From the **ChoirConnect** folder:

### 1. Install dependencies (first time only)

```bash
npm run install-all
```

This installs root and client dependencies.

### 2. Start the app (development)

```bash
npm run dev
```

This starts:

- **Backend** (Express + SQLite) – with nodemon (auto-restart on changes)
- **Frontend** (Vite + React) – with hot reload

### 3. URLs

| Service   | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:3000  |

Open **http://localhost:5173** in your browser.

### 4. Stop the app

Press **Ctrl+C** in the terminal where `npm run dev` is running.

---

## Other npm scripts

| Command              | Description                              |
|----------------------|------------------------------------------|
| `npm run dev`        | Start backend + frontend (development)   |
| `npm run server`     | Start backend only (nodemon)             |
| `npm run client`     | Start frontend only (Vite)               |
| `npm start`          | Start backend only (node, no nodemon)    |
| `npm run build`      | Build frontend for production            |
| `npm run install-all`| Install root + client dependencies      |
| `npm run add-special-events` | Add Ash Wednesday & Way of the Cross (Feb 2026) for all members |

---

## Add special events (February 2026)

To add **Ash Wednesday (Wed 18 Feb)** and **Way of the Cross (Wed 25 Feb)** as special events for all members:

```bash
npm run add-special-events
```

This creates one attendance row per member per event (status “Not joined yet”). You can then open the Attendance page, choose February 2026, and mark Present/Absent for each member. Safe to run more than once (skips existing records). If the npm script is not available, run from the ChoirConnect folder: `node scripts/add-special-events.js`.

To **fill in February special attendance** (Present/Absent for Ash Wednesday and Way of the Cross) so the grid is not empty, run:

```bash
node scripts/seed-feb-special-attendance.js
```

This creates missing records for all members and sets present/absent from the built-in list. Edit `scripts/seed-feb-special-attendance.js` if your member names or who was present differ.

---

## Production

1. Build the frontend:

   ```bash
   npm run build
   ```

2. Serve the built files from `client/dist` with your web server, and run the backend with:

   ```bash
   npm start
   ```

---

## Running 24/7 (always on)

When you run the app with `run.bat` or `npm run dev`, it runs **on your PC** and uses **localhost**. As soon as you close the terminal or shut down your system, the app stops. To keep it running all the time, you need to run it on a **machine or service that is always on**.

### Option A: Deploy to a cloud host (recommended)

Host the app on a server on the internet. It will run 24/7 and you can open it from any device with a URL (e.g. `https://your-choir-app.onrender.com`), not just your PC.

| Host | Notes |
|------|--------|
| **Render** | Free tier, good for Node + static sites. You deploy the repo; it runs `npm install`, `npm run build`, and `npm start`. You need to serve the built frontend from the backend or use two services. |
| **Railway** | Simple deploy from GitHub; free tier available. |
| **Fly.io** | Free tier; run the app in a container. |
| **Your own VPS** (DigitalOcean, Linode, etc.) | You get a Linux server; you install Node, clone the repo, run with PM2, and optionally use Nginx. |

**Typical steps (e.g. Render or Railway):**

1. Push your ChoirConnect code to GitHub (if not already).
2. Create an account on the host and connect your GitHub repo.
3. Set build command: `npm run install-all && npm run build` (or as the host suggests).
4. Set start command: e.g. `npm start` and configure the server to serve the built frontend (many hosts let you set a “static” folder to `client/dist` and run the Node server for API).
5. The host will give you a URL; use that instead of localhost.

The database (`choir.db`) is a single file. On most cloud hosts, the filesystem is temporary, so you either need to use a **persistent disk** (if the host supports it) or back up/restore `choir.db` regularly. Some hosts offer a small persistent volume; otherwise you can copy `choir.db` off the server periodically.

### Option B: Keep it running on your own PC (or a home server)

If you have a computer that stays on all the time (e.g. a desktop or a small home server), you can run ChoirConnect there so it keeps running until that machine is shut down.

1. **Use PM2 (process manager)**  
   - Install: `npm install -g pm2`  
   - From the ChoirConnect folder, build and run the backend, and serve the frontend:
     - Build once: `npm run build`
     - Start backend: `pm2 start server/index.js --name choir-api`
     - Serve `client/dist` with a simple static server or point Nginx to it (or run the backend so it serves `client/dist` in production).
   - Then: `pm2 save` and `pm2 startup` so it restarts after a reboot.  
   You would open the app at `http://YOUR-PC-IP:3000` (or the port you use) from other devices on your network.

2. **Run as a Windows service**  
   - Use a tool like **NSSM** (Non-Sucking Service Manager) or **node-windows** to run `node server/index.js` as a Windows service so it starts when Windows starts and keeps running when you log out.

**Summary**

- **“Keep running all the time”** = run it on something that is always on: either a **cloud host** (Option A) or **your own always-on PC** (Option B).
- **localhost** = only that computer; closing the system or the terminal stops the app.
- For a **shared choir app**, Option A (cloud) is usually best so everyone can use the same URL from anywhere.
