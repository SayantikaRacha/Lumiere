<!-- Banner -->
<p align="center">
  <img src="Banner.png" alt="Lumière Banner" width="100%">
</p>

# 🌫️ Lumière — Every Version Teaches Something

> **A high-end 3D aesthetic creative studio for bespoke digital invitations, cinematic photo grading, and curated design goods.**

Lumière began as an experimental project in **Class 11** and has now evolved into an interactive 3D digital studio equipped with mouse-reactive perspectives, an interactive order customizer, an Amazon affiliate showcase, and a robust order management operations desk.

---

## ✨ Features & Architecture

### 1. 🌐 3D Interactive Spatial Aesthetic
- **Dynamic 3D Card Tilt & Glare:** Cards respond to mouse cursor coordinates with smooth 3D perspective shifts and specular light reflections.
- **Cinematic Portfolio Slider:** Horizontal reel of past editing and design works that glides smoothly based on cursor motion and inertia. Clicking any piece opens a cinematic detail lightbox.
- **6 Sophisticated Theme Palettes:**
  - `Studio Paper` — Pure, clean editorial canvas
  - `Wisteria Veil` — Dreamy lilac twilight
  - `Golden Hour` — Warm, nostalgic 5 PM amber
  - `Cachemire` — Tactile neutral silk & linen
  - `Espresso` — Deep roasted umber and warm autumn tones
  - `Bordeaux` — Obsidian and gothic red-wine velvet

### 2. 📝 Interactive Order Customizer
- **Service Selection:** Bespoke Digital Invitations, Aesthetic Photo Edits, Soft-Copy Art, and Visual Keepsakes.
- **Aesthetic Mood Selectors:** Editorial, Vintage Film, Soft-Tech Pastel, Moody Nocturne, Golden Romantic, Custom.
- **Turnaround Speed Options:** Standard (3–5 Days), Priority (48h), Rush Order (24h).
- **Drag & Drop Inspiration Zone:** Clients can attach up to 5 reference photos, palettes, or drafts (up to 15MB each) with instant client-side thumbnail previews.

### 3. 🛍️ Curated Studio Picks & Affiliate Showcase
- Filterable showcase for stationery, ambient desk lighting, K-Pop photocard displays, and custom keychains.
- Seamless outbound affiliate links with Amazon associate disclosure.

### 4. 🗄️ Robust SQLite Database & Multer Backend
- **Database (`lumiere.db`):** Relational storage for orders and file metadata using SQLite with WAL mode.
- **File Upload Engine (`multer`):** Handles multipart upload streams, validates file formats (JPG, PNG, WEBP, GIF, PDF), and securely stores reference images with unique identifiers.
- **Legacy Migration:** Automatically imports past orders from `orders.json` on startup.

### 5. 📊 Studio Orders Desk (`admin.html`)
- **PIN Protected:** Secured with a studio PIN (default: `lumiere2026`, configurable via `ADMIN_PIN` env var).
- **Order Pipeline Tracking:** Manage client requests across `Pending` ➔ `In Progress` ➔ `Review Sent` ➔ `Completed` ➔ `Archived`.
- **Reference Image Lightbox:** Inspect client-attached inspiration photos in full resolution.
- **Quick Reply:** One-click pre-filled email client actions and client clipboard copying.
- **JSON Backup Export:** One-click export of the entire database.

---

## 🚀 Quick Start Guide

### 1. Run Locally
```bash
# Navigate to the project
cd "C:\Users\dassa\OneDrive\Desktop\Projects\Lumiere"

# Install dependencies (Express, SQLite3, Multer, Cors, Nodemailer)
npm install

# Start the studio backend
npm start
```

- **Client Studio:** [http://localhost:5000](http://localhost:5000)
- **Studio Orders Desk (Admin):** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)
  *(Default PIN: `lumiere2026`)*

---

## ☁️ Deployment Guide (Hosting Live on the Web)

### Deploying to Render
1. Push this updated repository to your GitHub:
   ```bash
   git add .
   git commit -m "feat: 3D interactive studio, 6 themes, sqlite backend, and admin desk"
   git push origin main
   ```
2. Log into [Render.com](https://render.com) and link your GitHub repository as a **Web Service**.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Environment Variables:**
   - `ADMIN_PIN`: (Your private studio PIN password)
   - `PORT`: `5000` (or leave default for Render to assign)

---

## 🌱 Philosophy
> *"Every version teaches something. Every project is a learning experience. Every builder starts somewhere."*
