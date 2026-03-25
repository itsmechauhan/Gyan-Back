require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../database.js");
const nodemailer = require("nodemailer");

/* ================================
   ENV — same as demoForm.js
================================ */
const SMTP_HOST       = process.env.SMTP_HOST;
const SMTP_PORT       = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER       = process.env.SMTP_USER;
const SMTP_PASS       = process.env.SMTP_PASS;
const NOTIFY_EMAIL_TO = process.env.NOTIFY_EMAIL_TO || SMTP_USER;

/* ================================
   TRANSPORTER — exact copy of
   working demoForm.js transporter
================================ */
let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // ✅ same verify as demoForm.js
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Connection Error:", error.message);
    } else {
      console.log("SMTP Server ready for Aviation Enquiry emails ✅");
    }
  });
}

/* ================================
   SEND EMAIL — same style as
   sendDemoEmail() in demoForm.js
================================ */
async function sendAviationEmail(data) {
  if (!transporter || !NOTIFY_EMAIL_TO) {
    console.warn("Email not configured. Skipping email send.");
    return;
  }

  const subject = `New Aviation Enquiry from ${data.name}`;

  /* ── Plain Text (same as demoForm) ── */
  const textBody = `
New Aviation Enquiry
====================

Name    : ${data.name}
Email   : ${data.email}
Phone   : ${data.phone}
Course  : ${data.course || "N/A"}
  `;

  /* ── HTML Email ── */
  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;
             font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;
                      overflow:hidden;
                      box-shadow:0 8px 40px rgba(13,27,94,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d1b5e 0%,#2563eb 100%);
                       padding:36px 40px;">
              <p style="margin:0;color:rgba(255,255,255,0.7);
                         font-size:11px;letter-spacing:2px;
                         text-transform:uppercase;font-weight:600;">
                Ascot Asia Aviation Academy
              </p>
              <h1 style="margin:10px 0 0;color:#ffffff;font-size:22px;
                          font-weight:700;line-height:1.3;">
                ✈️ New Career Consultation Request
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.70);
                         font-size:13px;line-height:1.65;">
                A new enquiry was submitted on your website.<br/>
                Please follow up within 24 hours.
              </p>
            </td>
          </tr>

          <!-- COLOR BAR -->
          <tr>
            <td style="height:4px;
                       background:linear-gradient(90deg,#2563eb,#60a5fa,#2563eb);">
            </td>
          </tr>

          <!-- DETAILS -->
          <tr>
            <td style="padding:36px 40px 28px;">

              <p style="margin:0 0 18px;font-size:11px;font-weight:700;
                         letter-spacing:2px;text-transform:uppercase;
                         color:#9aa3c4;">
                Student Details
              </p>

              <!-- Name -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin-bottom:3px;">
                <tr>
                  <td style="background:#f7f9ff;padding:16px 20px;
                             border-radius:10px 10px 0 0;
                             border-bottom:1px solid #eef0f8;">
                    <p style="margin:0;font-size:10px;color:#9aa3c4;
                               font-weight:700;text-transform:uppercase;
                               letter-spacing:1.2px;">
                      👤 Full Name
                    </p>
                    <p style="margin:6px 0 0;font-size:16px;
                               color:#0d1b5e;font-weight:700;">
                      ${data.name}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Email -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin-bottom:3px;">
                <tr>
                  <td style="background:#f7f9ff;padding:16px 20px;
                             border-bottom:1px solid #eef0f8;">
                    <p style="margin:0;font-size:10px;color:#9aa3c4;
                               font-weight:700;text-transform:uppercase;
                               letter-spacing:1.2px;">
                      📧 Email Address
                    </p>
                    <p style="margin:6px 0 0;font-size:15px;font-weight:600;">
                      <a href="mailto:${data.email}"
                         style="color:#2563eb;text-decoration:none;">
                        ${data.email}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Phone -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin-bottom:3px;">
                <tr>
                  <td style="background:#f7f9ff;padding:16px 20px;
                             border-bottom:1px solid #eef0f8;">
                    <p style="margin:0;font-size:10px;color:#9aa3c4;
                               font-weight:700;text-transform:uppercase;
                               letter-spacing:1.2px;">
                      📱 Phone Number
                    </p>
                    <p style="margin:6px 0 0;font-size:16px;
                               color:#0d1b5e;font-weight:700;">
                      <a href="tel:${data.phone}"
                         style="color:#0d1b5e;text-decoration:none;">
                        ${data.phone}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Course -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f7f9ff;padding:16px 20px;
                             border-radius:0 0 10px 10px;">
                    <p style="margin:0;font-size:10px;color:#9aa3c4;
                               font-weight:700;text-transform:uppercase;
                               letter-spacing:1.2px;">
                      🎓 Course Interest
                    </p>
                    <p style="margin:6px 0 0;font-size:15px;
                               color:#0d1b5e;font-weight:700;">
                      ${data.course || "Not Specified"}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ACTION BANNER -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#eff6ff,#dbeafe);
                             border:1px solid #bfdbfe;border-radius:12px;
                             padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:13px;
                                     font-weight:700;color:#1d4ed8;">
                            ⏰ Action Required — Within 24 Hours
                          </p>
                          <p style="margin:7px 0 0;font-size:12px;
                                     color:#3b5bdb;line-height:1.65;">
                            Contact this student to guide them on the
                            right aviation career path.
                          </p>
                        </td>
                        <td align="right" valign="middle"
                            style="padding-left:20px;white-space:nowrap;">
                          <a href="tel:${data.phone}"
                             style="display:inline-block;
                                    background:#2563eb;color:#ffffff;
                                    text-decoration:none;padding:12px 22px;
                                    border-radius:8px;font-size:12px;
                                    font-weight:700;">
                            📞 Call Now
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TIMESTAMP -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0;font-size:12px;color:#b0bbd4;">
                🕐 Submitted:&nbsp;
                <strong style="color:#6b7ab5;">
                  ${new Date().toLocaleString("en-IN", {
                    timeZone:  "Asia/Kolkata",
                    dateStyle: "full",
                    timeStyle: "short",
                  })} IST
                </strong>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0d1b5e;padding:26px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#ffffff;font-size:14px;
                               font-weight:700;">
                      Ascot Asia Aviation Academy
                    </p>
                    <p style="margin:5px 0 0;
                               color:rgba(255,255,255,0.45);
                               font-size:11px;">
                      India's Premier Air Hostess Training Academy
                      &nbsp;|&nbsp; Delhi NCR &nbsp;|&nbsp; Since 2012
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <p style="margin:0;
                               color:rgba(255,255,255,0.35);
                               font-size:10px;line-height:1.6;
                               text-align:right;">
                      Automated notification.<br/>
                      Do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;

  await transporter.sendMail({
    from:    `"Aviation Enquiry" <${SMTP_USER}>`,
    to:      NOTIFY_EMAIL_TO,
    subject,
    text:    textBody,
    html:    htmlBody,
  });

  console.log("✅ Aviation enquiry email sent to:", NOTIFY_EMAIL_TO);
}

/* ================================
   AUTO CREATE TABLE
================================ */
async function ensureTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS aviation_enquiries (
        id         SERIAL       PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        phone      VARCHAR(20)  NOT NULL,
        course     VARCHAR(255),
        created_at TIMESTAMPTZ  DEFAULT NOW()
      )
    `);
    console.log("✅ aviation_enquiries table ready");
  } catch (err) {
    console.error("❌ Table error:", err.message);
  }
}

ensureTable();

/* ================================
   GET — Health Check
================================ */
router.get("/", (req, res) => {
  res.json({
    success:  true,
    message:  "Aviation Enquiry API running ✅",
    smtp:     transporter     ? "✅ Ready"  : "❌ Not configured",
    notifyTo: NOTIFY_EMAIL_TO ? "✅ Set"    : "❌ Missing",
  });
});

/* ================================
   POST /api/aviation-enquiry
================================ */
router.post("/", async (req, res) => {
  console.log("📩 Aviation enquiry:", req.body);

  const { name, email, phone, course } = req.body || {};

  // Validation
  if (!name || !email || !phone) {
    return res.status(400).json({
      success: false,
      error:   "name, email and phone are required",
    });
  }

  try {
    // ── Save to DB ──
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
    console.log("✅ Saved to DB — ID:", row.id);

    // ── Send Email ──  same pattern as demoForm.js
    try {
      await sendAviationEmail(row);
    } catch (mailError) {
      console.error("Failed to send aviation email:", mailError.message);
    }

    return res.status(201).json({ success: true, data: row });

  } catch (err) {
    console.error("❌ DB error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;