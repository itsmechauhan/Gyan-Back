# GYANGANGA Education – Backend API

This folder is the **backend/API** for GYANGANGA Education. It lives **outside** the main frontend project (`gyanganga-education`) so you can:

- Upload the **frontend** (Vite build) to Hostinger (e.g. `public_html`)
- Run this **API** on Hostinger Node hosting, or on a VPS, or any server that supports Node.js

## Setup

```bash
cd gyanganga-api
npm install
```

## Run locally

```bash
npm start
```

API will be at `http://localhost:4000`. Use `.env` to set `PORT` and `FRONTEND_ORIGIN` if needed.

## Deploying to Hostinger

1. **Frontend (gyanganga-education)**  
   - Run `npm run build` inside `gyanganga-education`  
   - Upload the contents of `dist/` to your domain’s `public_html` (or subdomain root).

2. **Backend (this folder)**  
   - If Hostinger supports Node.js: upload this `gyanganga-api` folder and set start command to `node server.js`.  
   - Or run this API on a VPS / cloud (e.g. Railway, Render, DigitalOcean) and point your frontend to that API URL.

3. **Environment**  
   - Set `FRONTEND_ORIGIN` to your live domain (e.g. `https://gyangangaeducation.in`) so CORS allows your frontend.  
   - Copy `.env.example` to `.env` and set:
     - `PORT` (e.g. 4000 or the port Hostinger gives you)
     - `FRONTEND_ORIGIN=https://yourdomain.com`

## API endpoints

| Method | Path              | Description                    |
|--------|-------------------|--------------------------------|
| GET    | /api/health       | Health check                   |
| GET    | /api/courses      | List courses                   |
| GET    | /api/locations    | List locations                 |
| GET    | /api/search?course=&location= | Search (course + location) |
| POST   | /api/contact      | Submit contact (name, phone, email, message) |

## Database (optional)

Right now the API uses JSON files in `data/` (e.g. `courses.json`, `locations.json`). To use a real database (e.g. MySQL on Hostinger):

1. Install a driver: `npm install mysql2` (or `pg` for PostgreSQL).
2. In `server.js`, replace the `loadJson` usage with DB queries and add a connection to your Hostinger MySQL database.

Your frontend can then call `https://your-api-url.com/api/courses` and `/api/locations` (and other endpoints) from the deployed site.
