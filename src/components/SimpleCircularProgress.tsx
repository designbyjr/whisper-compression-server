import React from 'react';

interface SimpleCircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
}

export const SimpleCircularProgress: React.FC<SimpleCircularProgressProps> = ({
  value,
  size = 120,
  strokeWidth = 10,
  className = "",
  ariaLabel,
  ariaLabelledby,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const progressValue = Math.min(100, Math.max(0, Math.round(value)));
  const label = ariaLabel || 'Loading progress';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      className={className}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressValue}
      aria-label={ariaLabelledby ? undefined : label}
      aria-labelledby={ariaLabelledby}
    >
      <svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: 'rotate(-90deg)'
        }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.3s ease-in-out'
          }}
        />
      </svg>
      
      {/* Text label */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#111827',
          zIndex: 10
        }}
      >
        {progressValue}%
      </div>
    </div>
  );
};