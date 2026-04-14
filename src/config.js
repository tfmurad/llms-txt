import { readFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * Load configuration from a JSON file
 */
export async function loadConfig(configPath) {
  const fullPath = resolve(configPath);
  const content = await readFile(fullPath, 'utf8');
  return JSON.parse(content);
}
