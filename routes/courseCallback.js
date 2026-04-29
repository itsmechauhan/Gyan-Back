/**
 * Course Callback Enquiry API
 * POST /api/course-callback  — Public (save + email)
 * GET  /api/course-callback  — Admin (fetch all)
 */

require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../database.js");
const nodemailer = require("nodemailer");

/* ================================
   HELPER: ? → \$1 \$2 for Postgres
================================ */
function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/* ================================
   ENV VARIABLES
================================ */
const SMTP_HOST       = process.env.SMTP_HOST;
const SMTP_PORT       = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER       = process.env.SMTP_USER;
const SMTP_PASS       = process.env.SMTP_PASS;
const NOTIFY_EMAIL_TO = process.env.NOTIFY_EMAIL_TO || SMTP_USER;

/* ================================
   MAIL TRANSPORTER
================================ */
let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  transporter.verify((error) => {
    if (error) {
      console.error("Course Callback SMTP Error:", error.message);
    } else {
      console.log("Course Callback SMTP ready ✅");
    }
  });
}

/* ================================
   SEND EMAIL FUNCTION
================================ */
async function sendCallbackEmail(data) {
  if (!transporter || !NOTIFY_EMAIL_TO) {
    console.warn("Email not configured. Skipping callback email.");
    return;
  }

  const subject = `✈️ New Course Callback Request from ${data.name}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
            Roboto, sans-serif;
          background: #f5f5f7;
          margin: 0;
          padding: 20px;
        }
        .card {
          background: #ffffff;
          border-radius: 16px;
          max-width: 560px;
          margin: 0 auto;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%);
          padding: 32px 36px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .header p {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          margin: 0;
        }
        .body {
          padding: 32px 36px;
        }
        .badge {
          display: inline-block;
          background: rgba(29, 78, 216, 0.1);
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 100px;
          margin-bottom: 20px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .field {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid #f0f0f5;
        }
        .field:last-child {
          border-bottom: none;
        }
        .field-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(29, 78, 216, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }
        .field-label {
          font-size: 11px;
          font-weight: 700;
          color: #8e8e93;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 3px;
        }
        .field-value {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .footer {
          background: #f5f5f7;
          padding: 18px 36px;
          text-align: center;
          font-size: 12px;
          color: #8e8e93;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="card">

        <div class="header">
          <h1>✈️ New Callback Request</h1>
          <p>Aviation &amp; Hospitality Courses — GYANGANGA Education</p>
        </div>

        <div class="body">
          <div style="text-align:center;">
            <span class="badge">New Lead</span>
          </div>

          <div class="field">
            <div class="field-icon">👤</div>
            <div>
              <div class="field-label">Full Name</div>
              <div class="field-value">${data.name}</div>
            </div>
          </div>

          <div class="field">
            <div class="field-icon">📧</div>
            <div>
              <div class="field-label">Email Address</div>
              <div class="field-value">${data.email || "Not provided"}</div>
            </div>
          </div>

          <div class="field">
            <div class="field-icon">📞</div>
            <div>
              <div class="field-label">Phone Number</div>
              <div class="field-value">${data.phone}</div>
            </div>
          </div>

          <div class="field">
            <div class="field-icon">🕐</div>
            <div>
              <div class="field-label">Submitted At</div>
              <div class="field-value">
                ${new Date().toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </div>
            </div>
          </div>

        </div>

        <div class="footer">
          Sent automatically by GYANGANGA Education CRM<br/>
          Aviation &amp; Hospitality Courses Page
        </div>

      </div>
    </body>
    </html>
  `;

  const textBody = `
New Course Callback Request
============================
Name  : ${data.name}
Email : ${data.email || "Not provided"}
Phone : ${data.phone}
Time  : ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
  `.trim();

  await transporter.sendMail({
    from: `"GYANGANGA Education" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL_TO,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

/* ================================
   CREATE TABLE IF NOT EXISTS
================================ */
async function ensureTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "Aviation_Callback_enquiry" (
        id         SERIAL       PRIMARY KEY,
        name       TEXT         NOT NULL,
        email      TEXT,
        phone      TEXT         NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Table "Aviation_Callback_enquiry" ready ✅');
  } catch (err) {
    console.error(
      "Failed to create Aviation_Callback_enquiry table:",
      err.message
    );
  }
}

ensureTable();

/* ================================
   ADMIN: GET ALL
================================ */
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM "Aviation_Callback_enquiry" ORDER BY id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Failed to fetch course callbacks:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================================
   PUBLIC: CREATE
================================ */
router.post("/", async (req, res) => {
  const { name, email, phone } = req.body || {};

  /* Validation */
  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      error: "name and phone are required",
    });
  }

  if (String(phone).replace(/\D/g, "").length < 10) {
    return res.status(400).json({
      success: false,
      error: "Please enter a valid 10-digit phone number",
    });
  }

  try {
    const sql = toPgSql(`
      INSERT INTO "Aviation_Callback_enquiry" (name, email, phone)
      VALUES (?, ?, ?)
    `);

    const values = [
      String(name).trim(),
      email ? String(email).trim() : null,
      String(phone).trim(),
    ];

    const { rows } = await db.query(`${sql} RETURNING *`, values);
    const row = rows[0];

    /* Send email — non-blocking */
    sendCallbackEmail(row).catch((err) => {
      console.error("Callback email failed:", err.message);
    });

    res.status(201).json({
      success: true,
      message: "Callback request received! We will contact you soon.",
      data: row,
    });
  } catch (err) {
    console.error("Failed to save course callback:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;