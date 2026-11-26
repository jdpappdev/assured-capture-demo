import React from 'react';
import { ReportStatus } from '../types';

interface StatusBadgeProps {
  status: ReportStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const STATUS_CONFIG: Record<
  ReportStatus,
  { bg: string; text: string; border: string; label: string; dot: string }
> = {
  Draft: {
    bg: 'bg-[#F4F6F8]',
    text: 'text-[#152128]/70',
    border: 'border-[#C4CBC4]',
    dot: 'bg-[#C4CBC4]',
    label: 'Draft',
  },
  'In Progress': {
    bg: 'bg-[#B9E6F5]/30',
    text: 'text-[#152128]',
    border: 'border-[#B9E6F5]',
    dot: 'bg-[#6990FF]',
    label: 'In Progress',
  },
  'Awaiting Review': {
    bg: 'bg-[#B9E6F5]/50',
    text: 'text-[#152128]',
    border: 'border-[#6990FF]/40',
    dot: 'bg-[#6990FF]',
    label: 'Awaiting Review',
  },
  Completed: {
    bg: 'bg-[#98C2B3]/25',
    text: 'text-[#152128]',
    border: 'border-[#98C2B3]',
    dot: 'bg-[#4F7F70]',
    label: 'Completed',
  },
  'Sent to Client': {
    bg: 'bg-[#98C2B3]/35',
    text: 'text-[#152128]',
    border: 'border-[#98C2B3]',
    dot: 'bg-[#2D6151]',
    label: 'Sent to Client',
  },
};

export const ALL_REPORT_STATUSES: ReportStatus[] = [
  'Draft',
  'In Progress',
  'Awaiting Review',
  'Completed',
  'Sent to Client',
];

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-semibold',
    md: 'px-2.5 py-0.5 text-xs font-semibold',
    lg: 'px-3 py-1 text-xs font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className="whitespace-nowrap tracking-tight">{config.label}</span>
    </span>
  );
};
