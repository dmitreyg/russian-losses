# Russian Military Losses — Interactive Data Website

Comprehensive tracking of confirmed Russian military personnel and equipment losses in Ukraine, from Feb 24, 2022 to present.

**Live data** · **13 categories** · **Year-by-year analysis** · **Trend forecasting** · **EN / UK**

---

## Features

- Real-time data from `russian-casualties.in.ua` public API
- Year pages for 2022–present with peak/trough detection
- Dynamic forecast for current and next year (linear regression)
- Category analysis page with heatmap, trend overlays, spike rankings
- Dark / Light theme toggle
- English / Ukrainian language toggle

---

## Quick Start (Local Development)

### Requirements
- **Node.js 18 or 20 LTS** — download from [nodejs.org](https://nodejs.org)
- npm (comes with Node)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

The site opens automatically at **http://localhost:5173**

---

## Deploy to Vercel (Free, ~5 minutes)

### Step 1 — Push to GitHub

```bash
# In the project folder:
git init
git add .
git commit -m "initial commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account (free, no credit card)
2. Click **Add New Project**
3. Select your GitHub repository
4. Vercel auto-detects Vite — click **Deploy**
5. Your site is live at `https://your-project.vercel.app` in ~60 seconds

### Step 3 — Auto-deploy on updates

Every `git push` to `main` automatically redeploys. No manual steps needed.

### Optional: Custom domain

In Vercel dashboard → your project → **Settings → Domains** → add your domain for free.

---

## Alternative: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Select your GitHub repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click **Deploy**

---

## Project Structure

```
losses-app/
├── index.html          # HTML entry point
├── vite.config.js      # Vite configuration
├── vercel.json         # Vercel deployment config
├── package.json        # Dependencies
├── .gitignore
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx        # React entry point
    └── App.jsx         # Full application (single file)
```

---

## Data Source

Data provided by [russian-casualties.in.ua](https://russian-casualties.in.ua)  
API endpoint: `https://russian-casualties.in.ua/api/v1/data/json/daily`

All figures represent confirmed and documented losses.  
Forecasts are trend-based projections — not military intelligence assessments.

---

## Phase 8 — Twitter Citations (Pending)

Citation cards for peak and trough months are currently placeholders.  
Real curated tweets will be added in Phase 8 of the project plan.  
See `project-plan.docx` for full details.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build tool | Vite 5 |
| Charts | Recharts |
| Fonts | Syne + JetBrains Mono (Google Fonts) |
| Hosting | Vercel (free tier) |
| Data | russian-casualties.in.ua public API |
