'use client';
import type { CSSProperties } from 'react';

import BackToTop from '../BackToTop';
import FloatingMenuButton from '../FloatingMenuButton';
import TopBar from '../TopBar';
import CommandPalette from '../ui/CommandPalette';
import NetworkStatusIndicator from '../ui/NetworkStatusIndicator';

import RoleTabs from './RoleTabs';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';

type AppShellStyle = CSSProperties & {
  '--top-bar-offset'?: string;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: _me } = useCurrentUserProfile();
  const shellStyle: AppShellStyle = {
    '--top-bar-offset': 'calc(env(safe-area-inset-top, 0px) + 3rem)',
  };
  return (
    <div className="min-h-dvh pad-safe-t pad-safe-b bg-bg text-fg" style={shellStyle}>
      <div className="top-shell" data-top-bar>
        <div className="app-container space-y-2">
          <TopBar />
          <RoleTabs />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl">
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-6 pad-safe-b min-w-0" role="main">
          {children}
        </main>
      </div>
      <FloatingMenuButton />
      <BackToTop />
      <NetworkStatusIndicator show="offline-only" position="bottom" />
      <CommandPalette />
    </div>
  );
}
