const AdmZip = require('adm-zip');
const fs = require('fs-extra');
const path = require('path');
const { parseString } = require('xml2js');

/**
 * SCORM Service
 * 
 * Handles SCORM package extraction, parsing, and validation
 */

/**
 * Extract SCORM package ZIP file to specified directory
 * @param {string} zipPath - Path to the ZIP file
 * @param {string} outputDir - Directory to extract to
 * @returns {Promise<string>} Path to extracted directory
 */
async function extractScormPackage(zipPath, outputDir) {
  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    // Extract ZIP file
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    
    return outputDir;
  } catch (error) {
    throw new Error(`Failed to extract SCORM package: ${error.message}`);
  }
}

/**
 * Parse imsmanifest.xml to get package metadata
 * @param {string} manifestPath - Path to imsmanifest.xml
 * @returns {Promise<Object>} Parsed manifest object
 */
async function parseManifest(manifestPath) {
  try {
    const xmlContent = await fs.readFile(manifestPath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      parseString(xmlContent, { 
        explicitArray: false,
        mergeAttrs: true 
      }, (err, result) => {
        if (err) {
          reject(new Error(`Failed to parse manifest XML: ${err.message}`));
        } else {
          resolve(result);
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to read manifest file: ${error.message}`);
  }
}

/**
 * Get SCORM entry point (index.html path) from manifest
 * @param {string} manifestPath - Path to imsmanifest.xml
 * @param {string} basePath - Base path of extracted SCORM package
 * @returns {Promise<string>} Relative path to entry point
 */
async function getScormEntryPoint(manifestPath, basePath) {
  try {
    const manifest = await parseManifest(manifestPath);
    
    // SCORM 1.2 structure: manifest.resources.resource.href
    // SCORM 2004 structure: manifest.resources.resource.href
    let entryPoint = null;
    
    if (manifest.manifest) {
      const resources = manifest.manifest.resources;
      if (resources) {
        const resource = Array.isArray(resources.resource) 
          ? resources.resource[0] 
          : resources.resource;
        
        if (resource && resource.href) {
          entryPoint = resource.href;
        }
      }
    }
    
    // Fallback: look for common entry points
    if (!entryPoint) {
      const commonEntryPoints = ['index.html', 'index.htm', 'story.html', 'story.htm'];
      for (const entry of commonEntryPoints) {
        const entryPath = path.join(basePath, entry);
        if (await fs.pathExists(entryPath)) {
          entryPoint = entry;
          break;
        }
      }
    }
    
    // Final fallback
    if (!entryPoint) {
      entryPoint = 'index.html';
    }
    
    return entryPoint;
  } catch (error) {
    // If manifest parsing fails, default to index.html
    console.warn(`Could not parse manifest, using default entry point: ${error.message}`);
    return 'index.html';
  }
}

/**
 * Validate SCORM package structure
 * @param {string} extractedPath - Path to extracted SCORM package
 * @returns {Promise<boolean>} True if valid
 */
async function validateScormPackage(extractedPath) {
  try {
    // Check if directory exists
    const exists = await fs.pathExists(extractedPath);
    if (!exists) {
      throw new Error('Extracted SCORM package directory does not exist');
    }
    
    // Check for imsmanifest.xml (required for SCORM)
    const manifestPath = path.join(extractedPath, 'imsmanifest.xml');
    const manifestExists = await fs.pathExists(manifestPath);
    
    if (!manifestExists) {
      // Try alternative locations
      const altManifestPaths = [
        path.join(extractedPath, 'manifest', 'imsmanifest.xml'),
        path.join(extractedPath, 'ims', 'imsmanifest.xml'),
      ];
      
      let found = false;
      for (const altPath of altManifestPaths) {
        if (await fs.pathExists(altPath)) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error('Invalid SCORM package: imsmanifest.xml not found');
      }
    }
    
    return true;
  } catch (error) {
    throw new Error(`SCORM validation failed: ${error.message}`);
  }
}

/**
 * Find manifest file in extracted package
 * @param {string} extractedPath - Path to extracted SCORM package
 * @returns {Promise<string|null>} Path to manifest file or null
 */
async function findManifestFile(extractedPath) {
  const possiblePaths = [
    path.join(extractedPath, 'imsmanifest.xml'),
    path.join(extractedPath, 'manifest', 'imsmanifest.xml'),
    path.join(extractedPath, 'ims', 'imsmanifest.xml'),
  ];
  
  for (const manifestPath of possiblePaths) {
    if (await fs.pathExists(manifestPath)) {
      return manifestPath;
    }
  }
  
  return null;
}

/**
 * Get SCORM package metadata
 * @param {string} extractedPath - Path to extracted SCORM package
 * @returns {Promise<Object>} Package metadata
 */
async function getScormMetadata(extractedPath) {
  try {
    const manifestPath = await findManifestFile(extractedPath);
    
    if (!manifestPath) {
      return {
        title: 'SCORM Package',
        entryPoint: 'index.html',
        version: '1.2',
      };
    }
    
    const manifest = await parseManifest(manifestPath);
    const entryPoint = await getScormEntryPoint(manifestPath, extractedPath);
    
    // Extract title from manifest
    let title = 'SCORM Package';
    if (manifest.manifest) {
      const metadata = manifest.manifest.metadata;
      if (metadata) {
        const schema = metadata.schema;
        if (schema) {
          const lom = schema.lom;
          if (lom && lom.general) {
            const general = lom.general;
            if (general.title) {
              const langString = general.title.langstring || general.title;
              title = langString._text || langString || title;
            }
          }
        }
      }
    }
    
    // Try to determine SCORM version from manifest
    let version = '1.2';
    if (manifest.manifest && manifest.manifest.$) {
      const schemaversion = manifest.manifest.$.schemaversion;
      if (schemaversion && schemaversion.includes('2004')) {
        version = '2004';
      }
    }
    
    return {
      title,
      entryPoint,
      version,
      manifestPath: path.relative(extractedPath, manifestPath),
    };
  } catch (error) {
    console.warn(`Could not extract full metadata: ${error.message}`);
    return {
      title: 'SCORM Package',
      entryPoint: 'index.html',
      version: '1.2',
    };
  }
}

/**
 * Clean up extracted SCORM package
 * @param {string} extractedPath - Path to extracted directory
 * @returns {Promise<void>}
 */
async function cleanupScormPackage(extractedPath) {
  try {
    await fs.remove(extractedPath);
  } catch (error) {
    console.error(`Failed to cleanup SCORM package: ${error.message}`);
    // Don't throw - cleanup failures shouldn't break the flow
  }
}

module.exports = {
  extractScormPackage,
  parseManifest,
  getScormEntryPoint,
  validateScormPackage,
  findManifestFile,
  getScormMetadata,
  cleanupScormPackage,
};
