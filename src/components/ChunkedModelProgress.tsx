import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Download, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Zap,
  HardDrive,
  Wifi,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  OverallProgress, 
  ChunkDownloadProgress, 
  formatBytes, 
  formatTime 
} from '../utils/chunkDownloader';

interface ChunkedModelProgressProps {
  progress: OverallProgress;
  isVisible: boolean;
}

export const ChunkedModelProgress: React.FC<ChunkedModelProgressProps> = ({ 
  progress, 
  isVisible 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!isVisible) return null;

  const overallProgressPercent = progress.totalBytes > 0 
    ? Math.round((progress.downloadedBytes / progress.totalBytes) * 100)
    : 0;

  const completionPercent = progress.totalChunks > 0
    ? Math.round((progress.completedChunks / progress.totalChunks) * 100)
    : 0;

  const getStatusIcon = (status: OverallProgress['status']) => {
    switch (status) {
      case 'initializing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'downloading':
        return <Download className="h-4 w-4 text-blue-500" />;
      case 'assembling':
        return <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />;
      case 'decompressing':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'fallback':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
    }
  };

  const getStatusColor = (status: OverallProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'fallback':
        return 'text-orange-600';
      default:
        return 'text-blue-600';
    }
  };

  const chunkArray = Array.from(progress.chunkProgress.values());
  const activeChunks = chunkArray.filter(c => c.status === 'downloading' || c.status === 'retrying');
  const completedChunks = chunkArray.filter(c => c.status === 'completed');
  const failedChunks = chunkArray.filter(c => c.status === 'failed');

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg">
        
        {/* Main Status Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(progress.status)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Advanced Model Download
              </h3>
              <p className={`text-sm ${getStatusColor(progress.status)}`}>
                {progress.message}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {overallProgressPercent}%
            </div>
            {progress.compressionRatio && (
              <div className="text-xs text-green-600">
                {progress.compressionRatio}% compression
              </div>
            )}
          </div>
        </div>

        {/* Main Progress Bar */}
        <div className="mb-4">
          <Progress 
            value={overallProgressPercent} 
            className="h-4 mb-2" 
          />
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
            </span>
            <div className="flex items-center gap-4">
              {progress.overallSpeed > 0 && (
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  {formatBytes(progress.overallSpeed)}/s
                </span>
              )}
              {progress.estimatedTimeRemaining > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(progress.estimatedTimeRemaining)} left
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Total Chunks</span>
              <span className="text-lg font-bold text-blue-900">{progress.totalChunks}</span>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Completed</span>
              <span className="text-lg font-bold text-green-900">{progress.completedChunks}</span>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">Active</span>
              <span className="text-lg font-bold text-orange-900">{activeChunks.length}</span>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-700">Failed</span>
              <span className="text-lg font-bold text-red-900">{progress.failedChunks}</span>
            </div>
          </div>
        </div>

        {/* Toggle Details Button */}
        {progress.totalChunks > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showDetails ? 'Hide' : 'Show'} chunk details
          </button>
        )}

        {/* Detailed Chunk Progress */}
        {showDetails && progress.totalChunks > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Individual Chunk Progress
            </h4>
            
            {/* Active Downloads */}
            {activeChunks.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-orange-700 mb-2">
                  Active Downloads ({activeChunks.length})
                </h5>
                <div className="space-y-2">
                  {activeChunks.map((chunk) => (
                    <ChunkProgressItem key={chunk.chunkId} chunk={chunk} />
                  ))}
                </div>
              </div>
            )}

            {/* Failed Downloads */}
            {failedChunks.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-red-700 mb-2">
                  Failed Downloads ({failedChunks.length})
                </h5>
                <div className="space-y-2">
                  {failedChunks.map((chunk) => (
                    <ChunkProgressItem key={chunk.chunkId} chunk={chunk} />
                  ))}
                </div>
              </div>
            )}

            {/* Show some completed chunks */}
            {completedChunks.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-green-700 mb-2">
                  Recent Completions ({Math.min(completedChunks.length, 5)} of {completedChunks.length})
                </h5>
                <div className="space-y-2">
                  {completedChunks.slice(-5).map((chunk) => (
                    <ChunkProgressItem key={chunk.chunkId} chunk={chunk} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Metrics */}
        {(progress.status === 'downloading' || progress.status === 'completed') && progress.overallSpeed > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span>Parallel Downloads: {Math.min(activeChunks.length, 4)}/4</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Avg Speed: {formatBytes(progress.overallSpeed)}/s</span>
              </div>
              {progress.compressionRatio && (
                <div className="flex items-center gap-2">
                  <span>💾</span>
                  <span>Space Saved: {progress.compressionRatio}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual chunk progress component
 */
interface ChunkProgressItemProps {
  chunk: ChunkDownloadProgress;
}

const ChunkProgressItem: React.FC<ChunkProgressItemProps> = ({ chunk }) => {
  const getChunkStatusIcon = (status: ChunkDownloadProgress['status']) => {
    switch (status) {
      case 'downloading':
        return <Download className="h-3 w-3 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'retrying':
        return <RefreshCw className="h-3 w-3 animate-spin text-orange-500" />;
      default:
        return <Loader2 className="h-3 w-3 animate-spin text-gray-500" />;
    }
  };

  const progressPercent = Math.round(chunk.progress * 100);

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getChunkStatusIcon(chunk.status)}
          <span className="text-sm font-mono text-gray-700">
            {chunk.filename}
          </span>
          {chunk.retryCount > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
              Retry {chunk.retryCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="font-mono">{progressPercent}%</span>
          {chunk.speed > 0 && (
            <span>{formatBytes(chunk.speed)}/s</span>
          )}
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-2 mb-2" />
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatBytes(chunk.downloaded)} / {formatBytes(chunk.total)}</span>
        {chunk.error && (
          <span className="text-red-500 truncate max-w-xs">
            Error: {chunk.error}
          </span>
        )}
      </div>
    </div>
  );
};