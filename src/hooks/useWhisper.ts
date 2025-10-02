import { useCallback, useEffect, useRef, useState } from "react";
import { getPreferredWhisperModelUrl } from "@/config/whisper";
import { useWorker } from "./useWorker";

// Check if device is mobile/tablet for model selection
function mobileTabletCheck() {
    let check = false;
    (function (a: string) {
        if (
            /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
                a,
            ) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
                a.slice(0, 4),
            )
        )
            check = true;
    })(
        navigator.userAgent ||
            navigator.vendor ||
            ("opera" in window && typeof window.opera === "string"
                ? window.opera
                : ""),
    );
    return check;
}

const isMobileOrTablet = mobileTabletCheck();
// Model configuration - using Whisper Small for better accuracy
const ONLINE_MODEL = "onnx-community/whisper-small";
const LOCAL_MODEL = "http://localhost:3001/onnx-community/whisper-small";

// Determine the preferred model location.
// Falls back to the CDN when not running on localhost or when explicitly configured via env vars.
const DEFAULT_MODEL = getPreferredWhisperModelUrl();

interface ProgressItem {
    file: string;
    loaded: number;
    progress: number;
    total: number;
    name: string;
    status: string;
    downloadSpeed?: number; // MB/s
    timeRemaining?: number; // seconds
    startTime?: number; // timestamp
}

interface TranscriberUpdateData {
    data: {
        text: string;
        chunks: { text: string; timestamp: [number, number | null] }[];
        tps: number;
    };
}

export interface TranscriberData {
    isBusy: boolean;
    tps?: number;
    text: string;
    chunks: { text: string; timestamp: [number, number | null] }[];
}

interface UseWhisperReturn {
  transcribe: (audioBlob: Blob) => Promise<TranscriberData | null>;
  isTranscribing: boolean;
  error: string | null;
  isModelLoading: boolean;
  modelReady: boolean;
  progressItems: ProgressItem[];
  resetState: () => void;
}

export const useWhisper = (): UseWhisperReturn => {
    const [transcript, setTranscript] = useState<TranscriberData | undefined>(
        undefined,
    );
    const [isBusy, setIsBusy] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(true); // Start with model loading
    const [modelReady, setModelReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

    const webWorker = useWorker((event) => {
        const message = event.data;
        console.log('Main thread received worker message:', message);
        
        // Update the state with the result
        switch (message.status) {
            case "progress":
                // Model file progress: update one of the progress items with speed calculation
                setProgressItems((prev) =>
                    prev.map((item) => {
                        if (item.file === message.file) {
                            const now = Date.now();
                            const elapsed = item.startTime ? (now - item.startTime) / 1000 : 0; // seconds
                            const loadedMB = (message.loaded || 0) / (1024 * 1024);
                            const totalMB = Math.max((message.total || 1), 1) / (1024 * 1024); // Ensure total is at least 1
                            const downloadSpeed = elapsed > 1 ? loadedMB / elapsed : 0; // Only calculate after 1 second
                            const remainingMB = Math.max(totalMB - loadedMB, 0);
                            const timeRemaining = downloadSpeed > 0 ? remainingMB / downloadSpeed : 0;
                            
                            // Ensure progress is between 0 and 1
                            const normalizedProgress = Math.min(Math.max(message.progress || 0, 0), 1);
                            
                            return { 
                                ...item, 
                                progress: normalizedProgress,
                                loaded: message.loaded || 0,
                                total: Math.max(message.total || 1, 1),
                                downloadSpeed,
                                timeRemaining
                            };
                        }
                        return item;
                    }),
                );
                break;
            case "update":
            case "complete":
                const busy = message.status === "update";
                const updateMessage = message as TranscriberUpdateData;
                setTranscript({
                    isBusy: busy,
                    text: updateMessage.data.text,
                    tps: updateMessage.data.tps,
                    chunks: updateMessage.data.chunks,
                });
                setIsBusy(busy);
                break;

            case "initiate":
                // Model file start load: add a new progress item to the list.
                console.log('Model loading initiated:', message.name);
                setIsModelLoading(true);
                setProgressItems((prev) => [...prev, { ...message, startTime: Date.now() }]);
                break;
            case "ready":
                console.log('Model is ready for transcription');
                if (message.message === "Model loaded, starting transcription") {
                    // This is from actual transcription, don't change modelReady
                } else {
                    // This is from preloading
                    setModelReady(true);
                    setTimeout(() => {
                        setIsModelLoading(false);
                    }, 100);
                }
                break;
            case "model_ready":
                console.log('Model preloading complete');
                // Set model ready first to hide progress component
                setModelReady(true);
                // Then clear loading state and progress items
                setTimeout(() => {
                    setIsModelLoading(false);
                    setProgressItems([]);
                }, 100); // Small delay to ensure smooth transition
                break;
            case "error":
                setIsBusy(false);
                setIsModelLoading(false);
                setError(`An error occurred: "${message.data.message}". Please check console for details.`);
                break;
            case "done":
                // Model file loaded: remove the progress item from the list.
                setProgressItems((prev) =>
                    prev.filter((item) => item.file !== message.file),
                );
                break;

            default:
                // initiate/download/done
                break;
        }
    });

    // Store resolve function for current transcription
    const currentResolveRef = useRef<((value: string) => void) | null>(null);
    
    // Preload model on component mount (only once)
    const hasPreloaded = useRef(false);
    
    useEffect(() => {
        if (!hasPreloaded.current) {
            console.log('Starting model preload with:', DEFAULT_MODEL);
            hasPreloaded.current = true;
            webWorker.postMessage({
                type: 'preload',
                model: DEFAULT_MODEL
            });
        }
    }, []); // Empty dependency array - run only once

    // Watch for transcript updates to resolve promises
    useEffect(() => {
        if (transcript && !transcript.isBusy && currentResolveRef.current) {
            const resolve = currentResolveRef.current;
            currentResolveRef.current = null;
            setIsBusy(false); // Ensure we stop the busy state
            resolve(transcript);
        }
    }, [transcript]);

    const transcribe = useCallback(async (audioBlob: Blob): Promise<TranscriberData | null> => {
        try {
            if (!modelReady) {
                throw new Error('Model is not ready yet. Please wait for the model to load.');
            }
            
            setError(null);
            setTranscript(undefined);
            setIsBusy(true);

            console.log('Starting transcription...');
            
            // Convert blob to array buffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            console.log('Audio blob size:', arrayBuffer.byteLength, 'bytes');
            
            if (arrayBuffer.byteLength === 0) {
                throw new Error('Audio blob is empty');
            }
            
            // Create audio context and decode
            const audioContext = new AudioContext();
            let audioBuffer;
            
            try {
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            } catch (decodeError) {
                console.error('Failed to decode audio data:', decodeError);
                throw new Error('Failed to decode audio. The recording format may not be supported.');
            }
            
            console.log(`Original audio: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`);
            
            // Whisper requires 16kHz sample rate
            const targetSampleRate = 16000;
            let processedAudio: Float32Array;
            
            // Get mono audio data (convert stereo to mono if needed)
            let monoAudio: Float32Array;
            if (audioBuffer.numberOfChannels === 2) {
                const SCALING_FACTOR = Math.sqrt(2);
                const left = audioBuffer.getChannelData(0);
                const right = audioBuffer.getChannelData(1);
                monoAudio = new Float32Array(left.length);
                for (let i = 0; i < audioBuffer.length; ++i) {
                    monoAudio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
                }
            } else {
                // If the audio is mono, just use the first channel:
                monoAudio = audioBuffer.getChannelData(0);
            }
            
            // Resample to 16kHz if necessary
            if (audioBuffer.sampleRate !== targetSampleRate) {
                console.log(`Resampling from ${audioBuffer.sampleRate}Hz to ${targetSampleRate}Hz`);
                
                // Simple linear interpolation resampling
                const ratio = audioBuffer.sampleRate / targetSampleRate;
                const newLength = Math.round(monoAudio.length / ratio);
                processedAudio = new Float32Array(newLength);
                
                for (let i = 0; i < newLength; i++) {
                    const srcIndex = i * ratio;
                    const srcIndexFloor = Math.floor(srcIndex);
                    const srcIndexCeil = Math.min(srcIndexFloor + 1, monoAudio.length - 1);
                    const fraction = srcIndex - srcIndexFloor;
                    
                    processedAudio[i] = monoAudio[srcIndexFloor] * (1 - fraction) + monoAudio[srcIndexCeil] * fraction;
                }
                
                console.log(`Resampled audio: ${processedAudio.length} samples at ${targetSampleRate}Hz`);
            } else {
                processedAudio = monoAudio;
                console.log('Audio already at 16kHz, no resampling needed');
            }
            
            console.log('Final audio data:', {
                length: processedAudio.length,
                duration: processedAudio.length / targetSampleRate,
                sampleRate: targetSampleRate,
                firstValues: Array.from(processedAudio.slice(0, 10))
            });

            // Close audio context
            await audioContext.close();

            // Return promise that resolves when transcription is complete
            return new Promise<TranscriberData | null>((resolve, reject) => {
                currentResolveRef.current = resolve;
                
                // Send to worker for transcription
                webWorker.postMessage({
                    audio: processedAudio,
                    model: DEFAULT_MODEL,
                    multilingual: false,
                    subtask: null,
                    language: null,
                });
                
                // Set timeout in case something goes wrong
                setTimeout(() => {
                    if (currentResolveRef.current === resolve) {
                        currentResolveRef.current = null;
                        setIsBusy(false);
                        reject(new Error('Transcription timeout - model may still be downloading'));
                    }
                }, 120000); // 2 minute timeout for first-time model download
            });
            
        } catch (err: any) {
            console.error('Transcription failed:', err);
            setError(`Transcription failed: ${err.message || err}`);
            setIsBusy(false);
            currentResolveRef.current = null;
            return null;
        }
    }, [webWorker, modelReady]);

    const resetState = useCallback(() => {
        console.log('Resetting transcription state');
        setTranscript(undefined);
        setIsBusy(false);
        setError(null);
        currentResolveRef.current = null;
    }, []);

    return {
        transcribe,
        isTranscribing: isBusy,
        error,
        isModelLoading,
        modelReady,
        progressItems,
        resetState,
    };
};
