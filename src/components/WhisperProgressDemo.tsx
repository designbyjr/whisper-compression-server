import React, { useState, useEffect } from "react"
import { 
  MultiStepProgress, 
  SimpleProgress, 
  ProgressStep 
} from "@/components/ui/multi-step-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Mock data that matches the Whisper download scenarios from the screenshots
const whisperSmallFiles: ProgressStep[] = [
  {
    id: "config",
    name: "onnx-community/whisper-small",
    progress: 100,
    status: "completed",
    downloadedMB: 336.5,
    totalMB: 336.5,
    speedMBps: 18.8,
    timeRemainingSeconds: 0,
    detail: "2238%"
  },
  {
    id: "weights", 
    name: "onnx-community/whisper-small", 
    progress: 100,
    status: "completed",
    downloadedMB: 222.3,
    totalMB: 222.3,
    speedMBps: 17.9,
    timeRemainingSeconds: 0,
    detail: "3218%"
  }
]

const whisperDownloadSteps: ProgressStep[] = [
  {
    id: "config",
    name: "onnx-community/whisper-small",
    progress: 75.3,
    status: "active",
    downloadedMB: 75.3,
    totalMB: 336.5,
    speedMBps: 18.8,
    timeRemainingSeconds: 14,
    detail: "2238%18.8 MB/s"
  },
  {
    id: "weights",
    name: "onnx-community/whisper-small", 
    progress: 32.1,
    status: "active",
    downloadedMB: 71.5,
    totalMB: 222.3,
    speedMBps: 17.9,
    timeRemainingSeconds: 8,
    detail: "3218%17.9 MB/s"
  }
]

export const WhisperProgressDemo = () => {
  const [scenario, setScenario] = useState<"loading" | "downloading" | "completed" | "simple">("loading")
  const [progress, setProgress] = useState(0)

  // Simulate progress for the simple demo
  useEffect(() => {
    if (scenario === "simple") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 2
        })
      }, 100)
      return () => clearInterval(interval)
    }
  }, [scenario])

  const resetSimpleProgress = () => {
    setProgress(0)
    setScenario("simple")
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Whisper Progress Component Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This demo recreates the Whisper Web Speech-to-Text interface progress components using shadcn/ui.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setScenario("loading")}
              variant={scenario === "loading" ? "default" : "outline"}
              size="sm"
            >
              Initial Loading
            </Button>
            <Button 
              onClick={() => setScenario("downloading")}
              variant={scenario === "downloading" ? "default" : "outline"}
              size="sm"
            >
              Active Download
            </Button>
            <Button 
              onClick={() => setScenario("completed")}
              variant={scenario === "completed" ? "default" : "outline"}
              size="sm"
            >
              Completed
            </Button>
            <Button 
              onClick={resetSimpleProgress}
              variant={scenario === "simple" ? "default" : "outline"}
              size="sm"
            >
              Simple Progress
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Demos */}
      <div className="space-y-8">
        
        {scenario === "loading" && (
          <MultiStepProgress
            title="Whisper Web Speech-to-Text"
            subtitle="Click the microphone to start recording, then speak clearly. Your speech will be automatically transcribed using Whisper AI."
            overallProgress={0}
            steps={[
              {
                id: "init",
                name: "Loading Whisper Model",
                progress: 0,
                status: "pending"
              }
            ]}
            showStepDetails={false}
            showSpinner={true}
          />
        )}

        {scenario === "downloading" && (
          <MultiStepProgress
            title="Whisper Web Speech-to-Text"
            subtitle="Click the microphone to start recording, then speak clearly. Your speech will be automatically transcribed using Whisper AI."
            overallProgress={53.7} // Average of the two files
            steps={whisperDownloadSteps}
            showStepDetails={true}
            showSpinner={true}
          />
        )}

        {scenario === "completed" && (
          <MultiStepProgress
            title="Whisper Web Speech-to-Text"
            subtitle="Click the microphone to start recording, then speak clearly. Your speech will be automatically transcribed using Whisper AI."
            overallProgress={100}
            steps={whisperSmallFiles}
            showStepDetails={true}
            showSpinner={false}
          />
        )}

        {scenario === "simple" && (
          <SimpleProgress
            title="Whisper Web Speech-to-Text"
            subtitle="Click the microphone to start recording, then speak clearly. Your speech will be automatically transcribed using Whisper AI."
            progress={progress}
            downloadedMB={progress * 5.58} // Simulated total of ~558MB
            totalMB={558}
            speedMBps={progress > 0 ? 18.3 : 0}
            timeRemainingSeconds={progress > 0 && progress < 100 ? (100 - progress) * 0.5 : 0}
            showSpinner={progress > 0 && progress < 100}
          />
        )}
      </div>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <h4 className="font-semibold">Multi-Step Progress:</h4>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`import { MultiStepProgress, ProgressStep } from "@/components/ui/multi-step-progress"

const steps: ProgressStep[] = [
  {
    id: "model1",
    name: "onnx-community/whisper-small",
    progress: 75,
    status: "active",
    downloadedMB: 252,
    totalMB: 336.5,
    speedMBps: 18.8,
    timeRemainingSeconds: 14
  }
]

<MultiStepProgress
  title="Whisper Web Speech-to-Text"
  overallProgress={67}
  steps={steps}
  showStepDetails={true}
  showSpinner={true}
/>`}
            </pre>
          </div>

          <div className="text-sm space-y-2">
            <h4 className="font-semibold">Simple Progress:</h4>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`import { SimpleProgress } from "@/components/ui/multi-step-progress"

<SimpleProgress
  title="Loading Model"
  progress={75}
  downloadedMB={419}
  totalMB={558}
  speedMBps={18.3}
  timeRemainingSeconds={8}
  showSpinner={true}
/>`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}