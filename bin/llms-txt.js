#!/usr/bin/env node

import { program } from 'commander';
import { generateLlmsFiles } from '../src/index.js';
import { loadConfig } from '../src/config.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

program
  .name('llms-txt')
  .description('Generate llms.txt and llms-full.txt for any static site')
  .usage('[options]')
  .version(packageJson.version)
  .option('-i, --input <dir>', 'Input directory containing built HTML files (default: ./dist or from config)')
  .option('-o, --output <dir>', 'Output directory (defaults to input directory or from config)')
  .option('-s, --site <url>', 'Site base URL (e.g., https://example.com)')
  .option('-n, --name <name>', 'Site name for llms.txt heading')
  .option('-d, --description <desc>', 'Site description for llms.txt')
  .option('-c, --config <file>', 'Path to configuration file (auto-detects src/config/llms.json if exists)')
  .option('-p, --preset <name>', 'Framework preset (astro, nextjs, nextjs-static)')
  .option('--no-md', 'Do not generate individual .md files')
  .option('--no-llms-txt', 'Do not generate llms.txt')
  .option('--no-llms-full', 'Do not generate llms-full.txt')
  .option('--dry-run', 'Show what would be generated without writing files')
  .option('--verbose', 'Show detailed output')
  .option('--title-selector <selector>', 'CSS selector for page title', 'h1')
  .option('--content-selector <selector>', 'CSS selector for main content', 'main')
  .option('--exclude <patterns>', 'Comma-separated patterns to exclude (default: 404,_astro,_next,node_modules)', (val) => val.split(','))
  .action(async (options) => {
    try {
      // Auto-detect config file
      let config = {};
      let configPath = options.config;
      
      // Check for src/config/llms.json if no config specified
      if (!configPath) {
        const autoConfigPath = join(process.cwd(), 'src', 'config', 'llms.json');
        if (existsSync(autoConfigPath)) {
          configPath = autoConfigPath;
          console.log(`📄 Auto-detected config: src/config/llms.json`);
        }
      }
      
      if (configPath) {
        config = await loadConfig(configPath);
        if (options.verbose) {
          console.log(`Loaded config from: ${configPath}`);
        }
      }

      // Apply preset if specified
      if (options.preset) {
        const presetConfig = getPreset(options.preset);
        config = { ...presetConfig, ...config };
        if (options.verbose) {
          console.log(`Applied preset: ${options.preset}`);
        }
      }

      // Support both snake_case (config file) and camelCase (CLI options)
      // Map snake_case config keys to camelCase
      const getConfigValue = (camelKey, snakeKey, defaultValue) => {
        return config[camelKey] ?? config[snakeKey] ?? defaultValue;
      };

      // Get values with priority: CLI option > config file > default
      // Note: options.input/output are undefined when not specified (no default in .option())
      const inputDir = options.input ?? getConfigValue('inputDir', 'input_dir', './dist');
      const outputDir = options.output ?? getConfigValue('outputDir', 'output_dir', inputDir);

      // Handle boolean options with --no- flags
      // Commander sets these to false when --no-X is used, true otherwise (for --no- flags)
      // So we need to check if config has explicit value first, then CLI, then default
      const getBooleanOption = (cliValue, camelKey, snakeKey, defaultValue = true) => {
        // If CLI explicitly set it (either --X or --no-X), use CLI value
        // For --no- flags, Commander sets them to false when used
        if (cliValue === false) return false; // --no-X was used
        // If config has an explicit boolean value, use it
        const configValue = getConfigValue(camelKey, snakeKey);
        if (typeof configValue === 'boolean') return configValue;
        // Otherwise use CLI value (true) or default
        return cliValue ?? defaultValue;
      };

      // CLI options override config
      const finalConfig = {
        inputDir,
        outputDir,
        siteUrl: options.site || getConfigValue('siteUrl', 'site_url'),
        name: options.name || config.name,
        description: options.description || config.description,
        generateIndividualMd: getBooleanOption(options.md, 'generateIndividualMd', 'generate_individual_md', true),
        generateLlmsTxt: getBooleanOption(options.llmsTxt, 'generateLlmsTxt', 'generate_llms_txt', true),
        generateLlmsFullTxt: getBooleanOption(options.llmsFull, 'generateLlmsFullTxt', 'generate_llms_full_txt', true),
        titleSelector: options.titleSelector || getConfigValue('titleSelector', 'title_selector', 'h1'),
        contentSelector: options.contentSelector || getConfigValue('contentSelector', 'content_selector', 'main'),
        exclude: options.exclude || config.exclude || ['404', '_astro', 'node_modules'],
        dryRun: options.dryRun || false,
        verbose: options.verbose || false,
      };

      // Validate required options
      if (!finalConfig.siteUrl) {
        console.error('Error: --site is required (e.g., https://example.com)');
        console.error('  Or specify it in the config file');
        process.exit(1);
      }

      if (options.verbose) {
        console.log('Configuration:');
        console.log(JSON.stringify(finalConfig, null, 2));
        console.log('');
      }

      // Generate files
      await generateLlmsFiles(finalConfig);

    } catch (error) {
      console.error('Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

function getPreset(name) {
  const presets = {
    astro: {
      inputDir: './dist',
      exclude: ['404', '404.html', '_astro', '**.xml', '**.txt'],
      titleSelector: 'h1',
      contentSelector: 'main',
    },
    nextjs: {
      inputDir: './.next/server/app',
      outputDir: './public',
      exclude: ['404', '404.html', '_next', '**.xml', '**.txt'],
      titleSelector: 'h1',
      contentSelector: 'main',
      _note: 'For static export (output: "export"), use inputDir: "./out" and outputDir: "./out"'
    },
    'nextjs-static': {
      inputDir: './out',
      outputDir: './out',
      exclude: ['404', '404.html', '_next', '**.xml', '**.txt'],
      titleSelector: 'h1',
      contentSelector: 'main',
    },
  };

  const preset = presets[name.toLowerCase()];
  if (!preset) {
    throw new Error(`Unknown preset: ${name}. Available: astro, nextjs, nextjs-static`);
  }
  return preset;
}

program.parse();
