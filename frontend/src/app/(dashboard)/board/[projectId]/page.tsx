'use client';

import React from 'react';
import Board from '@/features/kanban/Board';

export default function BoardPage() {
  return (
    <div className="h-full flex flex-col">
      <Board />
    </div>
  );
}
