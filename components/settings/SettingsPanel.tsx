'use client';

import { useState } from 'react';

import AccountSection from './AccountSection';
import PreferencesSection from './PreferencesSection';
import ProfileSection from './ProfileSection';
import QuickAccessSection from './QuickAccessSection';
import SecuritySection from './SecuritySection';

import Toast from '@/components/ui/Toast';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';

export default function SettingsPanel() {
  const { status, firebaseUser, data: profile, refetch } = useCurrentUserProfile();
  const [toast, setToast] = useState<string | null>(null);

  if (status !== 'ready') {
    return <div className="text-sm text-gray-600 dark:text-gray-300">Loading…</div>;
  }

  if (!firebaseUser || !profile) {
    return null;
  }

  return (
    <div className="space-y-8">
      <Toast message={toast} onClear={() => setToast(null)} />

      {/* Profile Section */}
      <div className="card-levitate p-6">
        <ProfileSection profile={profile} onUpdate={refetch} onToast={setToast} />
      </div>

      {/* Preferences Section */}
      <div className="card-levitate p-6">
        <PreferencesSection
          profile={profile}
          firebaseUserId={firebaseUser.uid}
          onToast={setToast}
        />
      </div>

      {/* Quick Access Tabs Section */}
      <div className="card-levitate p-6">
        <QuickAccessSection profile={profile} onToast={setToast} />
      </div>

      {/* Security Section */}
      <div className="card-levitate p-6">
        <SecuritySection onToast={setToast} />
      </div>

      {/* Account Section */}
      <div className="card-levitate p-6">
        <AccountSection />
      </div>
    </div>
  );
}
