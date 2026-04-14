import { readFile } from 'fs/promises';
import { parse } from 'node-html-parser';
import TurndownService from 'turndown';

// Initialize Turndown service once and reuse
const turndownService = createTurndownService();

/**
 * Create and configure Turndown service
 */
function createTurndownService() {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  // Remove empty links
  service.addRule('emptyLinks', {
    filter: (node) => {
      return node.nodeName === 'A' && !node.getAttribute('href');
    },
    replacement: (content) => content,
  });

  // Handle code blocks better
  service.addRule('fencedCodeBlock', {
    filter: (node) => {
      return node.nodeName === 'PRE' && node.querySelector('code');
    },
    replacement: (content, node) => {
      const code = node.querySelector('code');
      const language = code.className ? code.className.replace('language-', '') : '';
      return `\n\n\`\`\`${language}\n${code.textContent}\n\`\`\`\n\n`;
    },
  });

  return service;
}

/**
 * Extract metadata and content from an HTML file
 */
export async function processHtmlFile(filePath, options = {}) {
  const {
    titleSelector = 'h1',
    contentSelector = 'main',
  } = options;

  let html;
  try {
    html = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }

  let root;
  try {
    root = parse(html, {
      comment: false,
      blockTextElements: {
        script: false,
        style: false,
      },
    });
  } catch (error) {
    throw new Error(`Failed to parse HTML: ${error.message}`);
  }

  // Extract title
  let title = '';
  if (titleSelector === 'h1') {
    const h1 = root.querySelector('h1');
    title = h1 ? cleanText(h1.text) : '';
  }
  
  // Fallback to <title> tag if no h1 or if titleSelector is 'title'
  if (!title || titleSelector === 'title') {
    const titleEl = root.querySelector('title');
    title = titleEl ? cleanText(titleEl.text) : '';
  }

  // Extract description
  const metaDesc = root.querySelector('meta[name="description"]');
  const description = metaDesc ? metaDesc.getAttribute('content') || '' : '';

  // Extract and convert content
  let content = '';
  const contentEl = root.querySelector(contentSelector);
  if (contentEl) {
    // Remove the h1 from content if it exists (to avoid duplication)
    const h1InContent = contentEl.querySelector('h1');
    if (h1InContent) {
      h1InContent.remove();
    }
    
    content = htmlToMarkdown(contentEl.toString());
  }

  return {
    title,
    description,
    content,
  };
}

/**
 * Convert HTML to Markdown using Turndown
 */
export function htmlToMarkdown(html) {
  let root;
  try {
    // Parse HTML
    root = parse(html, {
      comment: false,
      blockTextElements: {
        script: false,
        style: false,
      },
    });
  } catch (error) {
    console.warn(`Warning: Failed to parse HTML content: ${error.message}`);
    return '';
  }

  // Remove unwanted elements
  const selectorsToRemove = [
    'script',
    'style',
    'nav',
    '[aria-hidden="true"]',
    '.no-llms',
    'img',
    'picture',
    'svg',
    'header',
    'footer',
    'aside',
    '.sidebar',
    '.navigation',
    '.menu',
    '.ads',
    '.advertisement',
    // Astro-specific
    'astro-island',
    'astro-slot',
    'astro-static-slot',
    // Next.js specific
    'next-route-announcer',
    '#__next',
  ];

  selectorsToRemove.forEach(selector => {
    try {
      root.querySelectorAll(selector).forEach(el => el.remove());
    } catch {
      // Ignore errors for individual selectors
    }
  });

  // Convert to markdown using singleton service
  let markdown;
  try {
    markdown = turndownService.turndown(root.toString());
  } catch (error) {
    console.warn(`Warning: Failed to convert HTML to markdown: ${error.message}`);
    return '';
  }

  // Clean up the output
  markdown = cleanMarkdown(markdown);

  return markdown;
}

/**
 * Clean up markdown output
 */
function cleanMarkdown(markdown) {
  return markdown
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim()
    // Remove empty list items
    .replace(/^-\s*$/gm, '')
    // Remove multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Fix list spacing
    .replace(/\n- /g, '\n- ')
    // Clean up again after replacements
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean text content
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .trim();
}
