import { useEffect, useRef, useCallback } from 'react';

export function useWorker(onMessageReceived: (event: MessageEvent) => void) {
    const workerRef = useRef<Worker | null>(null);
    const messageHandlerRef = useRef(onMessageReceived);
    
    // Update the message handler ref when the callback changes
    useEffect(() => {
        messageHandlerRef.current = onMessageReceived;
    }, [onMessageReceived]);

    useEffect(() => {
        // Create worker only once
        if (!workerRef.current) {
            console.log('Creating new worker...');
            workerRef.current = new Worker(
                new URL('../worker.js', import.meta.url),
                { type: 'module' }
            );

            // Set up message handler that uses the ref
            workerRef.current.onmessage = (event) => {
                messageHandlerRef.current(event);
            };

            // Set up error handler
            workerRef.current.onerror = (error) => {
                console.error('Worker error:', error);
            };
        }

        // Cleanup function
        return () => {
            if (workerRef.current) {
                console.log('Terminating worker...');
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []); // Empty dependency array - create worker only once

    return {
        postMessage: (message: any) => {
            if (workerRef.current) {
                workerRef.current.postMessage(message);
            }
        }
    };
}