#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Configuration
const CHUNK_SIZE = 12 * 1024 * 1024; // 12MB chunks
const COMPRESSION_LEVEL = 3; // zstd compression level (1-22, higher = better compression but slower)

console.log('🗜️  Whisper Model Compression & Chunking System\n');

// Check if zstd is available on the system
function checkZstd() {
    return new Promise((resolve) => {
        const process = spawn('zstd', ['--version']);
        process.on('close', (code) => {
            resolve(code === 0);
        });
        process.on('error', () => {
            resolve(false);
        });
    });
}

// Compress a file using zstd
function compressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`   Compressing: ${path.basename(inputPath)}`);
        
        const process = spawn('zstd', [
            `-${COMPRESSION_LEVEL}`,
            inputPath,
            '-o',
            outputPath
        ]);
        
        process.on('close', (code) => {
            if (code === 0) {
                const inputSize = fs.statSync(inputPath).size;
                const outputSize = fs.statSync(outputPath).size;
                const ratio = ((1 - outputSize / inputSize) * 100).toFixed(1);
                console.log(`   ✅ ${path.basename(inputPath)}: ${formatBytes(inputSize)} → ${formatBytes(outputSize)} (${ratio}% reduction)`);
                resolve();
            } else {
                reject(new Error(`zstd compression failed with code ${code}`));
            }
        });
        
        process.on('error', reject);
    });
}

// Split compressed file into chunks
function chunkFile(filePath, outputDir) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(filePath);
        const fileSize = fs.statSync(filePath).size;
        const numChunks = Math.ceil(fileSize / CHUNK_SIZE);
        
        console.log(`   Chunking: ${fileName} (${formatBytes(fileSize)} → ${numChunks} chunks)`);
        
        const chunks = [];
        const readStream = fs.createReadStream(filePath);
        let chunkIndex = 0;
        let currentChunk = Buffer.alloc(0);
        
        readStream.on('data', (data) => {
            currentChunk = Buffer.concat([currentChunk, data]);
            
            while (currentChunk.length >= CHUNK_SIZE) {
                const chunk = currentChunk.slice(0, CHUNK_SIZE);
                const chunkPath = path.join(outputDir, `${fileName}.chunk.${chunkIndex.toString().padStart(3, '0')}`);
                
                fs.writeFileSync(chunkPath, chunk);
                
                // Calculate chunk checksum
                const checksum = crypto.createHash('sha256').update(chunk).digest('hex');
                
                chunks.push({
                    index: chunkIndex,
                    filename: path.basename(chunkPath),
                    size: chunk.length,
                    checksum: checksum
                });
                
                console.log(`     ✅ Chunk ${chunkIndex}: ${formatBytes(chunk.length)}`);
                
                currentChunk = currentChunk.slice(CHUNK_SIZE);
                chunkIndex++;
            }
        });
        
        readStream.on('end', () => {
            // Handle remaining data
            if (currentChunk.length > 0) {
                const chunkPath = path.join(outputDir, `${fileName}.chunk.${chunkIndex.toString().padStart(3, '0')}`);
                fs.writeFileSync(chunkPath, currentChunk);
                
                const checksum = crypto.createHash('sha256').update(currentChunk).digest('hex');
                
                chunks.push({
                    index: chunkIndex,
                    filename: path.basename(chunkPath),
                    size: currentChunk.length,
                    checksum: checksum
                });
                
                console.log(`     ✅ Chunk ${chunkIndex}: ${formatBytes(currentChunk.length)}`);
            }
            
            // Create manifest file
            const manifest = {
                originalFile: fileName,
                originalSize: fileSize,
                compression: 'zstd',
                compressionLevel: COMPRESSION_LEVEL,
                chunkSize: CHUNK_SIZE,
                totalChunks: chunks.length,
                chunks: chunks,
                createdAt: new Date().toISOString()
            };
            
            const manifestPath = path.join(outputDir, `${fileName}.manifest.json`);
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            
            console.log(`   ✅ Created manifest: ${numChunks} chunks`);
            resolve(manifest);
        });
        
        readStream.on('error', reject);
    });
}

// Format bytes for display
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Process a model directory
async function processModel(modelPath, modelName) {
    console.log(`\n📦 Processing ${modelName} model...`);
    
    if (!fs.existsSync(modelPath)) {
        console.log(`   ⚠️  Model directory not found: ${modelPath}`);
        return;
    }
    
    // Create zstd directory
    const zstdDir = path.join(path.dirname(modelPath), `${modelName}-zstd`);
    if (fs.existsSync(zstdDir)) {
        console.log(`   🧹 Cleaning existing zstd directory...`);
        fs.rmSync(zstdDir, { recursive: true });
    }
    fs.mkdirSync(zstdDir, { recursive: true });
    
    // Get all model files
    const getAllFiles = (dir, fileList = []) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                getAllFiles(filePath, fileList);
            } else {
                fileList.push(filePath);
            }
        });
        return fileList;
    };
    
    const modelFiles = getAllFiles(modelPath);
    console.log(`   Found ${modelFiles.length} files to compress`);
    
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    const manifests = [];
    
    // Process each file
    for (const filePath of modelFiles) {
        const relativePath = path.relative(modelPath, filePath);
        const compressedPath = path.join(zstdDir, relativePath + '.zst');
        
        // Ensure directory exists
        fs.mkdirSync(path.dirname(compressedPath), { recursive: true });
        
        // Compress file
        await compressFile(filePath, compressedPath);
        
        // Chunk compressed file
        const manifest = await chunkFile(compressedPath, path.dirname(compressedPath));
        manifests.push({
            originalPath: relativePath,
            compressedPath: path.relative(zstdDir, compressedPath),
            manifest: manifest
        });
        
        totalOriginalSize += fs.statSync(filePath).size;
        totalCompressedSize += fs.statSync(compressedPath).size;
        
        // Remove the single compressed file since we have chunks now
        fs.unlinkSync(compressedPath);
    }
    
    // Create master manifest
    const masterManifest = {
        modelName: modelName,
        totalFiles: modelFiles.length,
        totalOriginalSize: totalOriginalSize,
        totalCompressedSize: totalCompressedSize,
        compressionRatio: ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1),
        chunkSize: CHUNK_SIZE,
        files: manifests,
        createdAt: new Date().toISOString()
    };
    
    const masterManifestPath = path.join(zstdDir, 'master-manifest.json');
    fs.writeFileSync(masterManifestPath, JSON.stringify(masterManifest, null, 2));
    
    console.log(`\n   📊 ${modelName} Compression Summary:`);
    console.log(`      Original size: ${formatBytes(totalOriginalSize)}`);
    console.log(`      Compressed size: ${formatBytes(totalCompressedSize)}`);
    console.log(`      Reduction: ${masterManifest.compressionRatio}%`);
    console.log(`      Total chunks: ${manifests.reduce((acc, m) => acc + m.manifest.totalChunks, 0)}`);
    
    return masterManifest;
}

// Main execution
async function main() {
    // Check for zstd
    const hasZstd = await checkZstd();
    if (!hasZstd) {
        console.error('❌ zstd is not installed or not in PATH');
        console.log('💡 Install zstd:');
        console.log('   macOS: brew install zstd');
        console.log('   Ubuntu: sudo apt install zstd');
        console.log('   Windows: Download from https://github.com/facebook/zstd/releases');
        process.exit(1);
    }
    
    console.log('✅ zstd is available\n');
    
    const publicDir = path.join(__dirname, 'public');
    
    // Process existing models
    const models = [
        { path: path.join(publicDir, 'models'), name: 'tiny' },
        { path: path.join(publicDir, 'models-small'), name: 'small' }
    ];
    
    const processedModels = [];
    
    for (const model of models) {
        try {
            const result = await processModel(model.path, model.name);
            if (result) {
                processedModels.push(result);
            }
        } catch (error) {
            console.error(`❌ Failed to process ${model.name} model:`, error.message);
        }
    }
    
    console.log(`\n🎉 Compression complete! Processed ${processedModels.length} models.`);
    
    if (processedModels.length > 0) {
        const totalOriginal = processedModels.reduce((acc, m) => acc + m.totalOriginalSize, 0);
        const totalCompressed = processedModels.reduce((acc, m) => acc + m.totalCompressedSize, 0);
        const overallRatio = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
        
        console.log(`\n📈 Overall Statistics:`);
        console.log(`   Total original size: ${formatBytes(totalOriginal)}`);
        console.log(`   Total compressed size: ${formatBytes(totalCompressed)}`);
        console.log(`   Overall reduction: ${overallRatio}%`);
        console.log(`   Space saved: ${formatBytes(totalOriginal - totalCompressed)}`);
    }
    
    console.log('\n🚀 Ready for chunked downloads!');
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Compression failed:', error);
        process.exit(1);
    });
}

module.exports = { processModel, chunkFile, compressFile };