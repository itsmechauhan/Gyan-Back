/**
 * GYANGANGA Education – Backend API
 * Database: SQLite
 * Endpoints: /api/colleges (search + budget filter), /api/admin/* (CRUD)
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

// Initialize database (creates tables and seeds if empty)
require("./database.js");

const collegesRoute = require("./routes/colleges.js");
const adminRoute = require("./routes/admin.js");
const reviewsRoute = require("./routes/reviews.js");
const enquiriesRoute = require("./routes/enquiries.js");

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";
const CORS_ORIGINS = process.env.CORS_ORIGINS || "";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(FRONTEND_ORIGIN ? [FRONTEND_ORIGIN] : []),
  ...CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.use("/api/colleges", collegesRoute);
app.use("/api/admin", adminRoute);
app.use("/api/reviews", reviewsRoute);
app.use("/api/enquiries", enquiriesRoute);

// Serve admin UI static files (optional - we'll build admin in React)
app.get("/api", (req, res) => {
  res.json({
    message: "GYANGANGA Education API",
    endpoints: {
      search: "GET /api/colleges?course=&location=&budget_range=&mode=",
      budgetRanges: "GET /api/colleges/budget-ranges?course=&location=&mode=",
      adminColleges: "GET/POST/PUT/DELETE /api/admin/colleges",
      adminCourses: "GET/POST/PUT/DELETE /api/admin/courses",
    },
  });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
