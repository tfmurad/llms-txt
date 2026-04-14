#!/usr/bin/env node

/**
 * Post-install script to create default llms.json config
 * Runs automatically when the package is installed
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default config for Astro projects (works for Next.js too with small tweaks)
const astroConfig = {
  "input_dir": "./dist",
  "output_dir": "./dist",
  "site_url": "https://your-site.com",
  "name": "Your Site Name",
  "description": "Your site description",
  "generate_individual_md": true,
  "generate_llms_txt": true,
  "generate_llms_full_txt": true,
  "title_selector": "h1",
  "content_selector": "main",
  "exclude": ["404", "404.html", "_astro", "_next", "**.xml", "**.txt", "node_modules"],
  "verbose": true,
  "_note": "Astro: Make sure you've run 'npm run build' before running llms-txt. The dist folder must exist."
};

// Next.js specific config
// Note: Next.js can output to different locations:
// - './out' for static export (output: 'export' in next.config.js)
// - './.next/server/app' or './.next/server/pages' for SSR
// We default to './.next' to avoid creating unwanted 'out' folders
const nextjsConfig = {
  "input_dir": "./.next/server/app",
  "output_dir": "./public",
  "site_url": "https://your-site-url.com",
  "name": "Your Site Name",
  "description": "Your site description",
  "generate_individual_md": true,
  "generate_llms_txt": true,
  "generate_llms_full_txt": true,
  "title_selector": "h1",
  "content_selector": "main",
  "exclude": ["404", "404.html", "_next", "**.xml", "**.txt", "node_modules"],
  "verbose": true,
  "_note": "Next.js: For static export (output: 'export'), change input_dir to './out' and output_dir to './out'. For SSR, use './.next/server/app' or './.next/server/pages' as input_dir."
};

function detectFramework(projectRoot) {
  const packageJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return 'unknown';
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.next) {
      return 'nextjs';
    } else if (deps.astro) {
      return 'astro';
    }
    
    // Check for Astro config files as fallback
    const astroConfigFiles = ['astro.config.mjs', 'astro.config.js', 'astro.config.ts'];
    for (const configFile of astroConfigFiles) {
      if (existsSync(join(projectRoot, configFile))) {
        return 'astro';
      }
    }
  } catch (error) {
    // ignore
  }
  
  return 'unknown';
}

function hasNextJsStaticExport(projectRoot) {
  // Check common next.config file patterns
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  
  for (const configFile of configFiles) {
    const configPath = join(projectRoot, configFile);
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        // Check if output: 'export' is present
        if (content.includes("output:") && content.includes("'export'") || content.includes('"export"')) {
          return true;
        }
      } catch (error) {
        // ignore
      }
    }
  }
  
  return false;
}

function createConfig(projectRoot, framework) {
  const configDir = join(projectRoot, 'src', 'config');
  const configPath = join(configDir, 'llms.json');
  
  // Don't overwrite existing config
  if (existsSync(configPath)) {
    console.log('ℹ️  llms.json already exists at src/config/llms.json - skipping creation');
    return;
  }

  try {
    // Create directories if they don't exist
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
      console.log('📁 Created directory: src/config');
    }

    // Use appropriate config based on framework
    let config;
    if (framework === 'nextjs') {
      console.log('📦 Detected Next.js project');
      
      // Check if static export is configured
      if (hasNextJsStaticExport(projectRoot)) {
        console.log('   ✓ Static export detected (output: "export")');
        // Use static export config
        config = {
          "input_dir": "./out",
          "output_dir": "./out",
          "site_url": "https://your-site-url.com",
          "name": "Your Site Name",
          "description": "Your site description",
          "generate_individual_md": true,
          "generate_llms_txt": true,
          "generate_llms_full_txt": true,
          "title_selector": "h1",
          "content_selector": "main",
          "exclude": ["404", "404.html", "_next", "**.xml", "**.txt", "node_modules"],
          "verbose": true,
          "_note": "Next.js static export config. For SSR, change input_dir to './.next/server/app' or './.next/server/pages'"
        };
      } else {
        console.log('   ⚠️  Standard Next.js detected (not static export)');
        console.log('   📝 Please configure input_dir manually after reviewing your build output');
        // Use a safe default that won't create unwanted folders
        config = {
          "input_dir": "./.next/server/app",
          "output_dir": "./public",
          "site_url": "https://your-site-url.com",
          "name": "Your Site Name",
          "description": "Your site description",
          "generate_individual_md": true,
          "generate_llms_txt": true,
          "generate_llms_full_txt": true,
          "title_selector": "h1",
          "content_selector": "main",
          "exclude": ["404", "404.html", "_next", "**.xml", "**.txt", "node_modules"],
          "verbose": true,
          "_note": "For static export, add output: 'export' to next.config.js and change input_dir/output_dir to './out'. For SSR, verify the input_dir matches your build structure (e.g., './.next/server/app' or './.next/server/pages')"
        };
      }
    } else if (framework === 'astro') {
      console.log('📦 Detected Astro project');
      config = astroConfig;
    } else {
      console.log('📦 Framework not detected - using generic defaults');
      console.log('   📝 Please review and update the config for your framework');
      // Use a safe generic config that won't create unwanted folders
      config = {
        "input_dir": "./dist",
        "output_dir": "./dist",
        "site_url": "https://your-site.com",
        "name": "Your Site Name",
        "description": "Your site description",
        "generate_individual_md": true,
        "generate_llms_txt": true,
        "generate_llms_full_txt": true,
        "title_selector": "h1",
        "content_selector": "main",
        "exclude": ["404", "404.html", "_astro", "_next", "**.xml", "**.txt", "node_modules"],
        "verbose": true,
        "_note": "Generic config - please update input_dir and output_dir to match your framework's build output directory (e.g., './dist' for Astro, './out' for Next.js static export, etc.)"
      };
    }

    // Write config file
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Created llms.json config at: src/config/llms.json');
  } catch (error) {
    console.error('❌ Error creating config file:', error.message);
  }
}

function updateBuildScript(projectRoot) {
  const packageJsonPath = join(projectRoot, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    console.log('ℹ️  No package.json found - skipping script setup');
    return;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    let modified = false;

    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Update build script to include llms-txt if build exists and doesn't already have it
    if (packageJson.scripts.build) {
      if (!packageJson.scripts.build.includes('llms-txt')) {
        packageJson.scripts.build = packageJson.scripts.build + ' && llms-txt';
        console.log('✅ Updated script: build (added llms-txt)');
        modified = true;
      } else {
        console.log('ℹ️  Build script already includes llms-txt - skipping');
      }
    }

    if (modified) {
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log('✅ Updated package.json');
    }
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
  }
}

function findProjectRoot() {
  // INIT_CWD is set by npm/yarn to the directory where the install command was run
  const initCwd = process.env.INIT_CWD;
  
  // Check if INIT_CWD is valid and different from our package directory
  // This handles the npm link scenario where INIT_CWD points to package dir
  if (initCwd && initCwd !== __dirname && !__dirname.startsWith(initCwd)) {
    // Verify there's a package.json in INIT_CWD
    const packageJsonPath = join(initCwd, 'package.json');
    if (existsSync(packageJsonPath)) {
      return initCwd;
    }
  }
  
  // Fallback: traverse up from script location to find node_modules parent
  let currentDir = __dirname;
  
  // Check if we're inside node_modules
  if (currentDir.includes('node_modules')) {
    // Go up until we exit node_modules
    while (currentDir.includes('node_modules') && currentDir !== '/') {
      currentDir = dirname(currentDir);
    }
    return currentDir;
  }
  
  // If not in node_modules, we're likely in development mode (npm link)
  // Return null to indicate we can't determine the project root
  return null;
}

function main() {
  const projectRoot = findProjectRoot();
  
  // Skip if we can't determine the project root (e.g., during npm link development)
  if (!projectRoot) {
    console.log('ℹ️  Skipping postinstall setup (development mode)');
    return;
  }
  
  console.log('🚀 Setting up llms-txt-generator...');
  console.log(`📁 Project root: ${projectRoot}\n`);
  
  // Detect framework first
  const framework = detectFramework(projectRoot);
  
  // Create config file
  createConfig(projectRoot, framework);
  
  console.log('');
  
  // Update build script only
  updateBuildScript(projectRoot);
  
  console.log('\n✨ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update src/config/llms.json with your site details');
  console.log('   2. Run your build command first (e.g., "npm run build")');
  console.log('   3. Run "npx llms-txt" to generate files');
  console.log('   4. Or the build script now includes llms-txt automatically!');
  
  if (framework === 'nextjs') {
    console.log('\n⚠️  Next.js specific notes:');
    console.log('   - Static export: Add output: "export" to next.config.js');
    console.log('   - Default build: Update input_dir to match your build output');
    console.log('   - See README for detailed Next.js setup instructions');
  } else if (framework === 'astro') {
    console.log('\n🚀 Astro specific notes:');
    console.log('   - Default config uses ./dist folder (Astro static build output)');
    console.log('   - Make sure you\'ve run "npm run build" before running llms-txt');
  } else {
    console.log('\n📝 Generic setup - please review:');
    console.log('   - Update input_dir to match your framework\'s build output');
    console.log('   - Common values: ./dist (Astro), ./out (Next.js), ./build (Vite), etc.');
  }
  
  console.log('\n📖 Documentation: https://github.com/tfmurad/llms-txt#readme');
}

main();
