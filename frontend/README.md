# Frontend (Pole 3) — ASTRA-SN Mission Planning Console

Aerospace mission planning and candidate site evaluation console for the NASA CLPS & Artemis South Pole landing sites.

---

## 🚀 Capabilities

- **Interactive 3D Moon Landing View**: 3D lunar globe with candidate landing markers, search navigation, custom coordinates, and Google Moon Dribbble-style site overview with connecting line.
- **Local 3D Terrain View**: Real NASA LOLA LDEM_16 (16 px/°) surface topography (128×128 mesh · 32,768 polygons) with grazing solar illumination, touchdown beacon, and lander legs on the datum ($Y = 0$).
- **3D Celestial Horizon View**: 360° sky dome with dynamic Sun and Earth vectors, observer horizon ring, and azimuth/elevation axes.
- **Vertical Left-Docked Celestial Playback**: Interactive vertical timeline with dual Gantt ribbons (Sunlight & Earth LOS), scrub track ($T+0\text{h}$ to $T+\text{totalHours}$), play/pause, speed multipliers ($1\times, 10\times, 60\times$), and step buttons ($\pm 1\text{h}, +24\text{h}$).
- **Miniature 3D Square Viewport Switchers**: Bottom-centered 3D miniature preview thumbnails for 1-click toggling between Local Terrain and Celestial Horizon.
- **Real-Time Telemetry HUD**: Retractable side panel with Sun/Earth azimuth & elevation, local terrain obstruction angles, visibility states (`ILLUMINATED` vs `OCCULTED`, `LINE-OF-SIGHT` vs `OCCULTED`), solar flux %, and validated full-mission metrics.
- **Multi-Site Aerospace Trade Matrix Cockpit**: Side-by-side candidate comparison (e.g., Malapert Massif, Shackleton Ridge, Nobile Rim, Apollo 11) with dynamic Launch Slip Slider ($0\text{d}, +7\text{d}, +14\text{d}, +29.5\text{d}$) and instant metric recalculation.
- **ASTRA Flight AI Copilot**: Context-aware mission assistant grounded in NASA LOLA DEM altimetry and JPL Horizons ephemerides with quick prompt chips.
- **Standardized Backend JSON Contract (`schemaVersion: 1`)**: Built-in data adapter supporting export and synchronization with the backend API.

---

## 🛠️ Stack

- **Framework**: React 19, TypeScript, Vite 6
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **Styling**: Tailwind CSS v4, Lucide Icons, JetBrains Mono & Inter typography
- **State**: Zustand

---

## 📦 Getting Started

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start local development server
npm run dev

# Production build
npm run build
```
