# ⏳ Initiative Flow // DnD Combat Pacing & PWA Turn Timer

**Initiative Flow** is a premium, high-performance pacing tracker designed for D&D (Dungeons & Dragons) tables. Styled in a clean dark-mode visual aesthetic with vivid neon glassmorphism indicators, it acts as a pacing companion to optimize table turns, monitor rule-discussion pauses, and track live session pacing metrics.

Built as an offline-first **Progressive Web Application (PWA)**, Initiative Flow runs locally and can be installed directly as a native standalone app on **Windows** and **Linux (including Arch Linux)**.

---

## ⚡ Key Features

* **Zero-Setup Quick Start**: Bypass heavy configuration. Start a session timer instantly with an empty queue and add players or custom "DM Time" slots on-the-fly as turns come up.
* **Master Party Roster**: Create and manage character presets (assigning custom names, classes, and neon colors) saved locally so they persist across browser restarts.
* **Live Inline Pacing Statistics**: View active turn counts, average turn durations, and cumulative session times attached directly to each participant card in the initiative queue.
* **Dynamic Table Badges**: Awards shift automatically in real time:
  * `👑 Pace Setter`: Assigned to the player with the fastest average turn speed.
  * `💤 Slowpoke`: Assigned to the player with the slowest average turn speed.
  * `🏎️ Record Breaker`: Highlights the player who completed the fastest overall single turn.
  * `⏳ Time Sinker`: Highlights the player who took the slowest overall single turn.
* **Prompted Session Logging**: Save completed encounters under custom names/notes and tag them by type (`Combat`, `Roleplay (RP)`, `Mixed`, or `Other`).
* **Deep Analytics Summary Reports**: Under the **Saved Logs** tab, expand any entry to view:
  * **Pacing Diagnostics**: Computed pacing analysis text evaluating turn flow and active ratios.
  * **Activity Density Splits**: Visual gauges comparing Player vs. DM time, and Active Play vs. Paused/Interruption Time.
  * **Pacing Progression Charts**: Visual round-by-round time distribution bar graphs to map pacing acceleration.
  * **Pacing Consistency (Standard Deviation)**: Calculates mathematical turn-time volatility per player, classifying them as *Steady* or *Volatile*.
  * **Turn Boundaries**: Track absolute fastest and slowest single turn thresholds.

---

## 🛠️ Tech Stack

* **Frontend**: React (Hooks, Context, LocalStorage state hydration)
* **Build System**: Vite (Ultra-fast HMR and bundling)
* **Styling**: Vanilla CSS (Custom properties, CSS Grid, Backdrop blur panel layouts, Glowing neon gradients)
* **PWA**: Service Worker (`sw.js`) caching and web app manifest (`manifest.json`) for offline execution and OS desktop installation.

---

## 🚀 Running Locally

Ensure you have [Node.js](https://nodejs.org/) installed, then execute:

1. **Clone & Navigate**:
   ```bash
   git clone https://github.com/Zelixo/DnD-Timers.git
   cd DnD-Timers
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173/`** in your browser.
4. **Compile Production Build**:
   ```bash
   npm run build
   ```

---

## 🖥️ PWA Desktop Installation

* **Windows / macOS**: Open the app in Chrome or Edge, click the **App Install icon** in the right corner of the address bar.
* **Arch Linux / General Linux**: In Chromium-based browsers, select **"Install Initiative Flow"** from the settings menu.
* Once installed, it runs in a borderless window, works offline, and displays its own application dock icon.
