import * as React from "react"
import { Progress } from "@/components/ui/progress"
import {
  WhisperProgressCard,
  WhisperProgressCardContent,
} from "@/components/ui/whisper-progress-card"
import { 
  Download, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileDown,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProgressStep {
  id: string
  name: string
  progress: number // 0-100
  status: "pending" | "active" | "completed" | "error"
  downloadedMB?: number
  totalMB?: number
  speedMBps?: number
  timeRemainingSeconds?: number
  detail?: string
}

export interface MultiStepProgressProps {
  title: string
  subtitle?: string
  steps: ProgressStep[]
  overallProgress: number // 0-100
  showStepDetails?: boolean
  showSpinner?: boolean
  className?: string
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 MB"
  const k = 1024 * 1024 // MB
  return (bytes / k).toFixed(1) + " MB"
}

const formatSpeed = (mbps: number): string => {
  if (mbps < 0.1) return "0 MB/s"
  return mbps.toFixed(1) + " MB/s"
}

const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return ""
  if (seconds < 60) return `${Math.round(seconds)}s remaining`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s left`
}

const getStepIcon = (status: ProgressStep["status"]) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case "active":
      return <Download className="h-4 w-4 text-blue-500" />
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
  }
}

export const MultiStepProgress = React.forwardRef<
  HTMLDivElement,
  MultiStepProgressProps
>(({ 
  title, 
  subtitle, 
  steps, 
  overallProgress, 
  showStepDetails = true, 
  showSpinner = false,
  className,
  ...props 
}, ref) => {
  const activeSteps = steps.filter(step => step.status === "active")
  const completedSteps = steps.filter(step => step.status === "completed")
  
  // Calculate total download info
  const totalDownloaded = steps.reduce((acc, step) => acc + (step.downloadedMB || 0), 0)
  const totalSize = steps.reduce((acc, step) => acc + (step.totalMB || 0), 0)
  const averageSpeed = activeSteps.length > 0 
    ? activeSteps.reduce((acc, step) => acc + (step.speedMBps || 0), 0) / activeSteps.length
    : 0
  const estimatedTimeRemaining = activeSteps.length > 0 && activeSteps[0].timeRemainingSeconds
    ? activeSteps[0].timeRemainingSeconds
    : 0

  return (
    <WhisperProgressCard ref={ref} className={className} {...props}>
      <WhisperProgressCardContent>
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Main Progress Section */}
        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <span className="font-medium">Loading Whisper Model</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
                {averageSpeed > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {formatSpeed(averageSpeed)}
                  </div>
                )}
              </div>
            </div>
            
            <Progress value={overallProgress} size="lg" className="h-4" />
            
            {totalSize > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{formatBytes(totalDownloaded * 1024 * 1024)} / {formatBytes(totalSize * 1024 * 1024)}</span>
                {estimatedTimeRemaining > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(estimatedTimeRemaining)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step Details */}
          {showStepDetails && steps.length > 0 && (
            <div className="space-y-3 pt-2">
              {steps.map((step) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStepIcon(step.status)}
                      <span className="text-sm font-medium truncate">
                        {step.name}
                      </span>
                      {step.status === "active" && step.detail && (
                        <span className="text-xs text-muted-foreground">
                          {step.detail}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{Math.round(step.progress)}%</span>
                      {step.speedMBps && step.speedMBps > 0 && (
                        <span>{formatSpeed(step.speedMBps)}</span>
                      )}
                    </div>
                  </div>
                  
                  {step.status !== "pending" && step.progress > 0 && (
                    <Progress 
                      value={step.progress} 
                      size="default"
                      variant={step.status === "error" ? "destructive" : "default"}
                      className="h-2"
                    />
                  )}
                  
                  {(step.downloadedMB || step.totalMB || step.timeRemainingSeconds) && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {step.downloadedMB && step.totalMB && (
                        <span>
                          {formatBytes(step.downloadedMB * 1024 * 1024)} / {formatBytes(step.totalMB * 1024 * 1024)}
                        </span>
                      )}
                      {step.timeRemainingSeconds && step.timeRemainingSeconds > 0 && (
                        <span>{formatTime(step.timeRemainingSeconds)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Loading Spinner and Status */}
          {showSpinner && activeSteps.length > 0 && (
            <div className="flex justify-center pt-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-primary/60 animate-spin" />
                </div>
              </div>
            </div>
          )}

          {/* Footer Status */}
          <div className="text-center text-sm text-muted-foreground">
            {activeSteps.length > 0 && (
              <div className="flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Downloading model files... ({activeSteps.length} file{activeSteps.length !== 1 ? 's' : ''})</span>
              </div>
            )}
            {completedSteps.length === steps.length && steps.length > 0 && (
              <div className="flex items-center justify-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Download completed!</span>
              </div>
            )}
          </div>
        </div>
      </WhisperProgressCardContent>
    </WhisperProgressCard>
  )
})

MultiStepProgress.displayName = "MultiStepProgress"

// Convenience component for simple use cases
export interface SimpleProgressProps {
  title: string
  subtitle?: string
  progress: number
  downloadedMB?: number
  totalMB?: number
  speedMBps?: number
  timeRemainingSeconds?: number
  showSpinner?: boolean
  className?: string
}

export const SimpleProgress = React.forwardRef<HTMLDivElement, SimpleProgressProps>(
  ({ 
    title, 
    subtitle, 
    progress, 
    downloadedMB, 
    totalMB, 
    speedMBps, 
    timeRemainingSeconds,
    showSpinner = false,
    className,
    ...props 
  }, ref) => {
    const singleStep: ProgressStep = {
      id: "main",
      name: "Downloading model",
      progress,
      status: progress >= 100 ? "completed" : progress > 0 ? "active" : "pending",
      downloadedMB,
      totalMB,
      speedMBps,
      timeRemainingSeconds,
    }

    return (
      <MultiStepProgress
        ref={ref}
        title={title}
        subtitle={subtitle}
        overallProgress={progress}
        steps={[singleStep]}
        showStepDetails={false}
        showSpinner={showSpinner}
        className={className}
        {...props}
      />
    )
  }
)

SimpleProgress.displayName = "SimpleProgress"