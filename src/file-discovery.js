import { glob } from 'glob';
import { resolve, relative, dirname, join } from 'path';

/**
 * Discover all HTML files in the build directory
 */
export async function discoverHtmlFiles(inputDir, excludePatterns = []) {
  const fullInputDir = resolve(inputDir);
  const pattern = join(fullInputDir, '**/*.html');
  
  // Build ignore patterns for glob
  // glob v13+ requires proper glob patterns for ignore
  const ignorePatterns = excludePatterns.flatMap(pat => {
    // If it already looks like a glob pattern, use it as-is with full path
    if (pat.includes('*') || pat.includes('?')) {
      return join(fullInputDir, pat);
    }
    
    // If it starts with ./ or ../, resolve it
    if (pat.startsWith('./') || pat.startsWith('../')) {
      return resolve(fullInputDir, pat);
    }
    
    // Handle special '404' pattern
    if (pat === '404') {
      return [
        join(fullInputDir, '404.html'),
        join(fullInputDir, '404/**'),
      ];
    }
    
    // For directory names like 'authors', 'tags', create patterns to match
    // the directory and all its contents
    return [
      join(fullInputDir, pat),
      join(fullInputDir, pat, '**'),
    ];
  });
  
  const files = await glob(pattern, {
    ignore: ignorePatterns,
    absolute: true,
  });
  
  return files.sort();
}

/**
 * Convert file path to URL path
 * e.g., /path/to/dist/about/index.html -> /about
 */
export function fileToUrlPath(filePath, inputDir) {
  const relativePath = relative(resolve(inputDir), filePath);
  
  // Remove index.html
  let urlPath = relativePath.replace(/index\.html$/, '');
  
  // Remove .html extension
  urlPath = urlPath.replace(/\.html$/, '');
  
  // Ensure leading slash
  if (!urlPath.startsWith('/')) {
    urlPath = '/' + urlPath;
  }
  
  // Remove trailing slash for root
  if (urlPath === '/') {
    return urlPath;
  }
  
  // Remove trailing slash
  return urlPath.replace(/\/$/, '');
}

/**
 * Get the markdown file path for a given HTML file path
 * e.g., /path/to/dist/about/index.html -> /path/to/dist/about.md
 * 
 * @param {string} filePath - Full path to the HTML file
 * @param {string} inputDir - The input directory (where HTML files are located)
 * @param {string} outputDir - The output directory (where MD files should be placed)
 */
export function getMarkdownPath(filePath, inputDir, outputDir) {
  const relativePath = relative(resolve(inputDir), filePath);
  const resolvedOutputDir = resolve(outputDir);
  
  // If it's an index.html, put .md in the parent directory with the folder name
  if (relativePath.endsWith('index.html')) {
    const dir = dirname(relativePath);
    if (dir === '.') {
      return join(resolvedOutputDir, 'index.md');
    }
    // For paths like about/index.html -> about.md
    return join(resolvedOutputDir, dir + '.md');
  }
  
  // Otherwise, replace .html with .md and place in output dir
  // e.g., /input/blog/post.html -> /output/blog/post.md
  const relativeDir = dirname(relativePath);
  const baseName = filePath.replace(/.*\//, '').replace(/\.html$/, '');
  
  if (relativeDir === '.') {
    return join(resolvedOutputDir, baseName + '.md');
  }
  
  return join(resolvedOutputDir, relativeDir, baseName + '.md');
}


