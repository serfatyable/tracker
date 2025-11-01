'use client';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import TopBar from '../TopBar';
import NetworkStatusIndicator from '../ui/NetworkStatusIndicator';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: _me } = useCurrentUserProfile();
  return (
    <div className="min-h-dvh pad-safe-t pad-safe-b bg-bg text-fg">
      <div className="sticky top-0 z-40 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80 pad-safe-t w-full max-w-[min(100%,100svw)] border-b border-gray-200 dark:border-[rgb(var(--border))]">
        <div className="app-container">
          <TopBar />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl">
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-6 pad-safe-b min-w-0" role="main">
          {children}
        </main>
      </div>
      <NetworkStatusIndicator show="offline-only" position="bottom" />
    </div>
  );
}
