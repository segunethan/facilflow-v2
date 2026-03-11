# FaciliFlow v2 — Africa Prudential

Two-app internal workflow platform.

| App | URL | Port |
|-----|-----|------|
| Staff Portal | app.africaprudential.com | 3000 |
| Admin Console | admin.africaprudential.com | 3001 |

---

## Quick Start (Local)

```bash
# Staff Portal
cd facilflow-user
npm install
npm run dev        # http://localhost:3000

# Admin Console
cd facilflow-admin
npm install
npm run dev        # http://localhost:3001
```

---

## Build for Production

```bash
cd facilflow-user && npm run build   # outputs to facilflow-user/dist/
cd facilflow-admin && npm run build  # outputs to facilflow-admin/dist/
```

---

## Deploy to Vercel (Recommended)

Deploy each app separately as two Vercel projects.

### facilflow-user
- Root directory: `facilflow-user`
- Build command: `npm run build`
- Output directory: `dist`

### facilflow-admin
- Root directory: `facilflow-admin`
- Build command: `npm run build`
- Output directory: `dist`

---

## Project Structure

```
facilflow-v2/
├── facilflow-user/          # Staff Portal
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   └── App.jsx          # Full user platform
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── facilflow-admin/         # Admin Console
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   └── App.jsx          # Full admin platform
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```
