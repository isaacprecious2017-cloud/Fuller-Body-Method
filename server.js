import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import session from "express-session";
import bcrypt from "bcryptjs";
import pg from "pg";
import { fileURLToPath } from "url";
import {
    verifyMailer,
    sendWelcomeEmail,
    sendPasswordResetEmail
} from "./mailer.js";

dotenv.config();

console.log("========== SMTP DEBUG ==========");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "LOADED" : "MISSING");
console.log("================================");

const { Pool } = pg;

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/* =========================================================
   SETTINGS
========================================================= */

const PORT =
    process.env.PORT || 3000;

const BASE_URL =
    process.env.BASE_URL ||
    `http://localhost:${PORT}`;

const PAYSTACK_SECRET_KEY =
    process.env.PAYSTACK_SECRET_KEY;

const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    "change-this-session-secret";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD;

const PRODUCT_PRICE =
    980000;

const PRODUCT_NAME =
    "The Fuller-Body Method";

const TELEGRAM_GROUP =
    process.env.TELEGRAM_GROUP ||
    "https://t.me/+c1REV198pt4yZmE0";


/* =========================================================
   DATABASE
========================================================= */

const pool =
    new Pool({

        connectionString:
            process.env.DATABASE_URL,

        ssl:
            process.env.NODE_ENV === "production"
                ? {
                    rejectUnauthorized: false
                }
                : false

    });


/* =========================================================
   DIRECTORIES
========================================================= */

const PRIVATE_DIRECTORY =
    path.join(
        __dirname,
        "private"
    );

const PDF_DIRECTORY =
    path.join(
        PRIVATE_DIRECTORY,
        "pdfs"
    );

const RESOURCE_DIRECTORY =
    path.join(
        PRIVATE_DIRECTORY,
        "resources"
    );

const TESTIMONIAL_DIRECTORY =
    path.join(
        PRIVATE_DIRECTORY,
        "testimonials"
    );


[
    PRIVATE_DIRECTORY,
    PDF_DIRECTORY,
    RESOURCE_DIRECTORY,
    TESTIMONIAL_DIRECTORY
].forEach(directory => {

    if (
        !fs.existsSync(directory)
    ) {

        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );

    }

});


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


/* =========================================================
   SESSION
========================================================= */

app.use(
    session({

        secret:
            SESSION_SECRET,

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            secure:
                process.env.NODE_ENV === "production",

            sameSite:
                "lax",

            maxAge:
                1000 *
                60 *
                60 *
                24 *
                7

        }

    })
);


/* =========================================================
   PUBLIC FRONTEND
========================================================= */

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/* =========================================================
   HOME PAGE
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {

    /* -----------------------------------------------------
       CUSTOMERS
    ----------------------------------------------------- */

    await pool.query(`

        CREATE TABLE IF NOT EXISTS customers (

            id SERIAL PRIMARY KEY,

            name VARCHAR(150) NOT NULL,

            email VARCHAR(255) UNIQUE NOT NULL,

            password_hash TEXT,

            paid BOOLEAN DEFAULT FALSE,

            payment_reference VARCHAR(255),

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        );

    `);

    await pool.query(`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
`);


    /* -----------------------------------------------------
       PAYMENTS
    ----------------------------------------------------- */

    await pool.query(`

        CREATE TABLE IF NOT EXISTS payments (

            id SERIAL PRIMARY KEY,

            customer_id INTEGER
                REFERENCES customers(id)
                ON DELETE SET NULL,

            reference VARCHAR(255)
                UNIQUE NOT NULL,

            amount INTEGER NOT NULL,

            status VARCHAR(50) NOT NULL,

            email VARCHAR(255) NOT NULL,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        );

    `);


    /* -----------------------------------------------------
       PDFS
    ----------------------------------------------------- */

    await pool.query(`

        CREATE TABLE IF NOT EXISTS pdfs (

            id SERIAL PRIMARY KEY,

            filename TEXT NOT NULL,

            original_name TEXT NOT NULL,

            title VARCHAR(255) NOT NULL,

            file_size BIGINT DEFAULT 0,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        );

    `);


    /* -----------------------------------------------------
       FEEDBACK
    ----------------------------------------------------- */

    await pool.query(`

        CREATE TABLE IF NOT EXISTS feedback (

            id SERIAL PRIMARY KEY,

            customer_id INTEGER
                REFERENCES customers(id)
                ON DELETE CASCADE,

            rating INTEGER
                CHECK (
                    rating >= 1
                    AND rating <= 5
                ),

            message TEXT NOT NULL,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        );

    `);


    /* -----------------------------------------------------
       TESTIMONIALS
    ----------------------------------------------------- */

    await pool.query(`

        CREATE TABLE IF NOT EXISTS testimonials (

            id SERIAL PRIMARY KEY,

            customer_id INTEGER
                REFERENCES customers(id)
                ON DELETE CASCADE,

            name VARCHAR(150) NOT NULL,

            location VARCHAR(150),

            rating INTEGER
                CHECK (
                    rating >= 1
                    AND rating <= 5
                ),

            message TEXT NOT NULL,

            photo_filename TEXT,

            permission BOOLEAN DEFAULT FALSE,

            approved BOOLEAN DEFAULT FALSE,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        );

    `);


    /* -----------------------------------------------------
       RESOURCES
    ----------------------------------------------------- */

    await pool.query(`

        CREATE TABLE IF NOT EXISTS resources (

            id SERIAL PRIMARY KEY,

            title VARCHAR(255) NOT NULL,

            type VARCHAR(30) NOT NULL,

            url TEXT,

            file_path TEXT,

            original_name TEXT,

            mime_type TEXT,

            file_size BIGINT DEFAULT 0,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        );

    `);


    console.log(
        "Database initialized successfully."
    );

}


/* =========================================================
   CUSTOMER AUTH MIDDLEWARE
========================================================= */

function requireCustomer(
    req,
    res,
    next
) {

    if (
        req.session &&
        req.session.customerId
    ) {

        return next();

    }


    return res.status(401).json({

        success:
            false,

        message:
            "Please log in."

    });

}


/* =========================================================
   PAID CUSTOMER AUTH MIDDLEWARE
========================================================= */

async function requirePaidCustomer(
    req,
    res,
    next
) {

    try {

        if (
            !req.session ||
            !req.session.customerId
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Please log in."

            });

        }


        const result =
            await pool.query(

                `
                    SELECT
                        id,
                        name,
                        email,
                        paid

                    FROM customers

                    WHERE id = $1
                `,

                [
                    req.session.customerId
                ]

            );


        if (
            !result.rows.length
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Customer account not found."

            });

        }


        if (
            result.rows[0].paid !== true
        ) {

            return res.status(403).json({

                success:
                    false,

                message:
                    "Paid customer access required."

            });

        }


        req.customer =
            result.rows[0];


        next();

    }

    catch (error) {

        console.error(
            "CUSTOMER AUTH ERROR:",
            error
        );

        return res.status(500).json({

            success:
                false,

            message:
                "Authentication error."

        });

    }

}


/* =========================================================
   ADMIN AUTH MIDDLEWARE
========================================================= */

function requireAdmin(
    req,
    res,
    next
) {

    if (
        req.session &&
        req.session.isAdmin === true
    ) {

        return next();

    }


    return res.status(401).json({

        success:
            false,

        message:
            "Admin authentication required."

    });

}


/* =========================================================
   PAYMENT INITIALIZATION
========================================================= */

app.post(
    "/api/payments/initialize",
    async (req, res) => {

        try {

            const {
                name,
                email
            } = req.body;


            if (
                !name ||
                !email
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Name and email are required."

                });

            }


            const cleanName =
                String(name).trim();

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();


            if (
                !cleanName ||
                !cleanEmail
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please provide a valid name and email."

                });

            }


            if (
                !PAYSTACK_SECRET_KEY
            ) {

                console.error(
                    "PAYSTACK_SECRET_KEY is missing."
                );

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Payment system is not configured."

                });

            }


            const reference =
                `FBM-${Date.now()}-${crypto
                    .randomBytes(6)
                    .toString("hex")}`;


            const response =
                await axios.post(

                    "https://api.paystack.co/transaction/initialize",

                    {

                        email:
                            cleanEmail,

                        amount:
                            PRODUCT_PRICE,

                        currency:
                            "NGN",

                        reference,

                        callback_url:
                            `${BASE_URL}/payment-callback`,

                        metadata: {

                            customer_name:
                                cleanName,

                            product:
                                PRODUCT_NAME

                        },

                        channels: [

                            "card",

                            "bank",

                            "ussd",

                            "bank_transfer"

                        ]

                    },

                    {

                        headers: {

                            Authorization:
                                `Bearer ${PAYSTACK_SECRET_KEY}`,

                            "Content-Type":
                                "application/json"

                        }

                    }

                );


            if (
                !response.data ||
                !response.data.status ||
                !response.data.data
            ) {

                throw new Error(
                    "Invalid response from Paystack."
                );

            }


            return res.json({

                success:
                    true,

                authorization_url:
                    response.data.data
                        .authorization_url,

                reference:
                    reference

            });

        }

        catch (error) {

            console.error(
                "PAYSTACK INITIALIZATION ERROR:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    error.response?.data?.message ||
                    "Unable to initialize payment."

            });

        }

    }
);


/* =========================================================
   PAYMENT CALLBACK / VERIFICATION
========================================================= */

app.get(
    "/payment-callback",
    async (req, res) => {

        const reference =
            req.query.reference;


        if (
            !reference
        ) {

            return res.redirect(
                "/purchase.html?error=missing_reference"
            );

        }


        if (
            !PAYSTACK_SECRET_KEY
        ) {

            return res.redirect(
                "/purchase.html?error=payment_configuration"
            );

        }


        try {

            const response =
                await axios.get(

                    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${PAYSTACK_SECRET_KEY}`

                        }

                    }

                );


            const transaction =
                response.data?.data;


            if (
                !transaction
            ) {

                return res.redirect(
                    "/purchase.html?error=verification_failed"
                );

            }


            const successful =
                transaction.status ===
                "success";


            const correctAmount =
                Number(transaction.amount) ===
                Number(PRODUCT_PRICE);


            if (
                !successful ||
                !correctAmount
            ) {

                console.error(
                    "Payment verification failed:",
                    {
                        reference,
                        status:
                            transaction.status,
                        amount:
                            transaction.amount
                    }
                );


                return res.redirect(
                    "/purchase.html?error=payment_failed"
                );

            }


            const name =
                transaction.metadata
                    ?.customer_name ||
                transaction.customer
                    ?.first_name ||
                "Customer";


            const email =
                transaction.customer
                    ?.email;


            if (
                !email
            ) {

                return res.redirect(
                    "/purchase.html?error=missing_email"
                );

            }


            const cleanEmail =
                email
                    .trim()
                    .toLowerCase();


            /* -------------------------------------------------
               FIND CUSTOMER
            ------------------------------------------------- */

            const existing =
                await pool.query(

                    `
                        SELECT id

                        FROM customers

                        WHERE email = $1
                    `,

                    [
                        cleanEmail
                    ]

                );


            let customerId;


            /* -------------------------------------------------
               EXISTING CUSTOMER
            ------------------------------------------------- */

            if (
                existing.rows.length
            ) {

                customerId =
                    existing.rows[0].id;


                await pool.query(

                    `
                        UPDATE customers

                        SET
                            paid = TRUE,
                            payment_reference = $1,
                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE id = $2
                    `,

                    [
                        reference,
                        customerId
                    ]

                );

            }


            /* -------------------------------------------------
               NEW CUSTOMER
            ------------------------------------------------- */

            else {

                const created =
                    await pool.query(

                        `
                            INSERT INTO customers
                            (
                                name,
                                email,
                                paid,
                                payment_reference
                            )

                            VALUES
                            (
                                $1,
                                $2,
                                TRUE,
                                $3
                            )

                            RETURNING id
                        `,

                        [
                            String(name).trim(),
                            cleanEmail,
                            reference
                        ]

                    );


                customerId =
                    created.rows[0].id;

            }


            /* -------------------------------------------------
               RECORD PAYMENT
            ------------------------------------------------- */

            await pool.query(

                `
                    INSERT INTO payments
                    (
                        customer_id,
                        reference,
                        amount,
                        status,
                        email
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )

                    ON CONFLICT (reference)
                    DO UPDATE SET
                        status = EXCLUDED.status,
                        amount = EXCLUDED.amount,
                        customer_id =
                            EXCLUDED.customer_id
                `,

                [
                    customerId,
                    reference,
                    transaction.amount,
                    transaction.status,
                    cleanEmail
                ]

            );


            /* -------------------------------------------------
               LOGIN CUSTOMER
            ------------------------------------------------- */

            req.session.customerId =
                customerId;

            req.session.customerEmail =
                cleanEmail;


            return req.session.save(
                () => {

                    return res.redirect(
                        "/success.html?payment=success"
                    );

                }
            );

        }

        catch (error) {

            console.error(
                "PAYMENT VERIFICATION ERROR:",
                error.response?.data ||
                error.message
            );


            return res.redirect(
                "/purchase.html?error=verification_failed"
            );

        }

    }
);


/* =========================================================
   CUSTOMER SESSION / PROFILE
========================================================= */

app.get(
    "/api/customer/me",
    requireCustomer,
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `
                        SELECT
                            id,
                            name,
                            email,
                            paid,
                            created_at

                        FROM customers

                        WHERE id = $1
                    `,

                    [
                        req.session.customerId
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Customer not found."

                });

            }


            return res.json({

                success:
                    true,

                customer:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "CUSTOMER PROFILE ERROR:",
                error
            );

            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load customer."

            });

        }

    }
);


/* =========================================================
   CUSTOMER LOGIN
========================================================= */

app.post(
    "/api/customer/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Email and password are required."

                });

            }


            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();


            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM customers

                        WHERE email = $1
                    `,

                    [
                        cleanEmail
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Account not found."

                });

            }


            const customer =
                result.rows[0];


            if (
                !customer.password_hash
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please activate your account first."

                });

            }


            const valid =
                await bcrypt.compare(
                    String(password),
                    customer.password_hash
                );


            if (
                !valid
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Incorrect email or password."

                });

            }


            if (
                customer.paid !== true
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "This account does not have paid access."

                });

            }


            req.session.customerId =
                customer.id;

            req.session.customerEmail =
                customer.email;


return req.session.save(() => {
    return res.json({
        success: true,
        redirect: "/dashboard.html"
    });
});

        }

        catch (error) {

            console.error(
                "CUSTOMER LOGIN ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Login failed."

            });

        }

    }
);


/* =========================================================
   ACCOUNT ACTIVATION
========================================================= */

app.post(
    "/api/customer/activate",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password
            } = req.body;


            if (
                !name ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "All fields are required."

                });

            }


            const cleanName =
                String(name).trim();

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            const cleanPassword =
                String(password);


            if (
                cleanPassword.length < 6
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Password must be at least 6 characters."

                });

            }


            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM customers

                        WHERE email = $1
                    `,

                    [
                        cleanEmail
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "No purchase was found for this email."

                });

            }


            const customer =
                result.rows[0];


            if (
                customer.paid !== true
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "This email does not have paid access."

                });

            }


            const hash =
                await bcrypt.hash(
                    cleanPassword,
                    12
                );


            await pool.query(

                `
                    UPDATE customers

                    SET
                        name = $1,
                        password_hash = $2,
                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE id = $3
                `,

                [
                    cleanName,
                    hash,
                    customer.id
                ]

            );


            req.session.customerId =
                customer.id;

            req.session.customerEmail =
                customer.email;


            sendWelcomeEmail({ to: cleanEmail, name: cleanName })
    .catch(error => console.error("WELCOME EMAIL ERROR:", error));

return req.session.save(() => {
    return res.json({
        success: true,
        redirect: "/dashboard.html"
    });
});

        }

        catch (error) {

            console.error(
                "ACCOUNT ACTIVATION ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Account activation failed."

            });

        }

    }
);

/* =========================================================
   FORGOT PASSWORD
========================================================= */

app.post(
    "/api/customer/forgot-password",
    async (req, res) => {

        try {

            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter your email."
                });
            }

            const cleanEmail =
                String(email).trim().toLowerCase();

            const result = await pool.query(
                `SELECT id, name, email, paid FROM customers WHERE email = $1`,
                [cleanEmail]
            );

            /*
                IMPORTANT: always respond with the same generic
                success message, whether or not the account
                exists. This stops the form being used to check
                which emails are registered.
            */

            const genericMessage =
                "If that email has an account, a reset link is on its way.";

            if (!result.rows.length || result.rows[0].paid !== true) {
                return res.json({ success: true, message: genericMessage });
            }

            const customer = result.rows[0];

            const rawToken = crypto.randomBytes(32).toString("hex");
            const tokenHash = crypto
                .createHash("sha256")
                .update(rawToken)
                .digest("hex");

            const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await pool.query(
                `UPDATE customers
                 SET reset_token_hash = $1, reset_token_expires = $2
                 WHERE id = $3`,
                [tokenHash, expires, customer.id]
            );

            sendPasswordResetEmail({
                to: customer.email,
                name: customer.name,
                token: rawToken
            }).catch(error =>
                console.error("PASSWORD RESET EMAIL ERROR:", error)
            );

            return res.json({ success: true, message: genericMessage });

        } catch (error) {

            console.error("FORGOT PASSWORD ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to process your request."
            });

        }

    }
);


/* =========================================================
   RESET PASSWORD
========================================================= */

app.post(
    "/api/customer/reset-password",
    async (req, res) => {

        try {

            const { token, password } = req.body;

            if (!token || !password) {
                return res.status(400).json({
                    success: false,
                    message: "This reset link is invalid."
                });
            }

            if (String(password).length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters."
                });
            }

            const tokenHash = crypto
                .createHash("sha256")
                .update(String(token))
                .digest("hex");

            const result = await pool.query(
                `SELECT id, reset_token_expires FROM customers
                 WHERE reset_token_hash = $1`,
                [tokenHash]
            );

            if (!result.rows.length) {
                return res.status(400).json({
                    success: false,
                    message: "This reset link is invalid or has already been used."
                });
            }

            const customer = result.rows[0];

            if (
                !customer.reset_token_expires ||
                new Date(customer.reset_token_expires) < new Date()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "This reset link has expired. Please request a new one."
                });
            }

            const hash = await bcrypt.hash(String(password), 12);

            await pool.query(
                `UPDATE customers
                 SET password_hash = $1,
                     reset_token_hash = NULL,
                     reset_token_expires = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [hash, customer.id]
            );

            return res.json({
                success: true,
                message: "Your password has been updated."
            });

        } catch (error) {

            console.error("RESET PASSWORD ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to reset your password."
            });

        }

    }
);

/* =========================================================
   CUSTOMER LOGOUT
========================================================= */

app.post(
    "/api/customer/logout",
    requireCustomer,
    (req, res) => {

        req.session.destroy(
            error => {

                if (error) {

                    console.error(
                        "LOGOUT ERROR:",
                        error
                    );

                    return res.status(500).json({

                        success:
                            false,

                        message:
                            "Unable to log out."

                    });

                }


                res.clearCookie(
                    "connect.sid"
                );


                return res.json({

                    success:
                        true

                });

            }
        );

    }
);


/* =========================================================
   PDF STORAGE
========================================================= */

const pdfStorage =
    multer.diskStorage({

        destination:
            (req, file, cb) => {

                cb(
                    null,
                    PDF_DIRECTORY
                );

            },

        filename:
            (req, file, cb) => {

                const uniqueName =
                    `${Date.now()}-${crypto
                        .randomBytes(8)
                        .toString("hex")}.pdf`;


                cb(
                    null,
                    uniqueName
                );

            }

    });


const pdfUpload =
    multer({

        storage:
            pdfStorage,

        limits: {

            fileSize:
                100 *
                1024 *
                1024

        },

        fileFilter:
            (req, file, cb) => {

                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();


                if (
                    file.mimetype ===
                        "application/pdf" &&
                    extension ===
                        ".pdf"
                ) {

                    return cb(
                        null,
                        true
                    );

                }


                return cb(
                    new Error(
                        "Only PDF files are allowed."
                    )
                );

            }

    });


/* =========================================================
   RESOURCE STORAGE
========================================================= */

const resourceStorage =
    multer.diskStorage({

        destination:
            (req, file, cb) => {

                cb(
                    null,
                    RESOURCE_DIRECTORY
                );

            },

        filename:
            (req, file, cb) => {

                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();


                const uniqueName =
                    `${Date.now()}-${crypto
                        .randomBytes(8)
                        .toString("hex")}${extension}`;


                cb(
                    null,
                    uniqueName
                );

            }

    });


const resourceUpload =
    multer({

        storage:
            resourceStorage,

        limits: {

            fileSize:
                200 *
                1024 *
                1024

        },

        fileFilter:
            (req, file, cb) => {

                const mime =
                    file.mimetype;


                const allowed =

                    mime ===
                        "application/pdf" ||

                    mime.startsWith(
                        "image/"
                    ) ||

                    mime.startsWith(
                        "video/"
                    );


                if (
                    allowed
                ) {

                    return cb(
                        null,
                        true
                    );

                }


                return cb(
                    new Error(
                        "Unsupported file type."
                    )
                );

            }

    });


/* =========================================================
   TESTIMONIAL PHOTO STORAGE
========================================================= */

const testimonialStorage =
    multer.diskStorage({

        destination:
            (req, file, cb) => {

                cb(
                    null,
                    TESTIMONIAL_DIRECTORY
                );

            },

        filename:
            (req, file, cb) => {

                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();


                const uniqueName =
                    `${Date.now()}-${crypto
                        .randomBytes(8)
                        .toString("hex")}${extension}`;


                cb(
                    null,
                    uniqueName
                );

            }

    });


const testimonialUpload =
    multer({

        storage:
            testimonialStorage,

        limits: {

            fileSize:
                5 *
                1024 *
                1024

        },

        fileFilter:
            (req, file, cb) => {

                const allowed = [

                    "image/jpeg",

                    "image/png",

                    "image/webp"

                ];


                if (
                    allowed.includes(
                        file.mimetype
                    )
                ) {

                    return cb(
                        null,
                        true
                    );

                }


                return cb(
                    new Error(
                        "Only JPG, PNG and WEBP images are allowed."
                    )
                );

            }

    });


/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
    "/api/admin/login",
    (req, res) => {

        try {

            const {
                password
            } = req.body;


            if (
                !ADMIN_PASSWORD
            ) {

                console.error(
                    "ADMIN_PASSWORD is not configured."
                );


                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Admin login is not configured."

                });

            }


            if (
                !password ||
                String(password) !==
                    String(ADMIN_PASSWORD)
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Incorrect admin password."

                });

            }


            req.session.isAdmin =
                true;


            return req.session.save(
                () => {

                    return res.json({

                        success:
                            true

                    });

                }
            );

        }

        catch (error) {

            console.error(
                "ADMIN LOGIN ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Admin login failed."

            });

        }

    }
);


/* =========================================================
   ADMIN SESSION
========================================================= */

app.get(
    "/api/admin/session",
    (req, res) => {

        return res.json({

            authenticated:
                req.session?.isAdmin === true

        });

    }
);


/* =========================================================
   ADMIN LOGOUT
========================================================= */

app.post(
    "/api/admin/logout",
    requireAdmin,
    (req, res) => {

        req.session.destroy(
            error => {

                if (error) {

                    return res.status(500).json({

                        success:
                            false,

                        message:
                            "Unable to log out."

                    });

                }


                res.clearCookie(
                    "connect.sid"
                );


                return res.json({

                    success:
                        true

                });

            }
        );

    }
);


/* =========================================================
   ADMIN PDF UPLOAD
========================================================= */

app.post(
    "/api/admin/upload",
    requireAdmin,
    pdfUpload.single("pdf"),
    async (req, res) => {

        try {

            if (
                !req.file
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select a PDF."

                });

            }


            const title =
                req.body.title ||
                path.basename(
                    req.file.originalname,
                    ".pdf"
                );


            const result =
                await pool.query(

                    `
                        INSERT INTO pdfs
                        (
                            filename,
                            original_name,
                            title,
                            file_size
                        )

                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4
                        )

                        RETURNING *
                    `,

                    [
                        req.file.filename,
                        req.file.originalname,
                        String(title).trim(),
                        req.file.size
                    ]

                );


            return res.json({

                success:
                    true,

                message:
                    "PDF uploaded successfully.",

                pdf:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "PDF UPLOAD ERROR:",
                error
            );


            if (
                req.file
            ) {

                const uploadedPath =
                    path.join(
                        PDF_DIRECTORY,
                        req.file.filename
                    );


                if (
                    fs.existsSync(
                        uploadedPath
                    )
                ) {

                    fs.unlinkSync(
                        uploadedPath
                    );

                }

            }


            return res.status(500).json({

                success:
                    false,

                message:
                    "Upload failed."

            });

        }

    }
);


/* =========================================================
   ADMIN PDF LIST
========================================================= */

app.get(
    "/api/admin/pdfs",
    requireAdmin,
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM pdfs

                        ORDER BY
                            created_at DESC
                    `

                );


            return res.json({

                success:
                    true,

                pdfs:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "ADMIN PDF LIST ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                pdfs:
                    [],

                message:
                    "Unable to load PDFs."

            });

        }

    }
);


/* =========================================================
   ADMIN DELETE PDF
========================================================= */

app.delete(
    "/api/admin/pdfs/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid PDF ID."

                });

            }


            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM pdfs

                        WHERE id = $1
                    `,

                    [
                        id
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "PDF not found."

                });

            }


            const pdf =
                result.rows[0];


            const filePath =
                path.join(
                    PDF_DIRECTORY,
                    path.basename(
                        pdf.filename
                    )
                );


            if (
                fs.existsSync(
                    filePath
                )
            ) {

                fs.unlinkSync(
                    filePath
                );

            }


            await pool.query(

                `
                    DELETE FROM pdfs

                    WHERE id = $1
                `,

                [
                    id
                ]

            );


            return res.json({

                success:
                    true,

                message:
                    "PDF removed successfully."

            });

        }

        catch (error) {

            console.error(
                "DELETE PDF ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to remove PDF."

            });

        }

    }
);


/* =========================================================
   ADMIN ADD RESOURCE
========================================================= */

app.post(
    "/api/admin/resources",
    requireAdmin,
    resourceUpload.single("file"),
    async (req, res) => {

        try {

            const {
                title,
                type,
                url
            } = req.body;


            const cleanTitle =
                String(
                    title || ""
                ).trim();

            const cleanType =
                String(
                    type || ""
                ).trim().toLowerCase();


            const allowedTypes = [

                "pdf",

                "image",

                "video",

                "link"

            ];


            if (
                !cleanTitle
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Resource title is required."

                });

            }


            if (
                !allowedTypes.includes(
                    cleanType
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid resource type."

                });

            }


            /* -------------------------------------------------
               EXTERNAL LINK
            ------------------------------------------------- */

            if (
                cleanType ===
                "link"
            ) {

                if (
                    !url
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "External URL is required."

                    });

                }


                let cleanUrl =
                    String(url).trim();


                try {

                    const parsed =
                        new URL(
                            cleanUrl
                        );


                    if (
                        ![
                            "http:",
                            "https:"
                        ].includes(
                            parsed.protocol
                        )
                    ) {

                        throw new Error(
                            "Invalid protocol"
                        );

                    }

                }

                catch {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Please provide a valid HTTP or HTTPS URL."

                    });

                }


                const result =
                    await pool.query(

                        `
                            INSERT INTO resources
                            (
                                title,
                                type,
                                url
                            )

                            VALUES
                            (
                                $1,
                                $2,
                                $3
                            )

                            RETURNING *
                        `,

                        [
                            cleanTitle,
                            cleanType,
                            cleanUrl
                        ]

                    );


                return res.json({

                    success:
                        true,

                    message:
                        "Link added successfully.",

                    resource:
                        result.rows[0]

                });

            }


            /* -------------------------------------------------
               FILE RESOURCE
            ------------------------------------------------- */

            if (
                !req.file
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select a file."

                });

            }


            const mime =
                req.file.mimetype;


            /* -------------------------------------------------
               TYPE VALIDATION
            ------------------------------------------------- */

            if (
                cleanType === "pdf" &&
                mime !==
                    "application/pdf"
            ) {

                fs.unlinkSync(
                    req.file.path
                );


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please upload a valid PDF."

                });

            }


            if (
                cleanType === "image" &&
                !mime.startsWith(
                    "image/"
                )
            ) {

                fs.unlinkSync(
                    req.file.path
                );


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please upload a valid image."

                });

            }


            if (
                cleanType === "video" &&
                !mime.startsWith(
                    "video/"
                )
            ) {

                fs.unlinkSync(
                    req.file.path
                );


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please upload a valid video."

                });

            }


            const result =
                await pool.query(

                    `
                        INSERT INTO resources
                        (
                            title,
                            type,
                            file_path,
                            original_name,
                            mime_type,
                            file_size
                        )

                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6
                        )

                        RETURNING *
                    `,

                    [
                        cleanTitle,
                        cleanType,
                        req.file.filename,
                        req.file.originalname,
                        mime,
                        req.file.size
                    ]

                );


            return res.json({

                success:
                    true,

                message:
                    "Resource added successfully.",

                resource:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "RESOURCE UPLOAD ERROR:",
                error
            );


            if (
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                fs.unlinkSync(
                    req.file.path
                );

            }


            return res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to add resource."

            });

        }

    }
);


/* =========================================================
   ADMIN RESOURCE LIST
========================================================= */

app.get(
    "/api/admin/resources",
    requireAdmin,
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `
                        SELECT
                            id,
                            title,
                            type,
                            url,
                            original_name,
                            mime_type,
                            file_size,
                            created_at

                        FROM resources

                        ORDER BY
                            created_at DESC
                    `

                );


            return res.json({

                success:
                    true,

                resources:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "RESOURCE LIST ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                resources:
                    [],

                message:
                    "Unable to load resources."

            });

        }

    }
);


/* =========================================================
   ADMIN DELETE RESOURCE
========================================================= */

app.delete(
    "/api/admin/resources/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid resource ID."

                });

            }


            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM resources

                        WHERE id = $1
                    `,

                    [
                        id
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Resource not found."

                });

            }


            const resource =
                result.rows[0];


            if (
                resource.file_path
            ) {

                const filePath =
                    path.join(
                        RESOURCE_DIRECTORY,
                        path.basename(
                            resource.file_path
                        )
                    );


                if (
                    fs.existsSync(
                        filePath
                    )
                ) {

                    fs.unlinkSync(
                        filePath
                    );

                }

            }


            await pool.query(

                `
                    DELETE FROM resources

                    WHERE id = $1
                `,

                [
                    id
                ]

            );


            return res.json({

                success:
                    true,

                message:
                    "Resource removed successfully."

            });

        }

        catch (error) {

            console.error(
                "DELETE RESOURCE ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to remove resource."

            });

        }

    }
);


/* =========================================================
   ADMIN RESOURCE FILE VIEW
========================================================= */

app.get(
    "/api/admin/resources/:id/file",
    requireAdmin,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM resources

                        WHERE id = $1
                    `,

                    [
                        id
                    ]

                );


            if (
                !result.rows.length ||
                !result.rows[0].file_path
            ) {

                return res.status(404).end();

            }


            const resource =
                result.rows[0];


            const filePath =
                path.join(
                    RESOURCE_DIRECTORY,
                    path.basename(
                        resource.file_path
                    )
                );


            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return res.status(404).end();

            }


            res.setHeader(
                "Content-Type",
                resource.mime_type ||
                "application/octet-stream"
            );


            res.setHeader(
                "Content-Disposition",
                "inline"
            );


            return res.sendFile(
                filePath
            );

        }

        catch (error) {

            console.error(
                "ADMIN RESOURCE VIEW ERROR:",
                error
            );


            return res.status(500).end();

        }

    }
);


/* =========================================================
   CUSTOMER PDF LIBRARY
========================================================= */

app.get(
    "/api/library",
    requirePaidCustomer,
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `
                        SELECT
                            id,
                            title,
                            original_name,
                            file_size,
                            created_at

                        FROM pdfs

                        ORDER BY
                            created_at ASC
                    `

                );


            return res.json({

                success:
                    true,

                pdfs:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "CUSTOMER LIBRARY ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                pdfs:
                    [],

                message:
                    "Unable to load library."

            });

        }

    }
);


/* =========================================================
   CUSTOMER RESOURCES
========================================================= */

app.get(
    "/api/customer/resources",
    requirePaidCustomer,
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `
                        SELECT
                            id,
                            title,
                            type,
                            url,
                            file_path,
                            original_name,
                            mime_type,
                            file_size,
                            created_at

                        FROM resources

                        ORDER BY
                            created_at ASC
                    `

                );


            const resources =
                result.rows.map(
                    resource => ({

                        id:
                            resource.id,

                        title:
                            resource.title,

                        type:
                            resource.type,

                        url:
                            resource.type ===
                                "link"
                                ? resource.url
                                : null,

                        original_name:
                            resource.original_name,

                        mime_type:
                            resource.mime_type,

                        file_size:
                            resource.file_size,

                        created_at:
                            resource.created_at,

                        file_url:
                            resource.file_path
                                ? `/api/customer/resources/${resource.id}/file`
                                : null

                    })
                );


            return res.json({

                success:
                    true,

                resources

            });

        }

        catch (error) {

            console.error(
                "CUSTOMER RESOURCE ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                resources:
                    [],

                message:
                    "Unable to load resources."

            });

        }

    }
);


/* =========================================================
   CUSTOMER RESOURCE FILE VIEW
========================================================= */

app.get(
    "/api/customer/resources/:id/file",
    requirePaidCustomer,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).end();

            }


            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM resources

                        WHERE id = $1
                    `,

                    [
                        id
                    ]

                );


            if (
                !result.rows.length ||
                !result.rows[0].file_path
            ) {

                return res.status(404).end();

            }


            const resource =
                result.rows[0];


            const filePath =
                path.join(
                    RESOURCE_DIRECTORY,
                    path.basename(
                        resource.file_path
                    )
                );


            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return res.status(404).end();

            }


            res.setHeader(
                "Content-Type",
                resource.mime_type ||
                "application/octet-stream"
            );


            res.setHeader(
                "Content-Disposition",
                "inline"
            );


            res.setHeader(
                "Cache-Control",
                "private, no-store, no-cache, must-revalidate"
            );


            res.setHeader(
                "Pragma",
                "no-cache"
            );


            return res.sendFile(
                filePath
            );

        }

        catch (error) {

            console.error(
                "CUSTOMER RESOURCE FILE ERROR:",
                error
            );


            return res.status(500).end();

        }

    }
);


/* =========================================================
   SECURE PDF VIEW
========================================================= */

app.get(
    "/api/library/pdf/:id",
    requirePaidCustomer,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).send(
                    "Invalid PDF."
                );

            }


            const result =
                await pool.query(

                    `
                        SELECT *

                        FROM pdfs

                        WHERE id = $1
                    `,

                    [
                        id
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(404).send(
                    "PDF not found."
                );

            }


            const pdf =
                result.rows[0];


            const filePath =
                path.join(
                    PDF_DIRECTORY,
                    path.basename(
                        pdf.filename
                    )
                );


            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return res.status(404).send(
                    "PDF file is missing."
                );

            }


            const stat =
                fs.statSync(
                    filePath
                );


            res.setHeader(
                "Content-Type",
                "application/pdf"
            );


            res.setHeader(
                "Content-Disposition",
                "inline"
            );


            res.setHeader(
                "Content-Length",
                stat.size
            );


            res.setHeader(
                "Cache-Control",
                "private, no-store, no-cache, must-revalidate"
            );


            res.setHeader(
                "Pragma",
                "no-cache"
            );


            return fs
                .createReadStream(
                    filePath
                )
                .pipe(res);

        }

        catch (error) {

            console.error(
                "PDF VIEW ERROR:",
                error
            );


            return res.status(500).send(
                "Unable to open PDF."
            );

        }

    }
);


/* =========================================================
   CUSTOMER FEEDBACK
========================================================= */

app.post(
    "/api/customer/feedback",
    requirePaidCustomer,
    async (req, res) => {

        try {

            const {
                rating,
                message
            } = req.body;


            const numericRating =
                Number(rating);


            if (
                !Number.isInteger(
                    numericRating
                ) ||
                numericRating < 1 ||
                numericRating > 5
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Rating must be between 1 and 5."

                });

            }


            if (
                !message ||
                String(message).trim().length < 3
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please enter your feedback."

                });

            }


            await pool.query(

                `
                    INSERT INTO feedback
                    (
                        customer_id,
                        rating,
                        message
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3
                    )
                `,

                [
                    req.session.customerId,
                    numericRating,
                    String(message).trim()
                ]

            );


            return res.json({

                success:
                    true,

                message:
                    "Thank you for your feedback!"

            });

        }

        catch (error) {

            console.error(
                "FEEDBACK SUBMISSION ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to submit feedback."

            });

        }

    }
);


/* =========================================================
   CUSTOMER TESTIMONIAL
========================================================= */

app.post(
    "/api/customer/testimonial",
    requirePaidCustomer,
    testimonialUpload.single("photo"),
    async (req, res) => {

        try {

            const {
                name,
                location,
                rating,
                message,
                permission
            } = req.body;


            const cleanName =
                String(
                    name || ""
                ).trim();

            const cleanLocation =
                String(
                    location || ""
                ).trim();

            const cleanMessage =
                String(
                    message || ""
                ).trim();


            const numericRating =
                Number(rating);


            if (
                !cleanName ||
                !cleanMessage
            ) {

                if (
                    req.file
                ) {

                    const photoPath =
                        path.join(
                            TESTIMONIAL_DIRECTORY,
                            req.file.filename
                        );


                    if (
                        fs.existsSync(
                            photoPath
                        )
                    ) {

                        fs.unlinkSync(
                            photoPath
                        );

                    }

                }


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Name and testimonial are required."

                });

            }


            if (
                !Number.isInteger(
                    numericRating
                ) ||
                numericRating < 1 ||
                numericRating > 5
            ) {

                if (
                    req.file
                ) {

                    const photoPath =
                        path.join(
                            TESTIMONIAL_DIRECTORY,
                            req.file.filename
                        );


                    if (
                        fs.existsSync(
                            photoPath
                        )
                    ) {

                        fs.unlinkSync(
                            photoPath
                        );

                    }

                }


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select a rating."

                });

            }


            const photoFilename =
                req.file
                    ? req.file.filename
                    : null;


            const hasPermission =
                permission === true ||
                permission === "true" ||
                permission === "on";


            await pool.query(

                `
                    INSERT INTO testimonials
                    (
                        customer_id,
                        name,
                        location,
                        rating,
                        message,
                        photo_filename,
                        permission,
                        approved
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        FALSE
                    )
                `,

                [
                    req.session.customerId,
                    cleanName,
                    cleanLocation || null,
                    numericRating,
                    cleanMessage,
                    photoFilename,
                    hasPermission
                ]

            );


            return res.json({

                success:
                    true,

                message:
                    "Your testimonial has been submitted for review."

            });

        }

        catch (error) {

            console.error(
                "TESTIMONIAL SUBMISSION ERROR:",
                error
            );


            if (
                req.file
            ) {

                const photoPath =
                    path.join(
                        TESTIMONIAL_DIRECTORY,
                        req.file.filename
                    );


                if (
                    fs.existsSync(
                        photoPath
                    )
                ) {

                    fs.unlinkSync(
                        photoPath
                    );

                }

            }


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to submit testimonial."

            });

        }

    }
);


/* =========================================================
   PUBLIC APPROVED TESTIMONIALS
========================================================= */

app.get(
    "/api/testimonials",
    async (req, res) => {

        try {

            res.set("Cache-Control", "no-store, no-cache, must-revalidate");

            const result =
                await pool.query(

                    `
                        SELECT
                            id,
                            name,
                            location,
                            rating,
                            message,
                            photo_filename,
                            created_at

                        FROM testimonials

                        WHERE
                            approved = TRUE
                            AND permission = TRUE

                        ORDER BY
                            created_at DESC

                        LIMIT 12
                    `

                );


            const testimonials =
                result.rows.map(
                    testimonial => ({

                        id:
                            testimonial.id,

                        name:
                            testimonial.name,

                        location:
                            testimonial.location,

                        rating:
                            testimonial.rating,

                        message:
                            testimonial.message,

                        image:
                            testimonial.photo_filename
                                ? `/api/testimonials/${testimonial.id}/photo`
                                : null,

                        created_at:
                            testimonial.created_at

                    })
                );


            return res.json({

                success:
                    true,

                testimonials

            });

        }

        catch (error) {

            console.error(
                "PUBLIC TESTIMONIAL ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                testimonials:
                    []

            });

        }

    }
);


/* =========================================================
   ADMIN FEEDBACK
========================================================= */

app.get(
    "/api/admin/feedback",
    requireAdmin,
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `
                        SELECT
                            f.*,
                            c.email,
                            c.name AS customer_name

                        FROM feedback f

                        LEFT JOIN customers c
                        ON c.id =
                            f.customer_id

                        ORDER BY
                            f.created_at DESC
                    `

                );


            return res.json({

                success:
                    true,

                feedback:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "ADMIN FEEDBACK ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                feedback:
                    [],

                message:
                    "Unable to load feedback."

            });

        }

    }
);


/* =========================================================
   ADMIN TESTIMONIALS
========================================================= */

app.get(
    "/api/admin/testimonials",
    requireAdmin,
    async (req, res) => {

        try {

            const result =
                await pool.query(

                    `
                        SELECT
                            t.*,
                            c.email AS customer_email

                        FROM testimonials t

                        LEFT JOIN customers c
                        ON c.id =
                            t.customer_id

                        ORDER BY
                            t.created_at DESC
                    `

                );


            const testimonials =
                result.rows.map(
                    testimonial => ({

                        ...testimonial,

                        image:
                            testimonial.photo_filename
                                ? `/api/testimonials/${testimonial.id}/photo`
                                : null

                    })
                );


            return res.json({

                success:
                    true,

                testimonials

            });

        }

        catch (error) {

            console.error(
                "ADMIN TESTIMONIAL ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                testimonials:
                    [],

                message:
                    "Unable to load testimonials."

            });

        }

    }
);


/* =========================================================
   APPROVE / REJECT TESTIMONIAL
========================================================= */

app.patch(
    "/api/admin/testimonials/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid testimonial ID."

                });

            }


            let approved =
                req.body.approved;


            /*
                Accept both:

                true

                and

                "true"

                This makes the endpoint work with
                different admin JavaScript implementations.
            */

            if (
                approved === "true"
            ) {

                approved =
                    true;

            }

            else if (
                approved === "false"
            ) {

                approved =
                    false;

            }

            else {

                approved =
                    approved === true;

            }


            const result =
                await pool.query(

                    `
                        UPDATE testimonials

                        SET
                            approved = $1

                        WHERE
                            id = $2

                        RETURNING
                            id,
                            approved
                    `,

                    [
                        approved,
                        id
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Testimonial not found."

                });

            }


            return res.json({

                success:
                    true,

                message:
                    approved
                        ? "Testimonial approved successfully."
                        : "Testimonial approval removed.",

                testimonial:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "TESTIMONIAL APPROVAL ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to update testimonial."

            });

        }

    }
);


/* =========================================================
   DELETE TESTIMONIAL
========================================================= */

app.delete(
    "/api/admin/testimonials/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid testimonial ID."

                });

            }


            const result =
                await pool.query(

                    `
                        SELECT
                            photo_filename

                        FROM testimonials

                        WHERE id = $1
                    `,

                    [
                        id
                    ]

                );


            if (
                !result.rows.length
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Testimonial not found."

                });

            }


            const filename =
                result.rows[0]
                    .photo_filename;


            if (
                filename
            ) {

                const photoPath =
                    path.join(
                        TESTIMONIAL_DIRECTORY,
                        path.basename(
                            filename
                        )
                    );


                if (
                    fs.existsSync(
                        photoPath
                    )
                ) {

                    fs.unlinkSync(
                        photoPath
                    );

                }

            }


            await pool.query(

                `
                    DELETE FROM testimonials

                    WHERE id = $1
                `,

                [
                    id
                ]

            );


            return res.json({

                success:
                    true,

                message:
                    "Testimonial deleted successfully."

            });

        }

        catch (error) {

            console.error(
                "DELETE TESTIMONIAL ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to delete testimonial."

            });

        }

    }
);


/* =========================================================
   APPROVED TESTIMONIAL PHOTO
========================================================= */

app.get(
    "/api/testimonials/:id/photo",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).end();

            }


            const result =
                await pool.query(

                    `
                        SELECT
                            photo_filename

                        FROM testimonials

                        WHERE
                            id = $1

                            AND approved = TRUE

                            AND permission = TRUE
                    `,

                    [
                        id
                    ]

                );


            if (
                !result.rows.length ||
                !result.rows[0]
                    .photo_filename
            ) {

                return res.status(404).end();

            }


            const photoPath =
                path.join(
                    TESTIMONIAL_DIRECTORY,
                    path.basename(
                        result.rows[0]
                            .photo_filename
                    )
                );


            if (
                !fs.existsSync(
                    photoPath
                )
            ) {

                return res.status(404).end();

            }


            res.setHeader(
                "Cache-Control",
                "public, max-age=3600"
            );


            return res.sendFile(
                photoPath
            );

        }

        catch (error) {

            console.error(
                "TESTIMONIAL PHOTO ERROR:",
                error
            );


            return res.status(500).end();

        }

    }
);


/* =========================================================
   ADMIN DASHBOARD SUMMARY
========================================================= */

app.get(
    "/api/admin/stats",
    requireAdmin,
    async (req, res) => {

        try {

            const [

                customersResult,

                paidCustomersResult,

                pdfsResult,

                resourcesResult,

                feedbackResult,

                testimonialsResult,

                pendingTestimonialsResult

            ] =
                await Promise.all([

                    pool.query(
                        `
                            SELECT COUNT(*)::integer AS count
                            FROM customers
                        `
                    ),

                    pool.query(
                        `
                            SELECT COUNT(*)::integer AS count
                            FROM customers
                            WHERE paid = TRUE
                        `
                    ),

                    pool.query(
                        `
                            SELECT COUNT(*)::integer AS count
                            FROM pdfs
                        `
                    ),

                    pool.query(
                        `
                            SELECT COUNT(*)::integer AS count
                            FROM resources
                        `
                    ),

                    pool.query(
                        `
                            SELECT COUNT(*)::integer AS count
                            FROM feedback
                        `
                    ),

                    pool.query(
                        `
                            SELECT COUNT(*)::integer AS count
                            FROM testimonials
                        `
                    ),

                    pool.query(
                        `
                            SELECT COUNT(*)::integer AS count
                            FROM testimonials
                            WHERE approved = FALSE
                        `
                    )

                ]);


            return res.json({

                success:
                    true,

                stats: {

                    customers:
                        customersResult
                            .rows[0]
                            .count,

                    paidCustomers:
                        paidCustomersResult
                            .rows[0]
                            .count,

                    pdfs:
                        pdfsResult
                            .rows[0]
                            .count,

                    resources:
                        resourcesResult
                            .rows[0]
                            .count,

                    feedback:
                        feedbackResult
                            .rows[0]
                            .count,

                    testimonials:
                        testimonialsResult
                            .rows[0]
                            .count,

                    pendingTestimonials:
                        pendingTestimonialsResult
                            .rows[0]
                            .count

                }

            });

        }

        catch (error) {

            console.error(
                "ADMIN STATS ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load dashboard statistics."

            });

        }

    }
);


/* =========================================================
   TELEGRAM GROUP
========================================================= */

app.get(
    "/api/telegram",
    (req, res) => {

        return res.json({

            success:
                true,

            url:
                TELEGRAM_GROUP

        });

    }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await pool.query(
                "SELECT 1"
            );


            return res.json({

                success:
                    true,

                server:
                    "online",

                database:
                    "connected"

            });

        }

        catch (error) {

            console.error(
                "HEALTH CHECK ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                server:
                    "online",

                database:
                    "disconnected"

            });

        }

    }
);


/* =========================================================
   404 API HANDLER
========================================================= */

app.use(
    "/api",
    (req, res) => {

        return res.status(404).json({

            success:
                false,

            message:
                "API endpoint not found."

        });

    }
);


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            error
        );


        if (
            error instanceof
            multer.MulterError
        ) {

            let message =
                error.message;


            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                message =
                    "The uploaded file is too large.";

            }


            return res.status(400).json({

                success:
                    false,

                message

            });

        }


        return res.status(500).json({

            success:
                false,

            message:
                error.message ||
                "Server error."

        });

    }
);


/* =========================================================
   START SERVER
========================================================= */

initializeDatabase()

    .then(
        () => {

            app.listen(

                PORT,

                () => {

                    console.log(
                        "======================================"
                    );

                    console.log(
                        `Server running at ${BASE_URL}`
                    );

                    console.log(
                        `Environment: ${
                            process.env.NODE_ENV ||
                            "development"
                        }`
                    );

                    console.log(
                        "Database connected."
                    );

                    console.log(
                        "======================================"
                    );

                }

            );

        }
    )

    .catch(
        error => {

            console.error(
                "======================================"
            );

            console.error(
                "DATABASE INITIALIZATION FAILED"
            );

            console.error(
                error
            );

            console.error(
                "======================================"
            );


            process.exit(1);

        }
    );