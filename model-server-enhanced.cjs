#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// JWT Configuration
const JWT_SECRET = crypto.randomBytes(64).toString('hex'); // Random secret for this session
const JWT_EXPIRY = '5m'; // 5 minutes as requested

console.log('🚀 Enhanced Whisper Model Server with Chunked Downloads\n');

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
}));

app.use(express.json());

// Add COOP and COEP headers for WebGPU/WASM support
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Model paths
const MODELS = {
    'tiny': {
        originalPath: path.join(__dirname, 'public', 'models'),
        compressedPath: path.join(__dirname, 'public', 'tiny-zstd'),
        name: 'Whisper Tiny'
    },
    'small': {
        originalPath: path.join(__dirname, 'public', 'models-small'),
        compressedPath: path.join(__dirname, 'public', 'small-zstd'),
        name: 'Whisper Small'
    }
};

// JWT Token Generation
function generateChunkToken(chunkInfo) {
    const payload = {
        chunkId: chunkInfo.id,
        filename: chunkInfo.filename,
        checksum: chunkInfo.checksum,
        model: chunkInfo.model,
        iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// JWT Token Validation Middleware
function validateToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
        return res.status(401).json({ 
            error: 'No token provided',
            code: 'NO_TOKEN'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.tokenData = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({ 
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    const availableModels = [];
    
    Object.entries(MODELS).forEach(([key, model]) => {
        const originalExists = fs.existsSync(model.originalPath);
        const compressedExists = fs.existsSync(model.compressedPath);
        
        availableModels.push({
            name: model.name,
            key: key,
            original: originalExists,
            compressed: compressedExists,
            compressionEnabled: compressedExists
        });
    });
    
    res.json({
        status: 'healthy',
        server: 'Enhanced Whisper Model Server',
        version: '2.0.0',
        features: ['chunked-downloads', 'jwt-auth', 'compression', 'parallel-serving'],
        models: availableModels,
        jwtExpiry: JWT_EXPIRY
    });
});

// Get model manifest (list of chunks with tokens)
app.get('/api/models/:model/manifest', async (req, res) => {
    const { model } = req.params;
    const modelConfig = MODELS[model];
    
    if (!modelConfig) {
        return res.status(404).json({ error: `Model '${model}' not found` });
    }
    
    const manifestPath = path.join(modelConfig.compressedPath, 'master-manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
        return res.status(404).json({ 
            error: `Compressed model manifest not found: ${model}`,
            suggestion: `Run 'npm run compress-models' to create compressed versions`
        });
    }
    
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Generate tokens for all chunks
        const chunkedFiles = manifest.files.map(file => ({
            originalPath: file.originalPath,
            compressedPath: file.compressedPath,
            manifest: {
                ...file.manifest,
                chunks: file.manifest.chunks.map(chunk => {
                    const chunkInfo = {
                        id: `${model}-${file.originalPath}-${chunk.index}`,
                        filename: chunk.filename,
                        checksum: chunk.checksum,
                        model: model
                    };
                    
                    return {
                        ...chunk,
                        token: generateChunkToken(chunkInfo),
                        downloadUrl: `/api/models/${model}/chunks/${encodeURIComponent(file.compressedPath)}/${chunk.filename}`
                    };
                })
            }
        }));
        
        res.json({
            ...manifest,
            files: chunkedFiles,
            serverTime: new Date().toISOString(),
            tokenExpiry: JWT_EXPIRY
        });
        
    } catch (error) {
        console.error('Error reading manifest:', error);
        res.status(500).json({ error: 'Failed to read model manifest' });
    }
});

// Download specific chunk with JWT validation
app.get('/api/models/:model/chunks/:filePath/:chunkFilename', validateToken, (req, res) => {
    const { model, filePath, chunkFilename } = req.params;
    const modelConfig = MODELS[model];
    
    if (!modelConfig) {
        return res.status(404).json({ error: `Model '${model}' not found` });
    }
    
    // Validate token data matches request
    const expectedChunkId = `${model}-${decodeURIComponent(filePath)}-${chunkFilename.split('.chunk.')[1]?.split('.')[0] || '0'}`;
    
    if (req.tokenData.chunkId !== expectedChunkId) {
        return res.status(403).json({ 
            error: 'Token does not match requested chunk',
            code: 'TOKEN_MISMATCH'
        });
    }
    
    const chunkPath = path.join(
        modelConfig.compressedPath,
        decodeURIComponent(filePath).replace('.zst', '.zst'),
        chunkFilename
    );
    
    // Security: Ensure the path is within the model directory
    const resolvedPath = path.resolve(chunkPath);
    const resolvedModelPath = path.resolve(modelConfig.compressedPath);
    
    if (!resolvedPath.startsWith(resolvedModelPath)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'Chunk not found' });
    }
    
    try {
        const stats = fs.statSync(resolvedPath);
        
        // Verify checksum if provided in token
        if (req.tokenData.checksum) {
            const chunkData = fs.readFileSync(resolvedPath);
            const actualChecksum = crypto.createHash('sha256').update(chunkData).digest('hex');
            
            if (actualChecksum !== req.tokenData.checksum) {
                return res.status(422).json({ 
                    error: 'Chunk integrity check failed',
                    code: 'CHECKSUM_MISMATCH'
                });
            }
        }
        
        // Set appropriate headers for chunk download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', `attachment; filename="${chunkFilename}"`);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        
        // Add custom headers for chunk info
        res.setHeader('X-Chunk-Size', stats.size);
        res.setHeader('X-Chunk-Checksum', req.tokenData.checksum || 'unknown');
        
        console.log(`📦 Serving chunk: ${chunkFilename} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
        
        // Stream the file
        const stream = fs.createReadStream(resolvedPath);
        stream.pipe(res);
        
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream chunk' });
            }
        });
        
    } catch (error) {
        console.error('Error serving chunk:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token endpoint for long downloads
app.post('/api/auth/refresh', validateToken, (req, res) => {
    const { chunkId } = req.body;
    
    if (req.tokenData.chunkId !== chunkId) {
        return res.status(403).json({ error: 'Token mismatch for refresh' });
    }
    
    // Generate new token with same payload but fresh expiry
    const newToken = jwt.sign({
        chunkId: req.tokenData.chunkId,
        filename: req.tokenData.filename,
        checksum: req.tokenData.checksum,
        model: req.tokenData.model,
        iat: Math.floor(Date.now() / 1000)
    }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    
    res.json({ 
        token: newToken,
        expiresIn: JWT_EXPIRY
    });
});

// Legacy endpoints for fallback (original file serving)
app.get('/onnx-community/:model/resolve/main/*', (req, res) => {
    const { model } = req.params;
    const filename = req.params[0]; // Wildcard capture
    let modelPath;
    
    // Map model names to local paths
    if (model === 'whisper-tiny') {
        modelPath = MODELS.tiny.originalPath;
    } else if (model === 'whisper-small') {
        modelPath = MODELS.small.originalPath;
    } else {
        return res.status(404).json({ error: 'Model not found' });
    }
    
    const filePath = path.join(modelPath, filename);
    
    // Security check
    const resolvedPath = path.resolve(filePath);
    const resolvedModelPath = path.resolve(modelPath);
    
    if (!resolvedPath.startsWith(resolvedModelPath)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = fs.statSync(resolvedPath);
    const ext = path.extname(filename).toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (ext === '.json') contentType = 'application/json';
    else if (ext === '.txt') contentType = 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    console.log(`📄 Serving legacy file: ${filename} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
    
    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
});

// File listing endpoints
app.get('/onnx-community/:model/files', (req, res) => {
    const { model } = req.params;
    let modelPath;
    
    if (model === 'whisper-tiny') {
        modelPath = MODELS.tiny.originalPath;
    } else if (model === 'whisper-small') {
        modelPath = MODELS.small.originalPath;
    } else {
        return res.status(404).json({ error: 'Model not found' });
    }
    
    if (!fs.existsSync(modelPath)) {
        return res.status(404).json({ error: 'Model directory not found' });
    }
    
    try {
        const getAllFiles = (dir, fileList = []) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const relativePath = path.relative(modelPath, filePath);
                if (fs.statSync(filePath).isDirectory()) {
                    getAllFiles(filePath, fileList);
                } else {
                    const stats = fs.statSync(filePath);
                    fileList.push({
                        path: relativePath,
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    });
                }
            });
            return fileList;
        };
        
        const files = getAllFiles(modelPath);
        res.json({ files });
        
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
    console.log(`🔐 JWT tokens expire after: ${JWT_EXPIRY}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    
    // Show available models
    Object.entries(MODELS).forEach(([key, model]) => {
        const originalExists = fs.existsSync(model.originalPath);
        const compressedExists = fs.existsSync(model.compressedPath);
        
        console.log(`📦 ${model.name} (${key}):`);
        console.log(`   Original: ${originalExists ? '✅' : '❌'} ${model.originalPath}`);
        console.log(`   Compressed: ${compressedExists ? '✅' : '❌'} ${model.compressedPath}`);
        
        if (compressedExists) {
            console.log(`   Manifest: http://localhost:${PORT}/api/models/${key}/manifest`);
        }
    });
    
    console.log(`\n🚀 Ready for chunked downloads with JWT authentication!`);
});
