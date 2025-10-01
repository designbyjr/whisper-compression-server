#!/bin/bash

# Download Whisper Small Model Files
echo "🔄 Downloading Whisper Small model files..."
echo "📊 This model is larger (~200MB) but provides better accuracy than Tiny"

# Create models directory
mkdir -p public/models-small/onnx

cd public/models-small

# Download model configuration files
echo "📄 Downloading configuration files..."
curl -L -o config.json https://huggingface.co/onnx-community/whisper-small/resolve/main/config.json
curl -L -o tokenizer.json https://huggingface.co/onnx-community/whisper-small/resolve/main/tokenizer.json
curl -L -o generation_config.json https://huggingface.co/onnx-community/whisper-small/resolve/main/generation_config.json
curl -L -o normalizer.json https://huggingface.co/onnx-community/whisper-small/resolve/main/normalizer.json
curl -L -o added_tokens.json https://huggingface.co/onnx-community/whisper-small/resolve/main/added_tokens.json
curl -L -o merges.txt https://huggingface.co/onnx-community/whisper-small/resolve/main/merges.txt

# Download additional config files for Small model
curl -L -o preprocessor_config.json https://huggingface.co/onnx-community/whisper-small/resolve/main/preprocessor_config.json
curl -L -o special_tokens_map.json https://huggingface.co/onnx-community/whisper-small/resolve/main/special_tokens_map.json
curl -L -o tokenizer_config.json https://huggingface.co/onnx-community/whisper-small/resolve/main/tokenizer_config.json
curl -L -o vocab.json https://huggingface.co/onnx-community/whisper-small/resolve/main/vocab.json

# Download ONNX model files (these are larger)
echo "🧠 Downloading ONNX model files (this will take a few minutes)..."
echo "📥 Encoder model (~60MB)..."
curl -L -o onnx/encoder_model.onnx https://huggingface.co/onnx-community/whisper-small/resolve/main/onnx/encoder_model.onnx

echo "📥 Decoder model (~140MB)..."
curl -L -o onnx/decoder_model_merged_q4.onnx https://huggingface.co/onnx-community/whisper-small/resolve/main/onnx/decoder_model_merged_q4.onnx

# Check if quantize_config exists (optional)
echo "📄 Downloading quantization config..."
curl -L -o quantize_config.json https://huggingface.co/onnx-community/whisper-small/resolve/main/quantize_config.json

echo "✅ Whisper Small model download complete!"
echo "📊 Total size: $(du -sh . | cut -f1)"
echo ""
echo "📁 Files downloaded:"
ls -la
echo ""
echo "🧠 ONNX model files:"
ls -la onnx/

echo ""
echo "🆚 Model Comparison:"
echo "   • Whisper Tiny:  ~40M parameters,  ~117MB, faster"
echo "   • Whisper Small: ~244M parameters, ~200MB, better accuracy"
echo ""
echo "🚀 To use this model, the app is already configured for whisper-small"