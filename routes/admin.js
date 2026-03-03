/**
 * Admin CRUD API for colleges and courses
 * GET/POST/PUT/DELETE /api/admin/colleges
 * GET/POST/PUT/DELETE /api/admin/courses
 * Password: GyanPradeep@001
 */

const express = require("express");
const router = express.Router();
const db = require("../database.js");
const multer = require("multer");
const xlsx = require("xlsx");

const upload = multer({ storage: multer.memoryStorage() });

const ADMIN_PASSWORD = "GyanPradeep@001";

// Middleware to check admin password
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized. Password required." });
  }
  const token = authHeader.substring(7);
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Invalid password." });
  }
  next();
};

// Login endpoint (no auth required) - must be defined before middleware
router.post("/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: "Login successful", token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ success: false, error: "Invalid password" });
  }
});

// Apply auth middleware to all routes except login
router.use((req, res, next) => {
  // Skip auth for login route
  if (req.path === "/login" && req.method === "POST") {
    return next();
  }
  requireAuth(req, res, next);
});

// --- COLLEGES CRUD ---

router.get("/colleges", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM colleges ORDER BY id
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/colleges/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare("SELECT * FROM colleges WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ success: false, error: "College not found" });
  res.json({ success: true, data: row });
});

router.post("/colleges", (req, res) => {
  const {
    name,
    location,
    type,
    mode,
    best_feature,
    image_url,
    description,
    image_gallery,
    rating,
    reviews_count,
    admission_status,
  } = req.body;
  if (!name || !location || !type || !mode) {
    return res.status(400).json({ success: false, error: "name, location, type, mode required" });
  }
  try {
    const stmt = db.prepare(`
      INSERT INTO colleges (name, location, type, mode, best_feature, image_url, description, image_gallery, rating, reviews_count, admission_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name,
      location,
      type || "Government",
      mode || "offline",
      best_feature || null,
      image_url || null,
      description || null,
      image_gallery || null,
      rating || 4.5,
      reviews_count || 0,
      admission_status || "open"
    );
    const row = db.prepare("SELECT * FROM colleges WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/colleges/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    name,
    location,
    type,
    mode,
    best_feature,
    image_url,
    description,
    image_gallery,
    rating,
    reviews_count,
    admission_status,
  } = req.body;
  const existing = db.prepare("SELECT * FROM colleges WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ success: false, error: "College not found" });

  try {
    db.prepare(`
      UPDATE colleges SET
        name = COALESCE(?, name),
        location = COALESCE(?, location),
        type = COALESCE(?, type),
        mode = COALESCE(?, mode),
        best_feature = ?,
        image_url = ?,
        description = ?,
        image_gallery = ?,
        rating = COALESCE(?, rating),
        reviews_count = COALESCE(?, reviews_count),
        admission_status = COALESCE(?, admission_status)
      WHERE id = ?
    `).run(
      name || existing.name,
      location || existing.location,
      type || existing.type,
      mode || existing.mode,
      best_feature !== undefined ? best_feature : existing.best_feature,
      image_url !== undefined ? image_url : existing.image_url,
      description !== undefined ? description : existing.description,
      image_gallery !== undefined ? image_gallery : existing.image_gallery,
      rating !== undefined ? rating : existing.rating,
      reviews_count !== undefined ? reviews_count : existing.reviews_count,
      admission_status !== undefined ? admission_status : (existing.admission_status || "open"),
      id
    );
    const row = db.prepare("SELECT * FROM colleges WHERE id = ?").get(id);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/colleges/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    db.prepare("DELETE FROM courses WHERE college_id = ?").run(id);
    const result = db.prepare("DELETE FROM colleges WHERE id = ?").run(id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: "College not found" });
    res.json({ success: true, message: "College deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- COURSES CRUD ---

router.get("/courses", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT co.*, c.name as college_name, c.location
      FROM courses co
      JOIN colleges c ON c.id = co.college_id
      ORDER BY co.college_id, co.id
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/courses/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(`
    SELECT co.*, c.name as college_name, c.location
    FROM courses co
    JOIN colleges c ON c.id = co.college_id
    WHERE co.id = ?
  `).get(id);
  if (!row) return res.status(404).json({ success: false, error: "Course not found" });
  res.json({ success: true, data: row });
});

router.post("/courses", (req, res) => {
  const { college_id, name, duration, total_fees, best_feature, location, specialization, features } = req.body;
  if (!college_id || !name || !duration || total_fees == null) {
    return res.status(400).json({ success: false, error: "college_id, name, duration, total_fees required" });
  }
  try {
    const featuresValue = features ? (typeof features === "string" ? features : JSON.stringify(features)) : null;
    const stmt = db.prepare(`
      INSERT INTO courses (college_id, name, duration, total_fees, best_feature, location, specialization, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      college_id,
      name,
      duration,
      parseInt(total_fees, 10),
      best_feature || null,
      location || null,
      specialization || null,
      featuresValue || null
    );
    const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/courses/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { college_id, name, duration, total_fees, best_feature, location, specialization, features } = req.body;
  const existing = db.prepare("SELECT * FROM courses WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ success: false, error: "Course not found" });

  try {
    const featuresValue = features !== undefined 
      ? (typeof features === "string" ? features : JSON.stringify(features))
      : existing.features;
    db.prepare(`
      UPDATE courses SET
        college_id = COALESCE(?, college_id),
        name = COALESCE(?, name),
        duration = COALESCE(?, duration),
        total_fees = COALESCE(?, total_fees),
        best_feature = ?,
        location = ?,
        specialization = ?,
        features = ?
      WHERE id = ?
    `).run(
      college_id || existing.college_id,
      name || existing.name,
      duration || existing.duration,
      total_fees !== undefined ? parseInt(total_fees, 10) : existing.total_fees,
      best_feature !== undefined ? best_feature : existing.best_feature,
      location !== undefined ? location : existing.location,
      specialization !== undefined ? specialization : existing.specialization,
      featuresValue,
      id
    );
    const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(id);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/courses/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db.prepare("DELETE FROM courses WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: "Course not found" });
  res.json({ success: true, message: "Course deleted" });
});

// --- ENQUIRIES (ADMIN) ---

router.get("/enquiries", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT *
        FROM enquiries
        ORDER BY datetime(created_at) DESC, id DESC
      `
      )
      .all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/enquiries/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = db.prepare("DELETE FROM enquiries WHERE id = ?").run(id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: "Enquiry not found" });
    res.json({ success: true, message: "Enquiry deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- IMPORT / EXPORT COLLEGES & COURSES (Excel / CSV) ---


// Import colleges from Excel/CSV
router.post("/colleges/import", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const insertStmt = db.prepare(`
      INSERT INTO colleges 
      (name, location, type, mode, best_feature, image_url, description, image_gallery, rating, reviews_count, admission_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE colleges SET
        name = ?,
        location = ?,
        type = ?,
        mode = ?,
        best_feature = ?,
        image_url = ?,
        description = ?,
        image_gallery = ?,
        rating = ?,
        reviews_count = ?,
        admission_status = ?
      WHERE id = ?
    `);

    const findById = db.prepare("SELECT id FROM colleges WHERE id = ?");
    const findByNameLocation = db.prepare(
      "SELECT id FROM colleges WHERE name = ? AND location = ?"
    );

    const summary = { inserted: 0, updated: 0 };

    const tx = db.transaction(() => {
      rows.forEach((row) => {

        const rawId = row.id || row.ID || "";
        const id = String(rawId).trim() !== "" ? parseInt(rawId) : null;

        const name = row.name || row.Name;
        const location = row.location || row.Location;
        const type = row.type || row.Type || "Government";
        const mode = row.mode || row.Mode || "offline";
        const best_feature = row.best_feature || row.BestFeature || row["Best Feature"] || null;
        const image_url = row.image_url || row.Image || row["Image URL"] || null;
        const description = row.description || row.Description || null;
        const image_gallery = row.image_gallery || row.ImageGallery || row["Image Gallery"] || null;
        const rating = row.rating || row.Rating || 4.5;
        const reviews_count = row.reviews_count || row.ReviewsCount || 0;
        const admission_status = row.admission_status || row.AdmissionStatus || "open";

        if (!name || !location) return;

        let existing = null;

        // 🔎 First check by ID (if given)
        if (id) {
          existing = findById.get(id);
        }

        // 🔎 If no ID match, check by name + location
        if (!existing) {
          existing = findByNameLocation.get(name, location);
        }

        if (existing) {
          updateStmt.run(
            name,
            location,
            type,
            mode,
            best_feature,
            image_url,
            description,
            image_gallery,
            rating,
            reviews_count,
            admission_status,
            existing.id
          );
          summary.updated++;
        } else {
          insertStmt.run(
            name,
            location,
            type,
            mode,
            best_feature,
            image_url,
            description,
            image_gallery,
            rating,
            reviews_count,
            admission_status
          );
          summary.inserted++;
        }

      });
    });

    tx();

    res.json({ success: true, summary });

  } catch (err) {
    console.error("Colleges import failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export all colleges as Excel
router.get("/colleges-export", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM colleges ORDER BY id").all();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Colleges");
    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", "attachment; filename=colleges.xlsx");
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error("Colleges export failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Import courses from Excel/CSV
router.post("/courses/import", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const insertStmt = db.prepare(`
      INSERT INTO courses 
      (college_id, name, duration, total_fees, best_feature, location, specialization, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE courses SET
        college_id = ?,
        name = ?,
        duration = ?,
        total_fees = ?,
        best_feature = ?,
        location = ?,
        specialization = ?,
        features = ?
      WHERE id = ?
    `);

    const findCourseById = db.prepare("SELECT id FROM courses WHERE id = ?");
    const findCollege = db.prepare("SELECT id FROM colleges WHERE id = ?");

    const summary = { inserted: 0, updated: 0, skipped: 0 };

    const tx = db.transaction(() => {
      rows.forEach((row) => {

        const rawId = row.id || row.ID || "";
        const id = String(rawId).trim() !== "" ? parseInt(rawId) : null;

        const college_id = parseInt(
          row.college_id || row.CollegeId || row["College ID"],
          10
        );

        const name = row.name || row.Name;
        const duration = row.duration || row.Duration;
        const total_fees = parseInt(
          row.total_fees || row.TotalFees || row["Total Fees"],
          10
        );

        const best_feature = row.best_feature || row.BestFeature || row["Best Feature"] || null;
        const location = row.location || row.Location || null;
        const specialization = row.specialization || row.Specialization || null;
        let features = row.features || row.Features || null;

        if (Array.isArray(features)) {
          features = JSON.stringify(features);
        }

        // Required validation
        if (!college_id || !name || !duration || !total_fees) {
          summary.skipped++;
          return;
        }

        // FOREIGN KEY CHECK (important)
        const collegeExists = findCollege.get(college_id);
        if (!collegeExists) {
          console.log("Invalid college_id:", college_id);
          summary.skipped++;
          return;
        }

        // 🔹 UPDATE only if ID exists in DB
        if (id) {
          const existing = findCourseById.get(id);
          if (existing) {
            updateStmt.run(
              college_id,
              name,
              duration,
              total_fees,
              best_feature,
              location,
              specialization,
              features,
              id
            );
            summary.updated++;
            return;
          }
        }

        // 🔹 Otherwise INSERT
        insertStmt.run(
          college_id,
          name,
          duration,
          total_fees,
          best_feature,
          location,
          specialization,
          features
        );
        summary.inserted++;

      });
    });

    tx();

    res.json({ success: true, summary });

  } catch (err) {
    console.error("Courses import failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



// Export all courses as Excel
router.get("/courses-export", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM courses ORDER BY id").all();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Courses");
    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", "attachment; filename=courses.xlsx");
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error("Courses export failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
