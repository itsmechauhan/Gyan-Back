/**
 * GYANGANGA Education – Backend API
 * Database: SQLite
 */

const express = require("express");
const cors = require("cors");
require("./database.js");

const collegesRoute = require("./routes/colleges.js");
const adminRoute = require("./routes/admin.js");
const reviewsRoute = require("./routes/reviews.js");
const enquiriesRoute = require("./routes/enquiries.js");

const app = express();
const PORT = process.env.PORT || 5000;

/* =============================
   CORS CONFIGURATION (FINAL)
============================= */

const allowedOrigins = [
  "https://gyangangaeducation.in",
  "https://www.gyangangaeducation.in",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

/* =============================
   MIDDLEWARE
============================= */

app.use(express.json());

/* =============================
   ROUTES
============================= */

app.use("/api/colleges", collegesRoute);
app.use("/api/admin", adminRoute);
app.use("/api/reviews", reviewsRoute);
app.use("/api/enquiries", enquiriesRoute);

/* =============================
   TEST ROUTE
============================= */

app.get("/api", (req, res) => {
  res.json({
    message: "GYANGANGA Education API Running 🚀",
  });
});

/* =============================
   START SERVER
============================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});