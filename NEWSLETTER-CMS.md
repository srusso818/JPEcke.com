# Technical Architecture & Developer Maintenance Guide: Newsletter CMS

**Website:** [jpecke.com](https://jpecke.com)  
**Client:** Lisa Ecke, Justice of the Peace, District 6 (Washington County, Arkansas)  
**Repository:** `srusso818/JPEcke.com`  
**Platform:** GitHub Pages + Decap CMS + DecapBridge Auth Gateway  

---

## 1. Overall System Architecture

The newsletter publishing system adds content management capabilities to `jpecke.com` while strictly isolating new functionality from existing static pages (`index.html`, `donate.html`, `gallery.html`, `compare.html`).

```
+-------------------------------------------------------------------------------+
|                                Content Creation                                |
|                                                                               |
|   Lisa Ecke                                   Developer                       |
|   (Browser @ /admin/)                         (DecapBridge Admin / Git)       |
|          |                                            |                       |
|          v                                            v                       |
|   +-------------------------------------------------------+                   |
|   | Decap CMS 3.x Visual Editor (admin/index.html)        |                   |
|   | Client Auth: DecapBridge Git Gateway                  |                   |
|   +-------------------------------------------------------+                   |
|                               |                                               |
+-------------------------------|-----------------------------------------------+
                                | (HTTPS API / JWT)
                                v
+-------------------------------------------------------------------------------+
|                       DecapBridge Authentication Gateway                      |
|                                                                               |
|   * Authenticates Lisa via email/password or OAuth (Google/Microsoft)         |
|   * Holds encrypted fine-grained GitHub PAT (scoped to srusso818/JPEcke.com)  |
|   * Translates Decap CMS actions into Git commits                             |
+-------------------------------------------------------------------------------+
                                | (Git Commit to 'main')
                                v
+-------------------------------------------------------------------------------+
|                               GitHub Repository                               |
|                                                                               |
|   * Adds/updates Markdown files: /content/newsletters/<slug>.md               |
|   * Uploads photography:         /assets/newsletters/<photo>.jpg              |
+-------------------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------------+
|                         Automated Build Pipeline                              |
|                         (.github/workflows/publish-newsletter.yml)            |
|                                                                               |
|   1. Triggers on push to 'main' for content/newsletters/**                    |
|   2. Runs scripts/build-newsletter.js                                         |
|   3. Compiles Markdown -> HTML using marked & gray-matter                     |
|   4. Generates /newsletter/index.html (Archive with search & cards)           |
|   5. Generates /newsletter/<slug>/index.html (Individual article views)       |
|   6. Commits compiled HTML to 'main' [skip ci]                                |
+-------------------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------------+
|                                GitHub Pages                                   |
|                                                                               |
|   * Serves static content at https://jpecke.com/newsletter/                   |
|   * Serves article pages at  https://jpecke.com/newsletter/<slug>/            |
|   * Zero runtime server, zero ongoing maintenance, zero hosting cost         |
+-------------------------------------------------------------------------------+
```

---

## 2. Directory Structure

```
JPECKE.com/
├── .github/
│   └── workflows/
│       └── publish-newsletter.yml     # Automated build & commit workflow
├── admin/
│   ├── index.html                     # Decap CMS frontend + custom preview template
│   └── config.yml                     # Decap CMS collections, fields, and backend config
├── assets/
│   ├── images/                        # Existing campaign images (untouched)
│   └── newsletters/                   # Newsletter photographs (isolated)
├── content/
│   └── newsletters/                   # Version-controlled Markdown posts with YAML frontmatter
├── templates/
│   └── newsletter/
│       ├── archive-template.html      # Archive page template (with search bar & cards)
│       └── article-template.html      # Article page template (Open Graph, author bio, typography)
├── newsletter/
│   ├── index.html                     # Generated archive page
│   ├── newsletter.css                 # Scoped stylesheet (Cinzel, Inter, Navy/Gold/Red)
│   └── <slug>/
│       └── index.html                 # Generated individual article page
├── scripts/
│   ├── build-newsletter.js            # Scoped static generator script
│   └── serve.js                       # Local development server
├── package.json                       # Dependencies (marked, gray-matter)
├── LISA-NEWSLETTER-GUIDE.md           # Non-technical guide for Lisa Ecke
├── NEWSLETTER-CMS.md                  # This technical manual
├── index.html                         # Untouched main website
├── index.css                          # Untouched main stylesheet
├── script.js                          # Untouched main JavaScript
└── CNAME                              # jpecke.com
```

---

## 3. CMS Configuration (`admin/config.yml`)

The CMS connects via the `git-gateway` backend provided by DecapBridge.

```yaml
backend:
  name: git-gateway
  repo: srusso818/JPEcke.com
  branch: main
  identity_url: https://auth.decapbridge.com/sites/YOUR_DECAPBRIDGE_SITE_ID
  gateway_url: https://gateway.decapbridge.com

media_folder: "assets/newsletters"
public_folder: "/assets/newsletters"
```

### Content Model (`newsletters`)
- **Title (`title`):** Required text string.
- **Date (`date`):** DateTime widget formatted to `YYYY-MM-DDTHH:mm:ssZ`.
- **Draft (`draft`):** Boolean toggle. If `true`, the static generator skips compiling the article to public HTML and excludes it from the archive.
- **Slug (`slug`):** Optional custom URL slug. If empty, the generator derives the slug from the post title or filename.
- **Featured Image (`featured_image`):** Uploaded directly to `/assets/newsletters/`.
- **Featured Image Alt (`featured_image_alt`):** Accessibility text and photo caption.
- **Excerpt (`excerpt`):** 1-2 sentence plain-text summary displayed on archive cards.
- **Body (`body`):** Rich-text Markdown widget with bold, italic, headings (H2, H3), lists, quotes, and links.
- **SEO Description (`seo_description`):** Optional metadata for search engines and social sharing.

---

## 4. Authentication Provider Setup (DecapBridge)

Lisa Ecke must **not** need a GitHub account. We achieve this via **DecapBridge**:

### Step 1: Create Account & Site on DecapBridge
1. The developer logs into [https://decapbridge.com](https://decapbridge.com).
2. Click **Create New Site** or **Add Site**.
3. Set the repository to: `srusso818/JPEcke.com`.
4. Enter production branch: `main`.

### Step 2: Configure Fine-Grained GitHub Access Token
1. In the developer's GitHub account, go to `Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens`.
2. Generate a token with the following scope:
   - **Repository Access:** Only select `srusso818/JPEcke.com`.
   - **Repository Permissions:**
     - `Contents`: **Read and Write**
     - `Pull requests`: **Read and Write**
     - `Metadata`: **Read-only** (default)
3. Paste the token into the DecapBridge site setup.
4. Copy the resulting **Site ID** or **Identity URL** (e.g., `https://auth.decapbridge.com/sites/a1b2c3d4-...`).

### Step 3: Update `admin/config.yml`
Replace `YOUR_DECAPBRIDGE_SITE_ID` with the actual Site ID from DecapBridge:
```yaml
identity_url: https://auth.decapbridge.com/sites/a1b2c3d4-...
gateway_url: https://gateway.decapbridge.com
```

### Step 4: Invite Lisa Ecke
1. In the DecapBridge site dashboard, navigate to **Users** -> **Invite User**.
2. Enter Lisa's email address and assign her the **Editor** role.
3. DecapBridge sends Lisa an invitation link where she sets her password.
4. Lisa logs in at `https://jpecke.com/admin/`.

---

## 5. Security & Access Control

- **Zero Public Credentials:** No API tokens, passwords, or secrets are committed to the repository or visible in client-side code.
- **Scoped Permissions:** The GitHub Personal Access Token used by DecapBridge is restricted strictly to the `srusso818/JPEcke.com` repository.
- **Separation of Accounts:** Lisa uses her own email/password. The developer maintains independent access through DecapBridge and direct Git pushes.
- **Access Revocation:** If access needs to be revoked for any user, the developer can delete or disable that user in the DecapBridge dashboard in seconds without touching GitHub.
- **Token Rotation:** The GitHub PAT in DecapBridge can be rotated at any time under the DecapBridge site settings.

---

## 6. Build & Deployment Automation

### Local Build & Testing
```bash
# Install dependencies (only required for local build)
npm install

# Compile markdown newsletters to HTML
npm run build:newsletter

# Launch local preview server
npm run serve
```
Open `http://localhost:8080/` in your browser.

### Automated GitHub Actions Workflow
When Lisa publishes an article via Decap CMS:
1. DecapBridge commits `content/newsletters/<filename>.md` directly to `main`.
2. `.github/workflows/publish-newsletter.yml` is triggered automatically.
3. The workflow executes `npm run build:newsletter` on Ubuntu.
4. It detects newly generated or updated HTML files in `/newsletter/`.
5. It commits the compiled static pages back to `main` with `[skip ci]`.
6. GitHub Pages detects the commit and serves the live files immediately.

---

## 7. Operating Costs

| Item | Provider | Monthly Cost |
| :--- | :--- | :--- |
| **Public Hosting & CDN** | GitHub Pages | **$0.00** |
| **Authentication & Git Gateway** | DecapBridge (Free Tier, up to 3 users) | **$0.00** |
| **Content Management System** | Decap CMS (Open Source, MIT) | **$0.00** |
| **Build & CI Automation** | GitHub Actions (Standard public minutes) | **$0.00** |
| **Media & Photo Storage** | Repository `/assets/newsletters/` | **$0.00** |
| **Total Recurring Cost** | | **$0.00 / month** |

---

## 8. Backup & Disaster Recovery

- **Full Version Control:** All newsletter articles are stored as plain Markdown files in `/content/newsletters/` inside Git. Every revision, edit, and publication has an immutable commit history.
- **Local Git Clone:** Anyone with repository access has a full offline backup of all content, templates, images, and history.
- **Rollback Procedure:** If an erroneous article is published or an accidental deletion occurs:
  ```bash
  # View recent commits
  git log -n 5 content/newsletters/

  # Revert specific commit or restore a deleted file
  git checkout <commit-hash> -- content/newsletters/<post-filename>.md
  node scripts/build-newsletter.js
  git commit -m "fix: restore previous newsletter version"
  git push origin main
  ```

---

## 9. Troubleshooting

### Issue 1: Login Error at `/admin/` ("API_ERROR: Failed to authenticate")
- **Cause:** `identity_url` in `admin/config.yml` contains placeholder `YOUR_DECAPBRIDGE_SITE_ID`, or token expired in DecapBridge.
- **Fix:** Verify `admin/config.yml` matches the Site ID in DecapBridge. Verify the GitHub token in DecapBridge has not expired.

### Issue 2: Published article doesn't appear on `/newsletter/` after 2 minutes
- **Cause:** Post is marked as `draft: true`, or GitHub Actions workflow encountered an error.
- **Fix:**
  1. Check the article in `/admin/`: make sure "Draft Mode" is unchecked.
  2. Check the **Actions** tab on `https://github.com/srusso818/JPEcke.com/actions` to see the build logs for `publish-newsletter.yml`.

### Issue 3: Image fails to render in article
- **Cause:** Incorrect image path.
- **Fix:** Images uploaded via Decap CMS are saved in `/assets/newsletters/`. Ensure image paths begin with `/assets/newsletters/`.

---

## 10. Official Launch Guide (Phase 8 — For Future Execution)

> ⚠️ **IMPORTANT:** Do NOT perform these steps until the client (Lisa Ecke) and developer have explicitly approved the public launch!

When authorized to make the newsletter public:

### Step 1: Remove Development `noindex` Safeguards
In `templates/newsletter/archive-template.html` and `templates/newsletter/article-template.html`:
```html
<!-- REMOVE THIS LINE: -->
<meta name="robots" content="noindex, nofollow">

<!-- REPLACE WITH: -->
<meta name="robots" content="index, follow">
```
Also remove the yellow `<div class="newsletter-staging-banner">...</div>` banner from both templates.

### Step 2: Add Newsletter Link to Main Navigation
In all root HTML files (`index.html`, `donate.html`, `gallery.html`, `compare.html`):
Locate the `<nav class="nav-links" id="nav-links">` block and insert the Newsletter link:
```html
<a href="/newsletter/" class="nav-link">Newsletter</a>
```
Insert it between `Gallery` and `Voter Guide` (or your preferred position).

### Step 3: Update Sitemap & Recompile
1. Add `https://jpecke.com/newsletter/` to your sitemap (if maintained).
2. Run `npm run build:newsletter` to generate the production HTML.
3. Commit and push:
   ```bash
   git add templates/ newsletter/ index.html donate.html gallery.html compare.html
   git commit -m "feat(newsletter): official launch of newsletter publishing system"
   git push origin main
   ```
4. Verify live indexing in Google Search Console.
