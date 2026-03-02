import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { extractCoMapeoZip, findGeojsonFiles } from './utils/extractZip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Paths
const DATA_DIR = join(__dirname, '../data');
const EXAMPLE_DIR = join(__dirname, '../example');
const EXAMPLE_ZIP = join(EXAMPLE_DIR, 'example.zip');

// Store current project info
let currentProject = {
  loaded: false,
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

// Get current project status
app.get('/api/project', (req, res) => {
  res.json(currentProject);
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
