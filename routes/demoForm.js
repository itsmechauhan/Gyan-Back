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

  // ✅ Verify SMTP at startup (same as enquiries.js)
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Connection Error:", error.message);
    } else {
      console.log("SMTP Server ready for DemoForm emails ✅");
    }
  });
}

/* ================================
   SEND EMAIL FUNCTION
================================ */
async function sendDemoEmail(data) {
  if (!transporter || !NOTIFY_EMAIL_TO) {
    console.warn("Email not configured. Skipping email send.");
    return;
  }

  const subject = `New Demo Booking from ${data.name}`;

  const textBody = `
New Demo Booking
================

Name    : ${data.name}
Email   : ${data.email}
Phone   : ${data.phone}
City    : ${data.city || "N/A"}

Preferred Destination : ${data.destination || "N/A"}
Coaching Required     : ${data.coaching || "N/A"}
  `;

  await transporter.sendMail({
    from: `"Demo Booking" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL_TO,
    subject,
    text: textBody,
  });
}

/* ================================
   POST /api/demoform
================================ */
router.post("/", async (req, res) => {
  const {
    name,
    email,
    phone,
    city,
    destination,
    coaching,
  } = req.body || {};

  // ✅ Validation
  if (!name || !email || !phone) {
    return res.status(400).json({
      success: false,
      error: "name, email and phone are required",
    });
  }

  try {
    // ✅ PostgreSQL syntax (matches your database.js)
    const sql = `
      INSERT INTO demo_bookings
        (name, email, phone, city, destination, coaching)
      VALUES
        (\$1, \$2, \$3, \$4, \$5, \$6)
      RETURNING *
    `;

    const values = [
      name,
      email,
      String(phone),
      city || null,
      destination || null,
      coaching || null,
    ];

    const { rows } = await db.query(sql, values);
    const row = rows[0];

    // ✅ Send email
    try {
      await sendDemoEmail(row);
    } catch (mailError) {
      console.error("Failed to send demo email:", mailError.message);
    }

    res.status(201).json({
      success: true,
      data: row,
    });

  } catch (err) {
    console.error("Failed to save demo booking:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;