import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync, readdirSync } from 'fs';
import { extractCoMapeoZip, findGeojsonFiles } from './utils/extractZip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Paths
const PROJECTS_DIR = join(__dirname, '../projects');
const DATA_DIR = join(__dirname, '../data');
const EXAMPLE_DIR = join(__dirname, '../example');
const EXAMPLE_ZIP = join(EXAMPLE_DIR, 'example.zip');

// Ensure projects directory exists
if (!existsSync(PROJECTS_DIR)) {
  mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: join(__dirname, '../uploads'),
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.zip', '.geojson'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip and .geojson files are allowed'));
    }
  }
});

// Store current project info
let currentProject = {
  loaded: false,
  name: null,
  geojsonFiles: [],
  mediaDir: null
};

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the dist folder in production
app.use(express.static(join(__dirname, '../dist')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CoMapeo Project Web Renderer API' });
});

// Extract the example zip (for testing)
app.post('/api/extract-example', async (req, res) => {
  const result = await extractCoMapeoZip(EXAMPLE_ZIP, DATA_DIR);
  
  if (result.success) {
    // Also include any geojson files from example folder (for testing tracks)
    const exampleGeojsons = findGeojsonFiles(EXAMPLE_DIR);
    const allGeojsonFiles = [...result.geojsonFiles, ...exampleGeojsons];
    
    currentProject = {
      loaded: true,
      name: 'Example Project',
      geojsonFiles: allGeojsonFiles,
      mediaDir: result.mediaDir
    };
    res.json({ 
      success: true, 
      message: 'Example data loaded successfully',
      geojsonFiles: allGeojsonFiles,
      mediaDir: result.mediaDir
    });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Create a new project with uploaded files
app.post('/api/projects', upload.array('files'), async (req, res) => {
  const { projectName } = req.body;
  const files = req.files;

  if (!projectName || !projectName.trim()) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one file is required' });
  }

  const safeName = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const projectDir = join(PROJECTS_DIR, safeName);

  try {
    // Create project directory
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true });
    }
    mkdirSync(projectDir, { recursive: true });

    const geojsonFiles = [];
    let mediaDir = null;

    // Process uploaded files
    for (const file of files) {
      const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      
      if (ext === '.zip') {
        // Extract zip file
        const result = await extractCoMapeoZip(file.path, projectDir);
        if (result.success) {
          geojsonFiles.push(...result.geojsonFiles);
          if (result.mediaDir) {
            mediaDir = result.mediaDir;
          }
        }
      } else if (ext === '.geojson') {
        // Copy geojson file to project directory
        const destPath = join(projectDir, file.originalname);
        copyFileSync(file.path, destPath);
        geojsonFiles.push(destPath);
      }

      // Clean up uploaded temp file
      if (existsSync(file.path)) {
        rmSync(file.path);
      }
    }

    // Save project metadata
    const projectMeta = {
      name: projectName.trim(),
      createdAt: new Date().toISOString(),
      geojsonFiles,
      mediaDir
    };
    writeFileSync(join(projectDir, 'project.json'), JSON.stringify(projectMeta, null, 2));

    // Set as current project
    currentProject = {
      loaded: true,
      name: projectName.trim(),
      geojsonFiles,
      mediaDir
    };

    res.json({
      success: true,
      message: 'Project created successfully',
      project: {
        name: projectName.trim(),
        geojsonFiles,
        mediaDir
      }
    });
  } catch (err) {
    // Clean up on error
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current project status
app.get('/api/project', (req, res) => {
  res.json(currentProject);
});

// List all stored projects
app.get('/api/projects', (req, res) => {
  try {
    if (!existsSync(PROJECTS_DIR)) {
      return res.json({ projects: [] });
    }

    const projectDirs = readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const projects = [];
    for (const dirName of projectDirs) {
      const metaPath = join(PROJECTS_DIR, dirName, 'project.json');
      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          projects.push({
            id: dirName,
            name: meta.name,
            createdAt: meta.createdAt,
            geojsonCount: meta.geojsonFiles?.length || 0,
            hasMedia: !!meta.mediaDir
          });
        } catch (e) {
          // Skip invalid project.json
        }
      }
    }

    // Sort by creation date (newest first)
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// Switch to a specific project
app.post('/api/projects/:projectId/select', (req, res) => {
  const { projectId } = req.params;
  const projectDir = join(PROJECTS_DIR, projectId);
  const metaPath = join(projectDir, 'project.json');

  if (!existsSync(metaPath)) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    
    currentProject = {
      loaded: true,
      name: meta.name,
      geojsonFiles: meta.geojsonFiles || [],
      mediaDir: meta.mediaDir || null
    };

    res.json({
      success: true,
      project: {
        name: meta.name,
        geojsonFiles: meta.geojsonFiles,
        mediaDir: meta.mediaDir
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load project' });
  }
});

// Delete a project
app.delete('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const projectDir = join(PROJECTS_DIR, projectId);

  if (!existsSync(projectDir)) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  try {
    // Read project name before deletion for response
    const metaPath = join(projectDir, 'project.json');
    let projectName = projectId;
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        projectName = meta.name || projectId;
      } catch (e) {
        // Use projectId as fallback
      }
    }

    // Delete the project directory
    rmSync(projectDir, { recursive: true });

    // If this was the current project, clear it
    if (currentProject.name === projectName) {
      currentProject = {
        loaded: false,
        name: null,
        geojsonFiles: [],
        mediaDir: null
      };
    }

    res.json({
      success: true,
      message: `Project "${projectName}" deleted successfully`,
      wasCurrentProject: currentProject.name === null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

// Add files to an existing project
app.post('/api/projects/:projectId/files', upload.array('files'), async (req, res) => {
  const { projectId } = req.params;
  const files = req.files;
  const projectDir = join(PROJECTS_DIR, projectId);
  const metaPath = join(projectDir, 'project.json');

  if (!existsSync(metaPath)) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one file is required' });
  }

  try {
    // Read existing project metadata
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    const existingGeojsonFiles = meta.geojsonFiles || [];
    let mediaDir = meta.mediaDir || null;

    const newGeojsonFiles = [];

    // Process uploaded files
    for (const file of files) {
      const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      
      if (ext === '.zip') {
        // Extract zip file to a subdirectory to avoid overwriting
        const zipExtractDir = join(projectDir, `import_${Date.now()}`);
        const result = await extractCoMapeoZip(file.path, zipExtractDir);
        if (result.success) {
          newGeojsonFiles.push(...result.geojsonFiles);
          // Use the media dir from the zip if we don't have one yet
          if (result.mediaDir && !mediaDir) {
            mediaDir = result.mediaDir;
          } else if (result.mediaDir && mediaDir) {
            // If we already have a media dir, copy files from the new one
            const newMediaFiles = readdirSync(result.mediaDir);
            for (const mediaFile of newMediaFiles) {
              const srcPath = join(result.mediaDir, mediaFile);
              const destPath = join(mediaDir, mediaFile);
              if (!existsSync(destPath)) {
                copyFileSync(srcPath, destPath);
              }
            }
          }
        }
      } else if (ext === '.geojson') {
        // Copy geojson file to project directory with unique name if needed
        let destName = file.originalname;
        let destPath = join(projectDir, destName);
        let counter = 1;
        while (existsSync(destPath)) {
          const baseName = file.originalname.replace('.geojson', '');
          destName = `${baseName}_${counter}.geojson`;
          destPath = join(projectDir, destName);
          counter++;
        }
        copyFileSync(file.path, destPath);
        newGeojsonFiles.push(destPath);
      }

      // Clean up uploaded temp file
      if (existsSync(file.path)) {
        rmSync(file.path);
      }
    }

    // Update project metadata
    const allGeojsonFiles = [...existingGeojsonFiles, ...newGeojsonFiles];
    meta.geojsonFiles = allGeojsonFiles;
    meta.mediaDir = mediaDir;
    meta.updatedAt = new Date().toISOString();
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    // Update current project if this is the active one
    if (currentProject.name === meta.name) {
      currentProject.geojsonFiles = allGeojsonFiles;
      currentProject.mediaDir = mediaDir;
    }

    res.json({
      success: true,
      message: `Added ${newGeojsonFiles.length} file(s) to project`,
      project: {
        name: meta.name,
        geojsonFiles: allGeojsonFiles,
        mediaDir,
        newFilesCount: newGeojsonFiles.length
      },
      isCurrentProject: currentProject.name === meta.name
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get combined geojson data (observations and tracks)
app.get('/api/geojson', (req, res) => {
  if (!currentProject.loaded || currentProject.geojsonFiles.length === 0) {
    return res.status(404).json({ error: 'No project loaded' });
  }
  
  try {
    // Combine all features from all geojson files
    const allFeatures = [];
    
    for (const filePath of currentProject.geojsonFiles) {
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf-8');
        const geojson = JSON.parse(data);
        if (geojson.features) {
          allFeatures.push(...geojson.features);
        }
      }
    }
    
    res.json({
      type: 'FeatureCollection',
      features: allFeatures
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read GeoJSON files' });
  }
});

// Serve media files
app.get('/api/media/:name', (req, res) => {
  if (!currentProject.loaded || !currentProject.mediaDir) {
    return res.status(404).json({ error: 'No project loaded' });
  }
  
  const { name } = req.params;
  const mediaDir = currentProject.mediaDir;
  
  // Try to find the file with _original suffix
  const possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'm4a', 'mp3', 'wav', 'ogg'];
  let filePath = null;
  
  for (const ext of possibleExtensions) {
    const candidate = join(mediaDir, `${name}_original.${ext}`);
    if (existsSync(candidate)) {
      filePath = candidate;
      break;
    }
  }
  
  if (!filePath) {
    return res.status(404).json({ error: 'Media file not found' });
  }
  
  res.sendFile(filePath);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
