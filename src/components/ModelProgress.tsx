import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, Clock } from 'lucide-react';

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

interface ModelProgressProps {
    progressItems: ProgressItem[];
    isModelLoading: boolean;
    modelReady: boolean;
}

export const ModelProgress: React.FC<ModelProgressProps> = ({ 
    progressItems, 
    isModelLoading, 
    modelReady 
}) => {
    if (modelReady) {
        return null; // Don't show progress when model is ready
    }

    // Calculate overall progress with better handling
    const validItems = progressItems.filter(item => 
        typeof item.progress === 'number' && 
        !isNaN(item.progress) &&
        item.total > 0 &&
        item.progress >= 0 &&
        item.progress <= 1
    );
    
    const totalProgress = validItems.reduce((acc, item) => {
        const progress = Math.min(Math.max(item.progress || 0, 0), 1);
        return acc + progress;
    }, 0);
    
    const averageProgress = validItems.length > 0 ? totalProgress / validItems.length : 0;
    const progressPercentage = Math.min(Math.max(Math.round(averageProgress * 100), 0), 100);

    // Calculate total size
    const totalSize = validItems.reduce((acc, item) => acc + (item.total || 0), 0);
    const loadedSize = validItems.reduce((acc, item) => acc + (item.loaded || 0), 0);
    
    // Calculate average download speed
    const avgDownloadSpeed = validItems
        .filter(item => (item.downloadSpeed || 0) > 0)
        .reduce((acc, item) => acc + (item.downloadSpeed || 0), 0) / Math.max(validItems.length, 1);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatSpeed = (mbps: number): string => {
        if (mbps < 0.1) return '0 MB/s';
        if (mbps < 1) return `${(mbps * 1024).toFixed(0)} KB/s`;
        return `${mbps.toFixed(1)} MB/s`;
    };

    const formatTime = (seconds: number): string => {
        if (!seconds || seconds === Infinity) return '--';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    };

    if (!isModelLoading && progressItems.length === 0) {
        return (
            <div className="w-full max-w-lg mx-auto mb-6">
                <div className="text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Preparing Whisper model...
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg mx-auto mb-6">
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
                {/* Main Progress Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Download className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                Loading Whisper Model
                            </span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                            <div className="font-mono text-lg text-foreground">{progressPercentage}%</div>
                            {avgDownloadSpeed > 0 && (
                                <div className="flex items-center gap-1">
                                    <span>{formatSpeed(avgDownloadSpeed)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Main Progress Bar using shadcn Progress */}
                    <Progress 
                        value={progressPercentage} 
                        className="h-3"
                    />
                    
                    {/* Size and Speed Info */}
                    {totalSize > 0 && (
                        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                            <span>{formatBytes(loadedSize)} / {formatBytes(totalSize)}</span>
                            {validItems.length > 0 && avgDownloadSpeed > 0 && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                        {formatTime(validItems[0]?.timeRemaining || 0)} remaining
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Individual File Progress */}
                {validItems.length > 0 && (
                    <div className="space-y-3">
                        {validItems.map((item, index) => {
                            const fileProgress = Math.min(Math.max(Math.round((item.progress || 0) * 100), 0), 100);
                            const fileName = item.name || `File ${index + 1}`;
                            
                            return (
                                <div key={item.file} className="space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-foreground truncate pr-2">
                                            {fileName}
                                        </span>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <span className="font-mono">{fileProgress}%</span>
                                            {(item.downloadSpeed || 0) > 0 && (
                                                <span>{formatSpeed(item.downloadSpeed || 0)}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <Progress 
                                        value={fileProgress} 
                                        className="h-2"
                                    />
                                    
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{formatBytes(item.loaded)} / {formatBytes(item.total)}</span>
                                        {(item.timeRemaining || 0) > 0 && (
                                            <span>{formatTime(item.timeRemaining || 0)} left</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Loading Animation */}
                {isModelLoading && (
                    <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        <span>Downloading model files...</span>
                        {validItems.length > 0 && (
                            <span className="ml-2">({validItems.length} file{validItems.length !== 1 ? 's' : ''})</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
