import * as React from "react"
import { cn } from "@/lib/utils"

export interface WhisperProgressCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "compact" | "detailed"
}

const WhisperProgressCard = React.forwardRef<
  HTMLDivElement,
  WhisperProgressCardProps
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "w-full max-w-2xl mx-auto",
      "bg-background border border-border rounded-xl shadow-lg",
      "overflow-hidden",
      variant === "compact" && "max-w-lg",
      variant === "detailed" && "max-w-4xl",
      className
    )}
    {...props}
  />
))
WhisperProgressCard.displayName = "WhisperProgressCard"

const WhisperProgressCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 border-b border-border bg-muted/20", className)}
    {...props}
  />
))
WhisperProgressCardHeader.displayName = "WhisperProgressCardHeader"

const WhisperProgressCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-6 space-y-6", className)}
    {...props}
  />
))
WhisperProgressCardContent.displayName = "WhisperProgressCardContent"

const WhisperProgressCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-bold tracking-tight text-center", className)}
    {...props}
  />
))
WhisperProgressCardTitle.displayName = "WhisperProgressCardTitle"

const WhisperProgressCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-center text-muted-foreground", className)}
    {...props}
  />
))
WhisperProgressCardDescription.displayName = "WhisperProgressCardDescription"

const WhisperProgressCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 border-t border-border bg-muted/10", className)}
    {...props}
  />
))
WhisperProgressCardFooter.displayName = "WhisperProgressCardFooter"

export {
  WhisperProgressCard,
  WhisperProgressCardHeader,
  WhisperProgressCardContent,
  WhisperProgressCardTitle,
  WhisperProgressCardDescription,
  WhisperProgressCardFooter,
}