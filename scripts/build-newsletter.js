const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// Configure Marked for safe, accessible HTML output
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false
});

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'newsletters');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates', 'newsletter');
const OUTPUT_NEWSLETTER_DIR = path.join(ROOT_DIR, 'newsletter');
const ASSETS_NEWSLETTERS_DIR = path.join(ROOT_DIR, 'assets', 'newsletters');

const ARCHIVE_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'archive-template.html');
const ARTICLE_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'article-template.html');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function calculateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function formatDate(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return 'Recent';
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatISODate(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}

function sanitizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractFirstImage(markdownContent) {
  const match = markdownContent.match(/!\[.*?\]\((.*?)\)/);
  return match ? match[1] : null;
}

function generateExcerpt(content, customExcerpt) {
  if (customExcerpt && customExcerpt.trim()) {
    return customExcerpt.trim();
  }
  // Strip markdown markers for plain text excerpt
  const plain = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/^>\s+/gm, '')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .trim();

  // Extract first complete sentence ending in ., !, or ?
  const sentenceMatch = plain.match(/^([^.!?\r\n]+[.!?])/);
  if (sentenceMatch && sentenceMatch[1] && sentenceMatch[1].trim().length >= 15) {
    return sentenceMatch[1].trim();
  }

  // Fallback to first non-empty line or 160 characters
  const firstLine = plain.split(/\r?\n/).find(line => line.trim().length > 0) || plain;
  return firstLine.slice(0, 160) + (firstLine.length > 160 ? '...' : '');
}

function build() {
  console.log('--- Lisa Ecke Newsletter Publishing System: Static Builder ---');
  
  ensureDirSync(CONTENT_DIR);
  ensureDirSync(OUTPUT_NEWSLETTER_DIR);
  ensureDirSync(ASSETS_NEWSLETTERS_DIR);

  if (!fs.existsSync(ARCHIVE_TEMPLATE_PATH) || !fs.existsSync(ARTICLE_TEMPLATE_PATH)) {
    console.error('Error: Templates missing in templates/newsletter/');
    process.exit(1);
  }

  const archiveTemplate = fs.readFileSync(ARCHIVE_TEMPLATE_PATH, 'utf-8');
  const articleTemplate = fs.readFileSync(ARTICLE_TEMPLATE_PATH, 'utf-8');

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown file(s) in content/newsletters/`);

  const articles = [];

  for (const filename of files) {
    const filePath = path.join(CONTENT_DIR, filename);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(rawContent);
    const data = parsed.data || {};
    const content = parsed.content || '';

    // Check draft status
    if (data.draft === true) {
      console.log(`[Draft Skipped] ${filename} - draft is true`);
      continue;
    }

    // Determine slug
    let slug = data.slug;
    if (!slug) {
      // derive from filename: e.g. 2026-10-22-my-post.md -> my-post
      const baseName = filename.replace(/\.md$/, '');
      const datePrefixMatch = baseName.match(/^\d{4}-\d{2}-\d{2}-(.*)$/);
      slug = datePrefixMatch ? datePrefixMatch[1] : baseName;
    }
    slug = sanitizeSlug(slug) || sanitizeSlug(data.title) || 'newsletter-update';

    // Featured image
    let featuredImage = data.featured_image;
    if (!featuredImage) {
      featuredImage = extractFirstImage(content) || '/assets/images/swearing-in-heath-ward.png';
    }
    if (featuredImage && !featuredImage.startsWith('/') && !featuredImage.startsWith('http')) {
      featuredImage = '/' + featuredImage;
    }

    const title = data.title || 'Washington County District 6 Newsletter';
    const dateVal = data.date ? new Date(data.date) : new Date();
    const excerpt = generateExcerpt(content, data.excerpt);
    const seoDesc = (data.seo_description || excerpt).replace(/"/g, '&quot;');
    const bodyHtml = marked.parse(content);
    const readingTime = calculateReadingTime(content);

    articles.push({
      filename,
      slug,
      title,
      date: dateVal,
      formattedDate: formatDate(dateVal),
      isoDate: formatISODate(dateVal),
      featuredImage,
      featuredImageAlt: data.featured_image_alt || title,
      excerpt,
      seoDesc,
      bodyHtml,
      readingTime,
      canonicalUrl: `https://jpecke.com/newsletter/${slug}/`
    });
  }

  // Sort articles newest first
  articles.sort((a, b) => b.date.getTime() - a.date.getTime());
  console.log(`Processing ${articles.length} published article(s)...`);

  const validDirs = new Set();

  // Build Individual Article Pages
  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    validDirs.add(art.slug);
    const prevArt = i < articles.length - 1 ? articles[i + 1] : null;
    const nextArt = i > 0 ? articles[i - 1] : null;

    const prevLinkHtml = prevArt
      ? `<a href="/newsletter/${prevArt.slug}/" class="newsletter-nav-btn-link">&larr; ${prevArt.title}</a>`
      : '';
    const nextLinkHtml = nextArt
      ? `<a href="/newsletter/${nextArt.slug}/" class="newsletter-nav-btn-link">${nextArt.title} &rarr;</a>`
      : '';

    const featuredImageBlock = art.featuredImage
      ? `<figure class="newsletter-article-figure">
          <img src="${art.featuredImage}" alt="${art.featuredImageAlt}" class="newsletter-article-img">
          <figcaption class="newsletter-article-caption">${art.featuredImageAlt}</figcaption>
        </figure>`
      : '';

    let html = articleTemplate
      .replace(/{{TITLE}}/g, art.title)
      .replace(/{{SEO_DESCRIPTION}}/g, art.seoDesc)
      .replace(/{{CANONICAL_URL}}/g, art.canonicalUrl)
      .replace(/{{FEATURED_IMAGE_URL}}/g, art.featuredImage)
      .replace(/{{FEATURED_IMAGE_ALT}}/g, art.featuredImageAlt)
      .replace(/{{FEATURED_IMAGE_BLOCK}}/g, featuredImageBlock)
      .replace(/{{ISO_DATE}}/g, art.isoDate)
      .replace(/{{FORMATTED_DATE}}/g, art.formattedDate)
      .replace(/{{READING_TIME}}/g, art.readingTime)
      .replace(/{{EXCERPT}}/g, art.excerpt)
      .replace(/{{BODY_HTML}}/g, art.bodyHtml)
      .replace(/{{PREV_POST_LINK}}/g, prevLinkHtml)
      .replace(/{{NEXT_POST_LINK}}/g, nextLinkHtml);

    const articleDir = path.join(OUTPUT_NEWSLETTER_DIR, art.slug);
    ensureDirSync(articleDir);
    fs.writeFileSync(path.join(articleDir, 'index.html'), html, 'utf-8');
    console.log(`[Generated Article] /newsletter/${art.slug}/index.html`);

    // If filename has a date prefix (e.g. 2026-10-22-test-newsletter-2), also output alias folder so Decap CMS's old preview_path never 404s!
    const rawBaseName = art.filename.replace(/\.md$/, '');
    if (rawBaseName !== art.slug) {
      validDirs.add(rawBaseName);
      const aliasDir = path.join(OUTPUT_NEWSLETTER_DIR, rawBaseName);
      ensureDirSync(aliasDir);
      fs.writeFileSync(path.join(aliasDir, 'index.html'), html, 'utf-8');
      console.log(`[Generated Alias Article] /newsletter/${rawBaseName}/index.html`);
    }
  }

  // Clean up any stale article directories in /newsletter/ that no longer exist in content/newsletters/
  if (fs.existsSync(OUTPUT_NEWSLETTER_DIR)) {
    const existingItems = fs.readdirSync(OUTPUT_NEWSLETTER_DIR);
    for (const item of existingItems) {
      const itemPath = path.join(OUTPUT_NEWSLETTER_DIR, item);
      if (fs.statSync(itemPath).isDirectory() && !validDirs.has(item)) {
        console.log(`[Cleaned Stale Directory] /newsletter/${item}`);
        fs.rmSync(itemPath, { recursive: true, force: true });
      }
    }
  }

  // Build Newsletter Archive Page (/newsletter/index.html)
  let featuredArticleHtml = '';
  let gridArticlesHtml = '';

  if (articles.length > 0) {
    const top = articles[0];
    featuredArticleHtml = `
      <section class="newsletter-featured-container">
        <div class="newsletter-featured-card">
          <div class="newsletter-featured-img-wrap">
            <div class="newsletter-featured-img-backdrop" style="background-image: url('${top.featuredImage}')"></div>
            <img src="${top.featuredImage}" alt="${top.featuredImageAlt}" class="newsletter-featured-img">
            <span class="newsletter-featured-badge">Featured Newsletter</span>
          </div>
          <div class="newsletter-featured-body">
            <div class="newsletter-meta-line">
              <span>District 6 Report</span>
              <span>&bull;</span>
              <time datetime="${top.isoDate}">${top.formattedDate}</time>
              <span>&bull;</span>
              <span>${top.readingTime}</span>
            </div>
            <h2 class="newsletter-featured-title">
              <a href="/newsletter/${top.slug}/">${top.title}</a>
            </h2>
            <p class="newsletter-featured-excerpt">${top.excerpt}</p>
            <a href="/newsletter/${top.slug}/" class="newsletter-btn-read">
              Read Full Newsletter &rarr;
            </a>
          </div>
        </div>
      </section>
    `;

    const remaining = articles.slice(1);
    if (remaining.length > 0) {
      gridArticlesHtml = remaining.map(art => `
        <article class="newsletter-card">
          <div class="newsletter-card-img-wrap">
            <div class="newsletter-card-img-backdrop" style="background-image: url('${art.featuredImage}')"></div>
            <img src="${art.featuredImage}" alt="${art.featuredImageAlt}" class="newsletter-card-img">
            <span class="newsletter-card-date-badge">${art.formattedDate}</span>
          </div>
          <div class="newsletter-card-content">
            <span class="newsletter-card-tag">Quorum Court</span>
            <h3 class="newsletter-card-title">
              <a href="/newsletter/${art.slug}/">${art.title}</a>
            </h3>
            <p class="newsletter-card-excerpt">${art.excerpt}</p>
            <div class="newsletter-card-footer">
              <span class="newsletter-card-author">By Lisa Ecke</span>
              <a href="/newsletter/${art.slug}/" class="newsletter-card-link">
                Read More &rarr;
              </a>
            </div>
          </div>
        </article>
      `).join('\n');
    } else {
      gridArticlesHtml = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1;">
          <p style="color: #64748b; font-size: 1.05rem; margin: 0;">More Quorum Court newsletters and community updates are currently in preparation. Check back soon!</p>
        </div>
      `;
    }
  } else {
    featuredArticleHtml = `
      <section class="newsletter-featured-container" style="text-align: center; padding: 60px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h2 style="font-family: 'Cinzel', serif; color: #0a2540; margin-bottom: 12px;">Newsletter Under Preparation</h2>
          <p style="color: #64748b;">The first edition of District 6 Newsletter will be published shortly. Stay tuned!</p>
        </div>
      </section>
    `;
  }

  let archiveHtml = archiveTemplate
    .replace('{{TOTAL_COUNT}}', String(articles.length))
    .replace('{{FEATURED_ARTICLE}}', featuredArticleHtml)
    .replace('{{ARTICLE_GRID}}', gridArticlesHtml);

  fs.writeFileSync(path.join(OUTPUT_NEWSLETTER_DIR, 'index.html'), archiveHtml, 'utf-8');
  console.log(`[Generated Archive] /newsletter/index.html with ${articles.length} published post(s).`);
  console.log('--- Newsletter Build Completed Successfully! ---');
}

build();
