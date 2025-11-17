'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

/**
 * QueryClient configuration with sensible defaults for the Tracker app
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Queries are considered stale after 5 minutes
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Cache data for 10 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        // Retry failed queries twice with exponential backoff
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus for critical data freshness
        refetchOnWindowFocus: true,
        // Don't refetch on mount if data is still fresh
        refetchOnMount: false,
        // Refetch on reconnect to sync after offline periods
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once (less aggressive than queries)
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider for the Tracker app
 *
 * Wraps the app with QueryClientProvider and includes devtools in development.
 *
 * Usage:
 * ```tsx
 * <ReactQueryProvider>
 *   <YourApp />
 * </ReactQueryProvider>
 * ```
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may
  // suspend because React will throw away the client on the initial
  // render if it suspends and there is no boundary
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}
