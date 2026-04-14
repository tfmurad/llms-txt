/**
 * Configuration options for generating LLMS files
 */
export interface LlmsConfig {
  /** Input directory containing built HTML files */
  inputDir: string;
  /** Output directory for generated files */
  outputDir: string;
  /** Your site's base URL (e.g., https://example.com) */
  siteUrl: string;
  /** Site name for llms.txt heading */
  name?: string;
  /** Site description for llms.txt */
  description?: string;
  /** Generate individual .md files for each page */
  generateIndividualMd?: boolean;
  /** Generate llms.txt index file */
  generateLlmsTxt?: boolean;
  /** Generate llms-full.txt with all content */
  generateLlmsFullTxt?: boolean;
  /** CSS selector for page title (default: 'h1') */
  titleSelector?: string;
  /** CSS selector for main content (default: 'main') */
  contentSelector?: string;
  /** Patterns to exclude from processing */
  exclude?: string[];
  /** Show detailed output */
  verbose?: boolean;
  /** Show what would be generated without writing files */
  dryRun?: boolean;
}

/**
 * Page data structure
 */
export interface PageData {
  /** URL path (e.g., /about) */
  urlPath: string;
  /** Full file path to the HTML file */
  filePath: string;
  /** Page title */
  title: string;
  /** Page description from meta tag */
  description?: string;
  /** Converted markdown content */
  content: string;
}

/**
 * Formatter configuration
 */
export interface FormatterConfig {
  /** Site name */
  name: string;
  /** Site description */
  description: string;
  /** Site base URL */
  siteUrl: string;
}

/**
 * Main function to generate all LLMS files
 * @param config - Configuration options
 */
export function generateLlmsFiles(config: LlmsConfig): Promise<void>;
