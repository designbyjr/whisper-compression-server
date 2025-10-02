import React from 'react';
import { Progress } from '@/components/ui/progress';
import { SimpleCircularProgress } from '@/components/SimpleCircularProgress';
import { Download, Loader2, Clock } from 'lucide-react';

interface ProgressItem {
  file: string;
  loaded: number;
  progress: number;
  total: number;
  name: string;
  status: string;
  downloadSpeed?: number;
  timeRemaining?: number;
  startTime?: number;
}

interface WhisperProgressProps {
  progressItems: ProgressItem[];
  isModelLoading: boolean;
  modelReady: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(1) + ' MB';
};

const formatSpeed = (mbps: number): string => {
  if (mbps < 0.1) return '0 MB/s';
  return mbps.toFixed(1) + ' MB/s';
};

const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';
  if (seconds < 60) return `${Math.round(seconds)}s remaining`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s remaining`;
};

export const WhisperProgress: React.FC<WhisperProgressProps> = ({ 
  progressItems, 
  isModelLoading, 
  modelReady 
}) => {
  // Don't show progress when model is ready
  if (modelReady) {
    return null;
  }

  // If model loading finished but no progress items, don't show anything
  if (!isModelLoading && progressItems.length === 0) {
    return null;
  }

  // Calculate overall progress based on total bytes
  const validItems = progressItems.filter(item => 
    typeof item.progress === 'number' && 
    !isNaN(item.progress) &&
    item.total > 0
  );
  
  // Calculate totals
  const totalDownloaded = validItems.reduce((acc, item) => acc + (item.loaded || 0), 0);
  const totalSize = validItems.reduce((acc, item) => acc + (item.total || 0), 0);
  
  // Calculate progress as total bytes downloaded vs total bytes to download
  const progressRatio = totalSize > 0 ? totalDownloaded / totalSize : 0;
  const progressPercentage = Math.min(Math.max(Math.round(progressRatio * 100), 0), 100);
  
  const avgSpeed = validItems
    .filter(item => (item.downloadSpeed || 0) > 0)
    .reduce((acc, item) => acc + (item.downloadSpeed || 0), 0) / Math.max(validItems.length, 1);

  // If no progress data available, show 0% progress
  const displayProgress = validItems.length === 0 ? 0 : progressPercentage;
  

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="bg-white rounded-lg border shadow-sm p-8">
        <div className="flex flex-col items-center gap-6">
          <SimpleCircularProgress
            value={displayProgress}
            size={120}
            strokeWidth={10}
            ariaLabel="Model loading progress"
          />
          
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900">
              Preparing your interview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};