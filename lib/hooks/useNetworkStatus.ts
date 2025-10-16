/**
 * Hook for detecting and monitoring network connectivity status
 */

'use client';
import { useCallback, useEffect, useState } from 'react';

import { logger } from '../utils/logger';

export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether we've detected actual connectivity (not just browser status) */
  isConnected: boolean;
  /** Current connection type if available */
  connectionType?: string;
  /** Estimated download speed in Mbps */
  downlink?: number;
  /** Round trip time estimate in ms */
  rtt?: number;
}

/**
 * Hook that provides real-time network status information
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const getNetworkConnection = useCallback((): any => {
    return (
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection ||
      null
    );
  }, []);

  const testConnectivity = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    try {
      // Try to fetch a small resource to test actual connectivity
      // Using a tiny image or favicon as a connectivity test
      const response = await fetch('/logo-56.png', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      logger.debug('Connectivity test failed', 'NetworkStatus', error);
      return false;
    }
  }, []);

  const updateNetworkInfo = useCallback(() => {
    const isOnline = navigator.onLine;
    const connection = getNetworkConnection();

    let connectionType: string | undefined;
    let downlink: number | undefined;
    let rtt: number | undefined;

    if (connection) {
      connectionType = connection.effectiveType || connection.type;
      downlink = connection.downlink;
      rtt = connection.rtt;
    }

    // Test actual connectivity with a small request
    testConnectivity().then((isConnected) => {
      setNetworkStatus({
        isOnline,
        isConnected,
        connectionType,
        downlink,
        rtt,
      });
    });
  }, [getNetworkConnection, testConnectivity]);

  useEffect(() => {
    // Initial status
    updateNetworkInfo();

    // Listen for online/offline events
    const handleOnline = () => {
      logger.info('Network connection restored', 'NetworkStatus');
      updateNetworkInfo();
    };

    const handleOffline = () => {
      logger.warn('Network connection lost', 'NetworkStatus');
      setNetworkStatus((prev) => ({
        ...prev,
        isOnline: false,
        isConnected: false,
      }));
    };

    // Listen for connection changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // For browsers that support Network Information API
    const connection = getNetworkConnection();
    if (connection) {
      const handleConnectionChange = () => updateNetworkInfo();
      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateNetworkInfo, getNetworkConnection]);

  return networkStatus;
}

/**
 * Returns a human-readable description of the current connection
 */
export function getConnectionDescription(status: NetworkStatus): string {
  if (!status.isOnline) {
    return 'Offline';
  }

  if (!status.isConnected) {
    return 'No internet connection';
  }

  if (status.connectionType) {
    switch (status.connectionType) {
      case 'slow-2g':
        return 'Very slow connection (2G)';
      case '2g':
        return 'Slow connection (2G)';
      case '3g':
        return 'Moderate connection (3G)';
      case '4g':
        return 'Fast connection (4G)';
      case 'ethernet':
        return 'Ethernet connection';
      case 'wifi':
        return 'WiFi connection';
      default:
        return 'Connected';
    }
  }

  return 'Connected';
}

/**
 * Returns whether the current connection is considered slow
 */
export function isSlowConnection(status: NetworkStatus): boolean {
  if (!status.isConnected) return true;

  // Check effective connection type
  if (status.connectionType === 'slow-2g' || status.connectionType === '2g') {
    return true;
  }

  // Check actual speed measurements if available
  if (status.downlink && status.downlink < 1) {
    // Less than 1 Mbps
    return true;
  }

  if (status.rtt && status.rtt > 1000) {
    // RTT > 1 second
    return true;
  }

  return false;
}
