/**
 * GET /api/colleges
 * Query: course, location, min_fees, max_fees, budget_range, mode (offline|online)
 * Returns flattened course listings (each course-college combo = one result)
 */

const express = require("express");
const router = express.Router();
const db = require("../database.js");

// Convert SQLite-style "?" placeholders to Postgres "$1, $2, ..." placeholders
function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

//seacrh college 

// Budget ranges in INR (like Croma price filter)
const BUDGET_RANGES = [
  { id: "0-50k", min: 0, max: 50000, label: "Up to ₹50,000" },
  { id: "50k-1l", min: 50000, max: 100000, label: "₹50,001 - ₹1,00,000" },
  { id: "1l-2l", min: 100000, max: 200000, label: "₹1,00,001 - ₹2,00,000" },
  { id: "2l-5l", min: 200000, max: 500000, label: "₹2,00,001 - ₹5,00,000" },
  { id: "5l-10l", min: 500000, max: 1000000, label: "₹5,00,001 - ₹10,00,000" },
  { id: "10l-20l", min: 1000000, max: 2000000, label: "₹10,00,001 - ₹20,00,000" },
  { id: "20l-30l", min: 2000000, max: 3000000, label: "₹20,00,001 - ₹30,00,000" },
  { id: "30l+", min: 3000000, max: 999999999, label: "Above ₹30,00,000" },
];

router.get("/", async (req, res) => {
  const course = (req.query.course || "").trim().toLowerCase();
  const location = (req.query.location || "").trim().toLowerCase();
  const specialization = (req.query.specialization || "").trim().toLowerCase();
  const minFees = req.query.min_fees ? parseInt(req.query.min_fees, 10) : null;
  const maxFees = req.query.max_fees ? parseInt(req.query.max_fees, 10) : null;
  const budgetRange = req.query.budget_range || "";
  const mode = (req.query.mode || "").toLowerCase();

  let sql = `
    SELECT 
      c.id as college_id,
      c.name as college_name,
      c.location as college_location,
      c.type,
      c.mode,
      c.best_feature as college_best_feature,
      c.image_url,
      c.description as college_description,
      c.image_gallery as college_image_gallery,
      c.rating,
      c.reviews_count,
      COALESCE(c.admission_status, 'open') as admission_status,
      co.id as course_id,
      co.name as course_name,
      co.duration,
      co.total_fees,
      co.best_feature as course_best_feature,
      co.features as course_features,
      co.specialization,
      COALESCE(co.location, c.location) as location
    FROM colleges c
    JOIN courses co ON co.college_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (course) {
    sql += " AND (LOWER(co.name) LIKE ? OR LOWER(co.name) LIKE ?)";
    params.push(`%${course}%`, `%${course.replace(/ /g, "%")}%`);
  }
  if (location) {
    sql += " AND (LOWER(c.location) LIKE ? OR LOWER(co.location) LIKE ?)";
    params.push(`%${location}%`, `%${location}%`);
  }
  if (specialization) {
    sql += " AND LOWER(co.specialization) LIKE ?";
    params.push(`%${specialization}%`);
  }
  if (mode === "offline" || mode === "online") {
    sql += " AND LOWER(c.mode) = ?";
    params.push(mode);
  }
  if (minFees != null && !isNaN(minFees)) {
    sql += " AND co.total_fees >= ?";
    params.push(minFees);
  }
  if (maxFees != null && !isNaN(maxFees)) {
    sql += " AND co.total_fees <= ?";
    params.push(maxFees);
  }
  if (budgetRange) {
    const range = BUDGET_RANGES.find((r) => r.id === budgetRange);
    if (range) {
      sql += " AND co.total_fees >= ? AND co.total_fees <= ?";
      params.push(range.min, range.max);
    }
  }

  sql += " ORDER BY co.total_fees ASC, c.rating DESC";

  try {
    const { rows } = await db.query(toPgSql(sql), params);

    const data = rows.map((r) => ({
      id: `${r.college_id}-${r.course_id}`,
      college_id: r.college_id,
      college_name: r.college_name,
      location: r.location || r.college_location,
      college_location: r.college_location,
      type: r.type,
      mode: r.mode,
      college_best_feature: r.college_best_feature,
      college_description: r.college_description,
      college_image_gallery: (() => {
        if (!r.college_image_gallery) return [];
        try {
          const parsed = JSON.parse(r.college_image_gallery);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      course_id: r.course_id,
      course_name: r.course_name,
      duration: r.duration,
      total_fees: r.total_fees,
      course_best_feature: r.course_best_feature,
      course_features: r.course_features ? (() => {
        try {
          return JSON.parse(r.course_features);
        } catch {
          return r.course_features ? [r.course_features] : [];
        }
      })() : [],
      specialization: r.specialization,
      best_feature: r.course_best_feature || r.college_best_feature,
      features: (() => {
        try {
          const parsed = r.course_features ? JSON.parse(r.course_features) : [];
          return Array.isArray(parsed) && parsed.length > 0 ? parsed : (r.course_best_feature ? [r.course_best_feature] : []);
        } catch {
          return r.course_best_feature ? [r.course_best_feature] : [];
        }
      })(),
      image_url: r.image_url,
      rating: r.rating || 4.5,
      reviews_count: r.reviews_count || 0,
      admission_status: r.admission_status || "open",
    }));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//get all colleges for admin panel
router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.json({ success: true, data: [] });
  }

  try {
    const text = toPgSql(
      `SELECT id, name FROM colleges WHERE name LIKE ? LIMIT 10`
    );
    const { rows } = await db.query(text, [`%${q}%`]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET budget ranges for filter UI
router.get("/budget-ranges", async (req, res) => {
  const course = (req.query.course || "").trim().toLowerCase();
  const location = (req.query.location || "").trim().toLowerCase();
  const mode = (req.query.mode || "").toLowerCase();

  let baseSql = `
    SELECT co.total_fees
    FROM colleges c
    JOIN courses co ON co.college_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (course) {
    baseSql += " AND (LOWER(co.name) LIKE ? OR LOWER(co.name) LIKE ?)";
    params.push(`%${course}%`, `%${course.replace(/ /g, "%")}%`);
  }
  if (location) {
    baseSql += " AND LOWER(c.location) LIKE ?";
    params.push(`%${location}%`);
  }
  if (mode === "offline" || mode === "online") {
    baseSql += " AND LOWER(c.mode) = ?";
    params.push(mode);
  }

  try {
    const { rows } = await db.query(toPgSql(baseSql), params);
    const feesList = rows.map((r) => r.total_fees);

    const rangesWithCount = BUDGET_RANGES.map((r) => {
      const count = feesList.filter((f) => f >= r.min && f <= r.max).length;
      return { ...r, count };
    }).filter((r) => r.count > 0);

    res.json({ success: true, data: rangesWithCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all unique course names for dropdown
router.get("/course-list", async (req, res) => {
  try {
    const text = `
      SELECT DISTINCT name as course_name
      FROM courses
      ORDER BY name
    `;
    const { rows } = await db.query(text);
    res.json({ success: true, data: rows.map((r) => r.course_name) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all specializations for dropdown
router.get("/specializations", async (req, res) => {
  try {
    const text = `
      SELECT DISTINCT specialization
      FROM courses
      WHERE specialization IS NOT NULL AND specialization != ''
      ORDER BY specialization
    `;
    const { rows } = await db.query(text);
    res.json({ success: true, data: rows.map((r) => r.specialization) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.BUDGET_RANGES = BUDGET_RANGES;
