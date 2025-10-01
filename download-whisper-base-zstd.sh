#!/bin/bash

# Download Whisper Base Model Files and compress with zstd
echo "🔄 Downloading and compressing Whisper Base model files..."
echo "📊 This model provides excellent accuracy (~550MB)"
echo "🗜️ Files will be compressed with zstd into 12MB chunks"

# Check for zstd
if ! command -v zstd &> /dev/null; then
    echo "❌ zstd is not installed. Please install zstd first:"
    echo "   macOS: brew install zstd"
    echo "   Linux: sudo apt-get install zstd"
    exit 1
fi

# Create models directory
DEST_DIR="public/models/zstd/whisper-base"
mkdir -p "$DEST_DIR/onnx"
cd "$DEST_DIR"

TEMP_DIR=$(mktemp -d)
echo "📁 Using temporary directory: $TEMP_DIR"

# Function to download, compress and chunk a file
download_and_compress() {
    local filename=$1
    local url=$2
    local subdir=${3:-""}
    
    echo "📥 Downloading $filename..."
    
    if [[ -n "$subdir" ]]; then
        curl -L -o "$TEMP_DIR/$filename" "$url"
        
        echo "🗜️ Compressing $filename..."
        zstd -19 "$TEMP_DIR/$filename" -o "$TEMP_DIR/$filename.zst"
        rm "$TEMP_DIR/$filename"
        
        echo "✂️ Chunking $filename into 12MB pieces..."
        # Create chunks of 12MB (12 * 1024 * 1024 bytes)
        split -b 12582912 "$TEMP_DIR/$filename.zst" "$filename.zst.chunk."
        rm "$TEMP_DIR/$filename.zst"
        
        # Create manifest
        echo "{" > "$filename.zst.manifest.json"
        echo "  \"originalFile\": \"$filename\"," >> "$filename.zst.manifest.json"
        echo "  \"compressionType\": \"zstd\"," >> "$filename.zst.manifest.json"
        echo "  \"chunks\": [" >> "$filename.zst.manifest.json"
        
        chunk_index=0
        for chunk in $filename.zst.chunk.*; do
            if [[ $chunk_index -gt 0 ]]; then
                echo "    \"$chunk\"," >> "$filename.zst.manifest.json"
            else
                echo "    \"$chunk\"," >> "$filename.zst.manifest.json"
            fi
            chunk_index=$((chunk_index + 1))
        done
        
        # Remove trailing comma and close JSON
        sed -i '' '$s/,$//' "$filename.zst.manifest.json"
        echo "  ]" >> "$filename.zst.manifest.json"
        echo "}" >> "$filename.zst.manifest.json"
        
        # Move to proper subdirectory
        mkdir -p "$subdir"
        mv $filename.zst.chunk.* "$subdir/"
        mv "$filename.zst.manifest.json" "$subdir/"
    else
        curl -L -o "$TEMP_DIR/$filename" "$url"
        
        echo "🗜️ Compressing $filename..."
        zstd -19 "$TEMP_DIR/$filename" -o "$TEMP_DIR/$filename.zst"
        rm "$TEMP_DIR/$filename"
        
        echo "✂️ Chunking $filename into 12MB pieces..."
        # Create chunks of 12MB (12 * 1024 * 1024 bytes)
        split -b 12582912 "$TEMP_DIR/$filename.zst" "$filename.zst.chunk."
        rm "$TEMP_DIR/$filename.zst"
        
        # Create manifest
        echo "{" > "$filename.zst.manifest.json"
        echo "  \"originalFile\": \"$filename\"," >> "$filename.zst.manifest.json"
        echo "  \"compressionType\": \"zstd\"," >> "$filename.zst.manifest.json"
        echo "  \"chunks\": [" >> "$filename.zst.manifest.json"
        
        chunk_index=0
        for chunk in $filename.zst.chunk.*; do
            if [[ $chunk_index -gt 0 ]]; then
                echo "    \"$chunk\"," >> "$filename.zst.manifest.json"
            else
                echo "    \"$chunk\"," >> "$filename.zst.manifest.json"
            fi
            chunk_index=$((chunk_index + 1))
        done
        
        # Remove trailing comma and close JSON
        sed -i '' '$s/,$//' "$filename.zst.manifest.json"
        echo "  ]" >> "$filename.zst.manifest.json"
        echo "}" >> "$filename.zst.manifest.json"
    fi
}

# Download and compress configuration files
echo "📄 Downloading configuration files..."
download_and_compress "config.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/config.json"
download_and_compress "tokenizer.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/tokenizer.json"
download_and_compress "generation_config.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/generation_config.json"
download_and_compress "normalizer.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/normalizer.json"
download_and_compress "added_tokens.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/added_tokens.json"
download_and_compress "merges.txt" "https://huggingface.co/onnx-community/whisper-base/resolve/main/merges.txt"
download_and_compress "preprocessor_config.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/preprocessor_config.json"
download_and_compress "special_tokens_map.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/special_tokens_map.json"
download_and_compress "tokenizer_config.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/tokenizer_config.json"
download_and_compress "vocab.json" "https://huggingface.co/onnx-community/whisper-base/resolve/main/vocab.json"

# Download and compress ONNX model files
echo "🧠 Downloading ONNX model files..."
echo "📥 Encoder model (~140MB)..."
download_and_compress "encoder_model.onnx" "https://huggingface.co/onnx-community/whisper-base/resolve/main/onnx/encoder_model.onnx" "onnx"

echo "📥 Decoder model (~420MB)..."
download_and_compress "decoder_model_merged_q4.onnx" "https://huggingface.co/onnx-community/whisper-base/resolve/main/onnx/decoder_model_merged_q4.onnx" "onnx"

# Create master manifest
echo "📋 Creating master manifest..."
echo "{" > "master-manifest.json"
echo "  \"model\": \"whisper-base\"," >> "master-manifest.json"
echo "  \"type\": \"onnx-community\"," >> "master-manifest.json"
echo "  \"compressionType\": \"zstd\"," >> "master-manifest.json"
echo "  \"chunkSize\": \"12MB\"," >> "master-manifest.json"
echo "  \"files\": [" >> "master-manifest.json"

# List all manifest files
find . -name "*.manifest.json" | grep -v master-manifest | sed 's|^\./||' | \
    while IFS= read -r manifest; do
        echo "    \"$manifest\"," >> "master-manifest.json"
    done

# Remove trailing comma and close JSON
sed -i '' '$s/,$//' "master-manifest.json"
echo "  ]" >> "master-manifest.json"
echo "}" >> "master-manifest.json"

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Whisper Base model download and compression complete!"
echo "📊 Total size: $(du -sh . | cut -f1)"
echo ""
echo "📁 Compressed files structure:"
find . -name "*.chunk.*" -o -name "*.manifest.json" | head -20
echo ""
echo "🗜️ All files are compressed with zstd and chunked into 12MB pieces"
echo "📋 Use master-manifest.json to reconstruct files"