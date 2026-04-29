/**
 * Admin CRUD API for colleges and courses
 * GET/POST/PUT/DELETE /api/admin/colleges
 * GET/POST/PUT/DELETE /api/admin/courses
 * Password: GyanPradeep@001
 */

const express = require("express");
const router = express.Router();
const db = require("../database.js");
const { pool } = db;
const multer = require("multer");
const xlsx = require("xlsx");
const { createClient } = require('@supabase/supabase-js');

const upload = multer({ storage: multer.memoryStorage() });

// Supabase client for Storage operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Convert SQLite-style "?" placeholders to Postgres "$1, $2, ..." placeholders
function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

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

router.get("/colleges", async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT * FROM colleges ORDER BY id
    `
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/colleges/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows } = await db.query(
      toPgSql("SELECT * FROM colleges WHERE id = ?"),
      [id]
    );
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ success: false, error: "College not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/colleges", async (req, res) => {
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
    const text = toPgSql(`
      INSERT INTO colleges (name, location, type, mode, best_feature, image_url, description, image_gallery, rating, reviews_count, admission_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const values = [
      name,
      location,
      type || "Government",
      mode || "offline",
      best_feature || null,
      image_url || null,
      description || null,
      image_gallery || null,
      rating ?? 4.5,
      reviews_count ?? 0,
      admission_status || "open",
    ];
    const { rows } = await db.query(`${text} RETURNING *`, values);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/colleges/:id", async (req, res) => {
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
  try {
    const { rows: existingRows } = await db.query(
      toPgSql("SELECT * FROM colleges WHERE id = ?"),
      [id]
    );
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ success: false, error: "College not found" });

    const text = toPgSql(`
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
    `);
    const values = [
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
      id,
    ];
    await db.query(text, values);
    const { rows } = await db.query(
      toPgSql("SELECT * FROM colleges WHERE id = ?"),
      [id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/colleges/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    // Delete associated brochure from storage if exists
    if (supabase) {
      const { rows } = await db.query(
        toPgSql("SELECT brochure_url FROM colleges WHERE id = ?"),
        [id]
      );
      if (rows[0]?.brochure_url) {
        const pathMatch = rows[0].brochure_url.match(/brochures\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('brochures').remove([`brochures/${pathMatch[1]}`]);
        }
      }
    }
    
    await db.query(toPgSql("DELETE FROM courses WHERE college_id = ?"), [id]);
    const result = await db.query(
      toPgSql("DELETE FROM colleges WHERE id = ?"),
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ success: false, error: "College not found" });
    res.json({ success: true, message: "College deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- BROCHURE UPLOAD/DELETE ---

// Upload brochure for a college
router.post("/colleges/:id/brochure", upload.single("brochure"), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No brochure file uploaded" });
  }

  if (!supabase) {
    return res.status(500).json({ success: false, error: "Supabase not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    // Check if college exists
    const { rows: collegeRows } = await db.query(
      toPgSql("SELECT id, brochure_url FROM colleges WHERE id = ?"),
      [id]
    );
    
    if (!collegeRows[0]) {
      return res.status(404).json({ success: false, error: "College not found" });
    }

    // Delete old brochure if exists
    if (collegeRows[0].brochure_url) {
      const oldPathMatch = collegeRows[0].brochure_url.match(/brochures\/(.+)$/);
      if (oldPathMatch) {
        await supabase.storage.from('brochures').remove([`brochures/${oldPathMatch[1]}`]);
      }
    }

    // Create unique filename: college-{id}-{timestamp}.{ext}
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `college-${id}-${Date.now()}.${fileExt}`;
    const filePath = `brochures/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('brochures')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('brochures')
      .getPublicUrl(filePath);

    // Update database
    const updateSql = toPgSql(`
      UPDATE colleges SET
        brochure_url = ?,
        brochure_filename = ?,
        brochure_mime_type = ?
      WHERE id = ?
    `);
    
    await db.query(updateSql, [
      publicUrl,
      req.file.originalname,
      req.file.mimetype,
      id
    ]);

    // Return updated college
    const { rows } = await db.query(
      toPgSql("SELECT * FROM colleges WHERE id = ?"),
      [id]
    );

    res.json({ 
      success: true, 
      message: "Brochure uploaded successfully",
      data: rows[0] 
    });

  } catch (err) {
    console.error("Brochure upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete brochure for a college
router.delete("/colleges/:id/brochure", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  try {
    // Get current brochure info
    const { rows } = await db.query(
      toPgSql("SELECT brochure_url FROM colleges WHERE id = ?"),
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ success: false, error: "College not found" });
    }

    const brochureUrl = rows[0].brochure_url;
    
    if (brochureUrl && supabase) {
      // Extract path from URL (assumes format: .../brochures/filename)
      const pathMatch = brochureUrl.match(/brochures\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('brochures').remove([`brochures/${pathMatch[1]}`]);
      }
    }

    // Clear DB fields
    await db.query(
      toPgSql("UPDATE colleges SET brochure_url = NULL, brochure_filename = NULL, brochure_mime_type = NULL WHERE id = ?"),
      [id]
    );

    res.json({ success: true, message: "Brochure removed successfully" });
  } catch (err) {
    console.error("Brochure delete error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- COURSES CRUD ---

router.get("/courses", async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT co.*, c.name as college_name, c.location
      FROM courses co
      JOIN colleges c ON c.id = co.college_id
      ORDER BY co.college_id, co.id
    `
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/courses/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const text = toPgSql(`
    SELECT co.*, c.name as college_name, c.location
    FROM courses co
    JOIN colleges c ON c.id = co.college_id
    WHERE co.id = ?
  `);
    const { rows } = await db.query(text, [id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, error: "Course not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/courses", async (req, res) => {
  const { college_id, name, duration, total_fees, best_feature, location, specialization, features } = req.body;
  if (!college_id || !name || !duration || total_fees == null) {
    return res.status(400).json({ success: false, error: "college_id, name, duration, total_fees required" });
  }
  try {
    const featuresValue = features ? (typeof features === "string" ? features : JSON.stringify(features)) : null;
    const text = toPgSql(`
      INSERT INTO courses (college_id, name, duration, total_fees, best_feature, location, specialization, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const values = [
      college_id,
      name,
      duration,
      parseInt(total_fees, 10),
      best_feature || null,
      location || null,
      specialization || null,
      featuresValue || null,
    ];
    const { rows } = await db.query(`${text} RETURNING *`, values);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/courses/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { college_id, name, duration, total_fees, best_feature, location, specialization, features } = req.body;
  try {
    const { rows: existingRows } = await db.query(
      toPgSql("SELECT * FROM courses WHERE id = ?"),
      [id]
    );
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ success: false, error: "Course not found" });

    const featuresValue =
      features !== undefined
        ? typeof features === "string"
          ? features
          : JSON.stringify(features)
        : existing.features;

    const text = toPgSql(`
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
    `);
    const values = [
      college_id || existing.college_id,
      name || existing.name,
      duration || existing.duration,
      total_fees !== undefined ? parseInt(total_fees, 10) : existing.total_fees,
      best_feature !== undefined ? best_feature : existing.best_feature,
      location !== undefined ? location : existing.location,
      specialization !== undefined ? specialization : existing.specialization,
      featuresValue,
      id,
    ];
    await db.query(text, values);
    const { rows } = await db.query(
      toPgSql("SELECT * FROM courses WHERE id = ?"),
      [id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/courses/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await db.query(
    toPgSql("DELETE FROM courses WHERE id = ?"),
    [id]
  );
  if (result.rowCount === 0)
    return res.status(404).json({ success: false, error: "Course not found" });
  res.json({ success: true, message: "Course deleted" });
});

// --- ENQUIRIES (ADMIN) ---

router.get("/enquiries", async (req, res) => {
  try {
    const { rows } = await db.query(
      `
        SELECT *
        FROM enquiries
        ORDER BY created_at DESC, id DESC
      `
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/enquiries/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await db.query(
      toPgSql("DELETE FROM enquiries WHERE id = ?"),
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ success: false, error: "Enquiry not found" });
    res.json({ success: true, message: "Enquiry deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- IMPORT / EXPORT COLLEGES & COURSES (Excel / CSV) ---


// Import colleges from Excel/CSV
router.post("/colleges/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const insertSql = toPgSql(`
      INSERT INTO colleges 
      (name, location, type, mode, best_feature, image_url, description, image_gallery, rating, reviews_count, admission_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateSql = toPgSql(`
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

    const summary = { inserted: 0, updated: 0 };
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const row of rows) {
        const rawId = row.id || row.ID || "";
        const id = String(rawId).trim() !== "" ? parseInt(rawId, 10) : null;

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

        if (!name || !location) continue;

        let existingId = null;

        if (id) {
          const { rows: byId } = await client.query(
            toPgSql("SELECT id FROM colleges WHERE id = ?"),
            [id]
          );
          if (byId[0]) existingId = byId[0].id;
        }

        if (!existingId) {
          const { rows: byNameLoc } = await client.query(
            toPgSql("SELECT id FROM colleges WHERE name = ? AND location = ?"),
            [name, location]
          );
          if (byNameLoc[0]) existingId = byNameLoc[0].id;
        }

        if (existingId) {
          await client.query(updateSql, [
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
            existingId,
          ]);
          summary.updated++;
        } else {
          await client.query(insertSql, [
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
          ]);
          summary.inserted++;
        }
      }

      await client.query("COMMIT");
    } catch (innerErr) {
      await client.query("ROLLBACK");
      throw innerErr;
    } finally {
      client.release();
    }

    res.json({ success: true, summary });
  } catch (err) {
    console.error("Colleges import failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export all colleges as Excel
router.get("/colleges-export", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM colleges ORDER BY id");
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
router.post("/courses/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const insertSql = toPgSql(`
      INSERT INTO courses 
      (college_id, name, duration, total_fees, best_feature, location, specialization, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateSql = toPgSql(`
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

    const summary = { inserted: 0, updated: 0, skipped: 0 };
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const row of rows) {
        const rawId = row.id || row.ID || "";
        const id = String(rawId).trim() !== "" ? parseInt(rawId, 10) : null;

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
          continue;
        }

        // FOREIGN KEY CHECK (important)
        const { rows: collegeRows } = await client.query(
          toPgSql("SELECT id FROM colleges WHERE id = ?"),
          [college_id]
        );
        if (!collegeRows[0]) {
          console.log("Invalid college_id:", college_id);
          summary.skipped++;
          continue;
        }

        if (id) {
          const { rows: existingRows } = await client.query(
            toPgSql("SELECT id FROM courses WHERE id = ?"),
            [id]
          );
          if (existingRows[0]) {
            await client.query(updateSql, [
              college_id,
              name,
              duration,
              total_fees,
              best_feature,
              location,
              specialization,
              features,
              id,
            ]);
            summary.updated++;
            continue;
          }
        }

        await client.query(insertSql, [
          college_id,
          name,
          duration,
          total_fees,
          best_feature,
          location,
          specialization,
          features,
        ]);
        summary.inserted++;
      }

      await client.query("COMMIT");
    } catch (innerErr) {
      await client.query("ROLLBACK");
      throw innerErr;
    } finally {
      client.release();
    }

    res.json({ success: true, summary });
  } catch (err) {
    console.error("Courses import failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export all courses as Excel
router.get("/courses-export", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM courses ORDER BY id");
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