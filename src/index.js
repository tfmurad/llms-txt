import { writeFile, mkdir, stat, unlink, readdir, rmdir } from 'fs/promises';
import { dirname, resolve, join } from 'path';
import { discoverHtmlFiles, fileToUrlPath, getMarkdownPath } from './file-discovery.js';
import { processHtmlFile } from './html-processor.js';
import { generateLlmsTxt as formatLlmsTxt, generateLlmsFullTxt as formatLlmsFullTxt, generateMarkdownFile } from './llms-formatter.js';

/**
 * Check if directory exists, create if not
 */
async function ensureDir(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Check if a directory exists
 */
async function dirExists(dirPath) {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Main function to generate all LLMS files
 */
export async function generateLlmsFiles(config) {
  const {
    inputDir,
    outputDir,
    siteUrl,
    name,
    description,
    generateIndividualMd,
    generateLlmsTxt,
    generateLlmsFullTxt,
    titleSelector,
    contentSelector,
    exclude,
    dryRun,
    verbose,
  } = config;

  // Validate input directory exists
  const resolvedInputDir = resolve(inputDir);
  const inputExists = await dirExists(resolvedInputDir);
  
  if (!inputExists) {
    console.error(`❌ Error: Input directory does not exist: ${inputDir}`);
    console.error(`   Please run your build command first (e.g., 'npm run build')`);
    console.error(`   or update the input_dir in your llms.json config.`);
    process.exit(1);
  }

  // Ensure output directory exists
  const resolvedOutputDir = resolve(outputDir);
  await ensureDir(resolvedOutputDir);

  // Check if we need to clean up any disabled file types
  const hasDisabledFiles = !generateIndividualMd || !generateLlmsTxt || !generateLlmsFullTxt;
  
  if (hasDisabledFiles) {
    if (!generateIndividualMd && !generateLlmsTxt && !generateLlmsFullTxt) {
      // All disabled - full cleanup mode
      console.log('🧹 Cleanup mode: All generation options are disabled.');
      console.log('   Removing previously generated files...\n');
      
      if (!dryRun) {
        await cleanupAllGeneratedFiles(resolvedOutputDir, verbose);
      } else {
        console.log('   [DRY-RUN] Would remove all .md files, llms.txt, and llms-full.txt');
      }
      
      console.log('✅ Cleanup complete!');
      return;
    } else {
      // Partial cleanup - only remove disabled file types
      console.log('🧹 Cleaning up disabled file types...\n');
      
      if (!dryRun) {
        await cleanupPartialFiles(resolvedOutputDir, {
          removeMd: !generateIndividualMd,
          removeLlmsTxt: !generateLlmsTxt,
          removeLlmsFullTxt: !generateLlmsFullTxt
        }, verbose);
      } else {
        if (!generateIndividualMd) console.log('   [DRY-RUN] Would remove all .md files');
        if (!generateLlmsTxt) console.log('   [DRY-RUN] Would remove llms.txt');
        if (!generateLlmsFullTxt) console.log('   [DRY-RUN] Would remove llms-full.txt');
      }
      
      console.log('✅ Cleanup complete!\n');
    }
  }

  console.log('🔍 Discovering HTML files...');
  const htmlFiles = await discoverHtmlFiles(inputDir, exclude);
  console.log(`   Found ${htmlFiles.length} HTML files`);

  if (verbose) {
    htmlFiles.forEach(file => console.log(`   - ${file}`));
  }

  console.log('');
  console.log('📄 Processing pages...');

  // Process all HTML files
  const pages = [];
  for (const file of htmlFiles) {
    try {
      const urlPath = fileToUrlPath(file, inputDir);
      const pageData = await processHtmlFile(file, {
        titleSelector,
        contentSelector,
      });

      // Skip pages without titles
      if (!pageData.title) {
        if (verbose) {
          console.log(`   ⚠️  Skipping ${urlPath} (no title found)`);
        }
        continue;
      }

      pages.push({
        urlPath,
        filePath: file,
        ...pageData,
      });

      if (verbose) {
        console.log(`   ✓ ${urlPath}: "${pageData.title}"`);
      }
    } catch (error) {
      console.error(`   ✗ Error processing ${file}: ${error.message}`);
    }
  }

  console.log(`   Processed ${pages.length} pages successfully`);
  console.log('');

  // Determine site name
  const siteName = name || inferSiteName(pages);
  const siteDescription = description || inferDescription(pages);

  const formatterConfig = {
    name: siteName,
    description: siteDescription,
    siteUrl: siteUrl.replace(/\/$/, ''), // Remove trailing slash
  };

  // Generate individual .md files
  if (generateIndividualMd) {
    console.log('📝 Generating individual .md files...');
    for (const page of pages) {
      const mdPath = getMarkdownPath(page.filePath, inputDir, outputDir);
      const mdContent = generateMarkdownFile(page, formatterConfig);

      if (dryRun) {
        console.log(`   [DRY-RUN] Would create: ${mdPath}`);
      } else {
        await ensureDir(dirname(mdPath));
        await writeFile(mdPath, mdContent, 'utf8');
        if (verbose) {
          console.log(`   ✓ ${mdPath}`);
        }
      }
    }
    console.log(`   Created ${pages.length} .md files`);
    console.log('');
  }

  // Generate llms.txt
  if (generateLlmsTxt) {
    console.log('📋 Generating llms.txt...');
    const llmsTxtContent = formatLlmsTxt(pages, formatterConfig);
    const llmsTxtPath = `${outputDir}/llms.txt`;

    if (dryRun) {
      console.log(`   [DRY-RUN] Would create: ${llmsTxtPath}`);
    } else {
      await writeFile(llmsTxtPath, llmsTxtContent, 'utf8');
      console.log(`   ✓ ${llmsTxtPath}`);
    }
    console.log('');
  }

  // Generate llms-full.txt
  if (generateLlmsFullTxt) {
    console.log('📚 Generating llms-full.txt...');
    const llmsFullContent = formatLlmsFullTxt(pages, formatterConfig);
    const llmsFullPath = `${outputDir}/llms-full.txt`;

    if (dryRun) {
      console.log(`   [DRY-RUN] Would create: ${llmsFullPath}`);
    } else {
      await writeFile(llmsFullPath, llmsFullContent, 'utf8');
      console.log(`   ✓ ${llmsFullPath}`);
    }
    console.log('');
  }

  console.log('✅ Done!');
  console.log('');
  console.log('Summary:');
  console.log(`  - Pages processed: ${pages.length}`);
  if (generateIndividualMd) console.log(`  - .md files created: ${pages.length}`);
  if (generateLlmsTxt) console.log(`  - llms.txt: ${outputDir}/llms.txt`);
  if (generateLlmsFullTxt) console.log(`  - llms-full.txt: ${outputDir}/llms-full.txt`);
}

/**
 * Infer site name from homepage
 */
function inferSiteName(pages) {
  const homePage = pages.find(p => p.urlPath === '/');
  if (homePage?.title) {
    return homePage.title;
  }
  return 'Site';
}

/**
 * Infer description from homepage
 */
function inferDescription(pages) {
  const homePage = pages.find(p => p.urlPath === '/');
  if (homePage?.description) {
    return homePage.description;
  }
  return '';
}

/**
 * Recursively find all .md files in a directory
 */
async function findMarkdownFiles(dir) {
  const mdFiles = [];
  
  async function scan(currentDir) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name.endsWith('.md')) {
          mdFiles.push(fullPath);
        }
      }
    } catch {
      // Directory might not exist or be accessible
    }
  }
  
  await scan(dir);
  return mdFiles;
}

/**
 * Clean up all previously generated files
 */
async function cleanupAllGeneratedFiles(outputDir, verbose) {
  const filesToRemove = [
    join(outputDir, 'llms.txt'),
    join(outputDir, 'llms-full.txt'),
  ];
  
  // Remove main files
  for (const file of filesToRemove) {
    try {
      await unlink(file);
      if (verbose) {
        console.log(`   ✓ Removed: ${file}`);
      }
    } catch {
      // File doesn't exist, ignore
    }
  }
  
  // Find and remove all .md files
  const mdFiles = await findMarkdownFiles(outputDir);
  for (const file of mdFiles) {
    try {
      await unlink(file);
      if (verbose) {
        console.log(`   ✓ Removed: ${file}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to remove: ${file}`);
    }
  }
  
  if (mdFiles.length > 0) {
    console.log(`   Removed ${mdFiles.length} .md files`);
  }
  if (!verbose) {
    console.log(`   Removed llms.txt and llms-full.txt (if they existed)`);
  }
  
  // Remove empty directories
  const removedDirs = await removeEmptyDirectories(outputDir, verbose);
  if (removedDirs > 0) {
    console.log(`   Removed ${removedDirs} empty directories`);
  }
}

/**
 * Partial cleanup - only remove specific file types
 */
async function cleanupPartialFiles(outputDir, options, verbose) {
  const { removeMd, removeLlmsTxt, removeLlmsFullTxt } = options;
  
  // Remove llms.txt if disabled
  if (removeLlmsTxt) {
    try {
      await unlink(join(outputDir, 'llms.txt'));
      if (verbose) {
        console.log(`   ✓ Removed: ${join(outputDir, 'llms.txt')}`);
      } else {
        console.log(`   Removed llms.txt`);
      }
    } catch {
      // File doesn't exist, ignore
    }
  }
  
  // Remove llms-full.txt if disabled
  if (removeLlmsFullTxt) {
    try {
      await unlink(join(outputDir, 'llms-full.txt'));
      if (verbose) {
        console.log(`   ✓ Removed: ${join(outputDir, 'llms-full.txt')}`);
      } else {
        console.log(`   Removed llms-full.txt`);
      }
    } catch {
      // File doesn't exist, ignore
    }
  }
  
  // Remove .md files if disabled
  if (removeMd) {
    const mdFiles = await findMarkdownFiles(outputDir);
    for (const file of mdFiles) {
      try {
        await unlink(file);
        if (verbose) {
          console.log(`   ✓ Removed: ${file}`);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to remove: ${file}`);
      }
    }
    
    if (mdFiles.length > 0) {
      console.log(`   Removed ${mdFiles.length} .md files`);
    }
    
    // Remove empty directories after removing .md files
    const removedDirs = await removeEmptyDirectories(outputDir, verbose);
    if (removedDirs > 0) {
      console.log(`   Removed ${removedDirs} empty directories`);
    }
  }
}

/**
 * Recursively remove empty directories
 * @param {string} dir - Directory to clean up
 * @param {boolean} verbose - Show verbose output
 * @returns {number} Number of directories removed
 */
async function removeEmptyDirectories(dir, verbose) {
  let removedCount = 0;
  
  async function scan(currentDir) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      // Process subdirectories first
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = join(currentDir, entry.name);
          await scan(fullPath);
        }
      }
      
      // Check if directory is now empty after removing subdirectories
      const remainingEntries = await readdir(currentDir);
      if (remainingEntries.length === 0 && currentDir !== dir) {
        // Don't remove the root output directory
        try {
          await rmdir(currentDir);
          removedCount++;
          if (verbose) {
            console.log(`   ✓ Removed empty directory: ${currentDir}`);
          }
        } catch {
          // Directory not empty or can't be removed, ignore
        }
      }
    } catch {
      // Directory might not exist or be accessible
    }
  }
  
  await scan(dir);
  return removedCount;
}
