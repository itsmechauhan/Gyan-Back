require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../database.js");
const nodemailer = require("nodemailer");

/* SMTP ENV */
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NOTIFY_EMAIL_TO = process.env.NOTIFY_EMAIL_TO || SMTP_USER;

/* MAIL TRANSPORTER */

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

}

/* SEND EMAIL */

async function sendDemoEmail(data) {

  if (!transporter) return;

  const subject = `New Demo Booking from ${data.name}`;

  const textBody = `
New Demo Booking

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone}
City: ${data.city || "N/A"}

Preferred Destination: ${data.destination || "N/A"}
Coaching Required: ${data.coaching || "N/A"}

Message:
${data.message || "No message"}
`;

  await transporter.sendMail({
    from: `"Demo Booking" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL_TO,
    subject,
    text: textBody,
  });

}

/* POST DEMO FORM */

router.post("/", async (req, res) => {

  const {
    name,
    email,
    phone,
    city,
    destination,
    coaching,
    message
  } = req.body || {};

  if (!name || !email || !phone) {

    return res.status(400).json({
      success:false,
      error:"name, email, phone required"
    });

  }

  try {

    const sql = `
      INSERT INTO demo_bookings
      (name,email,phone,city,destination,coaching,message)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `;

    const values = [
      name,
      email,
      phone,
      city || null,
      destination || null,
      coaching || null,
      message || null
    ];

    const { rows } = await db.query(sql, values);

    const row = rows[0];

    try {
      await sendDemoEmail(row);
    } catch (err) {
      console.log("Email error:",err.message);
    }

    res.status(201).json({
      success:true,
      data:row
    });

  } catch (err) {

    res.status(500).json({
      success:false,
      error:err.message
    });

  }

});

module.exports = router;