'use client';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../../components/auth/AuthGate';
import AppShell from '../../../../components/layout/AppShell';
import LargeTitleHeader from '../../../../components/layout/LargeTitleHeader';
import ReflectionDisplay from '../../../../components/reflections/ReflectionDisplay';
import ReflectionForm from '../../../../components/reflections/ReflectionForm';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { submitReflection, useReflection } from '../../../../lib/hooks/useReflections';
import { useLatestPublishedTemplate } from '../../../../lib/hooks/useReflectionTemplates';
import type { Reflection } from '../../../../types/reflections';

export default function TutorWriteReflectionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams() as { taskOccurrenceId?: string };
  const taskOccurrenceId = params?.taskOccurrenceId || '';
  const search = useSearchParams();
  const taskType = search?.get('taskType') || 'Task';
  const residentId = search?.get('residentId');

  const { data: me, firebaseUser } = useCurrentUserProfile();
  const uid = firebaseUser?.uid || null;
  const { template } = useLatestPublishedTemplate('tutor', taskType);
  const { template: residentTemplate } = useLatestPublishedTemplate('resident', taskType);
  const { reflection } = useReflection(taskOccurrenceId || null, uid, residentId || undefined);

  // Load resident reflection read-only
  const [residentReflection, setResidentReflection] = useState<Reflection | null>(null);
  const [loadingResident, setLoadingResident] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!residentId || !taskOccurrenceId) {
        setLoadingResident(false);
        return;
      }
      setLoadingResident(true);
      const db = getFirestore(getFirebaseApp());
      const rid = `${taskOccurrenceId}_${residentId}`;
      const snap = await getDoc(doc(db, 'reflections', rid));
      if (!cancelled) {
        setResidentReflection(snap.exists() ? (snap.data() as Reflection) : null);
        setLoadingResident(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [residentId, taskOccurrenceId]);

  const submitted = !!reflection?.submittedAt;

  return (
    <AuthGate requiredRole="tutor">
      <AppShell>
        <LargeTitleHeader
          title={t('reflections.tutorReflection', { defaultValue: 'Tutor Reflection' }) as string}
        />
        <div className="app-container p-4 space-y-4">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/tutor/reflections')}
              aria-label="Back to reflections"
            >
              ← {t('ui.back', { defaultValue: 'Back' })}
            </Button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-400">{taskType}</span>
          </div>

          {/* Error states */}
          {!me || !uid ? (
            <Card tone="rose" variant="tinted">
              <div className="text-center py-8">
                <h3 className="font-semibold mb-2">
                  {t('common.error', { defaultValue: 'Error' })}
                </h3>
                <p className="text-sm opacity-70">{t('common.signInRequired')}</p>
              </div>
            </Card>
          ) : !template ? (
            <Card>
              <div className="space-y-2" role="status" aria-live="polite">
                <p className="sr-only">{t('reflections.loading')}</p>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </Card>
          ) : !residentId ? (
            <Card tone="rose" variant="tinted">
              <div className="text-center py-8">
                <h3 className="font-semibold mb-2">
                  {t('common.error', { defaultValue: 'Error' })}
                </h3>
                <p className="text-sm opacity-70">
                  {t('reflections.missingResidentContext', {
                    defaultValue: 'Missing resident context for this reflection.',
                  })}
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Task info card */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-70">
                      {t('reflections.taskType', { defaultValue: 'Task Type' })}
                    </div>
                    <div className="font-semibold">{taskType}</div>
                  </div>
                  {submitted && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t('common.submitted', { defaultValue: 'Submitted' })}
                    </div>
                  )}
                </div>
              </Card>

              {/* Resident Reflection (if exists) */}
              {loadingResident ? (
                <Card>
                  <div className="space-y-2" role="status" aria-live="polite">
                    <p className="sr-only">{t('reflections.loading')}</p>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </Card>
              ) : residentReflection && residentTemplate ? (
                <Card tone="sky" variant="tinted">
                  <div className="font-semibold mb-3 text-sky-900 dark:text-sky-100">
                    {t('reflections.residentReflection', { defaultValue: 'Resident Reflection' })}
                  </div>
                  <ReflectionDisplay reflection={residentReflection} template={residentTemplate} />
                </Card>
              ) : null}

              {/* Tutor Reflection Form */}
              <Card>
                <h2 className="font-semibold mb-4 text-lg">
                  {t('reflections.yourReflection', { defaultValue: 'Your Reflection' })}
                </h2>
                <ReflectionForm
                  audience="tutor"
                  template={template}
                  initialAnswers={reflection?.answers || null}
                  disabled={submitted}
                  onSubmit={async (answers) => {
                    if (!uid) return;
                    await submitReflection({
                      taskOccurrenceId,
                      taskType,
                      templateKey: template.templateKey,
                      templateVersion: template.version,
                      authorId: uid,
                      authorRole: 'tutor',
                      residentId,
                      tutorId: uid,
                      answers,
                    });
                  }}
                />
              </Card>
            </>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
