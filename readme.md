# @tfmurad/llms-generator

[![npm version](https://badge.fury.io/js/@tfmurad%2Fllms-generator.svg)](https://www.npmjs.com/package/@tfmurad/llms-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A universal CLI tool to generate `llms.txt` and `llms-full.txt` files for any static site. Currently optimized for **Astro** and **Next.js** projects.

## What is llms.txt?

The `llms.txt` standard helps language models discover and understand your website's content. It provides:

- **llms.txt** - A lightweight index of your site's pages
- **llms-full.txt** - Complete content from all pages in one file
- **Individual .md files** - Separate markdown files for each page

## Features

- ✅ **Framework optimized** - First-class support for Astro and Next.js
- ✅ **Zero-config** - Works out of the box with sensible defaults
- ✅ **Auto-setup** - Automatically creates config and npm scripts on install
- ✅ **Smart detection** - Auto-detects Astro and Next.js projects
- ✅ **TypeScript support** - Includes TypeScript type definitions
- ✅ **SSR & Static** - Works with both SSR and static export builds
- ✅ **Smart cleanup** - Removes disabled file types automatically

## Installation

```bash
npm install -D @tfmurad/llms-generator
```

This automatically:
- Creates `src/config/llms.json` with framework-specific settings
- Appends `llms-txt` to your `build` script (if it exists)

## Quick Start

### 1. Configure

Update `src/config/llms.json` with your site details:

```json
{
  "input_dir": "./dist",
  "output_dir": "./dist",
  "site_url": "https://your-site.com",
  "name": "Your Site Name",
  "description": "Your site description",
  "generate_individual_md": true,
  "generate_llms_txt": true,
  "generate_llms_full_txt": true,
  "verbose": true
}
```

### 2. Generate

```bash
# During build (recommended)
npm run build

# Or manually
npx llms-txt
```

## Framework Guides

### Astro

Astro works out of the box with the default configuration:

```json
{
  "input_dir": "./dist",
  "output_dir": "./dist"
}
```

**Important:** Make sure you've run `npm run build` before running `llms-txt`.

### Next.js

Next.js has two build modes:

#### Static Export (Recommended)

Configure `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
}

module.exports = nextConfig
```

Then configure `src/config/llms.json`:

```json
{
  "input_dir": "./dist",
  "output_dir": "./dist"
}
```

#### SSR (Server-Side Rendering)

For SSR builds, the HTML files are in `.next/server/app` (App Router):

```json
{
  "input_dir": "./.next/server/app",
  "output_dir": "./public"
}
```

**Note:** For SSR, you'll want to output to `./public` so the generated files are served as static assets.

#### Pages Router

For the Pages Router, use:

```json
{
  "input_dir": "./.next/server/pages",
  "output_dir": "./public"
}
```

## CLI Usage

```bash
# Use auto-detected config
npx llms-txt

# Specify input and output directories
npx llms-txt --input ./dist --output ./public --site https://example.com

# Use presets
npx llms-txt --preset astro
npx llms-txt --preset nextjs
npx llms-txt --preset nextjs-static

# Dry run (see what would be generated)
npx llms-txt --dry-run

# Verbose output
npx llms-txt --verbose
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `input_dir` | string | `"./dist"` | Directory containing built HTML files |
| `output_dir` | string | `"./dist"` | Output directory for generated files |
| `site_url` | string | required | Your site's base URL |
| `name` | string | auto | Site name for llms.txt heading |
| `description` | string | auto | Site description |
| `generate_individual_md` | boolean | `true` | Generate individual .md files |
| `generate_llms_txt` | boolean | `true` | Generate llms.txt index |
| `generate_llms_full_txt` | boolean | `true` | Generate llms-full.txt |
| `title_selector` | string | `"h1"` | CSS selector for page title |
| `content_selector` | string | `"main"` | CSS selector for main content |
| `exclude` | array | see below | Patterns to exclude |
| `verbose` | boolean | `false` | Detailed output |

### Default Excludes

```json
["404", "404.html", "_astro", "_next", "**.xml", "**.txt", "node_modules"]
```

### Disabling File Types

When you disable file types in config, previously generated files are automatically removed:

```json
{
  "generate_individual_md": false,
  "generate_llms_txt": true,
  "generate_llms_full_txt": false
}
```

This will:
- ✅ Remove all existing `.md` files
- ✅ Remove `llms-full.txt` 
- ✅ Keep `llms.txt` (regenerates it)
- ✅ Remove empty directories

To disable all generation and clean up everything:

```json
{
  "generate_individual_md": false,
  "generate_llms_txt": false,
  "generate_llms_full_txt": false
}
```

## Output Files

After running, you'll have:

### llms.txt
A lightweight index file:

```markdown
# Your Site Name

> Your site description

This file helps language models discover the most useful content on this site.

## Home

- [Welcome](https://your-site.com/index.md)

## Company

- [About Us](https://your-site.com/about.md): Learn about our company
- [Contact](https://your-site.com/contact.md): Get in touch
```

### llms-full.txt
Complete content from all pages:

```markdown
# Your Site Name

## Welcome

Full content from your homepage...

---

## About Us

Full content from your about page...
```

### Individual .md Files
Each page gets its own markdown file with YAML frontmatter:

```markdown
---
title: "About Us"
url: "https://your-site.com/about"
description: "Learn about our company"
---

Content converted from HTML to Markdown...
```

## Advanced Usage

### Custom Selectors

If your site uses different HTML structure:

```json
{
  "title_selector": "h1.article-title",
  "content_selector": "article.content"
}
```

### Programmatic Usage

```javascript
import { generateLlmsFiles } from '@tfmurad/llms-generator';

await generateLlmsFiles({
  inputDir: './dist',
  outputDir: './dist',
  siteUrl: 'https://example.com',
  name: 'My Site',
  description: 'A great website',
  verbose: true
});
```

TypeScript types are included:

```typescript
import { generateLlmsFiles, LlmsConfig } from '@tfmurad/llms-generator';

const config: LlmsConfig = {
  // ... your config
};
```

## Troubleshooting

### "Input directory does not exist"

Make sure you've built your project first:

```bash
npm run build
```

### Next.js: No HTML files found

For Next.js SSR, the HTML files are generated at runtime. You need to:
1. Use static export (`output: 'export'` in next.config.js), or
2. Point to the correct server directory (`./.next/server/app` for App Router or `./.next/server/pages` for Pages Router)

### Pages not showing up in output

Check that your pages have:
1. An `<h1>` tag (or configure `title_selector` to match your title element)
2. A `<main>` element (or configure `content_selector`)
3. Valid HTML structure

## License

MIT © [Al Murad Uzzaman](https://github.com/tfmurad)
