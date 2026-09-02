# SLS Quotation & Purchase Order System

A lightweight ERP module for **Quotations** and **Purchase Orders** only —
no tax invoices, no proforma invoices. Built for Shoolini Life Sciences,
styled to match the SLS brand (green `#6AB33D` / black / gray, sampled
from the logo).

## What's included

- **Backend**: Node.js + Express + Sequelize (SQLite file DB, zero setup)
  - Customers, Vendors, Item catalog — full CRUD
  - **Bulk Excel/CSV import** for customers, vendors, and items, with a
    downloadable template per entity and a per-row skip report (duplicates,
    missing name, bad price) so nothing fails silently
  - Quotations: draft → sent → accepted/rejected/expired, with locked
    editing once sent
  - Purchase Orders: draft → sent → confirmed → partially_received/received
    → closed, with per-line goods receipt tracking
  - **Salesperson auto-tracking** — every quotation/PO records who created
    it (from their login, not a free-text field), preserved even if that
    person's account is later removed
  - **Multi-user accounts with roles**, and an admin-only **Reports** page
    to export quotations/POs to Excel — overall, or filtered to one
    person's records
  - Gap-free sequential numbering per financial year (`SLS/26-27/025P`),
    generated inside a DB transaction so concurrent requests never collide
  - PDF generation (Puppeteer) styled to match your logo and mirroring the
    layout of your reference Purchase Order (vendor/ship-to boxes, GST
    line, grand total, signature block)
  - **Every generated PDF is saved** (to local disk by default, or S3-
    compatible cloud storage — see below) and tracked in a document
    library, so you can come back later and re-download it without
    recreating it
  - JWT authentication with roles (admin / manager / viewer)
- **Frontend**: React + Vite, installable as a desktop/mobile app (PWA)
  - Login, dashboard, list/create/detail pages for customers, vendors,
    items, quotations and purchase orders
  - **Documents page** — every PDF ever generated, searchable by number,
    with a one-click re-download (no need to reopen the original
    quotation/PO)
  - Every list page offers **both** bulk Excel upload and manual entry —
    upload a spreadsheet, or add one record at a time via a form
  - Line-item editor that can pull from the item catalog or accept custom
    lines
  - One-click PDF download from each document's detail page

## Getting started

### Option A: One-click start (easiest, for everyday use)

After you've done the one-time setup below once, you can start the whole
app — backend and frontend together — with a single double-click:

- **Windows**: double-click `start.bat`
- **Mac**: double-click `start.command` (first time, right-click → Open,
  since it's an unsigned script — macOS will ask you to confirm once)
- **Linux**: run `./start.sh`

This opens your browser to the app automatically. No terminal typing
needed after the first run. Closing the terminal/command window it opens
stops the app — leave that window running in the background while you work.

**One-time setup before the scripts work:**
```bash
cd invoicing-app
npm install          # installs the root helper (concurrently)
npm run setup         # installs both backend and frontend dependencies
cd backend && cp .env.example .env && npm run seed && cd ..
```
After that, just use `start.bat` / `start.command` / `start.sh` from now on.

### Option B: Manual start (two terminals)

If you'd rather run things yourself or the one-click script doesn't suit
your setup:

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev              # http://localhost:4000
```

```bash
# in a second terminal
cd frontend
npm install
npm run dev              # http://localhost:5173
```

### Option C: Always-on (host it once, then just use the icon — no
### starting anything, ever)

Options A and B both require your computer to be running the servers.
For a true "click the icon, it just works" experience — including from
your phone, or when your laptop is off — deploy the backend and frontend
to a small always-on host once. Free tiers exist on services like
**Render**, **Railway**, or **Fly.io** for the backend, and
**Netlify**/**Vercel** (or the same host) for the frontend. In short:

1. Push this project to a GitHub repo.
2. Create a backend service on your chosen host pointing at `/backend`,
   set the same environment variables as `.env.example`, and set
   `STORAGE_DRIVER=s3` with S3 credentials (see below) so generated PDFs
   survive redeploys — a host's local disk is often wiped on restart.
3. Create a frontend static site pointing at `/frontend`, with
   `VITE_API_URL` set to your deployed backend's URL (e.g.
   `https://your-backend.onrender.com/api`).
4. Open the deployed frontend URL once, install it (see "Installing as
   an app" below) — now the icon on your desktop/phone always points to
   a live server. No terminals, ever.

This is the real fix for "I don't want to start it every time" — the
one-click scripts above still require your machine to run the servers
each session; hosting removes that requirement entirely.

## Making it accessible to other computers

### Option 1: Same office/network (simplest — free, no hosting needed)

If everyone who needs access is on the same WiFi/office network as the
computer running the app, you don't need to deploy anywhere — just let
other computers reach this one directly.

1. **Find this computer's local network IP address:**
   - Windows: open Command Prompt, run `ipconfig`, look for "IPv4 Address"
     (something like `192.168.1.42`)
   - Mac: System Settings → Wi-Fi → Details, or run `ipconfig getifaddr en0`
   - Linux: run `hostname -I`

2. **Start the app as usual** (`start.bat` / `start.command` / `start.sh`).
   The backend and frontend both now listen on all network interfaces,
   not just this computer.

3. **On another computer on the same network**, open a browser and go to:
   ```
   http://<that-IP-address>:5173
   ```
   e.g. `http://192.168.1.42:5173`

4. **If it doesn't connect**, your firewall is probably blocking it —
   when you first start the app, Windows may show a popup asking to
   allow Node.js through the firewall for "Private networks." Click
   **Allow**. If you missed that prompt, go to Windows Defender Firewall
   → Allow an app through firewall → find Node.js → check "Private."

This computer needs to stay on and running the app for others to reach
it — it's acting as the server for everyone else.

### Option 2: Different locations / anywhere on the internet (hosted)

For access from different networks — different offices, people's homes,
on the road — the app needs real hosting instead of running on someone's
desk. There are two viable paths, depending on whether cost or simplicity
matters more to you:

- **Free ($0/month)** — requires swapping local SQLite + local PDF
  storage for two free managed services (a real database and real file
  storage), because no major host in 2026 keeps local files reliably for
  free. Trade-off: the free compute tier "sleeps" when idle, so the
  first request after a quiet period takes 30-60 seconds.
- **Paid (~$8/month)** — keeps the app's local SQLite + local disk setup
  exactly as-is, no code changes, no cold starts.

Both use Vercel for the frontend either way — that part is genuinely
free and identical in both paths.

---

## Free path ($0/month): Vercel + Render (free) + Neon + Cloudflare R2

**Why four services for "free hosting"?** Render's free web service tier
wipes any local file — the SQLite database, saved PDFs — every time it
restarts, redeploys, *or* spins down from 15 minutes of inactivity. That
last part is the killer: it happens constantly, not just on updates. So
"free" only actually works by moving the database and file storage off
that server entirely, onto services built to keep data reliably for
free: **Neon** (permanent free Postgres, no card, no expiry) and
**Cloudflare R2** (permanent free file storage, 10GB, zero egress fees —
note: Cloudflare does require adding a payment card to activate R2 at
all, even though usage within the free limits costs nothing; you won't
be charged unless you exceed 10GB storage or the monthly operation caps).

**Steps:**

1. **Push this project to GitHub** (see git commands in the paid path
   below if you haven't done this yet).

2. **Create a free Neon database** (neon.tech → sign up, no card):
   - Create a project (any name/region)
   - On the project dashboard, copy the **connection string** — it
     looks like `postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require`

3. **Create a free Cloudflare R2 bucket** (dash.cloudflare.com → R2):
   - Create a bucket (any name, e.g. `sls-erp-pdfs`)
   - Go to "Manage R2 API Tokens" → create a token with read/write
     permissions on that bucket — note the **Access Key ID**, **Secret
     Access Key**, and the **Account ID** (shown in your Cloudflare
     dashboard URL or the R2 overview page)
   - Your endpoint is `https://<account-id>.r2.cloudflarestorage.com`

4. **Create the backend on Render** (render.com → New → Web Service,
   free tier is fine here):
   - Connect your GitHub repo, **Root Directory**: `backend`
   - **Build Command**: `npm install`, **Start Command**: `npm start`
   - Add these environment variables:
     ```
     JWT_SECRET=<generate a long random string>
     DATABASE_URL=<your Neon connection string from step 2>
     STORAGE_DRIVER=s3
     S3_BUCKET=sls-erp-pdfs
     S3_REGION=auto
     S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
     S3_ACCESS_KEY_ID=<from step 3>
     S3_SECRET_ACCESS_KEY=<from step 3>
     ADMIN_NAME=Admin
     ADMIN_EMAIL=<your real email>
     ADMIN_PASSWORD=<a real password>
     ORG_NAME=Shoolini Life Sciences Pvt. Ltd.
     ORG_WEBSITE=www.shoolinilifesciences.com
     ORG_ADDRESS=Shoolini University Campus, Village - Bajhol, P.O. - Sultanpur
     ORG_EMAIL=Shoolinilifescience@shooliniuniversity.com
     ORG_PHONE=+91 8894987030
     ORG_GST=02AAWCS9548J2ZJ
     ```
   - Deploy. Visit `https://your-app.onrender.com/api/health` — should
     show `{"ok":true}` (allow up to a minute for the free tier's first
     cold start).

5. **Create the frontend on Vercel** (vercel.com → Add New → Project):
   - Import the same repo, **Root Directory**: `frontend`
   - Add environment variable:
     `VITE_API_URL=https://your-app.onrender.com/api`
   - Deploy.

6. **Lock down CORS** (recommended): on Render, add
   `CORS_ORIGIN=https://your-app.vercel.app` (your real Vercel URL).

7. **Log in** at your Vercel URL with the `ADMIN_EMAIL`/`ADMIN_PASSWORD`
   from step 4 — created automatically on first boot. **Go to Users and
   reset that password immediately.**

8. **Install it as an app** (see below) — works from anywhere, $0/month.

**Living with the cold start**: if nobody's used the app in the last 15
minutes, the next person to open it waits 30-60 seconds for the first
load — after that it's fast until it goes quiet again. For an internal
business tool used through the day, this is usually a minor, occasional
wait rather than a real problem. If it bothers you later, upgrading just
the Render service to Starter (~$7/month) removes the sleep entirely —
nothing else about this setup needs to change.

**One more honest caveat**: PDF generation uses a real Chromium browser
(Puppeteer), and Render's free tier caps RAM at 512MB. This app's PDFs
are simple enough that this is normally fine, but if you ever see PDF
downloads fail specifically on Render's free tier, that's the likely
cause — upgrading to Starter (1GB+ RAM) resolves it, or let me know and
I can swap the PDF engine to a lighter one that fits comfortably in 512MB.

---

## Paid path (~$8/month): Vercel + Render Starter + Disk

This keeps the app exactly as it runs on your computer now — same
SQLite file, same local PDF folder — just always-on and reachable from
anywhere, with no cold starts.

**Steps:**

1. **Push this project to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

2. **Create the backend on Render** (render.com → New → Web Service):
   - Connect your repo, **Root Directory**: `backend`
   - **Build Command**: `npm install`, **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/mo) — free tier can't attach a disk
   - Under **Disks**, add one: mount path `/var/data`, size 1GB

3. **Add environment variables** on that service:
   ```
   JWT_SECRET=<generate a long random string>
   DB_STORAGE=/var/data/database.sqlite
   PDF_STORAGE_DIR=/var/data/pdfs
   ADMIN_NAME=Admin
   ADMIN_EMAIL=<your real email>
   ADMIN_PASSWORD=<a real password>
   ORG_NAME=Shoolini Life Sciences Pvt. Ltd.
   ORG_WEBSITE=www.shoolinilifesciences.com
   ORG_ADDRESS=Shoolini University Campus, Village - Bajhol, P.O. - Sultanpur
   ORG_EMAIL=Shoolinilifescience@shooliniuniversity.com
   ORG_PHONE=+91 8894987030
   ORG_GST=02AAWCS9548J2ZJ
   ```
   Both paths point inside `/var/data` — the disk from step 2 — so both
   the database and every generated PDF survive restarts and redeploys.
   Both are created automatically on first boot; no manual setup needed.

4. **Deploy.** Check `https://your-app.onrender.com/api/health` shows
   `{"ok":true}`.

5. **Create the frontend on Vercel** — same as steps 5-8 in the free
   path above (import repo, root directory `frontend`, set
   `VITE_API_URL`, deploy, lock CORS, log in, reset the bootstrap
   password, install as an app).

**Cheaper DIY alternative**: a small VPS (DigitalOcean, Hetzner, Linode
— roughly $4-6/month) gives you a real always-on Linux machine with a
real persistent disk, run almost exactly like `start.sh` runs this app
on your own computer now, just with Node/PM2/nginx set up once. More
setup work up front, no managed dashboard, but usually the cheapest way
to get genuine persistence if the free path's cold starts don't work
for you either. Ask me if you'd like that walkthrough instead.

### A note on multiple people writing data at once

The default database (SQLite) handles multiple simultaneous *readers*
fine, but if several people are saving records at the exact same moment,
occasional "database is locked" errors can happen under heavy concurrent
use. For a small team (a handful of people), this is unlikely to be
noticeable. If it becomes a problem, switching to PostgreSQL (see
`backend/src/config/database.js`) removes this limit entirely — the rest
of the app doesn't need to change.

## User accounts

The demo login (`admin@shoolinilifesciences.com` / `admin123`) created
by `npm run seed` is an **admin** account. Log in as admin and open the
**Users** page (visible only to admins) to create a separate login for
each teammate, with one of three roles:

- **Admin** — full access, including managing other users
- **Manager** — can create/edit quotations, purchase orders, customers,
  vendors, and items
- **Viewer** — read-only

Each person should have their own login rather than sharing one — this
also means you can see who created or changed what.

**Security note**: once other computers can reach this app (Option 1 or
2 above), change the demo admin password (or delete that account after
creating your own) — anyone who knows the app's default credentials
could otherwise log in.

## Salesperson tracking and reports

Every quotation now automatically records who created it — pulled from
their login, not typed in — and shows on both the quotation itself and
its PDF as "Sales Person." Purchase orders work the same way, labeled
"Raised By." This is captured at creation time, so it stays accurate
even if that person's user account is later removed.

Admins get a **Reports** page (Users page's neighbor in the sidebar)
to export either document type to Excel:
- Leave the dropdown on "All" for everyone's records in one file
- Pick one person to get just their records
- Optionally narrow by date range too

This is separate from the **Documents** page (which re-downloads PDFs
you've already generated) — Reports produces spreadsheet-format data
across many documents at once, for bookkeeping/analysis rather than
sending a single document to a customer or vendor.

## Quotation format (matches this lab's real letterhead)

The quotation PDF and detail page are built to match this business's
actual quotation format exactly — letterhead, customer letter block,
sample/parameter table, totals, terms, and footer.

**Signature**: every quotation PDF automatically shows the real
signature/stamp image (`backend/assets/signature.png`) in the
Authorized Signatory block — no manual signing needed. To replace it
(e.g. a different signatory later), just swap that file for a new
image of the same rough shape (wide, transparent or white background)
and redeploy; no code change needed. If that file is ever missing, the
PDF falls back to a plain text "Authorized Signatory" block instead of
failing.

**Samples & Parameters** (matches the "Sample Name / Parameters / Sample
Qty. / Charges per Sample / Sample count / Total" columns of the real
format — pricing is always per-sample here, never per-parameter):

- Enter a **Sample Name** once per sample.
- Add one or more **Parameters** under it — pick from the catalog or
  type a new one freely. **Typing a new parameter automatically saves
  it to the Parameters catalog** (matched by name, so retyping an
  existing one reuses it instead of duplicating) — so next time it's
  available to pick from the dropdown.
- Set **Sample Qty.**, **Charges/Sample**, and **Sample Count** — the
  line total is Charges/Sample × Sample Qty. × Sample Count, matching
  the real form's columns exactly.
- **"+ Add Sample"** starts a new sample block for quoting several
  samples in one quotation.
- Manage the Parameters catalog directly at **Parameters** in the
  sidebar: add one at a time, or bulk-upload a spreadsheet.
- **Items** (materials/reagents bought from vendors on Purchase Orders)
  is a separate, unchanged catalog — not in the sidebar nav day-to-day,
  but still reachable at `/items`, and Purchase Orders use it exactly
  as before.

**Discount** is a single field for the whole quotation (not per sample)
— enter it once near the bottom of the form.

**GST** defaults to *on* at 18% (matching this lab's standard practice
of always charging it) — shown as its own line in the totals and on the
PDF. Uncheck "Include GST" for the rare exempt/exclusive quote.

**Subject line**: quotations have an optional "Sub." field, shown on
the letter exactly like the real format.

### Matching the letterhead exactly

The quotation PDF's company details, NABL accreditation line, PAN, bank
details, and footer address all come from `QUOTE_ORG_*` environment
variables — separate from the `ORG_*` ones Purchase Orders use, since
this business's letterhead address differs from its PO "Ship To"
address. `backend/.env.example` has all of them pre-filled with the
values from the reference document, including bank details for the
"Payment Should be advanced through RTGS/NEFT" terms line — update them
there (or in your host's environment variables once deployed) if any of
these details ever change.

## Who can see what

**Admins** see every quotation, purchase order, and generated PDF —
across all users. **Managers and viewers** only see the ones they
created themselves; a quotation someone else made won't appear in
their list, and won't open even by direct link. The admin-only
**Reports** page still lets an admin pull everyone's data, or filter to
one person, regardless of this.

## Discounts and revising a quotation

**Discount is entered as a percentage** (not a flat rupee amount) —
the form shows Subtotal → Discount (%) → Total after Discount → GST →
Grand Total, and the PDF matches that same sequence.

**Revising a quotation**: once a quotation is no longer a draft (sent,
accepted, etc.), you can no longer edit it directly — the customer may
already have a copy. Instead, click **Revise** on its detail page. This
creates a new, fully editable draft copy (new number like
`SLS/26-27/QT-006-R1`, samples/discount/GST all copied over) and takes
you straight into editing it — change rates, add or remove parameters,
adjust the discount, anything. The original quotation is never touched.
A draft (including a fresh revision) can also be edited directly via
the **Edit** button on its detail page, without going through Revise.

## Mixing pricing within one sample

A sample's parameters don't all have to be priced the same way. By
default, every parameter you add gets its own **Charges** field. Check
**"Combine with above"** on any parameter (after the first) to fold it
into the same price as the parameter directly above it instead — check
it on several in a row to group 3 or more together under one shared
price. This means a single sample can freely mix individually-priced
parameters with one or more combined-price groups, all at once — e.g.
"256 pesticides" priced on its own, while "physical & Chemical" and
"Heavy metals" share one combined price, all under the same sample. The
detail page and PDF automatically show grouped parameters under one
merged price cell, and individually-priced ones with their own.

## User designations & contact details

When creating a user (Users page, admin only), you can set:
- **Designation** (e.g. "Sales Executive," "Lab Manager")
- **Contact No.**

Both show on quotations/POs they create — the quotation PDF's sign-off
block ("Warm regards, ... Mob: ...") uses the creator's name and contact
number automatically, matching the real format. Click a user's
designation or contact number in the Users table to edit it later.

## PDF generation on Render: "Could not find Chrome"

If you deployed the backend to Render and PDF downloads fail with a
"Could not find Chrome" error, this is a known Render + Puppeteer
interaction: Chrome gets downloaded during the build step to a system
cache path that doesn't always carry over into the running service.

This project already includes the standard fix (`backend/.puppeteerrc.cjs`,
which pins Chrome's download location inside the project folder so it's
guaranteed to survive the build-to-runtime handoff) — if you're
redeploying with the latest code, this should already be resolved.

If it still happens, add this as an extra safety net: on Render, go to
your backend service → **Settings** → change the **Build Command** from
`npm install` to:
```
npm install && npx puppeteer browsers install chrome
```
This forces Chrome to (re-)install on every build, regardless of
whether Render's dependency cache skipped it.


### 3. Try it out

1. Log in with the demo admin account.
2. Add a Customer (for quotations) and a Vendor (for purchase orders) —
   either **upload an Excel file** (click "Download template" on the
   Customers/Vendors page first to get the exact column headers), or use
   **"+ Add Customer/Vendor"** to enter one manually. Or just use the
   ones the seed script already created.
3. Do the same for Items — bulk-upload a spreadsheet of your catalog, or
   click **"+ Add Item Manually"** to enter one at a time.
4. Create a Quotation or Purchase Order, then open its detail page and
   click **Download PDF**.

### Bulk Excel import — column names

The importer matches header names case-insensitively and accepts a few
common variants, so your existing spreadsheet likely works without
edits. If a column isn't recognized, download the template for the exact
expected names.

**Customers / Vendors**: Name (required), Contact Person, Address,
GST No, Email, Phone

**Items**: Name (required), SKU, Description, Unit, Unit Price

Rows missing a name, or whose name/SKU already exists, are skipped and
listed in the "View skipped rows" summary after upload — nothing is
overwritten silently.

### Installing as an app

The frontend is a installable PWA. Once you run `npm run build` and serve
the `dist/` folder (or even just `npm run dev`), most browsers will offer
an **Install** option (in Chrome: the icon in the address bar, or the
"⋮" menu → "Install SLS ERP"). Installing it adds an SLS icon to your
desktop/home screen — opening it launches straight to the login page in
its own window, no browser address bar, like any other installed app.

**Note**: installing the PWA doesn't remove the need for the backend
server to be running somewhere. If you install it while running the app
locally (Options A/B above), you'll still need to start the servers each
session before the installed icon works — installing just skips the
"open a browser tab" step. For an icon that works without starting
anything, deploy the app first (Option C above), then install from the
deployed URL.

### Where do generated PDFs live?

Every time you click "Download PDF" on a quotation or purchase order,
the backend saves that PDF and records it in the **Documents** page.
Regenerating the same document overwrites its saved copy rather than
piling up duplicates, so Documents always shows the latest version.

By default (`STORAGE_DRIVER=local` in `.env`), PDFs are saved to
`backend/storage/pdfs/` on whatever machine runs the backend. That's
fine as long as that machine keeps running and its disk isn't wiped —
which is true for your own computer, and true for most VPS/cloud VM
hosting, but **not** true for some free-tier "serverless" hosts that
reset their filesystem on every deploy.

If you're deploying to a host with ephemeral storage, switch to real
cloud object storage instead:

```bash
npm install @aws-sdk/client-s3 --prefix backend
```
Then in `backend/.env`:
```
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com   # omit for real AWS S3
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```
This works with AWS S3 directly, or any S3-compatible service —
Cloudflare R2 and Backblaze B2 both have free tiers large enough for
years of PDFs. No other code changes needed; every route that reads or
writes a PDF goes through `services/storageService.js`, which is the
only file that knows which driver is active.

## Project structure

```
backend/
  src/
    config/database.js       Sequelize + SQLite setup
    models/                  Customer, Vendor, Item, Quotation, PurchaseOrder, ...
    controllers/              Business logic for each resource
    routes/                   Express route definitions
    middleware/auth.js        JWT auth + role guard
    templates/                HTML templates for PDF generation (brand-styled)
    services/pdfService.js    Puppeteer PDF rendering
    utils/
      numbering.js             Gap-free sequential document numbers
      statusTransitions.js     Valid status-change rules per document type
      money.js                 Rupee <-> paise conversion & formatting
      seed.js                  Demo data script
frontend/
  src/
    api/                      Fetch client + auth context
    components/LineItemsEditor.jsx
    pages/                    Login, Dashboard, lists, forms, detail views
    styles/global.css         Brand-matched styling
```

## Design notes worth knowing

- **Money is stored as integer paise**, never floats, to avoid rounding
  errors. The frontend and PDF templates convert to rupees only for
  display.
- **Line items snapshot their description and price** at creation time
  rather than live-joining to the item catalog — so a historical
  quotation/PO stays accurate even if you later change a catalog price.
- **Status transitions are enforced in code** (`utils/statusTransitions.js`),
  not just as a DB enum, so the API rejects invalid jumps like
  `draft → closed`.
- **Editing is locked once a document leaves draft** — the counterpart
  (customer or vendor) may already have a copy, so the document shouldn't
  silently change underneath them.

## Moving beyond this MVP

- **Switch to PostgreSQL**: edit `backend/src/config/database.js` — the
  models and controllers don't need to change, since Sequelize abstracts
  the SQL.
- **Email sending**: wire up `nodemailer` (or an API like Resend/SendGrid)
  in a new `services/emailService.js` and call it from the status-change
  routes when a quotation/PO moves to `sent`.
- **Quotation → PO conversion**: the `PurchaseOrder.sourceQuotationId`
  field already exists for this — add a "Convert to PO" button on the
  quotation detail page that pre-fills a new PO form from the quotation's
  line items.
- **Multi-tenancy**: if you'll run this for more than one legal entity,
  add an `organizationId` column to every table and scope all queries by
  it — the numbering counters are already keyed by document type + year,
  so adding org to that key is a small change.

### Swapping the PDF engine

If Puppeteer's Chromium download isn't viable in your deployment
environment, `backend/src/services/pdfService.js` is the only file that
needs to change — swap `page.pdf()` for a call to `wkhtmltopdf` (already
used to produce the sample preview PDF) or `weasyprint`, keeping the same
HTML templates in `src/templates/`.
