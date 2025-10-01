// LZMA Decompression Service for Client-side Model Loading
// Handles downloading compressed chunks, decompressing, and caching

import { LZMA } from 'lzma-js';
import ModelPersistence from './ModelPersistence';

interface ChunkManifest {
    originalFile: string;
    compressionType: string;
    chunks: string[];
}

interface ModelCache {
    [fileName: string]: Uint8Array;
}

class LzmaDecompressor {
    private cache: ModelCache = {};
    private baseUrl: string;
    private persistence: ModelPersistence;
    private modelId: string = '';

    constructor(baseUrl: string, modelId: string = 'whisper-small') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.modelId = modelId;
        this.persistence = new ModelPersistence();
        this.persistence.setCurrentModel(modelId, 'lzma');
    }

    // Check if model is fully cached
    async isModelCached(): Promise<boolean> {
        return await this.persistence.isModelCached(this.modelId);
    }

    // Download and decompress a single file
    async decompressFile(fileName: string, onProgress?: (progress: number) => void): Promise<Uint8Array> {
        // Check memory cache first
        if (this.cache[fileName]) {
            console.log(`📋 Serving ${fileName} from memory cache`);
            return this.cache[fileName];
        }

        // Check persistent cache
        const cached = await this.persistence.getCachedFile(fileName, this.modelId);
        if (cached) {
            this.cache[fileName] = cached; // Also store in memory for faster access
            return cached;
        }

        console.log(`🗜️ Downloading and decompressing ${fileName}...`);

        try {
            // Download manifest
            const manifestUrl = `${this.baseUrl}/${fileName}.xz.manifest.json`;
            const manifestResponse = await fetch(manifestUrl);
            if (!manifestResponse.ok) {
                throw new Error(`Failed to fetch manifest: ${manifestResponse.statusText}`);
            }
            
            const manifest: ChunkManifest = await manifestResponse.json();
            console.log(`📋 Manifest loaded: ${manifest.chunks.length} chunks for ${manifest.originalFile}`);

            // Download all chunks
            const chunkPromises = manifest.chunks.map(async (chunkName, index) => {
                const chunkUrl = `${this.baseUrl}/${chunkName}`;
                const response = await fetch(chunkUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch chunk ${index}: ${response.statusText}`);
                }
                return new Uint8Array(await response.arrayBuffer());
            });

            const chunks = await Promise.all(chunkPromises);
            
            // Combine chunks
            const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const combinedData = new Uint8Array(totalSize);
            let offset = 0;
            
            for (const chunk of chunks) {
                combinedData.set(chunk, offset);
                offset += chunk.length;
            }

            console.log(`📦 Combined ${chunks.length} chunks (${(totalSize / 1024 / 1024).toFixed(1)}MB compressed)`);

            // Decompress using LZMA
            console.log(`🗜️ Decompressing ${fileName}...`);
            const decompressed = LZMA.decompress(Array.from(combinedData));
            const decompressedData = new Uint8Array(decompressed);

            console.log(`✅ Decompressed ${fileName}: ${(combinedData.length / 1024 / 1024).toFixed(1)}MB → ${(decompressedData.length / 1024 / 1024).toFixed(1)}MB`);

            // Cache the decompressed data in memory and persistent storage
            this.cache[fileName] = decompressedData;
            await this.persistence.storeModelFile(fileName, decompressedData, this.modelId);

            if (onProgress) {
                onProgress(1.0);
            }

            return decompressedData;

        } catch (error) {
            console.error(`Error decompressing ${fileName}:`, error);
            throw error;
        }
    }

    // Create a blob URL for the decompressed file (for Transformers.js)
    async createBlobUrl(fileName: string, mimeType: string = 'application/octet-stream'): Promise<string> {
        const data = await this.decompressFile(fileName);
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        console.log(`🔗 Created blob URL for ${fileName}: ${url}`);
        return url;
    }

    // Preload multiple files (for model preloading)
    async preloadFiles(fileNames: string[], onProgress?: (fileName: string, progress: number) => void): Promise<void> {
        console.log(`🚀 Preloading ${fileNames.length} files...`);
        
        const promises = fileNames.map(async (fileName) => {
            try {
                await this.decompressFile(fileName, (progress) => {
                    if (onProgress) {
                        onProgress(fileName, progress);
                    }
                });
            } catch (error) {
                console.error(`Failed to preload ${fileName}:`, error);
            }
        });

        await Promise.all(promises);
        console.log(`✅ Preloading complete`);
    }

    // Get cache size info
    getCacheInfo(): { memoryFiles: number, memorySize: number } {
        const files = Object.keys(this.cache).length;
        const size = Object.values(this.cache).reduce((sum, data) => sum + data.length, 0);
        
        return {
            memoryFiles: files,
            memorySize: size
        };
    }

    // Clear cache
    async clearCache(): Promise<void> {
        // Clear memory cache
        this.cache = {};

        // Clear IndexedDB
        if (this.useIndexedDB && this.db) {
            return new Promise((resolve) => {
                const transaction = this.db!.transaction(['models'], 'readwrite');
                const store = transaction.objectStore('models');
                const request = store.clear();

                request.onsuccess = () => {
                    console.log('🗑️ Cache cleared');
                    resolve();
                };

                request.onerror = () => {
                    console.warn('Failed to clear IndexedDB cache');
                    resolve();
                };
            });
        }
    }
}

export default LzmaDecompressor;