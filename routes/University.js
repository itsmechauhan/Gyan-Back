/**
 * GET /api/university
 * Returns university listings from colleges table only
 */

const express = require("express");
const router = express.Router();
const db = require("../database.js");

// Convert SQLite-style "?" placeholders to Postgres "$1, $2, ..." placeholders
function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}


/* ===============================
GET ALL UNIVERSITIES
================================*/

router.get("/", async (req, res) => {

  const location = (req.query.location || "").trim().toLowerCase();
  const mode = (req.query.mode || "").toLowerCase();

  let sql = `
    SELECT
      id,
      name as college_name,
      location,
      type,
      mode,
      best_feature,
      image_url,
      description,
      image_gallery,
      rating,
      reviews_count,
      COALESCE(admission_status,'open') as admission_status
    FROM colleges
    WHERE 1=1
  `;

  const params = [];


  if (location) {
    sql += " AND LOWER(location) LIKE ?";
    params.push(`%${location}%`);
  }

  if (mode === "online" || mode === "offline") {
    sql += " AND LOWER(mode) = ?";
    params.push(mode);
  }

  sql += " ORDER BY rating DESC";


  try {

    const { rows } = await db.query(toPgSql(sql), params);

    const data = rows.map((r) => ({

      id: r.id,

      college_id: r.id,

      college_name: r.college_name,

      location: r.location,

      type: r.type,

      mode: r.mode,

      best_feature: r.best_feature,

      description: r.description,

      image_url: r.image_url,

      image_gallery: (() => {
        if (!r.image_gallery) return [];
        try {
          const parsed = JSON.parse(r.image_gallery);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),

      rating: r.rating || 4.5,

      reviews_count: r.reviews_count || 0,

      admission_status: r.admission_status || "open",

    }));


    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});


/* ===============================
SEARCH COLLEGES (ADMIN)
================================*/

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

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});


module.exports = router;