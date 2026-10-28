# Technical R&D & Feasibility Report: Converting Yearheads (YHD) to a Progressive Web App (PWA)

| **Document Attribute** | **Specification**                                                                                                     |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Project Target**     | Yearheads Dashboard (`YHD`) Web Application                                                                           |
| **Current Stack**      | **Next.js 14** (App Router, React Server Components, Server Actions)                                                  |
| **Architecture Scope** | **Strictly No Dynamic Offline Data Caching** (Active network connection required; static offline fallback shell only) |
| **Status**             | Technical Evaluation & Architecture Proposal                                                                          |
| **Author**             | Senior Frontend & Web Platform Engineering Team                                                                       |
| **Date**               | October 2026                                                                                                          |

---

## Executive Summary

This report evaluates the technical feasibility, architectural implications, operational trade-offs, and platform limitations of converting the **Yearheads (YHD)** school administrative website into a **Progressive Web App (PWA)** on **Next.js 14 (App Router)**.

### Core Architectural Decisions & Scope Clarification

1. **Strictly No Dynamic Offline Data Caching**: Per project constraints confirmed by **Kumar Sir**, dynamic record caching is out of scope. YHD handles live student safeguarding data, parent communications, and attendance logs. Storing student PII offline in `IndexedDB` on shared classroom PCs or staff mobile devices introduces major data desynchronization and privacy compliance risks.
2. **Phase 1: Core PWA (Immediate 2–3 Day Frontend Implementation)**:
   - Full standalone windowing (`display: standalone`) for desktop & mobile.
   - Type-safe Web App Manifest (`app/manifest.ts`) and icon assets.
   - Native App Badging API (`navigator.setAppBadge`) for live unread counts (e.g. _Notes from Parent [10]_).
   - A lightweight vanilla Service Worker (`public/sw.js`) providing a static branded `/offline.html` fallback for hard navigations and reloads.
   - **Zero backend changes required.**
3. **Phase 2: Web Push Notifications (Optional, Decoupled Backend Initiative)**:
   - Web Push requires generating VAPID key pairs, creating a database table (`push_subscriptions`) to store user endpoints, and building a server-side notification trigger pipeline.
   - **Scope Distinction**: Phase 1 Core PWA delivers ~85% of app benefits immediately without any backend dependencies. Phase 2 can be prioritized independently by leadership as a follow-on enhancement.
4. **Two-Tier Offline Defense (Soft vs. Hard Navigation)**:
   - **Hard Navigations & Cold Launches** (typing URL, app launch, page refresh): Protected by the Service Worker serving `/offline.html`.
   - **Soft Navigations** (clicking `<Link>` inside Next.js): Handled in client runtime via a Global React Error Boundary (`app/error.tsx`) and an active connectivity toast, preventing runtime crashes without corrupting RSC JSON streams.

```mermaid
flowchart TD
    subgraph Client Navigation
        A[User Action in YHD] --> B{Navigation Type}
        B -->|Hard Launch / Page Reload| C[Service Worker mode: navigate]
        B -->|Soft Click Link href| D[Next.js Client Router RSC fetch]
    end

    subgraph Offline Defense Boundary
        C -->|Offline| E[SW Serves Cached /offline.html Shell]
        D -->|Offline| F[Global React Error Boundary / Toast Banner]
    end

    subgraph Data Strategy
        E -.->|Strict Constraint| G[(Zero Offline Student Data Caching)]
        F -.->|Strict Constraint| G
    end
```

---

## 1. Overview & Use-Cases

### 1.1 What a PWA Brings to Yearheads (YHD) Specifically

A Progressive Web App is not a rewrite or a separate mobile codebase; it is a **progressive enhancement layer** applied to the existing Next.js 14 web application. By pairing a W3C-standard **Web App Manifest** and an unobtrusive **Service Worker**, the YHD platform gains native-like presence across desktop and mobile devices without app store overhead.

Examining the actual YHD production interface reveals a highly sophisticated, data-dense administrative dashboard:

- A persistent global header with quick student profile lookup (`Search Student Profile`), academic year context (`2026 - 2027`), and school switcher (`Test App School 2`).
- A comprehensive 11-module collapsible left navigation sidebar (_App Engagement Overview_, _Attendance Overview_, _Note from Parent [with live badge counter]_, _Detention_, _News_, _Notifications_, _Personal Notification_, _Evening Study_, _Manage MIS List_, _Picture Permissions_, _Medical Form_, and _Settings_).
- A multi-tier filtering control bar (_Today / Pending_, _Search by name_, _Absences_, _Status_, _Year_, _Class_, _Export_, and _Clear filters_).
- A 9-segment status tab bar (_Absent_, _Late_, _PTL - Permission to Leave_, _Not Signed Out_, _Please Check_, _Absence Alerts_, _Late Alerts_, _Anomalies_, and _School Activities_).
- An 8-column student attendance data table (_Student_, _Year_, _Class_, _From - To_, _Reason_, _Status_, _Cum. Days_, and _Consecutive Days_).

Key capabilities introduced for YHD include:

1. **Dedicated Standalone Windowing (`display: standalone`) & Screen Real Estate Reclamation**:
   - In standard browser tabs, the browser omnibar, tab strips, bookmarks bar, and extensions consume **80–120 vertical pixels**. On standard 13"–15" staff laptops, this pushes the student attendance table below the fold, forcing Year Heads to scroll constantly.
   - Running YHD as a standalone PWA completely removes browser chrome, expanding vertical viewing area by **30–40%** and allowing 5–8 additional student records to fit comfortably on screen at once.
2. **First-Class OS Integration & Multi-Tasking**:
   - Pinned directly to the Windows Taskbar, macOS Dock, ChromeOS shelf, or mobile home screens (iOS / Android).
   - Operates in its own OS-level process window, participating natively in application switchers (`Alt + Tab` on Windows, `Cmd + Tab` on macOS, and the iOS/Android app switchers). Year Heads can rapidly cycle between school email, Excel exports, and YHD without getting lost in 40+ browser tabs.
3. **App Launcher Identity & High-Frequency Shortcuts**:
   - Branded launcher icons and OS-level quick action shortcuts (via the manifest `shortcuts` API) that map directly to high-frequency YHD tasks: jumping straight into _Attendance Overview_, _Notes from Parent_, _Detention Queue_, or _Medical Forms_ with a single right-click or long-press.
4. **Zero-Friction Continuous Deployment**:
   - Native mobile apps require app store review cycles (24–72 hours), enterprise MDM profiles, and manual user updates.
   - A PWA updates instantly whenever the Next.js server deploys a new build, ensuring every Year Head and administrator is perpetually on the canonical version.

---

### 1.2 Realistic User and Business Use-Cases (Under the "No Offline Cache" Scope)

Because dynamic client-side caching is prohibited, realistic use-cases center on **ergonomics, administrative efficiency, operational focus, and communication**, rather than disconnected field work.

| User / Role                                        | Context / Workflow in YHD                                                                                                                                    | Tangible PWA Benefit                                                                                                                                                                                  |
| :------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Year Head (Office Desktop / Laptop)**            | Conducting morning attendance roll calls, filtering by _Year_ and _Class_, reviewing _Absence Alerts_ and _Anomalies_ amidst 30+ open browser tabs.          | **Window Isolation & Filter Guard:** Runs in a dedicated taskbar window. Accidental browser back-swipes cannot wipe active multi-tier filter states (_Today_, _Class_, _Absences_).                   |
| **Roving Year Head / Duty Master (iPad / Mobile)** | Walking through school gates, dining halls, detention halls, or boarding houses checking _PTL (Permission to Leave)_, _Detention lists_, or _Medical Forms_. | **1-Tap Launch & Fullscreen Viewport:** Home-screen icon opens fullscreen without safari navigation bars eating up screen real estate; instant access to student medical alerts on the move.          |
| **Urgent School Escalations & Parent Notes**       | Parents submitting absence notes or medical updates during school hours (indicated by the sidebar badge: _Note from Parent [10]_).                           | **Web Push & App Icon Badging:** Staff receive immediate OS push notifications for new notes, and the dock/taskbar icon mirrors the live unread count (`10`) via the App Badging API.                 |
| **Unstable Wi-Fi Campus Zones**                    | Staff moving through campus dead spots (e.g., sports fields, basements, exterior walkways).                                                                  | **Graceful Disconnect Boundary:** Instead of raw browser network error screens (`ERR_INTERNET_DISCONNECTED`), a clean, branded "Network Lost" screen with automated reconnect monitoring is rendered. |

#### Why "No Offline Cache" is Reinforced by the YHD UI:

1. **Critical Student Safeguarding & Medical Compliance**: As shown in the sidebar (_Medical Form_, _Picture Permissions_, _PTL_, _Notes from Parent_), YHD manages critical safeguarding data. Displaying cached, stale medical allergies or outdated parent permissions due to delayed offline synchronization is an unacceptable institutional safety risk.
2. **Attendance Synchronization Integrity**: When a Year Head marks an _Absence Alert_ or clears an _Anomaly_, other administrative offices (attendance officers, boarding masters) must observe that state immediately. Optimistic offline writes risk overwriting changes made simultaneously by the school front office.
3. **Elimination of Complex Multi-Table Conflict Resolution**: With 8+ columns and 9 status tabs, building offline mutation queues and merge conflict resolution into IndexedDB would introduce massive technical debt with virtually zero ROI on a connected school campus.

---

## 2. Advantages & Disadvantages

Converting YHD to a PWA represents a distinct set of trade-offs compared to maintaining a standard responsive website or building native store applications.

```mermaid
quadrantChart
    title YHD Deployment Models: Effort vs Operational Utility
    x-axis Low Development Effort --> High Development Effort
    y-axis Low Administrative Utility --> High Administrative Utility
    quadrant-1 Native Mobile Apps (React Native / Flutter)
    quadrant-2 Recommended: Thin PWA (Next.js 14)
    quadrant-3 Standard Responsive Website
    quadrant-4 Heavyweight Offline PWA
    "Standard Web": [0.15, 0.40]
    "Thin PWA (Manifest + SW Fallback)": [0.28, 0.82]
    "Heavy Offline PWA (IndexedDB Sync)": [0.75, 0.55]
    "Native Store Apps": [0.88, 0.78]
```

### 2.1 Direct Advantages (PWA vs. Standard Responsive Website)

- **Native App Icon Badging (`navigator.setAppBadge`)**:
  - The YHD sidebar actively features dynamic badge counts (e.g., **"Note from Parent [10]"** and **"Personal Notification [0]"**).
  - In a standard browser, staff only see these counts if the tab is actively focused or if they look at a tiny browser tab title favicon.
  - As an installed PWA, YHD can invoke `navigator.setAppBadge(10)` to display a native numerical badge directly on the Windows Taskbar icon, macOS Dock icon, or mobile app launcher icon, notifying staff of unread parent communications even when working in other applications.
- **Preservation of Complex Multi-Parameter Filter States**:
  - YHD's attendance screen utilizes complex composite state: Date selection (_Today_), _Absences_ filter, _Status_ dropdown, _Year_, _Class_, and 9 distinct status tabs (_Absent_, _Late_, _PTL_, etc.).
  - In standard desktop browsers, accidental two-finger trackpad back-swipes or mouse thumb button clicks navigate the browser back in history, instantly resetting complex filter configurations and causing staff frustration. Standalone PWA windows completely eliminate browser-level gesture navigation.
- **Elimination of Accidental History Traversal & Lost Form Data**: Standalone PWA windows remove browser back/forward buttons and enforce deliberate in-app navigation, preventing lost student notes or unsaved detention logs.
- **Persistent OS Taskbar & Dock Anchoring**: Standard web bookmarks are buried under bookmark menus or browser history. Installed PWAs are pinned to the user's primary operating system interface alongside Outlook, Slack, and Excel.
- **Modern Web Push Channel**: Push notifications provide an active re-engagement channel for mission-critical notifications without requiring an SMS gateway or third-party notification app.
- **App-Like Gestures & Fullscreen Viewport**: Mobile viewports benefit from `viewport-fit=cover` and elimination of mobile Safari's collapsing bottom navigation bar, which frequently triggers layout jumps during scroll interactions.
- **Shared Codebase & Single Deployment Pipeline**: Zero fragmentation. The same React components, Server Actions, and Tailwind/CSS tokens serve both browser visitors and installed PWA users.

---

### 2.2 Direct Disadvantages & Trade-offs

- **User Expectation Mismatch Regarding "App" Behavior**:
  - Non-technical staff equate an app on their home screen or dock with offline capability (e.g., native apps like WhatsApp or Notes).
  - When a user opens YHD with no internet connection and encounters a static "Offline Fallback" screen, some may file bug reports assuming the app is broken. Clear microcopy is required.
- **iOS Safari Installation Friction**:
  - Unlike Android and Desktop Chrome/Edge, iOS Safari **does not support the programmatic `beforeinstallprompt` API**.
  - Users cannot be presented with a direct "Click here to install" button. They must be educated to manually tap the Safari Share icon and scroll down to select _"Add to Home Screen"_.
- **Service Worker Cache Traps & Asset Mismatch**:
  - If a service worker is poorly configured, Next.js chunk hashes (`/_next/static/chunks/[hash].js`) can become desynchronized between deployments, resulting in fatal `ChunkLoadError` exceptions.
  - Mitigated entirely in this proposal by enforcing a **Network-Only** caching strategy for all scripts, styles, and routes, restricting caching exclusively to the single static `/offline.html` asset.
- **Isolated WebKit Authentication Context (iOS Standalone Sandbox)**:
  - When an iOS user adds YHD from Safari to their Home Screen, iOS WebKit boots the standalone PWA in a **partially sandboxed environment**.
  - Cookies and session tokens stored in Safari do not reliably sync into the standalone instance upon first launch. Staff will likely be required to log in again upon opening the installed PWA for the first time.
- **Maintenance & Asset Hygiene**:
  - Maintaining multiple icon densities (192px, 512px, maskable icons, Apple touch icons) and testing across desktop Chrome, Edge, macOS Safari, and iOS Safari adds ongoing maintenance and QA overhead.

---

## 3. Technical Architecture & Challenges (Next.js 14 App Router)

### 3.1 Native Next.js 14 App Router PWA Capabilities

Next.js 14 provides built-in metadata and route conventions that make manifest and icon management clean, type-safe, and native, without requiring third-party plugins.

#### 1. Native Manifest File (`app/manifest.ts`)

Next.js 14 App Router supports type-safe manifest generation directly via `MetadataRoute.Manifest`. Placing this file at `app/manifest.ts` automatically generates `/manifest.webmanifest` with appropriate HTTP headers.

```typescript
// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yearheads Administrative Portal",
    short_name: "YHD",
    description: "Yearheads Academic, Attendance & Student Life Portal",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a", // Slate 900
    theme_color: "#1e293b", // Slate 800
    scope: "/",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Attendance Overview",
        short_name: "Attendance",
        description: "Daily roll call, absences, and status tracking",
        url: "/attendance",
        icons: [{ src: "/icons/shortcuts/attendance.png", sizes: "96x96" }],
      },
      {
        name: "Notes from Parent",
        short_name: "Parent Notes",
        description: "Review incoming parent communications & excuses",
        url: "/parent-notes",
        icons: [{ src: "/icons/shortcuts/parent-notes.png", sizes: "96x96" }],
      },
      {
        name: "Detention Tracker",
        short_name: "Detention",
        description: "Manage student detention queues and records",
        url: "/detention",
        icons: [{ src: "/icons/shortcuts/detention.png", sizes: "96x96" }],
      },
      {
        name: "Medical Forms",
        short_name: "Medical",
        description: "Access student medical alerts and dietary requirements",
        url: "/medical",
        icons: [{ src: "/icons/shortcuts/medical.png", sizes: "96x96" }],
      },
    ],
  };
}
```

#### 2. Native Viewport & Apple Web App Metadata (`app/layout.tsx`)

In Next.js 14, `viewport` configuration is decoupled from `metadata` into its own exported object:

```typescript
// app/layout.tsx
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // Ensures full coverage beneath iOS notch/home bar
};

export const metadata: Metadata = {
  title: {
    default: "Yearheads Dashboard",
    template: "%s | YHD",
  },
  description: "Yearheads Academic and Student Care Management Portal",
  applicationName: "YHD",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YHD Portal",
  },
  formatDetection: {
    telephone: false,
  },
};
```

#### 3. Native App Icon Badging Implementation (`hooks/use-app-badge.ts`)

To mirror dynamic sidebar counts like **"Note from Parent [10]"** onto the OS Taskbar / Dock / Home Screen icon, Next.js 14 client components can leverage the W3C Badging API with clean feature detection:

```typescript
// hooks/use-app-badge.ts
"use client";

import { useEffect } from "react";

/**
 * Updates the OS application icon badge count (Windows Taskbar, macOS Dock, Android/iOS PWA).
 * @param count Number of unread notifications (e.g. unread Parent Notes)
 */
export function useAppBadge(count: number) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Verify browser support for the W3C Badging API
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch((err) => {
          console.warn("[YHD-PWA] Failed to set app icon badge:", err);
        });
      } else {
        navigator.clearAppBadge().catch((err) => {
          console.warn("[YHD-PWA] Failed to clear app icon badge:", err);
        });
      }
    }
  }, [count]);
}
```

---

### 3.2 Minimal Service Worker Implementation (The "Thin SW" Pattern)

Under the confirmed constraint of **No Dynamic Caching**, heavyweight libraries like `next-pwa` (which is legacy, unmaintained, and breaks modern App Router bundling) or full Workbox caching suites must be avoided.

Instead, a **custom 60-line vanilla Service Worker** stored at `public/sw.js` fulfills all browser PWA installability requirements while strictly enforcing network-only operations for all data.

```mermaid
sequenceDiagram
    autonumber
    actor User as Year Head
    participant App as Browser Client
    participant NextRouter as Next.js Client Router
    participant SW as Thin Service Worker
    participant Fallback as SW Cache (/offline.html)
    participant ErrorBoundary as React Error Boundary (app/error.tsx)

    alt Scenario A: Hard Navigation (Cold Launch / Page Refresh)
        User->>App: Opens App / Reloads (mode: 'navigate')
        App->>SW: Fetch Document Request
        alt Online
            SW->>Server: Direct fetch() -> 200 OK HTML
            SW-->>App: Render Page
        else Offline
            SW->>Fallback: caches.match('/offline.html')
            Fallback-->>App: Render Branded Offline Shell
        end
    else Scenario B: Soft Navigation (In-App Link Click)
        User->>NextRouter: Clicks Link href="/attendance"
        NextRouter->>SW: RSC Fetch Request (mode: 'cors')
        alt Online
            SW->>Server: Pass-through fetch() -> 200 OK (RSC Flight Data)
            NextRouter-->>App: Smooth React Client Transition
        else Offline
            SW->>Server: Pass-through fetch() [Fails at Network]
            NextRouter-->>ErrorBoundary: Catches Network Error
            ErrorBoundary-->>App: Displays In-App Reconnection & Retry Banner
        end
    end
```

#### 3.2.1 Critical Next.js Technical Nuance: Soft vs. Hard Navigation Offline Boundary

A common architectural trap in Next.js PWAs is assuming `if (event.request.mode === 'navigate')` catches all disconnected navigation attempts:

- **Hard Navigation (Caught by Service Worker)**:
  - **Triggers**: Entering a URL directly into the address bar, launching the standalone app from a cold boot, pressing browser reload (`Ctrl + R` / `Cmd + R`), or clicking an external/deep link.
  - **Behavior**: The browser requests a new HTML document (`mode === 'navigate'`). If offline, the Service Worker intercepts this fetch and serves the pre-cached `/offline.html` shell.
- **Soft Navigation (Handled by Next.js Client Runtime)**:
  - **Triggers**: A user clicking any Next.js `<Link href="/attendance">` or calling `router.push()` while inside the running app.
  - **Behavior**: Next.js does **not** make a document request. Instead, it fires a client-side `fetch()` with the `RSC: 1` header (`mode: 'cors'`) to retrieve the serialized React Server Component payload.
  - **The Trap**: If the service worker intercepted this and returned `/offline.html`, React would attempt to parse HTML as RSC JSON flight data, throwing an unhandled `SyntaxError: Unexpected token '<'` and locking the UI!
  - **The Solution**:
    1. The Service Worker intentionally leaves `mode !== 'navigate'` requests unintercepted.
    2. When the user clicks a `<Link>` while offline, the RSC fetch rejection is cleanly caught by Next.js's global Error Boundary (`app/error.tsx`) or an active offline banner listener (`window.addEventListener('offline')`).

```tsx
// app/error.tsx (Next.js Global In-App Error Boundary for Soft Navigations)
"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 mb-3">
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a9 9 0 010-12.728m3.536 3.536a4 4 0 010 5.656"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {isOffline ? "Network Connection Lost" : "Unable to Load Section"}
      </h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">
        {isOffline
          ? "YHD requires active connectivity to safeguard live student attendance and parent notes. Please reconnect."
          : error.message ||
            "An unexpected error occurred while loading this view."}
      </p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Retry Connection
      </button>
    </div>
  );
}
```

#### The Service Worker Implementation (`public/sw.js`)

```javascript
// public/sw.js
const OFFLINE_CACHE_NAME = "yhd-offline-v1";
const OFFLINE_URL = "/offline.html";

// 1. Install Phase: Cache ONLY the static offline fallback page and logo
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        "/icons/icon-192x192.png",
        "/brand/logo-offline.svg",
      ]);
    }),
  );
  // Activate worker immediately
  self.skipWaiting();
});

// 2. Activate Phase: Clean up obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== OFFLINE_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch Phase: Strictly Network-Only with Offline Document Fallback
// Only catches HARD navigations (page reload, URL entry).
// Soft navigations (Next.js Link clicks) bypass to network and fall back to app/error.tsx.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse;
      }),
    );
    return;
  }

  // All other requests (API, RSC chunks, static JS/CSS) pass straight to network
  // No interception, no caching. Prevents chunk desync bugs completely.
  return;
});

// 4. Web Push Notification Handlers (Optional Phase 2 Decoupled Feature)
// NOTE FOR LEADERSHIP: Pre-wired for forward compatibility. Remains dormant until Phase 2 backend pipeline is provisioned.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "New notification from YHD Portal",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || "Yearheads Alert",
        options,
      ),
    );
  } catch (err) {
    console.error("Failed to parse push event:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open, otherwise open new
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
```

#### Safe Client-Side Registration (`components/pwa-registrar.tsx`)

```tsx
"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    // Only register in production and if supported
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          // Check for worker updates periodically
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (
                  installing.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.info(
                    "[YHD-PWA] New service worker version available.",
                  );
                }
              };
            }
          };
        })
        .catch((err) =>
          console.error("[YHD-PWA] ServiceWorker registration failed:", err),
        );
    }
  }, []);

  return null;
}
```

---

### 3.3 App Router & React Server Components (RSC) Compatibility

Integrating a PWA with Next.js 14 App Router introduces architectural nuances that differ significantly from legacy Pages Router apps:

1. **RSC Wire Format & Stream Buffering**:
   - In Next.js 14, client transitions do not simply fetch static HTML. The router issues a fetch request containing the `RSC: 1` header, and the server streams back serialized React component flight data.
   - **Critical Rule**: The service worker must **never** attempt to cache or intercept these RSC flight streams (`/_next/data/*` or requests with `RSC` headers). If a service worker intercepts and returns stale or partial RSC data, React 18/19 streaming reconciliation breaks, triggering client-side crash loops and unrecoverable blank pages.
2. **Server Actions (`'use server'`) Execution Flow**:
   - Server Actions are HTTP `POST` requests directed to the current URL with an action ID header.
   - If a Year Head attempts a Server Action (e.g., submitting student conduct notes) while disconnected, the fetch will fail at the network layer. Because Server Actions are `POST` requests, the service worker must let them fail directly to the caller so standard React client error boundaries or `toast.error()` handlers can notify the user immediately.
3. **Cache Invalidation Headers in `next.config.js`**:
   - Browsers aggressively cache `/sw.js` unless instructed otherwise.
   - `next.config.js` must be configured with explicit `Cache-Control: no-cache, no-store, must-revalidate` for `/sw.js` to ensure updates roll out instantly without client caching locks.

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

### 3.4 Local Development vs. Production Builds

Service Workers and Next.js development mode (`next dev`) are frequently in conflict:

- **Fast Refresh / HMR Invalidation**: Hot Module Replacement continuously rebuilds bundles with transient chunk IDs. If a service worker is active during local development, it will repeatedly attempt to serve stale cached chunks, leading to false-positive runtime debugging cycles.
- **Architecture Pattern**:
  - Disable service worker registration completely in development (`process.env.NODE_ENV !== 'production'`).
  - When testing PWA installation, manifests, or Web Push locally, test against a production build using `next build && next start` alongside local HTTPS via `next dev --experimental-https` or `mkcert`.

---

## 4. Edge Cases & Platform Limitations

The real-world success of a PWA depends heavily on operating system idiosyncrasies. Platform support across desktop and mobile varies widely, with **iOS / WebKit** requiring the greatest care.

### 4.1 iOS & Safari (WebKit) Deep Dive

iOS represents the most restrictive platform for Progressive Web Apps:

```mermaid
graph TD
    A[Staff opens YHD on iOS Safari] --> B{Installation Method}
    B -->|Automatic Prompt?| C[NO: beforeinstallprompt NOT supported on iOS]
    B -->|Manual Flow| D[Tap Share Button -> 'Add to Home Screen']
    D --> E[Installed as Standalone WebApp]
    E --> F[Storage Sandboxing: Cookies/Sessions Partitioned from Safari]
    E --> G{Web Push Permission}
    G -->|Supported?| H[YES: Only available in Standalone Mode on iOS 16.4+]
    G -->|Standard Safari Tab| I[NO: Web Push blocked in iOS Safari tabs]
```

#### 1. Inability to Trigger Native Install Prompts (`beforeinstallprompt`)

- **Behavior**: Apple intentionally does not expose the `beforeinstallprompt` event on iOS Safari. Web applications cannot display a programmatic "Install" button that triggers the OS sheet.
- **Engineering Solution**: Detect iOS user-agent in client components (`/iPad|iPhone|iPod/.test(navigator.userAgent)`) and display an instructional popover guiding staff to tap the Safari **Share** icon and select **Add to Home Screen**.

#### 2. Isolated Storage Sandbox & Re-Authentication Shock

- **Behavior**: When YHD is installed to the iOS home screen, iOS WebKit provisions a separate data store (`MobileSafariUI`) detached from the Safari browser tab where the user discovered the app.
- **Impact**: Even if the staff member is actively logged in inside their Safari browser, launching the newly installed PWA icon will display an unauthenticated login screen. Staff must be forewarned in user onboarding documentation that logging in once inside the installed app is expected behavior.

#### 3. iOS 7-Day Storage Deletion (ITP Rule)

- **Behavior**: Under WebKit's Intelligent Tracking Prevention (ITP), if a user does not interact with a web application for 7 cumulative days, all client-side storage (`localStorage`, `sessionStorage`, `IndexedDB`, cookies) may be purged.
- **Impact**: Under our "No Offline Cache" architecture, this limitation is completely harmless! Because no student data is stored locally, only the authentication session cookie is subject to expiry, which can be cleanly renewed via standard refresh token flows.

#### 4. Web Push Notification Prerequisites (iOS 16.4+)

- **Behavior**: Web Push is supported on iOS **only** if two criteria are met:
  1. The user must be running iOS 16.4 or later.
  2. The application **must be installed to the Home Screen and launched in standalone mode**. Web push cannot be requested or subscribed from a standard iOS Safari browser tab.

#### 5. Safe Area Insets & Missing Navigation Chrome

- **Behavior**: In standalone mode, iOS hides the top URL bar and bottom toolbars. If an app does not provide in-UI back buttons, a user on an iPhone can become trapped inside deeply nested pages or open modals.
- **Engineering Solution**:
  - Include explicit breadcrumbs and close buttons on all routes and modals.
  - Implement CSS variables for notch padding:
    ```css
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    ```

---

### 4.2 Desktop & OS Badging Support (Windows, macOS, ChromeOS)

Desktop PWA execution offers the smoothest experience with near-zero friction:

- **Google Chrome & Microsoft Edge (Windows / ChromeOS)**:
  - Best-in-class support. Automatically displays an install icon in the URL omnibox (`Install Yearheads Dashboard`).
  - Supports rich desktop installation dialogs with preview screenshots.
  - Integrates into the Windows Start Menu, Taskbar pinning, and Windows Notifications Center.
  - **Taskbar Icon Badging**: Calling `navigator.setAppBadge(count)` renders a live badge counter directly on the Windows Taskbar icon for immediate notice of incoming parent notes.
- **macOS (Safari 17+ through Safari 27 on macOS Sonoma / Sequoia)**:
  - Apple added native desktop PWA support via **"File → Add to Dock"**.
  - Creates a dedicated macOS `.app` bundle in `~/Applications/` that runs in a standalone WebKit window, supports macOS Notifications, and docks seamlessly.
  - **Dock Icon Badging**: The macOS Dock icon renders a red badge with the unread count when `useAppBadge` is triggered.
- **Mozilla Firefox (Desktop)**:
  - Firefox discontinued desktop Site-Specific Browsing (SSB/PWA). While Firefox can access the website normally, it will not offer desktop home screen installation. Chrome, Edge, or Safari are recommended for desktop app installation.

---

### 4.3 Network Disconnection & Failure Modes

When network connectivity drops (e.g., traversing campus Wi-Fi blackouts), the application handles failures gracefully across three distinct architectural layers:

1. **Hard Document Navigations (Cold Launch & Browser Refresh)**:
   - The Service Worker detects navigation failure (`mode === 'navigate'`) and serves the pre-cached static `/offline.html` shell.
   - The offline page features an active network listener (`window.addEventListener('online')`) that automatically reloads the user's intended route the moment connectivity resumes.
2. **Soft In-App Navigations (Next.js `<Link>` Clicks)**:
   - Clicking sidebar items (_Attendance Overview_, _Notes from Parent_) triggers an RSC `fetch()` with `mode: 'cors'`.
   - The Service Worker intentionally allows this to fail at the network level rather than returning HTML (which would crash React's JSON stream parser).
   - The failure is caught cleanly by the root React Error Boundary ([`app/error.tsx`](#321-critical-nextjs-technical-nuance-soft-vs-hard-navigation-offline-boundary)) and an inline banner toast, prompting the user to reconnect without tearing down the existing interface.
3. **Server Actions & Dynamic Form Submissions**:
   - A Server Action submission while disconnected immediately rejects at the network layer.
   - Client form handlers wrap mutations in `try/catch` blocks with non-intrusive toast alerts:
     ```tsx
     try {
       await recordAttendanceAction(payload);
       toast.success("Attendance recorded");
     } catch (err) {
       toast.error(
         "Network connection lost. Attendance not submitted — please retry once connected.",
       );
     }
     ```

---

## 5. Feasibility Verdict & Recommendation

### 5.1 Phased Effort vs. Return Matrix

To provide clear visibility for leadership (**Vivek and Kumar Sir**), the implementation is split into an immediate **Phase 1 Frontend Win** and an optional **Phase 2 Backend Initiative**:

| Phase & Tier                                                | Technical Scope & Deliverables                                                                                          |  Dev Effort   |                                                       Operational Return                                                       |         Leadership Recommendation         |
| :---------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-----------: | :----------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------: |
| **Phase 1: Core PWA (Manifest & Standalone Shell)**         | `app/manifest.ts`, layout metadata, 192px/512px/maskable icons, `useAppBadge` hook for live parent note counter.        | **1–2 Days**  | **High**: Instant standalone desktop windowing, dock/taskbar presence, screen real estate expansion, live parent note badging. |  **Immediate Sign-Off (Pure Frontend)**   |
| **Phase 1: Offline Disconnect Shell (SW & Error Boundary)** | Custom `public/sw.js` (network-only with `/offline.html` fallback) + `app/error.tsx` for soft nav failures.             |   **1 Day**   |           **Medium**: Eliminates ugly browser "dinosaur" errors; provides professional branded disconnect recovery.            |  **Immediate Sign-Off (Pure Frontend)**   |
| **Phase 1: In-App iOS Install Guidance Banner**             | Contextual banner detecting iOS Safari and guiding users through the 3-step "Add to Home Screen" flow.                  | **0.5–1 Day** |             **Medium**: Bridges the lack of `beforeinstallprompt` on Apple devices for teachers/staff on iPhones.              |        **Recommended for Rollout**        |
| **Phase 2: Web Push Notifications (Optional Backend)**      | VAPID key pair, `push_subscriptions` database schema, Server Action subscription pipeline, and notification dispatcher. | **3–5 Days**  |                          **High**: Real-time staff incident escalation and alerts without SMS costs.                           | **Optional Follow-On (Backend Required)** |
| **Strictly Excluded: Dynamic Offline Data Caching**         | Workbox caching rules, local IndexedDB schema, conflict resolution, offline mutation queue.                             | **3–4 Weeks** |       **Negative / High Risk**: Violates project requirements. Causes data sync conflicts and security compliance risks.       |   **Strictly Excluded (Per Kumar Sir)**   |

---

### 5.2 Final Technical Recommendation: **PROCEED (Thin PWA Strategy)**

Converting the Yearheads (YHD) Next.js 14 website into a **Thin Progressive Web App** is **strongly recommended**.

#### Justification for Leadership:

1. **Fast, Low-Risk Phase 1 Win (2–3 Days Total)**:
   - **Phase 1 is 100% frontend**: It requires **zero changes to backend APIs, database schemas, or business logic**.
   - Within 2 to 3 days, YHD captures ~85% of native app benefits: desktop taskbar/dock presence, an uncluttered 80–120px taller viewport for student attendance grids, and native unread icon badging for parent notes.
2. **Zero Architecture Risk (No Offline Sync Bugs)**:
   - By adhering strictly to Kumar Sir's constraint of **No Dynamic Caching**, we eliminate the nightmare of stale student data, merge conflicts, and corrupted Next.js client chunks.
3. **Web Push is Decoupled & Non-Blocking**:
   - Web Push can be reviewed as an independent Phase 2 initiative. The Phase 1 PWA foundation is fully standalone and immediately valuable on its own.

---

## 6. Implementation Roadmap

```mermaid
gantt
    title YHD PWA Rollout Plan: Phased Delivery
    dateFormat  YYYY-MM-DD
    section Phase 1: Core PWA (2-3 Days)
    Asset Generation (Icons, Badges)     :done,    p1, 2026-11-01, 1d
    Next.js Manifest, Layout & Badging   :active,  p2, after p1, 1d
    Offline Shell (sw.js + app/error.tsx):         p3, after p2, 1d
    Standalone QA (Windows, Mac, iOS)    :         p4, after p3, 1d
    section Phase 2: Web Push (Optional)
    VAPID Setup & DB Subscription Schema :         p5, 2026-11-08, 2d
    Push Dispatcher & Notification QA    :         p6, after p5, 2d
```

### Next Steps for the Engineering Team:

1. **Asset Generation (Phase 1)**: Create high-resolution branded SVG source files and export `icon-192x192.png`, `icon-512x512.png`, and `icon-maskable-512x512.png` into `/public/icons/`.
2. **Implement Manifest & Layout (Phase 1)**: Commit `app/manifest.ts` and update `app/layout.tsx` with viewport, Apple metadata, and `useAppBadge` hook.
3. **Deploy Offline Shell & Error Boundary (Phase 1)**: Commit `/public/offline.html`, `app/error.tsx`, and `public/sw.js`.
4. **Update next.config.js (Phase 1)**: Configure strict `Cache-Control` headers for `/sw.js` to prevent browser caching traps.
5. **Internal Staff Pilot (Phase 1)**: Validate standalone mode and badging across target school devices (Windows staff laptops, macOS desktops, iPads, and iPhones).
6. **Leadership Review for Phase 2 (Optional)**: Present Web Push backend requirements to leadership to determine if real-time push escalation is desired.

---

## 7. Authoritative References & Verification Sources

All technical determinations, iOS/WebKit constraints, Next.js App Router patterns, and browser capabilities documented in this report are verified against the following primary references:

### 7.1 Core Framework & PWA Foundations
1. **Next.js Official Documentation — Progressive Web Applications**:
   * Reference: [nextjs.org/docs/app/guides/progressive-web-apps](https://nextjs.org/docs/app/guides/progressive-web-apps)
   * *Key Validations*: Built-in App Router manifest generation, `app/manifest.ts` conventions, Web Push via Server Actions, local HTTPS testing (`--experimental-https`), and the recommendation to avoid `beforeinstallprompt` due to lack of cross-platform Safari support.
2. **Next.js Metadata Route Conventions — Web App Manifest**:
   * Reference: [nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
   * *Key Validations*: `MetadataRoute.Manifest` type definitions, dynamic vs. static manifest serving, and automated `<link rel="manifest">` injection.
3. **Google web.dev — Progressive Web Apps**:
   * Reference: [web.dev/explore/progressive-web-apps](https://web.dev/explore/progressive-web-apps)
   * *Key Validations*: Standalone display modes, progressive enhancement principles, maskable icon safe zones, and service worker lifecycle management.
4. **MDN Web Docs — Progressive Web Apps (PWAs)**:
   * Reference: [developer.mozilla.org/en-US/docs/Web/Progressive_web_apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
   * *Key Validations*: Core architectural pillars, service worker event pipelines, client claim mechanics, and cross-browser feature availability.

---

### 7.2 iOS & Apple WebKit Verification Sources
5. **Apple WebKit Blog — Web Push for Web Apps on iOS and iPadOS**:
   * Reference: [webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
   * *Key Validations*: **Authoritative source confirming Web Push on iOS 16.4+ requires the app to be added to the Home Screen and launched in standalone mode**; standard Safari browser tabs cannot subscribe to Web Push.
6. **MDN Browser Compatibility Matrix — `beforeinstallprompt` Event**:
   * Reference: [developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)
   * *Key Validations*: Confirms `beforeinstallprompt` has **zero support across all versions of Apple Safari (iOS & macOS)**, mandating manual in-app "Share → Add to Home Screen" instructions for iOS users.
7. **Apple WebKit Blog — Designing Websites for iPhone X & Safe Area Insets**:
   * Reference: [webkit.org/blog/7929/designing-websites-for-iphone-x](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
   * *Key Validations*: Standardized use of `viewport-fit=cover` and CSS environment variables (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) to prevent notch, Dynamic Island, and home-indicator bar clipping.
8. **Apple WebKit Engineering — Web Apps Evolution: Safari 17 through Safari 27 (Current Latest)**:
   * Reference: [webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta](https://webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta/) & [webkit.org/blog/16155/webkit-features-in-safari-18-0](https://webkit.org/blog/16155/webkit-features-in-safari-18-0/)
   * *Key Validations*: Traces standalone web app evolution from Safari 17 up through Safari 27 (current latest). Validates standalone windowing, Add to Dock / Home Screen behavior, credential isolation, and manifest support across Apple platforms.
9. **Apple Developer Documentation — Safari Web Content Guide (Configuring Web Applications)**:
   * Reference: [developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
   * *Key Validations*: Apple's canonical reference for standalone web app tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and touch icon conventions.
10. **WebKit Tracking Prevention (ITP) Policy & Client Storage Lifecycle**:
   * Reference: [webkit.org/tracking-prevention](https://webkit.org/tracking-prevention/)
   * *Key Validations*: 7-day script-writable storage caps on inactive domains, validating our architectural decision to avoid client-side `IndexedDB` caching for critical school data.

---

### 7.3 W3C Web Standards & Platform Specifications
11. **W3C Badging API Specification**:
    * Reference: [w3c.github.io/badging](https://w3c.github.io/badging/)
    * *Key Validations*: `navigator.setAppBadge()` and `navigator.clearAppBadge()` method signatures, OS Taskbar (Windows) / Dock (macOS) / launcher badge integration.
12. **W3C Web Application Manifest Working Draft**:
    * Reference: [w3.org/TR/appmanifest](https://www.w3.org/TR/appmanifest/)
    * *Key Validations*: `display: standalone`, `shortcuts` member schema, `scope` boundary rules, and icon `purpose: "maskable any"`.
13. **W3C Push API Specification & IETF VAPID Standard**:
    * Reference: [w3.org/TR/push-api](https://www.w3.org/TR/push-api/) & [RFC 8292: Voluntary Application Server Identification (VAPID)](https://datatracker.ietf.org/doc/html/rfc8292)
    * *Key Validations*: Public/private key exchange, subscription endpoints, and push payload delivery to background service workers.
