#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const modelName = args[0];

// Available models
const MODELS = {
    'small': {
        id: 'onnx-community/whisper-small',
        name: 'Whisper Small',
        description: '244M parameters, better accuracy, ~200MB',
        files_dir: 'public/models/zstd/whisper-small',
        download_script: './download-whisper-small-zstd.sh'
    },
    'base': {
        id: 'onnx-community/whisper-base',
        name: 'Whisper Base',
        description: '74M parameters, excellent accuracy, ~550MB',
        files_dir: 'public/models/zstd/whisper-base',
        download_script: './download-whisper-base-zstd.sh'
    },
    'tiny': {
        id: 'onnx-community/whisper-tiny',
        name: 'Whisper Tiny',
        description: '40M parameters, faster, ~117MB',
        files_dir: 'public/models/zstd/tiny',
        download_script: './download-models.sh (legacy)'
    }
};

// Helper function to update the model in useWhisper.ts
function updateModelInCode(modelId) {
    const hookPath = path.join(__dirname, 'src', 'hooks', 'useWhisper.ts');
    
    if (!fs.existsSync(hookPath)) {
        console.error('❌ Error: useWhisper.ts not found');
        process.exit(1);
    }
    
    let content = fs.readFileSync(hookPath, 'utf8');
    
    // Replace the model configuration line
    const oldPattern = /const ONLINE_MODEL = "onnx-community\/whisper-(small|tiny|base)";/;
    const newLine = `const ONLINE_MODEL = "${modelId}";`;
    
    if (oldPattern.test(content)) {
        content = content.replace(oldPattern, newLine);
        fs.writeFileSync(hookPath, content, 'utf8');
        return true;
    } else {
        console.error('❌ Error: Could not find model configuration in useWhisper.ts');
        return false;
    }
}

// Helper function to check if model files exist
function checkModelFiles(model) {
    const modelsPath = path.join(__dirname, model.files_dir);
    
    if (!fs.existsSync(modelsPath)) {
        return { exists: false, fileCount: 0, totalSize: 0, compressed: false };
    }
    
    let fileCount = 0;
    let totalSize = 0;
    let isCompressed = false;
    
    try {
        // Check if it's a zstd compressed model directory
        const masterManifest = path.join(modelsPath, 'master-manifest.json');
        if (fs.existsSync(masterManifest)) {
            isCompressed = true;
            
            // Count manifest and chunk files for compressed models
            function countInDirectory(dirPath) {
                if (!fs.existsSync(dirPath)) return;
                
                const files = fs.readdirSync(dirPath);
                files.forEach(file => {
                    const filePath = path.join(dirPath, file);
                    const stat = fs.statSync(filePath);
                    
                    if (stat.isFile()) {
                        fileCount++;
                        totalSize += stat.size;
                    } else if (stat.isDirectory()) {
                        countInDirectory(filePath);
                    }
                });
            }
            
            countInDirectory(modelsPath);
        } else {
            // Regular files (legacy support)
            const mainFiles = fs.readdirSync(modelsPath);
            mainFiles.forEach(file => {
                const filePath = path.join(modelsPath, file);
                if (fs.statSync(filePath).isFile()) {
                    fileCount++;
                    totalSize += fs.statSync(filePath).size;
                }
            });
            
            // Count onnx subdirectory files
            const onnxPath = path.join(modelsPath, 'onnx');
            if (fs.existsSync(onnxPath)) {
                const onnxFiles = fs.readdirSync(onnxPath);
                onnxFiles.forEach(file => {
                    const filePath = path.join(onnxPath, file);
                    if (fs.statSync(filePath).isFile()) {
                        fileCount++;
                        totalSize += fs.statSync(filePath).size;
                    }
                });
            }
        }
        
        return { 
            exists: fileCount > 0, 
            fileCount, 
            totalSize: Math.round(totalSize / 1024 / 1024), // MB
            compressed: isCompressed
        };
    } catch (error) {
        return { exists: false, fileCount: 0, totalSize: 0, compressed: false };
    }
}

// Show help
function showHelp() {
    console.log('🔄 Whisper Model Switcher\n');
    console.log('Usage: npm run switch <model>\n');
    console.log('Available models:');
    
    Object.entries(MODELS).forEach(([key, model]) => {
        const status = checkModelFiles(model);
        const statusIcon = status.exists ? '✅' : '❌';
        const sizeInfo = status.exists ? `(${status.totalSize}MB, ${status.fileCount} files)` : '(not downloaded)';
        
        console.log(`  ${key.padEnd(6)} ${statusIcon} ${model.name}`);
        console.log(`         ${model.description} ${sizeInfo}`);
        console.log(`         Download: ${model.download_script}\n`);
    });
    
    console.log('Examples:');
    console.log('  npm run switch small   # Switch to Whisper Small (better accuracy)');
    console.log('  npm run switch base    # Switch to Whisper Base (excellent accuracy)');
    console.log('  npm run switch tiny    # Switch to Whisper Tiny (faster)');
    console.log('  npm run switch         # Show this help');
}

// Show current model
function showCurrentModel() {
    const hookPath = path.join(__dirname, 'src', 'hooks', 'useWhisper.ts');
    
    if (!fs.existsSync(hookPath)) {
        console.error('❌ Error: useWhisper.ts not found');
        return;
    }
    
    const content = fs.readFileSync(hookPath, 'utf8');
    const match = content.match(/const ONLINE_MODEL = "onnx-community\/whisper-(small|tiny|base)";/);
    
    if (match) {
        const currentModel = match[1];
        const modelInfo = MODELS[currentModel];
        const status = checkModelFiles(modelInfo);
        
        console.log('🎯 Current Model Configuration:');
        console.log(`   ${modelInfo.name} (${currentModel})`);
        console.log(`   ${modelInfo.description}`);
        console.log(`   Status: ${status.exists ? '✅ Downloaded' : '❌ Not Downloaded'}`);
        
        if (!status.exists) {
            console.log(`   💡 Run: ${modelInfo.download_script}`);
        }
    } else {
        console.log('❌ Could not determine current model');
    }
}

// Main function
function main() {
    console.log('🔄 Whisper Model Switcher\n');
    
    // Show help if no arguments or help requested
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        showCurrentModel();
        console.log('');
        showHelp();
        return;
    }
    
    // Validate model name
    if (!MODELS[modelName]) {
        console.error(`❌ Error: Unknown model "${modelName}"`);
        console.log('Available models: ' + Object.keys(MODELS).join(', '));
        console.log('Run "npm run switch" for help');
        process.exit(1);
    }
    
    const model = MODELS[modelName];
    
    console.log(`🔄 Switching to ${model.name}...`);
    console.log(`   ${model.description}`);
    
    // Check if model files exist
    const status = checkModelFiles(model);
    
    if (!status.exists) {
        console.log(`\n⚠️  Model files not found!`);
        console.log(`📥 Please download the model first:`);
        console.log(`   ${model.download_script}`);
        console.log(`\n🔄 Updating configuration anyway...`);
    } else {
        console.log(`\n✅ Model files found (${status.totalSize}MB, ${status.fileCount} files)`);
    }
    
    // Update the code
    if (updateModelInCode(model.id)) {
        console.log(`✅ Successfully switched to ${model.name}`);
        console.log(`\n🔧 Code updated in src/hooks/useWhisper.ts`);
        console.log(`🔄 Please restart your dev server for changes to take effect`);
        
        if (!status.exists) {
            console.log(`\n📥 Don't forget to download the model files:`);
            console.log(`   ${model.download_script}`);
        }
    } else {
        console.error(`❌ Failed to update model configuration`);
        process.exit(1);
    }
}

main();