/**
 * Browser Storage Research and Optimization for Transformers.js
 * 
 * This module researches and implements optimal storage strategies for
 * decompressed model files to ensure fastest access by Transformers.js
 */

// Storage options for model files
export enum StorageType {
  MEMORY_BLOB = 'memory_blob',      // In-memory Blob URLs (fastest access)
  CACHE_API = 'cache_api',          // Browser Cache API (persistent)
  INDEXEDDB = 'indexeddb',          // IndexedDB (structured persistent)
  OPFS = 'opfs'                     // Origin Private File System (fastest persistent)
}

export interface StorageMetrics {
  storageType: StorageType;
  writeTime: number;      // ms to store
  readTime: number;       // ms to retrieve
  memoryUsage: number;    // estimated bytes
  persistent: boolean;    // survives page reload
  supported: boolean;     // browser support
}

/**
 * Test storage performance for a given data blob
 */
export class StoragePerformanceTester {
  private testData: Blob;
  private testKey = 'transformers_storage_test';

  constructor(testDataSize = 10 * 1024 * 1024) { // 10MB test by default
    // Create test data similar to model files
    const buffer = new ArrayBuffer(testDataSize);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }
    this.testData = new Blob([buffer], { type: 'application/octet-stream' });
  }

  /**
   * Test Memory Blob URLs
   * Fastest access but not persistent, uses browser memory
   */
  async testMemoryBlob(): Promise<StorageMetrics> {
    const startWrite = performance.now();
    
    // Create blob URL
    const blobUrl = URL.createObjectURL(this.testData);
    const writeTime = performance.now() - startWrite;

    // Test read access
    const startRead = performance.now();
    const response = await fetch(blobUrl);
    const retrievedBlob = await response.blob();
    const readTime = performance.now() - startRead;

    // Cleanup
    URL.revokeObjectURL(blobUrl);

    return {
      storageType: StorageType.MEMORY_BLOB,
      writeTime,
      readTime,
      memoryUsage: this.testData.size,
      persistent: false,
      supported: true
    };
  }

  /**
   * Test Cache API
   * Good balance of performance and persistence
   */
  async testCacheApi(): Promise<StorageMetrics> {
    if (!('caches' in window)) {
      return this.unsupportedResult(StorageType.CACHE_API);
    }

    try {
      const cache = await caches.open('transformers-models');
      const testUrl = `https://models.local/${this.testKey}`;
      
      const startWrite = performance.now();
      const response = new Response(this.testData, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      await cache.put(testUrl, response);
      const writeTime = performance.now() - startWrite;

      // Test read
      const startRead = performance.now();
      const cachedResponse = await cache.match(testUrl);
      if (cachedResponse) {
        const retrievedBlob = await cachedResponse.blob();
        const readTime = performance.now() - startRead;

        // Cleanup
        await cache.delete(testUrl);

        return {
          storageType: StorageType.CACHE_API,
          writeTime,
          readTime,
          memoryUsage: 0, // Stored on disk
          persistent: true,
          supported: true
        };
      }
    } catch (error) {
      console.warn('Cache API test failed:', error);
    }

    return this.unsupportedResult(StorageType.CACHE_API);
  }

  /**
   * Test IndexedDB
   * Structured storage, good for metadata but slower for large blobs
   */
  async testIndexedDB(): Promise<StorageMetrics> {
    if (!('indexedDB' in window)) {
      return this.unsupportedResult(StorageType.INDEXEDDB);
    }

    return new Promise((resolve) => {
      const request = indexedDB.open('TransformersModels', 1);
      
      request.onerror = () => {
        resolve(this.unsupportedResult(StorageType.INDEXEDDB));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };

      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          // Test write
          const startWrite = performance.now();
          const transaction = db.transaction(['models'], 'readwrite');
          const store = transaction.objectStore('models');
          await new Promise<void>((resolve, reject) => {
            const putRequest = store.put(this.testData, this.testKey);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });
          const writeTime = performance.now() - startWrite;

          // Test read
          const startRead = performance.now();
          const readTransaction = db.transaction(['models'], 'readonly');
          const readStore = readTransaction.objectStore('models');
          const retrievedBlob = await new Promise<Blob>((resolve, reject) => {
            const getRequest = readStore.get(this.testKey);
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
          });
          const readTime = performance.now() - startRead;

          // Cleanup
          const deleteTransaction = db.transaction(['models'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('models');
          deleteStore.delete(this.testKey);

          db.close();

          resolve({
            storageType: StorageType.INDEXEDDB,
            writeTime,
            readTime,
            memoryUsage: 0, // Stored on disk
            persistent: true,
            supported: true
          });

        } catch (error) {
          console.warn('IndexedDB test failed:', error);
          db.close();
          resolve(this.unsupportedResult(StorageType.INDEXEDDB));
        }
      };
    });
  }

  /**
   * Test Origin Private File System (OPFS)
   * Newest and potentially fastest persistent storage
   */
  async testOPFS(): Promise<StorageMetrics> {
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
      return this.unsupportedResult(StorageType.OPFS);
    }

    try {
      const opfsRoot = await navigator.storage.getDirectory();
      
      // Test write
      const startWrite = performance.now();
      const fileHandle = await opfsRoot.getFileHandle(`${this.testKey}.bin`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(this.testData);
      await writable.close();
      const writeTime = performance.now() - startWrite;

      // Test read
      const startRead = performance.now();
      const file = await fileHandle.getFile();
      const retrievedBlob = new Blob([await file.arrayBuffer()]);
      const readTime = performance.now() - startRead;

      // Cleanup
      await opfsRoot.removeEntry(`${this.testKey}.bin`);

      return {
        storageType: StorageType.OPFS,
        writeTime,
        readTime,
        memoryUsage: 0, // Stored on disk
        persistent: true,
        supported: true
      };

    } catch (error) {
      console.warn('OPFS test failed:', error);
      return this.unsupportedResult(StorageType.OPFS);
    }
  }

  private unsupportedResult(type: StorageType): StorageMetrics {
    return {
      storageType: type,
      writeTime: Infinity,
      readTime: Infinity,
      memoryUsage: 0,
      persistent: false,
      supported: false
    };
  }

  /**
   * Run all storage tests and return results
   */
  async benchmarkAllStorage(): Promise<StorageMetrics[]> {
    console.log('🔬 Running browser storage benchmarks...');
    
    const results: StorageMetrics[] = [];
    
    try {
      results.push(await this.testMemoryBlob());
      console.log('✅ Memory Blob test complete');
    } catch (error) {
      console.warn('Memory Blob test failed:', error);
    }

    try {
      results.push(await this.testCacheApi());
      console.log('✅ Cache API test complete');
    } catch (error) {
      console.warn('Cache API test failed:', error);
    }

    try {
      results.push(await this.testIndexedDB());
      console.log('✅ IndexedDB test complete');
    } catch (error) {
      console.warn('IndexedDB test failed:', error);
    }

    try {
      results.push(await this.testOPFS());
      console.log('✅ OPFS test complete');
    } catch (error) {
      console.warn('OPFS test failed:', error);
    }

    return results;
  }
}

/**
 * Model File Storage Manager
 * Handles storage and retrieval of decompressed model files
 */
export class ModelFileStorage {
  private storageType: StorageType;
  private cacheName = 'whisper-models-v1';

  constructor(preferredType: StorageType = StorageType.CACHE_API) {
    this.storageType = preferredType;
  }

  /**
   * Store a decompressed model file
   */
  async storeModelFile(path: string, data: Blob): Promise<string> {
    switch (this.storageType) {
      case StorageType.MEMORY_BLOB:
        return this.storeInMemory(data);
      
      case StorageType.CACHE_API:
        return this.storeInCache(path, data);
      
      case StorageType.INDEXEDDB:
        return this.storeInIndexedDB(path, data);
      
      case StorageType.OPFS:
        return this.storeInOPFS(path, data);
      
      default:
        throw new Error(`Unsupported storage type: ${this.storageType}`);
    }
  }

  private async storeInMemory(data: Blob): Promise<string> {
    return URL.createObjectURL(data);
  }

  private async storeInCache(path: string, data: Blob): Promise<string> {
    const cache = await caches.open(this.cacheName);
    const url = `https://models.local/${path}`;
    const response = new Response(data, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    await cache.put(url, response);
    return url;
  }

  private async storeInIndexedDB(path: string, data: Blob): Promise<string> {
    // Implementation for IndexedDB storage
    // Returns a custom protocol URL that can be resolved later
    return `idb://models/${path}`;
  }

  private async storeInOPFS(path: string, data: Blob): Promise<string> {
    // Implementation for OPFS storage
    // Returns a custom protocol URL that can be resolved later
    return `opfs://models/${path}`;
  }

  /**
   * Retrieve a stored model file
   */
  async retrieveModelFile(url: string): Promise<Blob> {
    if (url.startsWith('blob:')) {
      const response = await fetch(url);
      return response.blob();
    }
    
    if (url.startsWith('https://models.local/')) {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(url);
      if (!response) throw new Error(`Model file not found in cache: ${url}`);
      return response.blob();
    }
    
    // Handle other storage types...
    throw new Error(`Unsupported URL format: ${url}`);
  }

  /**
   * Clean up stored files
   */
  async cleanup(): Promise<void> {
    switch (this.storageType) {
      case StorageType.CACHE_API:
        await caches.delete(this.cacheName);
        break;
      // Add cleanup for other storage types
    }
  }
}

/**
 * Determine optimal storage type based on browser capabilities and requirements
 */
export async function determineOptimalStorage(): Promise<{
  recommended: StorageType;
  fallbacks: StorageType[];
  benchmarks: StorageMetrics[];
}> {
  const tester = new StoragePerformanceTester(5 * 1024 * 1024); // 5MB test
  const benchmarks = await tester.benchmarkAllStorage();
  
  // Filter supported options
  const supported = benchmarks.filter(b => b.supported);
  
  // Sort by performance (read time is most important for Transformers.js)
  supported.sort((a, b) => a.readTime - b.readTime);
  
  const recommended = supported.length > 0 ? supported[0].storageType : StorageType.MEMORY_BLOB;
  const fallbacks = supported.slice(1).map(b => b.storageType);
  
  return {
    recommended,
    fallbacks,
    benchmarks
  };
}