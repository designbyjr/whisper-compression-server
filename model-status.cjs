#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 Whisper Model Status\n');

// Read the useWhisper hook to get current model
const useWhisperPath = path.join(__dirname, 'src', 'hooks', 'useWhisper.ts');
let currentModel = 'unknown';

if (fs.existsSync(useWhisperPath)) {
    const content = fs.readFileSync(useWhisperPath, 'utf8');
    const modelMatch = content.match(/const ONLINE_MODEL = "([^"]+)"/);
    if (modelMatch) {
        currentModel = modelMatch[1];
    }
}

console.log(`📦 Current Model: ${currentModel}`);

// Check if model files exist locally
const modelsPath = path.join(__dirname, 'public', 'models');
const modelsSmallPath = path.join(__dirname, 'public', 'models-small');

const checkModelFiles = (modelPath, modelName) => {
    if (!fs.existsSync(modelPath)) {
        return { exists: false, files: [], totalSize: 0 };
    }

    const requiredFiles = [
        'config.json',
        'tokenizer.json', 
        'generation_config.json',
        'normalizer.json',
        'added_tokens.json',
        'merges.txt',
        'onnx/encoder_model.onnx',
        'onnx/decoder_model_merged_q4.onnx'
    ];

    let totalSize = 0;
    const files = [];

    requiredFiles.forEach(file => {
        const filePath = path.join(modelPath, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            files.push({ name: file, size: sizeInMB, exists: true });
            totalSize += stats.size;
        } else {
            files.push({ name: file, size: '0.00', exists: false });
        }
    });

    return { 
        exists: files.every(f => f.exists), 
        files, 
        totalSize: (totalSize / (1024 * 1024)).toFixed(2) 
    };
};

// Check Whisper Tiny model
console.log('\n🔍 Local Model Files:');
const tinyStatus = checkModelFiles(modelsPath, 'Whisper Tiny');
console.log(`\n📁 Whisper Tiny (${modelsPath}):`);
console.log(`   Status: ${tinyStatus.exists ? '✅ Complete' : '❌ Incomplete'}`);
console.log(`   Total Size: ${tinyStatus.totalSize} MB`);

tinyStatus.files.forEach(file => {
    const status = file.exists ? '✅' : '❌';
    console.log(`   ${status} ${file.name} (${file.size} MB)`);
});

// Check Whisper Small model
const smallStatus = checkModelFiles(modelsSmallPath, 'Whisper Small');
console.log(`\n📁 Whisper Small (${modelsSmallPath}):`);
console.log(`   Status: ${smallStatus.exists ? '✅ Complete' : '❌ Incomplete'}`);
console.log(`   Total Size: ${smallStatus.totalSize} MB`);

smallStatus.files.forEach(file => {
    const status = file.exists ? '✅' : '❌';
    console.log(`   ${status} ${file.name} (${file.size} MB)`);
});

// Check model server status
console.log('\n🌐 Model Server Status:');
const http = require('http');

const checkServer = (port, modelName) => {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/health`, { timeout: 1000 }, (res) => {
            if (res.statusCode === 200) {
                resolve(`✅ ${modelName} server running on port ${port}`);
            } else {
                resolve(`❌ ${modelName} server responded with status ${res.statusCode}`);
            }
        });

        req.on('error', () => {
            resolve(`❌ ${modelName} server not running on port ${port}`);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(`❌ ${modelName} server timeout on port ${port}`);
        });
    });
};

Promise.all([
    checkServer(3001, 'Local model'),
]).then(results => {
    results.forEach(result => console.log(`   ${result}`));
    
    console.log('\n🚀 Recommendations:');
    
    if (currentModel.includes('small') && !smallStatus.exists) {
        console.log('   ⚠️  Current model is Whisper Small but local files are missing');
        console.log('   💡 Run: npm run download-models-small');
    } else if (currentModel.includes('tiny') && !tinyStatus.exists) {
        console.log('   ⚠️  Current model is Whisper Tiny but local files are missing'); 
        console.log('   💡 Run: npm run download-models');
    }
    
    if (!smallStatus.exists && !tinyStatus.exists) {
        console.log('   💡 To download models locally, run:');
        console.log('      • npm run download-models (Whisper Tiny)');
        console.log('      • npm run download-models-small (Whisper Small)');
    }
    
    console.log('\n📖 Usage:');
    console.log('   • npm start - Start with local model server');
    console.log('   • npm run dev-client - Start without local server');
    console.log('   • npm run model-server - Start only model server');
    console.log('   • npm run model-status - Show this status');
});