'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../../components/auth/AuthGate';
import { CardSkeleton } from '../../../../components/dashboard/Skeleton';
import AppShell from '../../../../components/layout/AppShell';
import LargeTitleHeader from '../../../../components/layout/LargeTitleHeader';
import Button from '../../../../components/ui/Button';

const RotationTree = dynamic(() => import('../../../../components/admin/rotations/RotationTree'), {
  ssr: false,
  loading: () => <CardSkeleton />,
});

export default function AdminRotationEditorPage() {
  const { t } = useTranslation();
  const params = useParams<{ rotationId: string }>();
  const router = useRouter();
  const rotationId = Array.isArray(params.rotationId) ? params.rotationId[0] : params.rotationId;

  return (
    <AuthGate requiredRole="admin">
      <AppShell>
        <LargeTitleHeader
          title={t('admin.rotations.edit', { defaultValue: 'Edit Rotation' }) as string}
          rightSlot={({ compact }) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/rotations')}
              leftIcon={
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              {compact
                ? t('ui.back', { defaultValue: 'Back' })
                : t('admin.rotations.backToList', { defaultValue: 'Back to rotations' })}
            </Button>
          )}
        />
        <div className="app-container p-4">
          {rotationId ? <RotationTree rotationId={rotationId} /> : null}
        </div>
      </AppShell>
    </AuthGate>
  );
}
