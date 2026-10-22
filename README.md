# YHD Tasks PWA Proof of Concept (POC)

A minimal, high-fidelity Progressive Web App (PWA) proof-of-concept built with **Next.js 14 (App Router)** and **Tailwind CSS**. Demonstrates standalone windowing, App Badging API, and offline fallback handling without dynamic offline caching (adhering strictly to project constraints).

---

## 🚀 Quick Start

From inside the `pwa-todo-poc` directory:

```bash
# Start development server
npm run dev

# OR build and run production server (recommended for PWA testing)
npm run build
npm start
```
The app runs at `http://localhost:3000`.

---

## 🧪 Testing on Desktop (Chrome, Edge, macOS Safari)

1. Open `http://localhost:3000` in **Google Chrome** or **Microsoft Edge**.
2. Look at the right side of the address/URL bar:
   - In Chrome/Edge, click the **Install App icon** (computer monitor with an arrow) or click the in-app **"Install"** button in the header.
   - On macOS Safari (Sonoma/Sequoia), select **File > Add to Dock...**.
3. **Observation**:
   - The app launches in its own dedicated, standalone window with **zero browser omnibar, tabs, or bookmarks**.
   - Pinned directly to your OS Taskbar (Windows) or Dock (macOS).
   - Operates in its own OS process (`Alt+Tab` / `Cmd+Tab`).

---

## 📱 Testing on Android Phone

PWAs on mobile require **HTTPS** (or localhost). The simplest, zero-config ways to test on your Android device:

### Option A: Using Cloudflare Tunnel (Zero-Config, Recommended)
1. In a new terminal window, expose your local Next.js server over secure HTTPS:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
2. Copy the generated `https://<random-name>.trycloudflare.com` URL.
3. Open this link in **Google Chrome on your Android phone**.
4. Chrome will either show a bottom banner: **"Add YHD Tasks to Home screen"** or tap the 3-dot menu `⋮` > **"Install app"**.
5. Tap **Install**. The app will appear in your Android App Drawer and Home Screen as a native WebAPK!

### Option B: Local Wi-Fi Network
1. Run: `npm run dev -- -H 0.0.0.0`
2. Find your PC's local IP (e.g., `192.168.1.50`).
3. On Android Chrome, open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, enter `http://192.168.1.50:3000`, tap **Enable**, and relaunch Chrome.
4. Browse to `http://192.168.1.50:3000` and tap **"Install app"**.

---

## ⚡ What Features to Demonstrate to Sir

1. **Standalone Display Mode**:
   - Run the app from your Desktop taskbar or mobile home screen. Notice the header displays the `[STANDALONE APP]` badge.
2. **Native OS App Badging (`navigator.setAppBadge`)**:
   - Add a few tasks. Notice the uncompleted task count dynamically updates the red notification badge on the Taskbar/Dock icon.
   - Mark all tasks complete -> the badge automatically clears!
3. **Hard Navigation Offline Defense**:
   - In Chrome DevTools > Network tab, check **Offline**.
   - Hard refresh (`Ctrl + R` / `Cmd + R`) -> The branded `/offline.html` shell renders cleanly instead of browser "dinosaur" errors.
   - Uncheck **Offline** -> The page automatically detects reconnection and reloads!
4. **Soft Navigation Offline Defense**:
   - Protected via `app/error.tsx` catching React Server Component fetch failures gracefully.

---

## 🧹 Deletion After Verification

Whenever you are ready to pull your main YHD repository into this workspace:
```bash
# From workspace root:
rm -rf pwa-todo-poc
```
Your documentation in `docs/` remains 100% safe.
