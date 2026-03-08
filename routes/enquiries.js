/**
 * Enquiries API
 * Public: POST /api/enquiries
 * Admin: GET /api/enquiries
 */

require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../database.js");
const nodemailer = require("nodemailer");

// Convert SQLite-style "?" placeholders to Postgres "$1, $2, ..." placeholders
function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/* ================================
   ENV VARIABLES
================================ */
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NOTIFY_EMAIL_TO = process.env.NOTIFY_EMAIL_TO || SMTP_USER;

/* ================================
   MAIL TRANSPORTER (Zoho Ready)
================================ */
let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS, // MUST be Zoho App Password
    },
  });

  // Verify connection at startup
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Connection Error:", error.message);
    } else {
      console.log("SMTP Server is ready to send emails");
    }
  });
}

/* ================================
   SEND EMAIL FUNCTION
================================ */
async function sendEnquiryEmail(enquiry) {
  if (!transporter || !NOTIFY_EMAIL_TO) {
    console.warn("Email not configured. Skipping email send.");
    return;
  }

  const subject = `New Course Enquiry from ${enquiry.name}`;

  const textBody = `
New Course Enquiry

Name: ${enquiry.name}
Course Level: ${enquiry.course_level}
Location: ${enquiry.location || "N/A"}
Phone: ${enquiry.phone}
College ID: ${enquiry.college_id || "N/A"}
Course ID: ${enquiry.course_id || "N/A"}

Message:
${enquiry.message || "No message provided"}
`;

  await transporter.sendMail({
    from: `"Enquiry System" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL_TO,
    subject,
    text: textBody,
  });
}

/* ================================
   ADMIN: GET ALL ENQUIRIES
================================ */
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM enquiries ORDER BY id DESC"
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Failed to fetch enquiries:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* ================================
   PUBLIC: CREATE ENQUIRY
================================ */
router.post("/", async (req, res) => {
  const {
    college_id,
    course_id,
    name,
    course_level,
    location,
    phone,
    message,
  } = req.body || {};

  if (!name || !course_level || !phone) {
    return res.status(400).json({
      success: false,
      error: "name, course_level and phone are required",
    });
  }

  try {
    const text = toPgSql(`
      INSERT INTO enquiries 
      (college_id, course_id, name, course_level, location, phone, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const values = [
      college_id ? parseInt(college_id, 10) : null,
      course_id ? parseInt(course_id, 10) : null,
      name,
      course_level,
      location || null,
      String(phone),
      message || null
    ];

    const { rows } = await db.query(`${text} RETURNING *`, values);
    const row = rows[0];

    // Send email notification
    try {
      await sendEnquiryEmail(row);
    } catch (mailError) {
      console.error("Failed to send enquiry email:", mailError.message);
    }

    res.status(201).json({
      success: true,
      data: row,
    });
  } catch (err) {
    console.error("Failed to save enquiry:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;