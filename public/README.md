# What's in this zip

## Bugs fixed

1. **Resources not showing in customer dashboard.**
   Admin uploads were saved to the `resources` table, but the
   customer dashboard was reading from `/api/library`, which only
   returns the old `pdfs` table. Fixed in `dashboard.js` and
   `reader.js`/`reader.html` — they now call `/api/customer/resources`,
   which already existed on your server and reads the right table.

2. **Reader page only supported PDFs.** Since resources can now be
   images, videos or links, `reader.html`/`reader.js` were rewritten
   to branch on resource type (iframe for PDF, `<img>` for image,
   `<video>` for video, redirect for external links). I also wrote
   `reader.css` from scratch since it wasn't included in what you
   sent me — it matches your existing plum/gold palette.

3. **`dashboard.js` called `/api/community`,** which doesn't exist
   (your server only has `/api/telegram`). Fixed to call the real
   endpoint.

4. **Testimonials:** I checked the full approve → publish pipeline
   and it's correct — a testimonial only shows publicly when it is
   BOTH approved by you AND the customer checked the permission box
   when submitting. If one still isn't showing after you approve it,
   check the note under it in the admin dashboard — it tells you
   directly whether permission was given. I hardened the public
   fetch with `cache: "no-store"` just in case of stale caching.

## New features

- **Forgot / reset password**: `forgot-password.html/js` and
  `reset-password.html/js`, plus a link added to `login.html`.
  Sends a real email with a 1-hour expiring reset link.
- **Welcome email** on account activation.
- `mailer.js` — one shared nodemailer setup for both emails.

## Files in this zip

| File | What to do with it |
|---|---|
| `dashboard.js` | Replace your existing file |
| `reader.html` | Replace your existing file |
| `reader.js` | Replace your existing file |
| `reader.css` | New file — you didn't have one; add it |
| `login.html` | Replace your existing file |
| `login.js` | Replace your existing file |
| `forgot-password.html` | New file — add it |
| `forgot-password.js` | New file — add it |
| `reset-password.html` | New file — add it |
| `reset-password.js` | New file — add it |
| `mailer.js` | New file — add next to `server.js` |
| `SERVER_PATCH_INSTRUCTIONS.md` | Follow this to wire everything into `server.js` |

## Setup steps, in order

1. Drop the HTML/JS/CSS files into your `public` folder (wherever
   `login.html`, `dashboard.js` etc. currently live).
2. Drop `mailer.js` next to your `server.js`.
3. `npm install nodemailer`
4. Add the SMTP env vars from `SERVER_PATCH_INSTRUCTIONS.md` to your `.env`.
5. Follow steps 1–5 in `SERVER_PATCH_INSTRUCTIONS.md` to add the
   two new routes, the welcome-email call, and the DB column migration
   to `server.js`.
6. Restart your server — the `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   runs automatically on boot, so no manual migration step needed.
7. Test: activate a test account → check for the welcome email.
   Then try "Forgot your password?" on the login page → check for
   the reset email → click through → set a new password → log in.
