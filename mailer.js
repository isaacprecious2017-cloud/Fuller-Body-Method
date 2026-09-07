import nodemailer from "nodemailer";

/* =========================================================
   MAILER SETUP

   Uses standard SMTP env vars. Works with Gmail, Zoho,
   SendGrid SMTP, Mailgun SMTP, or any SMTP provider.

   Required environment variables:

     SMTP_HOST
     SMTP_PORT      (587 for TLS, 465 for SSL)
     SMTP_SECURE    ("true" if using port 465, otherwise "false")
     SMTP_USER
     SMTP_PASS
     EMAIL_FROM     e.g. "The Fuller-Body Method <hello@yourdomain.com>"
     BASE_URL       already exists in your server.js

   IMPORTANT — LAZY TRANSPORTER:

   ES module imports run BEFORE any code in server.js,
   including dotenv.config(). If we build the transporter
   here at import time, process.env.SMTP_USER / SMTP_PASS
   are still undefined, and nodemailer bakes that undefined
   credential in permanently — you get "Missing credentials
   for PLAIN" even though your .env is correct and even
   though logging process.env later shows it as loaded.

   The fix is to build the transporter lazily, the first
   time an email actually needs to be sent — by then
   server.js has already run dotenv.config().
========================================================= */

let cachedTransporter = null;


function getTransporter() {

    if (cachedTransporter) {

        return cachedTransporter;

    }


    cachedTransporter =
        nodemailer.createTransport({

            host:
                process.env.SMTP_HOST,

            port:
                Number(process.env.SMTP_PORT) || 587,

            secure:
                process.env.SMTP_SECURE === "true",

            auth: {

                user:
                    process.env.SMTP_USER,

                pass:
                    process.env.SMTP_PASS

            }

        });


    return cachedTransporter;

}


const FROM_ADDRESS =
    process.env.EMAIL_FROM ||
    "The Fuller-Body Method <no-reply@fullerbodymethod.com>";


const BRAND_COLOR =
    "#5b2948";

const BRAND_GOLD =
    "#c99a4a";


/* =========================================================
   BASE EMAIL WRAPPER
========================================================= */

function wrapEmail(bodyHtml) {

    return `
        <div style="background:#f7f2ea;padding:40px 20px;font-family:'DM Sans',Arial,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eadde1;">

                <div style="background:${BRAND_COLOR};padding:26px 30px;text-align:center;">
                    <span style="color:${BRAND_GOLD};font-size:11px;letter-spacing:2px;font-weight:700;">
                        THE FULLER-BODY METHOD
                    </span>
                </div>

                <div style="padding:34px 30px;color:#282329;font-size:14px;line-height:1.7;">
                    ${bodyHtml}
                </div>

                <div style="padding:18px 30px;background:#faf6f1;text-align:center;color:#9b9398;font-size:11px;">
                    © ${new Date().getFullYear()} The Fuller-Body Method
                </div>

            </div>
        </div>
    `;

}


/* =========================================================
   WELCOME EMAIL

   Sent right after a customer successfully activates
   their account (sets their password for the first time).
========================================================= */

/* =========================================================
   OPTIONAL: verify SMTP connection on demand

   Call this once anywhere after your server starts (e.g. in
   a temporary debug route, or right after app.listen) to
   confirm your SMTP credentials actually work, without
   needing to trigger a real activation/reset flow:

       import { verifyMailer } from "./mailer.js";
       verifyMailer().then(ok => console.log("SMTP ready:", ok));
========================================================= */

export async function verifyMailer() {

    try {

        await getTransporter().verify();

        console.log("SMTP connection verified successfully.");

        return true;

    } catch (error) {

        console.error("SMTP VERIFY ERROR:", error.message);

        return false;

    }

}


export async function sendWelcomeEmail({ to, name }) {

    const dashboardUrl =
        `${process.env.BASE_URL}/dashboard.html`;


    const html =
        wrapEmail(`
            <h2 style="margin:0 0 16px;color:${BRAND_COLOR};font-family:Georgia,serif;">
                Welcome, ${escapeHtml(name || "there")}!
            </h2>

            <p style="margin:0 0 16px;">
                Your Fuller-Body Method account is now active. Your private
                library, meal calendar and bonus resources are ready
                whenever you are.
            </p>

            <div style="text-align:center;margin:26px 0;">
                <a href="${dashboardUrl}"
                   style="background:${BRAND_COLOR};color:#ffffff;text-decoration:none;
                          padding:14px 26px;border-radius:10px;font-weight:700;
                          font-size:13px;display:inline-block;">
                    Go to my dashboard →
                </a>
            </div>

            <p style="margin:0;color:#716970;">
                If you didn't create this account, you can safely ignore
                this email.
            </p>
        `);


    return getTransporter().sendMail({

        from:
            FROM_ADDRESS,

        to,

        subject:
            "Welcome to The Fuller-Body Method 🎉",

        html

    });

}


/* =========================================================
   PASSWORD RESET EMAIL
========================================================= */

export async function sendPasswordResetEmail({ to, name, token }) {

    const resetUrl =
        `${process.env.BASE_URL}/reset-password.html?token=${encodeURIComponent(token)}`;


    const html =
        wrapEmail(`
            <h2 style="margin:0 0 16px;color:${BRAND_COLOR};font-family:Georgia,serif;">
                Reset your password
            </h2>

            <p style="margin:0 0 16px;">
                Hi ${escapeHtml(name || "there")}, we received a request to
                reset the password for your Fuller-Body Method account.
                This link will expire in 1 hour.
            </p>

            <div style="text-align:center;margin:26px 0;">
                <a href="${resetUrl}"
                   style="background:${BRAND_COLOR};color:#ffffff;text-decoration:none;
                          padding:14px 26px;border-radius:10px;font-weight:700;
                          font-size:13px;display:inline-block;">
                    Reset my password →
                </a>
            </div>

            <p style="margin:0;color:#716970;">
                If you didn't request this, you can safely ignore this
                email — your password will stay the same.
            </p>
        `);


    return getTransporter().sendMail({

        from:
            FROM_ADDRESS,

        to,

        subject:
            "Reset your password — The Fuller-Body Method",

        html

    });

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

}
