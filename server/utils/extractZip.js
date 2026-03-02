import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Extract a CoMapeo export zip file to a target directory.
 * 
 * @param {string} zipPath - Path to the zip file
 * @param {string} outputDir - Directory to extract to
 * @returns {Promise<{success: boolean, geojsonFiles?: string[], mediaDir?: string, error?: string}>}
 */
export async function extractCoMapeoZip(zipPath, outputDir) {
  try {
    // Validate zip exists
    if (!existsSync(zipPath)) {
      return { success: false, error: `Zip file not found: ${zipPath}` };
    }

    // Clean output directory if it exists
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });

    // Extract zip
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);

    // Find all geojson files and media directory
    const entries = zip.getEntries();
    const geojsonFiles = [];
    let mediaDir = null;

    for (const entry of entries) {
      const entryName = entry.entryName;
      
      if (entryName.endsWith('.geojson')) {
        geojsonFiles.push(join(outputDir, entryName));
      } else if (entryName.includes('Media') && entryName.endsWith('/')) {
        mediaDir = join(outputDir, entryName);
      }
    }

    // If no explicit media dir found, try to detect from file paths
    if (!mediaDir) {
      for (const entry of entries) {
        const entryName = entry.entryName;
        if (entryName.includes('Media') && !entry.isDirectory) {
          const parts = entryName.split('/');
          if (parts.length > 1) {
            mediaDir = join(outputDir, parts[0]);
            break;
          }
        }
      }
    }

    return {
      success: true,
      geojsonFiles,
      mediaDir
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Find all geojson files in a directory.
 * 
 * @param {string} dir - Directory to search
 * @returns {string[]} Array of geojson file paths
 */
export function findGeojsonFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  
  const files = readdirSync(dir);
  return files
    .filter(f => f.endsWith('.geojson'))
    .map(f => join(dir, f));
}
