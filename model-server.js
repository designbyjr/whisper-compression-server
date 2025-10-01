#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Set proper headers for model files
app.use((req, res, next) => {
    // Set COOP/COEP headers for SharedArrayBuffer support
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Set proper MIME types for model files
    if (req.url.endsWith('.onnx')) {
        res.setHeader('Content-Type', 'application/octet-stream');
    } else if (req.url.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
    } else if (req.url.endsWith('.txt')) {
        res.setHeader('Content-Type', 'text/plain');
    }
    
    next();
});

const modelsPath = path.join(__dirname, 'public', 'models');
const zstdPath = path.join(__dirname, 'public', 'models', 'zstd');
const lzmaPath = path.join(__dirname, 'public', 'models', 'lzma');

// Function to serve LZMA chunked files
function serveLzmaFile(modelName, filename, res) {
    const modelPath = path.join(lzmaPath, modelName);
    let actualManifestPath;
    let actualFilePath;
    
    // Check if it's in the onnx subdirectory
    if (filename.startsWith('onnx/')) {
        const baseFilename = filename.substring(5); // Remove 'onnx/' prefix
        actualManifestPath = path.join(modelPath, 'onnx', baseFilename + '.xz.manifest.json');
        actualFilePath = path.join(modelPath, 'onnx');
    } else {
        actualManifestPath = path.join(modelPath, filename + '.xz.manifest.json');
        actualFilePath = modelPath;
    }
    
    console.log(`Looking for LZMA manifest: ${actualManifestPath}`);
    
    if (!fs.existsSync(actualManifestPath)) {
        console.log(`✗ LZMA Manifest not found: ${actualManifestPath}`);
        return res.status(404).json({ error: 'File not found (lzma)' });
    }
    
    try {
        const manifest = JSON.parse(fs.readFileSync(actualManifestPath, 'utf8'));
        const chunks = manifest.chunks;
        
        console.log(`✓ Serving LZMA file ${filename} (${chunks.length} chunks)`);
        
        // Set headers for LZMA content
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Encoding', 'lzma');
        res.setHeader('X-Original-Filename', manifest.originalFile);
        res.setHeader('X-Compression-Type', manifest.compressionType);
        res.setHeader('X-Chunk-Count', chunks.length);
        
        // Stream all chunks in order
        let totalSize = 0;
        
        for (let i = 0; i < chunks.length; i++) {
            const chunkPath = path.join(actualFilePath, chunks[i]);
            if (fs.existsSync(chunkPath)) {
                const chunkData = fs.readFileSync(chunkPath);
                res.write(chunkData);
                totalSize += chunkData.length;
            } else {
                console.log(`✗ LZMA Chunk not found: ${chunkPath}`);
                return res.status(404).json({ error: `LZMA Chunk ${i} not found` });
            }
        }
        
        res.end();
        console.log(`✓ Served ${filename} LZMA compressed (${(totalSize / 1024 / 1024).toFixed(2)}MB compressed)`);
        
    } catch (error) {
        console.error(`Error serving LZMA file: ${error.message}`);
        res.status(500).json({ error: 'Error reading LZMA file' });
    }
}

// Function to serve zstd chunked files
function serveZstdFile(modelName, filename, res) {
    const modelPath = path.join(zstdPath, modelName);
    const manifestPath = path.join(modelPath, filename + '.zst.manifest.json');
    const onnxManifestPath = path.join(modelPath, 'onnx', filename + '.zst.manifest.json');
    
    let actualManifestPath;
    let actualFilePath;
    
    // Check if it's in the onnx subdirectory
    if (filename.startsWith('onnx/')) {
        const baseFilename = filename.substring(5); // Remove 'onnx/' prefix
        actualManifestPath = path.join(modelPath, 'onnx', baseFilename + '.zst.manifest.json');
        actualFilePath = path.join(modelPath, 'onnx');
    } else {
        actualManifestPath = path.join(modelPath, filename + '.zst.manifest.json');
        actualFilePath = modelPath;
    }
    
    console.log(`Looking for manifest: ${actualManifestPath}`);
    
    if (!fs.existsSync(actualManifestPath)) {
        console.log(`✗ Manifest not found: ${actualManifestPath}`);
        return res.status(404).json({ error: 'File not found (zstd)' });
    }
    
    try {
        const manifest = JSON.parse(fs.readFileSync(actualManifestPath, 'utf8'));
        const chunks = manifest.chunks;
        
        console.log(`✓ Serving zstd file ${filename} (${chunks.length} chunks)`);
        
        // Set headers for zstd content
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Encoding', 'zstd');
        res.setHeader('X-Original-Filename', manifest.originalFile);
        res.setHeader('X-Compression-Type', manifest.compressionType);
        res.setHeader('X-Chunk-Count', chunks.length);
        
        // Stream all chunks in order
        let totalSize = 0;
        
        for (let i = 0; i < chunks.length; i++) {
            const chunkPath = path.join(actualFilePath, chunks[i]);
            if (fs.existsSync(chunkPath)) {
                const chunkData = fs.readFileSync(chunkPath);
                res.write(chunkData);
                totalSize += chunkData.length;
            } else {
                console.log(`✗ Chunk not found: ${chunkPath}`);
                return res.status(404).json({ error: `Chunk ${i} not found` });
            }
        }
        
        res.end();
        console.log(`✓ Served ${filename} compressed (${(totalSize / 1024 / 1024).toFixed(2)}MB compressed)`);
        
    } catch (error) {
        console.error(`Error serving zstd file: ${error.message}`);
        res.status(500).json({ error: 'Error reading zstd file' });
    }
}

// Function to serve regular files (for backwards compatibility)
function serveRegularFile(filename, res) {
    let filePath;
    
    if (filename.startsWith('onnx/')) {
        filePath = path.join(modelsPath, filename);
    } else {
        filePath = path.join(modelsPath, filename);
    }
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
        // Get file stats for Content-Length header
        const stats = fs.statSync(filePath);
        res.setHeader('Content-Length', stats.size);
        
        console.log(`✓ Serving ${filename} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
        res.sendFile(filePath);
    } else {
        console.log(`✗ File not found: ${filePath}`);
        res.status(404).json({ error: 'File not found' });
    }
}

// Mimic Hugging Face API structure - support multiple models
// Routes: /onnx-community/{model-name}/resolve/main/<filename>
app.use('/onnx-community/:modelName/resolve/main', (req, res) => {
    const modelName = req.params.modelName;
    const filename = req.path.substring(1); // Remove leading slash
    console.log(`Serving model file: ${modelName}/${filename}`);
    
    if (!filename) {
        return res.status(400).json({ error: 'No filename specified' });
    }
    
    // Map model names to folders
    const modelMapping = {
        'whisper-tiny': 'tiny',
        'whisper-small': 'whisper-small',
        'whisper-base': 'whisper-base'
    };
    
    const mappedModelName = modelMapping[modelName];
    if (!mappedModelName) {
        return res.status(404).json({ error: `Model ${modelName} not supported` });
    }
    
    // Priority order: LZMA -> ZSTD -> Regular files
    const lzmaModelPath = path.join(lzmaPath, mappedModelName);
    const zstdModelPath = path.join(zstdPath, mappedModelName);
    
    // For whisper-small, prefer LZMA if available
    if (modelName === 'whisper-small' && fs.existsSync(lzmaModelPath)) {
        console.log(`Using LZMA compressed version for ${modelName}`);
        serveLzmaFile(mappedModelName, filename, res);
    } else if (fs.existsSync(zstdModelPath)) {
        console.log(`Using zstd compressed version for ${modelName}`);
        serveZstdFile(mappedModelName, filename, res);
    } else {
        // Fallback to regular files for whisper-tiny (backwards compatibility)
        if (modelName === 'whisper-tiny') {
            console.log(`Using regular files for ${modelName}`);
            serveRegularFile(filename, res);
        } else {
            res.status(404).json({ error: `Model ${modelName} not found` });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const availableModels = [];
    
    // Check which models are available
    if (fs.existsSync(path.join(zstdPath, 'tiny'))) {
        availableModels.push('onnx-community/whisper-tiny (zstd)');
    }
    if (fs.existsSync(modelsPath) && fs.readdirSync(modelsPath).length > 3) {
        availableModels.push('onnx-community/whisper-tiny (regular)');
    }
    if (fs.existsSync(path.join(lzmaPath, 'whisper-small'))) {
        availableModels.push('onnx-community/whisper-small (lzma)');
    } else if (fs.existsSync(path.join(zstdPath, 'whisper-small'))) {
        availableModels.push('onnx-community/whisper-small (zstd)');
    }
    if (fs.existsSync(path.join(zstdPath, 'whisper-base'))) {
        availableModels.push('onnx-community/whisper-base (zstd)');
    }
    
    res.json({ 
        status: 'OK', 
        message: 'Whisper Model Server Running',
        timestamp: new Date().toISOString(),
        models: availableModels,
        compressionTypes: ['zstd', 'lzma'],
        chunkSize: '12MB',
        lzmaSupport: true
    });
});

// List available files
app.get('/onnx-community/whisper-tiny/files', (req, res) => {
    try {
        const files = [];
        
        // Read main directory
        const mainFiles = fs.readdirSync(modelsPath);
        mainFiles.forEach(file => {
            if (fs.statSync(path.join(modelsPath, file)).isFile()) {
                files.push(file);
            }
        });
        
        // Read onnx subdirectory
        const onnxPath = path.join(modelsPath, 'onnx');
        if (fs.existsSync(onnxPath)) {
            const onnxFiles = fs.readdirSync(onnxPath);
            onnxFiles.forEach(file => {
                files.push(`onnx/${file}`);
            });
        }
        
        res.json({
            model: 'onnx-community/whisper-tiny',
            files: files,
            total_files: files.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Whisper Local Model Server',
        version: '2.1.0',
        features: {
            multipleModels: ['whisper-tiny', 'whisper-small', 'whisper-base'],
            compressionTypes: ['zstd', 'lzma'],
            chunkSize: '12MB',
            lzmaSupport: true
        },
        endpoints: {
            health: '/health',
            models: '/onnx-community/{model-name}/resolve/main/<filename>'
        },
        examples: {
            'whisper-tiny': 'http://localhost:3001/onnx-community/whisper-tiny/resolve/main/config.json',
            'whisper-small': 'http://localhost:3001/onnx-community/whisper-small/resolve/main/config.json',
            'whisper-base': 'http://localhost:3001/onnx-community/whisper-base/resolve/main/config.json'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Whisper Model Server v2.1 running on http://localhost:${PORT}`);
    console.log(`📁 Serving models from: ${modelsPath}`);
    console.log(`🗜️  ZSTD models from: ${zstdPath}`);
    console.log(`🗜️  LZMA models from: ${lzmaPath}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(``);
    console.log(`📖 Supported models:`);
    
    // Check and list available models
    if (fs.existsSync(path.join(zstdPath, 'tiny'))) {
        console.log(`   ✅ whisper-tiny (zstd compressed)`);
    } else if (fs.existsSync(modelsPath)) {
        console.log(`   ✅ whisper-tiny (regular files)`);
    }
    
    if (fs.existsSync(path.join(lzmaPath, 'whisper-small'))) {
        console.log(`   ✅ whisper-small (lzma compressed) 🎯`);
    } else if (fs.existsSync(path.join(zstdPath, 'whisper-small'))) {
        console.log(`   ✅ whisper-small (zstd compressed)`);
    }
    
    if (fs.existsSync(path.join(zstdPath, 'whisper-base'))) {
        console.log(`   ✅ whisper-base (zstd compressed)`);
    }
    
    console.log(``);
    console.log(`📖 Usage in your app:`);
    console.log(`   Use: "http://localhost:${PORT}/onnx-community/{model-name}"`);
    console.log(`   Examples:`);
    console.log(`     - whisper-tiny:  http://localhost:${PORT}/onnx-community/whisper-tiny`);
    console.log(`     - whisper-small: http://localhost:${PORT}/onnx-community/whisper-small`);
    console.log(`     - whisper-base:  http://localhost:${PORT}/onnx-community/whisper-base`);
});
