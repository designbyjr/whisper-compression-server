#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, 'public', 'models');

console.log('🔍 Checking Whisper model files...');

// Check if model files exist
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

let allFilesExist = true;
let totalSize = 0;

for (const file of requiredFiles) {
    const filePath = path.join(modelsPath, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        console.log(`✅ ${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
}

if (!allFilesExist) {
    console.log('\n⚠️  Some model files are missing!');
    console.log('📥 Run: ./download-models.sh');
    console.log('📁 Or manually download to: public/models/');
    console.log('\n🔄 Starting anyway with online fallback...\n');
} else {
    console.log(`\n✅ All model files present (${(totalSize / 1024 / 1024).toFixed(2)}MB total)`);
    console.log('🚀 Starting with local model server...\n');
}

// Start the development servers
const child = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    child.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
});