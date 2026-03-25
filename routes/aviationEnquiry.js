require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../database.js");
const nodemailer = require("nodemailer");

/* ================================
   ENV VARIABLES
================================ */
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NOTIFY_EMAIL_TO = process.env.NOTIFY_EMAIL_TO || SMTP_USER;

/* ================================
   TRANSPORTER
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
      console.error("SMTP Error:", error.message);
    } else {
      console.log("SMTP Ready for Aviation Enquiries ✅");
    }
  });
}

/* ================================
   SEND EMAIL
================================ */
async function sendEnquiryEmail(data) {
  if (!transporter || !NOTIFY_EMAIL_TO) {
    console.warn("Email not configured. Skipping.");
    return;
  }

  const subject = `✈️ New Aviation Enquiry from ${data.name}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;
                margin: 0 auto; background: #f8faff;
                border-radius: 12px; overflow: hidden;">

      <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb);
                  padding: 32px 36px;">
        <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 700;">
          ✈️ New Career Consultation Request
        </h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">
          Ascot Asia Aviation Academy
        </p>
      </div>

      <div style="padding: 32px 36px; background: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eef0f8;
                       color: #6b7ab5; font-size: 13px; width: 140px;">
              👤 Full Name
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eef0f8;
                       color: #0d1b5e; font-weight: 600; font-size: 14px;">
              ${data.name}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eef0f8;
                       color: #6b7ab5; font-size: 13px;">
              📧 Email
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eef0f8;
                       color: #0d1b5e; font-size: 14px;">
              ${data.email}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eef0f8;
                       color: #6b7ab5; font-size: 13px;">
              📱 Phone
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eef0f8;
                       color: #0d1b5e; font-size: 14px;">
              ${data.phone}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #6b7ab5; font-size: 13px;">
              🎓 Course Interest
            </td>
            <td style="padding: 12px 0; color: #0d1b5e; font-size: 14px;">
              ${data.course || "Not specified"}
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 20px 36px; background: #f0f4ff;
                  border-top: 1px solid #dde3f5;">
        <p style="margin: 0; color: #9aa3c4; font-size: 12px;">
          Submitted via Ascot Asia website. Please respond within 24 hours.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Ascot Asia Enquiry" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL_TO,
    subject,
    html: htmlBody,
  });
}

/* ================================
   AUTO CREATE TABLE
================================ */
async function ensureTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS aviation_enquiries (
        id        SERIAL PRIMARY KEY,
        name      VARCHAR(255)  NOT NULL,
        email     VARCHAR(255)  NOT NULL,
        phone     VARCHAR(20)   NOT NULL,
        course    VARCHAR(255),
        created_at TIMESTAMPTZ  DEFAULT NOW()
      )
    `);
    console.log("aviation_enquiries table ready ✅");
  } catch (err) {
    console.error("Table creation error:", err.message);
  }
}

ensureTable();

// TEMPORARY TEST ROUTE - remove after testing
router.get("/test-email", async (req, res) => {
  try {
    if (!transporter) {
      return res.json({ 
        success: false, 
        error: "Transporter is NULL - SMTP env vars missing",
        env: {
          SMTP_HOST: process.env.SMTP_HOST ? "✅ Set" : "❌ Missing",
          SMTP_PORT: process.env.SMTP_PORT ? "✅ Set" : "❌ Missing",
          SMTP_USER: process.env.SMTP_USER ? "✅ Set" : "❌ Missing",
          SMTP_PASS: process.env.SMTP_PASS ? "✅ Set" : "❌ Missing",
          NOTIFY_EMAIL_TO: process.env.NOTIFY_EMAIL_TO ? "✅ Set" : "❌ Missing",
        }
      });
    }

    await transporter.sendMail({
      from: `"Test Mail" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL_TO,
      subject: "✅ SMTP Test - Aviation Enquiry",
      html: "<h1>SMTP is working!</h1><p>Test email from Aviation Enquiry route.</p>",
    });

    res.json({ success: true, message: "Test email sent! Check inbox." });

  } catch (err) {
    res.json({ 
      success: false, 
      error: err.message,
      code: err.code,
      command: err.command 
    });
  }
});
/* ================================
   POST /api/aviation-enquiry
================================ */
router.post("/", async (req, res) => {
  console.log("📩 Aviation enquiry received:", req.body); // debug log

  const { name, email, phone, course } = req.body || {};

  // ── Validation ──
  if (!name || !email || !phone) {
    return res.status(400).json({
      success: false,
      error: "name, email and phone are required",
    });
  }

  try {
    const sql = `
      INSERT INTO aviation_enquiries (name, email, phone, course)
      VALUES (\$1, \$2, \$3, \$4)
      RETURNING *
    `;

    const values = [
      name.trim(),
      email.trim().toLowerCase(),
      String(phone).trim(),
      course || null,
    ];

    const { rows } = await db.query(sql, values);
    const row = rows[0];

    // ── Send Email (non-blocking) ──
    sendEnquiryEmail(row).catch((err) =>
      console.error("Email send failed:", err.message)
    );

    return res.status(201).json({ success: true, data: row });

  } catch (err) {
    console.error("Aviation enquiry DB error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ================================
   GET /api/aviation-enquiry (test)
================================ */
router.get("/", async (req, res) => {
  res.json({ success: true, message: "Aviation Enquiry API is working ✅" });
});

module.exports = router;