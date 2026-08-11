# Menz

A data-driven REST API for a men's clothing store, built with Node.js, Express and Sequelize (MySQL), plus a static HTML/JS frontend served from the same app.

Full endpoint documentation is generated at the project root once the server is running — see "Getting it running" below, then open `http://localhost:3000/`.

## Tech stack

- Node.js (v20+) / Express
- MySQL via Sequelize
- JWT authentication in an `httpOnly` cookie (not localStorage — protects against XSS)
- bcrypt for password hashing
- multer for product photo uploads
- nodemailer for password reset emails
- Plain static HTML/CSS/JS frontend (`public/`), calling the API with `fetch(..., { credentials: 'include' })`

## Getting it running

1. **Clone and install**
   ```
   git clone <this repo's URL>
   cd Menz
   npm install
   ```

2. **Create a database**

   Create an empty MySQL database (default name `menz_db`, or your own — see step 3).

3. **Configure environment**

   Copy `.env.example` to `.env` and fill in the values:
   ```
   cp .env.example .env
   ```
   At minimum set `DB_NAME`, `DB_USER`, `DB_PASSWORD` to match your MySQL setup, and `JWT_SECRET` to any long random string. `SMTP_HOST` can be left empty in development — password reset emails then go through a throwaway Ethereal test inbox, and the preview link is logged to the console instead of a real email being sent.

4. **Create the schema and seed base data**
   ```
   npm run seed
   ```
   This creates all tables (via `sequelize.sync()`), seeds the fixed `Size` table (S/M/L/XL/XXL), and creates a default admin account using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. This step is required before first starting the server — the server itself does not create tables, only `npm run seed` does. It's safe to re-run; it skips the admin account if it already exists.

5. **Start the server**
   ```
   npm run dev    # with nodemon, auto-restarts on changes
   npm start      # plain node
   ```

6. **Explore**
   - `http://localhost:3000/` — API documentation (root page, required by the assignment)
   - `http://localhost:3000/home.html` — client-facing shop (browse, add to cart, checkout)
   - `http://localhost:3000/login.html` — log in as the seeded admin, or register a new client account
   - `http://localhost:3000/admin/dashboard.html` — admin panel (categories, products, orders)

## Project structure

```
config/       Sequelize/database configuration
controllers/  Route handler logic per resource
middleware/   auth, role, optionalAuth, error handling
models/       Sequelize models and associations
public/       Static frontend (HTML/CSS/JS) + uploaded product photos
routes/       Express routers per resource
seeders/      One-off seed script (sizes + admin account)
utils/        Validators, JWT/reset-token helpers, mailer, upload config
```

## Notes on design decisions

- **Auth**: the JWT lives in an `httpOnly` cookie set by the server, never read or stored by frontend JS. The auth middleware reads it from the cookie, not an `Authorization` header. This means every `fetch()` call to a protected endpoint from the frontend must include `credentials: 'include'`.
- **Cart**: the shopping cart lives in the browser's `localStorage`, not the database — it works for guests too, and is only turned into a real `Order` (with a server-side stock check and decrement) at checkout.
- **Stock**: never trusted from the client. `POST /api/orders` checks and decrements stock per product/size inside a database transaction, and rejects the whole order if any line item doesn't have enough stock.
- **Order status**: flows one-way, `new → processed → completed`. There is no cancel/cancelled state in this project (intentionally out of scope).
- **Error responses**: every error response across the API uses the same shape, `{ "errors": ["message", ...] }`, including validation errors, 404s, and unexpected server errors.

## Sources

- [Express](https://expressjs.com/) — routing, middleware, static file serving
- [Sequelize](https://sequelize.org/docs/v6/) — models, associations, transactions
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — JWT signing/verification
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) — password hashing
- [multer](https://github.com/expressjs/multer) — multipart form / file upload handling
- [nodemailer](https://nodemailer.com/) — sending password reset emails, including its [Ethereal test account](https://nodemailer.com/smtp/testing/) feature used for local development
