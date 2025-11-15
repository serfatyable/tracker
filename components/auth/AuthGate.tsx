'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import type { Role } from '../../types/auth';
import Skeleton from '../dashboard/Skeleton';

type AuthGateProps = {
  requiredRole?: Role;
  allowedRoles?: Role[];
  children: React.ReactNode;
};

function isAuthorized(role: Role | undefined, requirement?: Role, allowed?: Role[]) {
  if (!role) return false;
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed.includes(role);
  }
  if (requirement) {
    return role === requirement;
  }
  return true;
}

export default function AuthGate({ requiredRole, allowedRoles, children }: AuthGateProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { status, firebaseUser, data: profile, error } = useCurrentUserProfile();

  useEffect(() => {
    if (status !== 'ready') return;
    if (!firebaseUser) {
      router.replace('/auth');
      return;
    }
    if (profile?.status === 'pending') {
      router.replace('/awaiting-approval');
      return;
    }
    if (profile && !isAuthorized(profile.role, requiredRole, allowedRoles)) {
      router.replace('/auth');
      return;
    }
  }, [status, firebaseUser, profile, requiredRole, allowedRoles, router]);

  if (status === 'loading') {
    return (
      <div className="p-6">
        <div className="card-levitate p-4">
          <Skeleton className="h-6 w-40 mb-3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-6">
        <div className="card-levitate p-4 text-sm text-red-700">
          {error || t('errors.failedToLoadUser')}
        </div>
      </div>
    );
  }

  // When ready, gate will redirect as needed; render children
  return <>{children}</>;
}
