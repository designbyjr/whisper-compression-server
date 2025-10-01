// Model Persistence Manager
// Handles persistent storage of decompressed models with versioning

interface ModelMetadata {
    modelId: string;
    version: string;
    compressionType: 'lzma' | 'zstd';
    files: string[];
    totalSize: number;
    createdAt: number;
    lastAccessed: number;
}

interface StoredModel {
    fileName: string;
    modelId: string;
    data: number[]; // Uint8Array converted to regular array for IndexedDB
    size: number;
    createdAt: number;
}

class ModelPersistence {
    private dbName = 'whisper-model-persistence';
    private dbVersion = 2;
    private db: IDBDatabase | null = null;
    private currentModelId: string = '';
    private modelVersion: string = '1.0';

    constructor() {
        this.initDatabase();
    }

    // Initialize IndexedDB with proper schema
    private async initDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.error('IndexedDB not supported');
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('📚 Model persistence database initialized');
                this.cleanupOldVersions();
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('models')) {
                    const modelStore = db.createObjectStore('models', { keyPath: 'fileName' });
                    modelStore.createIndex('modelId', 'modelId', { unique: false });
                }

                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'modelId' });
                }

                console.log('📚 Database schema created/upgraded');
            };
        });
    }

    // Set current model ID (used for tracking which model is active)
    setCurrentModel(modelId: string, compressionType: 'lzma' | 'zstd' = 'lzma'): void {
        this.currentModelId = modelId;
        console.log(`🎯 Current model set to: ${modelId} (${compressionType})`);
    }

    // Check if model is already cached
    async isModelCached(modelId: string): Promise<boolean> {
        if (!this.db) return false;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(modelId);

            request.onsuccess = () => {
                const metadata = request.result as ModelMetadata;
                if (metadata) {
                    // Update last accessed time
                    this.updateLastAccessed(modelId);
                    console.log(`✅ Model ${modelId} found in cache (${metadata.files.length} files, ${(metadata.totalSize / 1024 / 1024).toFixed(1)}MB)`);
                    resolve(true);
                } else {
                    resolve(false);
                }
            };

            request.onerror = () => resolve(false);
        });
    }

    // Get cached model file
    async getCachedFile(fileName: string, modelId?: string): Promise<Uint8Array | null> {
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['models'], 'readonly');
            const store = transaction.objectStore('models');
            const request = store.get(fileName);

            request.onsuccess = () => {
                const result = request.result as StoredModel;
                if (result && (!modelId || result.modelId === modelId)) {
                    console.log(`📋 Serving ${fileName} from persistent cache (${(result.size / 1024 / 1024).toFixed(1)}MB)`);
                    resolve(new Uint8Array(result.data));
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => resolve(null);
        });
    }

    // Store model file persistently
    async storeModelFile(fileName: string, data: Uint8Array, modelId: string): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['models'], 'readwrite');
            const store = transaction.objectStore('models');
            
            const modelFile: StoredModel = {
                fileName: fileName,
                modelId: modelId,
                data: Array.from(data),
                size: data.length,
                createdAt: Date.now()
            };

            const request = store.put(modelFile);

            request.onsuccess = () => {
                console.log(`💾 Persistently stored ${fileName} (${(data.length / 1024 / 1024).toFixed(1)}MB)`);
                resolve();
            };

            request.onerror = () => {
                console.warn(`Failed to store ${fileName} persistently`);
                resolve();
            };
        });
    }

    // Store model metadata
    async storeModelMetadata(modelId: string, files: string[], compressionType: 'lzma' | 'zstd', totalSize: number): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            
            const metadata: ModelMetadata = {
                modelId: modelId,
                version: this.modelVersion,
                compressionType: compressionType,
                files: files,
                totalSize: totalSize,
                createdAt: Date.now(),
                lastAccessed: Date.now()
            };

            const request = store.put(metadata);

            request.onsuccess = () => {
                console.log(`📚 Model metadata stored for ${modelId}`);
                resolve();
            };

            request.onerror = () => {
                console.warn(`Failed to store metadata for ${modelId}`);
                resolve();
            };
        });
    }

    // Update last accessed time for a model
    private async updateLastAccessed(modelId: string): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            
            const getRequest = store.get(modelId);
            getRequest.onsuccess = () => {
                const metadata = getRequest.result as ModelMetadata;
                if (metadata) {
                    metadata.lastAccessed = Date.now();
                    store.put(metadata);
                }
                resolve();
            };

            getRequest.onerror = () => resolve();
        });
    }

    // Clear specific model from cache (used by model switcher)
    async clearModel(modelId: string): Promise<void> {
        if (!this.db) return;

        console.log(`🗑️ Clearing model ${modelId} from persistent cache...`);

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['models', 'metadata'], 'readwrite');
            const modelStore = transaction.objectStore('models');
            const metadataStore = transaction.objectStore('metadata');

            // Get model metadata to find all files
            const metadataRequest = metadataStore.get(modelId);
            metadataRequest.onsuccess = () => {
                const metadata = metadataRequest.result as ModelMetadata;
                
                if (metadata) {
                    // Delete all files for this model
                    const deletePromises = metadata.files.map(fileName => {
                        return new Promise<void>((fileResolve) => {
                            const deleteRequest = modelStore.delete(fileName);
                            deleteRequest.onsuccess = () => fileResolve();
                            deleteRequest.onerror = () => fileResolve();
                        });
                    });

                    Promise.all(deletePromises).then(() => {
                        // Delete metadata
                        const deleteMetaRequest = metadataStore.delete(modelId);
                        deleteMetaRequest.onsuccess = () => {
                            console.log(`✅ Model ${modelId} cleared from cache`);
                            resolve();
                        };
                        deleteMetaRequest.onerror = () => resolve();
                    });
                } else {
                    resolve();
                }
            };

            metadataRequest.onerror = () => resolve();
        });
    }

    // Clear all models from cache (used by cache flush)
    async clearAllModels(): Promise<void> {
        if (!this.db) return;

        console.log('🗑️ Clearing all models from persistent cache...');

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['models', 'metadata'], 'readwrite');
            
            const clearModels = transaction.objectStore('models').clear();
            const clearMetadata = transaction.objectStore('metadata').clear();

            let completed = 0;
            const checkComplete = () => {
                completed++;
                if (completed === 2) {
                    console.log('✅ All models cleared from persistent cache');
                    resolve();
                }
            };

            clearModels.onsuccess = checkComplete;
            clearModels.onerror = checkComplete;
            clearMetadata.onsuccess = checkComplete;
            clearMetadata.onerror = checkComplete;
        });
    }

    // Get cache statistics
    async getCacheStats(): Promise<{ models: number, totalSize: number, files: number }> {
        if (!this.db) return { models: 0, totalSize: 0, files: 0 };

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['metadata', 'models'], 'readonly');
            const metadataStore = transaction.objectStore('metadata');
            const modelStore = transaction.objectStore('models');

            let stats = { models: 0, totalSize: 0, files: 0 };

            // Count models and total size from metadata
            const metadataRequest = metadataStore.getAll();
            metadataRequest.onsuccess = () => {
                const metadata = metadataRequest.result as ModelMetadata[];
                stats.models = metadata.length;
                stats.totalSize = metadata.reduce((sum, m) => sum + m.totalSize, 0);

                // Count total files
                const filesRequest = modelStore.count();
                filesRequest.onsuccess = () => {
                    stats.files = filesRequest.result;
                    resolve(stats);
                };
                filesRequest.onerror = () => resolve(stats);
            };

            metadataRequest.onerror = () => resolve(stats);
        });
    }

    // Clean up old model versions (called during initialization)
    private async cleanupOldVersions(): Promise<void> {
        if (!this.db) return;

        console.log('🧹 Checking for old model versions to cleanup...');

        const transaction = this.db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.getAll();

        request.onsuccess = () => {
            const allMetadata = request.result as ModelMetadata[];
            const oldModels = allMetadata.filter(m => m.version !== this.modelVersion);
            
            if (oldModels.length > 0) {
                console.log(`🧹 Found ${oldModels.length} old model versions, clearing...`);
                
                // Clear old models
                oldModels.forEach(model => {
                    this.clearModel(model.modelId);
                });
            }
        };
    }

    // List all cached models
    async listCachedModels(): Promise<ModelMetadata[]> {
        if (!this.db) return [];

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.getAll();

            request.onsuccess = () => {
                const metadata = request.result as ModelMetadata[];
                resolve(metadata.sort((a, b) => b.lastAccessed - a.lastAccessed));
            };

            request.onerror = () => resolve([]);
        });
    }
}

export default ModelPersistence;