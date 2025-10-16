/**
 * Network Status Indicator Component
 * Shows users their current connection status
 */

'use client';
import { useTranslation } from 'react-i18next';

import {
  useNetworkStatus,
  getConnectionDescription,
  isSlowConnection,
} from '../../lib/hooks/useNetworkStatus';

interface NetworkStatusIndicatorProps {
  /** Whether to show the indicator (default: auto-detect when offline) */
  show?: 'always' | 'offline-only' | 'never';
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Compact mode shows just an icon */
  compact?: boolean;
}

export default function NetworkStatusIndicator({
  show = 'offline-only',
  position = 'bottom',
  compact = false,
}: NetworkStatusIndicatorProps) {
  const { t } = useTranslation();
  const networkStatus = useNetworkStatus();
  const connectionDescription = getConnectionDescription(networkStatus);
  const isSlow = isSlowConnection(networkStatus);

  // Determine if we should show the indicator
  const shouldShow = (() => {
    if (show === 'never') return false;
    if (show === 'always') return true;
    // offline-only mode
    return !networkStatus.isConnected || isSlow;
  })();

  if (!shouldShow) return null;

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636L5.636 18.364M9 12l6-6m0 0L9 12m6-6v6m0-6H9"
          />
        </svg>
      );
    }

    if (!networkStatus.isConnected) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    }

    if (isSlow) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }

    // Connected
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
        />
      </svg>
    );
  };

  const getStatusColor = () => {
    if (!networkStatus.isConnected) {
      return 'bg-red-500 text-white';
    }
    if (isSlow) {
      return 'bg-amber-500 text-white';
    }
    return 'bg-green-500 text-white';
  };

  const getMessage = () => {
    if (!networkStatus.isOnline) {
      return t('network.offline', { defaultValue: 'You are offline' });
    }
    if (!networkStatus.isConnected) {
      return t('network.noInternet', { defaultValue: 'No internet connection' });
    }
    if (isSlow) {
      return t('network.slowConnection', {
        defaultValue: `Slow connection detected (${connectionDescription})`,
      });
    }
    return connectionDescription;
  };

  const positionClasses =
    position === 'top' ? 'top-0 left-1/2 -translate-x-1/2' : 'bottom-4 left-1/2 -translate-x-1/2';

  return (
    <div
      className={`fixed z-50 ${positionClasses} transition-all duration-300 ease-in-out`}
      role="status"
      aria-live="polite"
      aria-label={getMessage()}
    >
      <div
        className={`
        flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border
        ${getStatusColor()}
        ${compact ? 'px-2' : 'px-3'}
      `}
      >
        {getStatusIcon()}

        {!compact && <span className="text-sm font-medium">{getMessage()}</span>}

        {/* Speed info for development/testing */}
        {process.env.NODE_ENV === 'development' && networkStatus.downlink && (
          <span className="text-xs opacity-75 ml-2">{networkStatus.downlink.toFixed(1)} Mbps</span>
        )}
      </div>
    </div>
  );
}

/**
 * Simplified network status for use in other components
 */
export function NetworkStatusBadge() {
  const networkStatus = useNetworkStatus();
  const isSlow = isSlowConnection(networkStatus);

  if (networkStatus.isConnected && !isSlow) {
    return null; // Don't show anything when connection is good
  }

  return (
    <div className="inline-flex items-center gap-1">
      <div
        className={`w-2 h-2 rounded-full ${
          !networkStatus.isConnected ? 'bg-red-500' : 'bg-amber-500'
        }`}
      />
      <span className="text-xs text-gray-600 dark:text-gray-300">
        {!networkStatus.isConnected ? 'Offline' : 'Slow'}
      </span>
    </div>
  );
}
