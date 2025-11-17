'use client';
import React from 'react';

type Props = {
  size?: number; // px
  stroke?: number; // px
  percent: number; // 0-100
  label?: string;
};

export default function ProgressRing({ size = 20, stroke = 3, percent, label }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * circumference;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label || `${clamped}%`}
      className="block"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        stroke="currentColor"
        className="text-gray-300 dark:text-gray-700"
        fill="none"
        opacity={0.6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        stroke="currentColor"
        className={
          clamped === 100
            ? 'text-green-500'
            : clamped > 0
              ? 'text-blue-500'
              : 'text-gray-400 dark:text-gray-500'
        }
        fill="none"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
