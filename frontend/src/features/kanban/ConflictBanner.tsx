'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ConflictBannerProps {
  userEditing: string;
  issueKey: string;
  version: number;
  onRefresh?: () => void;
  onClose?: () => void;
}

export default function ConflictBanner({ 
  userEditing, 
  issueKey, 
  version, 
  onRefresh, 
  onClose 
}: ConflictBannerProps) {
  return (
    <div className="mb-4 rounded-lg border border-amber-800 bg-amber-950/20 px-4 py-3 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 text-amber-500">
            <AlertTriangle size={15} />
          </span>
          <p className="text-xs">
            <span className="font-semibold text-white">Collision Alert:</span>{' '}
            <span className="font-medium text-amber-300">{userEditing}</span> is currently editing{' '}
            <span className="font-mono text-white bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{issueKey}</span> (v{version}). 
            Saving now may overwrite their changes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 rounded bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-300 border border-amber-500/20 transition-all"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              Sync Changes
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose} 
              className="text-amber-400/60 hover:text-white p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
