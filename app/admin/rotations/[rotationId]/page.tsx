'use client';

import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../../components/auth/AuthGate';
import AppShell from '../../../../components/layout/AppShell';
import LargeTitleHeader from '../../../../components/layout/LargeTitleHeader';
import RotationTree from '../../../../components/admin/rotations/RotationTree';

export default function AdminRotationEditorPage() {
  const { t } = useTranslation();
  const params = useParams<{ rotationId: string }>();
  const rotationId = Array.isArray(params.rotationId) ? params.rotationId[0] : params.rotationId;

  return (
    <AuthGate requiredRole="admin">
      <AppShell>
        <LargeTitleHeader title={t('admin.rotations.edit', { defaultValue: 'Edit Rotation' }) as string} />
        <div className="app-container p-4">
          {rotationId ? <RotationTree rotationId={rotationId} /> : null}
        </div>
      </AppShell>
    </AuthGate>
  );
}


