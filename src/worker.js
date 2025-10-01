import { pipeline, WhisperTextStreamer } from "@huggingface/transformers";

console.log('Worker: Starting up...');

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
    static task = null;
    static model = null;
    static instance = null;

    constructor(tokenizer, model) {
        this.tokenizer = tokenizer;
        this.model = model;
    }

    static async getInstance(progress_callback = null) {
        console.log('Worker: Getting pipeline instance for model:', this.model);
        
        if (this.instance === null) {
            console.log('Worker: Creating new pipeline instance...');
            try {
                // Try WebGPU first, fallback to WASM if needed
                let device = "webgpu";
                
                // Check if WebGPU is available
                if (typeof navigator !== 'undefined' && !navigator.gpu) {
                    console.log('Worker: WebGPU not available, falling back to WASM');
                    device = "wasm";
                }
                
                this.instance = pipeline(this.task, this.model, {
                    dtype: {
                        encoder_model: "fp32", // Use fp32 for better compatibility
                        decoder_model_merged: "q4",
                    },
                    device: device,
                    progress_callback,
                });
                
                console.log('Worker: Pipeline created successfully with device:', device);
            } catch (error) {
                console.error('Worker: Failed to create pipeline:', error);
                // Try fallback to WASM if WebGPU fails
                if (device === "webgpu") {
                    console.log('Worker: Trying WASM fallback...');
                    this.instance = pipeline(this.task, this.model, {
                        dtype: {
                            encoder_model: "fp32",
                            decoder_model_merged: "q4",
                        },
                        device: "wasm",
                        progress_callback,
                    });
                } else {
                    throw error;
                }
            }
        }

        return this.instance;
    }
}

self.addEventListener("message", async (event) => {
    console.log('Worker: Received message:', event.data);
    const message = event.data;

    try {
        // Handle preload request
        if (message.type === 'preload') {
            console.log('Worker: Preloading model:', message.model);
            await preloadModel(message.model);
            return;
        }
        
        // Validate input for transcription
        if (!message.audio) {
            throw new Error('No audio data provided');
        }
        
        if (!message.audio.length || message.audio.length === 0) {
            throw new Error('Audio data is empty');
        }
        
        if (!(message.audio instanceof Float32Array)) {
            console.log('Worker: Audio data type:', typeof message.audio, message.audio.constructor.name);
            // Try to convert if it's an array
            if (Array.isArray(message.audio)) {
                message.audio = new Float32Array(message.audio);
                console.log('Worker: Converted array to Float32Array');
            } else {
                throw new Error('Audio data must be Float32Array or Array');
            }
        }
        
        console.log('Worker: Audio data length:', message.audio.length);
        console.log('Worker: Audio data type:', message.audio.constructor.name);
        console.log('Worker: Audio sample values (first 5):', Array.from(message.audio.slice(0, 5)));
        console.log('Worker: Model:', message.model);
        
        console.log('Worker: Starting transcription process...');
        
        let transcript = await transcribe(message);
        if (transcript === null) {
            console.error('Worker: Transcription returned null');
            self.postMessage({
                status: "error",
                data: { message: 'Transcription process returned null' },
            });
            return;
        }

        console.log('Worker: Transcription complete:', transcript);
        
        // Send the result back to the main thread
        self.postMessage({
            status: "complete",
            data: transcript,
        });
        
    } catch (error) {
        console.error('Worker: Error processing message:', error);
        self.postMessage({
            status: "error",
            data: { message: error.message || 'Unknown error' },
        });
    }
});

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
    static task = "automatic-speech-recognition";
    static model = null;
}

// Function to preload the model
const preloadModel = async (modelName) => {
    try {
        console.log('Worker: Starting model preload for:', modelName);
        
        const p = AutomaticSpeechRecognitionPipelineFactory;
        p.model = modelName;
        
        // This will download and initialize the model
        const pipeline = await p.getInstance((data) => {
            console.log('Worker: Preload progress:', data);
            // Format and forward progress to main thread
            if (data.status && data.file) {
                // This is a progress update from Transformers.js
                const progress = data.loaded && data.total ? data.loaded / data.total : 0;
                self.postMessage({
                    status: data.status,
                    file: data.file,
                    name: data.name || data.file,
                    progress: progress,
                    loaded: data.loaded || 0,
                    total: data.total || 0
                });
            } else {
                // Forward other messages as-is
                self.postMessage(data);
            }
        });
        
        console.log('Worker: Model preload completed successfully');
        
        // Signal that model is ready
        self.postMessage({
            status: "model_ready",
            message: "Model preloaded and ready for use"
        });
        
    } catch (error) {
        console.error('Worker: Model preload failed:', error);
        self.postMessage({
            status: "error",
            data: { message: `Model preload failed: ${error.message}` },
        });
    }
};

const transcribe = async ({ audio, model, subtask, language }) => {
    const isDistilWhisper = model.startsWith("distil-whisper/");

    const p = AutomaticSpeechRecognitionPipelineFactory;
    if (p.model !== model) {
        // Invalidate model if different
        p.model = model;

        if (p.instance !== null) {
            (await p.getInstance()).dispose();
            p.instance = null;
        }
    }

    // Load transcriber model with progress reporting
    console.log('Worker: Loading transcriber model...');
    const transcriber = await p.getInstance((data) => {
        console.log('Worker: Model loading progress:', data);
        // Format and forward progress to main thread
        if (data.status && data.file) {
            // This is a progress update from Transformers.js
            const progress = data.loaded && data.total ? data.loaded / data.total : 0;
            self.postMessage({
                status: data.status,
                file: data.file,
                name: data.name || data.file,
                progress: progress,
                loaded: data.loaded || 0,
                total: data.total || 0
            });
        } else {
            // Forward other messages as-is
            self.postMessage(data);
        }
    });
    
    console.log('Worker: Model loaded successfully, starting transcription...');
    self.postMessage({
        status: "ready",
        message: "Model loaded, starting transcription"
    });

    const time_precision =
        transcriber.processor.feature_extractor.config.chunk_length /
        transcriber.model.config.max_source_positions;

    // Storage for chunks to be processed. Initialise with an empty chunk.
    /** @type {{ text: string; offset: number, timestamp: [number, number | null] }[]} */
    const chunks = [];

    // TODO: Storage for fully-processed and merged chunks
    // let decoded_chunks = [];

    const chunk_length_s = isDistilWhisper ? 20 : 30;
    const stride_length_s = isDistilWhisper ? 3 : 5;

    let chunk_count = 0;
    let start_time;
    let num_tokens = 0;
    let tps;
    const streamer = new WhisperTextStreamer(transcriber.tokenizer, {
        time_precision,
        on_chunk_start: (x) => {
            const offset = (chunk_length_s - stride_length_s) * chunk_count;
            chunks.push({
                text: "",
                timestamp: [offset + x, null],
                finalised: false,
                offset,
            });
        },
        token_callback_function: (x) => {
            start_time ??= performance.now();
            if (num_tokens++ > 0) {
                tps = (num_tokens / (performance.now() - start_time)) * 1000;
            }
        },
        callback_function: (x) => {
            if (chunks.length === 0) return;
            // Append text to the last chunk
            chunks.at(-1).text += x;

            self.postMessage({
                status: "update",
                data: {
                    text: "", // No need to send full text yet
                    chunks,
                    tps,
                },
            });
        },
        on_chunk_end: (x) => {
            const current = chunks.at(-1);
            current.timestamp[1] = x + current.offset;
            current.finalised = true;
        },
        on_finalize: () => {
            start_time = null;
            num_tokens = 0;
            ++chunk_count;
        },
    });

    // Actually run transcription
    const output = await transcriber(audio, {
        // Greedy
        top_k: 0,
        do_sample: false,

        // Sliding window
        chunk_length_s,
        stride_length_s,

        // Language and task
        language,
        task: subtask,

        // Return timestamps
        return_timestamps: true,
        force_full_sequences: false,

        // Callback functions
        streamer, // after each generation step
    }).catch((error) => {
        console.error(error);
        self.postMessage({
            status: "error",
            data: error,
        });
        return null;
    });

    return {
        tps,
        ...output,
    };
};
