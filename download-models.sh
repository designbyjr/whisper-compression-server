#!/bin/bash

# Download Whisper Tiny Model Files
echo "Downloading Whisper Tiny model files..."

# Create models directory
mkdir -p public/models/onnx

cd public/models

# Download model configuration files
echo "Downloading configuration files..."
curl -L -o config.json https://huggingface.co/onnx-community/whisper-tiny/resolve/main/config.json
curl -L -o tokenizer.json https://huggingface.co/onnx-community/whisper-tiny/resolve/main/tokenizer.json
curl -L -o generation_config.json https://huggingface.co/onnx-community/whisper-tiny/resolve/main/generation_config.json
curl -L -o normalizer.json https://huggingface.co/onnx-community/whisper-tiny/resolve/main/normalizer.json
curl -L -o added_tokens.json https://huggingface.co/onnx-community/whisper-tiny/resolve/main/added_tokens.json
curl -L -o merges.txt https://huggingface.co/onnx-community/whisper-tiny/resolve/main/merges.txt

# Download ONNX model files
echo "Downloading ONNX model files (this may take a few minutes)..."
curl -L -o onnx/encoder_model.onnx https://huggingface.co/onnx-community/whisper-tiny/resolve/main/onnx/encoder_model.onnx
curl -L -o onnx/decoder_model_merged_q4.onnx https://huggingface.co/onnx-community/whisper-tiny/resolve/main/onnx/decoder_model_merged_q4.onnx

echo "Model download complete!"
echo "Total size: $(du -sh . | cut -f1)"
echo "Files downloaded:"
ls -la
ls -la onnx/