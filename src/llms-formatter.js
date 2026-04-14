const BOM = '\uFEFF';

/**
 * Generate llms.txt content (lightweight index)
 */
export function generateLlmsTxt(pages, config) {
  const { name, description, siteUrl } = config;
  const lines = [];

  lines.push(`# ${name || 'Site'}`, '');

  if (description) {
    lines.push(`> ${description}`, '');
  }

  lines.push('This file helps language models discover the most useful content on this site.', '');

  const categories = groupPagesByCategory(pages);

  for (const [category, categoryPages] of categories) {
    if (categoryPages.length === 0) continue;

    lines.push(`## ${category}`, '');
    categoryPages.sort((a, b) => a.title.localeCompare(b.title));

    for (const page of categoryPages) {
      const mdUrl = page.urlPath === '/' ? `${siteUrl}/index.md` : `${siteUrl}${page.urlPath}.md`;
      const desc = page.description ? `: ${page.description}` : '';
      lines.push(`- [${page.title}](${mdUrl})${desc}`);
    }

    lines.push('');
  }

  return BOM + lines.join('\n').trim() + '\n';
}

/**
 * Generate llms-full.txt content (full content of all pages)
 */
export function generateLlmsFullTxt(pages, config) {
  const { name, description, siteUrl } = config;
  const lines = [];

  lines.push(`# ${name || 'Site'}`, '');

  if (description) {
    lines.push(`> ${description}`, '');
  }

  const sortedPages = [...pages].sort((a, b) => {
    if (a.urlPath === '/') return -1;
    if (b.urlPath === '/') return 1;
    return a.urlPath.localeCompare(b.urlPath);
  });

  for (const page of sortedPages) {
    lines.push(`## [${page.title}](${siteUrl}${page.urlPath})`, '');

    if (page.description) {
      lines.push(`*${page.description}*`, '');
    }

    if (page.content) {
      lines.push(page.content, '');
    }

    lines.push('---', '');
  }

  return BOM + lines.join('\n').trim() + '\n';
}

/**
 * Generate individual markdown file for a page
 */
export function generateMarkdownFile(page, config) {
  const lines = ['---'];
  lines.push(`title: "${escapeYaml(page.title)}"`);
  lines.push(`url: "${config.siteUrl}${page.urlPath}"`);

  if (page.description) {
    lines.push(`description: "${escapeYaml(page.description)}"`);
  }

  lines.push('---', '');

  if (page.content) {
    lines.push(page.content, '');
  }

  return BOM + lines.join('\n');
}

/**
 * Group pages into categories
 */
function groupPagesByCategory(pages) {
  const groups = new Map();
  const defaultCategories = ['Home', 'Product', 'Features', 'Blog', 'Docs', 'Company', 'Legal'];

  for (const cat of defaultCategories) {
    groups.set(cat, []);
  }

  for (const page of pages) {
    const category = inferCategory(page);
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category).push(page);
  }

  const result = new Map();
  for (const cat of defaultCategories) {
    if (groups.get(cat)?.length > 0) {
      result.set(cat, groups.get(cat));
      groups.delete(cat);
    }
  }

  const remaining = Array.from(groups.entries())
    .filter(([_, pages]) => pages.length > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  for (const [cat, catPages] of remaining) {
    result.set(cat, catPages);
  }

  return result;
}

/**
 * Infer category from page path
 */
function inferCategory(page) {
  const path = page.urlPath.toLowerCase();

  if (path === '/' || path === '/index') return 'Home';
  if (path.includes('/blog') || path.includes('/article') || path.includes('/post')) return 'Blog';
  if (path.includes('/docs') || path.includes('/documentation') || path.includes('/guide')) return 'Docs';
  if (path.includes('/privacy') || path.includes('/terms') || path.includes('/legal')) return 'Legal';
  if (path.includes('/about') || path.includes('/team') || path.includes('/contact')) return 'Company';
  if (path.includes('/product') || path.includes('/features') || path.includes('/pricing')) return 'Product';
  if (path.includes('/author')) return 'Authors';

  const parts = path.split('/').filter(Boolean);
  if (parts.length > 0) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return 'Other';
}

/**
 * Escape YAML special characters
 */
function escapeYaml(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
