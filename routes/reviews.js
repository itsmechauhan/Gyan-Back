/**
 * Reviews API
 * GET/POST /api/reviews
 */

const express = require("express");
const router = express.Router();
const db = require("../database.js");

// GET reviews for a college or course
router.get("/", (req, res) => {
  const collegeId = req.query.college_id ? parseInt(req.query.college_id, 10) : null;
  const courseId = req.query.course_id ? parseInt(req.query.course_id, 10) : null;

  let sql = "SELECT * FROM reviews WHERE 1=1";
  const params = [];

  if (collegeId) {
    sql += " AND college_id = ?";
    params.push(collegeId);
  }
  if (courseId) {
    sql += " AND course_id = ?";
    params.push(courseId);
  }

  sql += " ORDER BY created_at DESC";

  try {
    const rows = db.prepare(sql).all(...params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});



// POST a new review
router.post("/", (req, res) => {
  const { college_id, course_id, student_name, rating, comment } = req.body;

  if (!college_id || !student_name || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: "college_id, student_name, and rating (1-5) are required",
    });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO reviews (college_id, course_id, student_name, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      parseInt(college_id, 10),
      course_id ? parseInt(course_id, 10) : null,
      student_name,
      parseInt(rating, 10),
      comment || null
    );
    const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
