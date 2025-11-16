'use client';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ReflectionDisplay from '../../../../components/reflections/ReflectionDisplay';
import ReflectionForm from '../../../../components/reflections/ReflectionForm';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { useCurrentUserProfile } from '../../../../lib/hooks/useCurrentUserProfile';
import { submitReflection, useReflection } from '../../../../lib/hooks/useReflections';
import { useLatestPublishedTemplate } from '../../../../lib/hooks/useReflectionTemplates';
import type { Reflection } from '../../../../types/reflections';

export default function TutorWriteReflectionPage() {
  const { t } = useTranslation();
  const params = useParams() as { taskOccurrenceId?: string };
  const taskOccurrenceId = params?.taskOccurrenceId || '';
  const search = useSearchParams();
  const taskType = search?.get('taskType') || 'Task';
  const residentId = search?.get('residentId');

  const { data: me } = useCurrentUserProfile();
  const { template } = useLatestPublishedTemplate('tutor', taskType);
  const { template: residentTemplate } = useLatestPublishedTemplate('resident', taskType);
  const { reflection } = useReflection(
    taskOccurrenceId || null,
    me?.uid || null,
    residentId || undefined,
  );

  // Load resident reflection read-only
  const [residentReflection, setResidentReflection] = useState<Reflection | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!residentId || !taskOccurrenceId) return;
      const db = getFirestore(getFirebaseApp());
      const rid = `${taskOccurrenceId}_${residentId}`;
      const snap = await getDoc(doc(db, 'reflections', rid));
      if (!cancelled) setResidentReflection(snap.exists() ? (snap.data() as Reflection) : null);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [residentId, taskOccurrenceId]);

  if (!me) return <div className="p-4">{t('common.signInRequired')}</div>;
  if (!template) return <div className="p-4">{t('common.loadingTemplate')}</div>;
  if (!residentId)
    return (
      <div className="p-4 text-red-600">
        {t('reflections.missingResidentContext', {
          defaultValue: 'Missing resident context for this reflection.',
        })}
      </div>
    );

  const submitted = !!reflection?.submittedAt;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">{t('reflections.tutorReflection')}</h1>
      <div className="text-sm opacity-70">
        {t('reflections.taskType')} {taskType}
      </div>

      {/* Resident Reflection (if exists) */}
      {residentReflection && residentTemplate ? (
        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
            {t('reflections.residentReflection')}
          </div>
          <ReflectionDisplay reflection={residentReflection} template={residentTemplate} />
        </div>
      ) : null}

      {/* Tutor Reflection Form */}
      <div>
        <h2 className="font-semibold mb-3">
          {t('reflections.yourReflection', { defaultValue: 'Your Reflection' })}
        </h2>
        <ReflectionForm
          audience="tutor"
          template={template}
          initialAnswers={reflection?.answers || null}
          disabled={submitted}
          onSubmit={async (answers) => {
            if (!me) return;
            await submitReflection({
              taskOccurrenceId,
              taskType,
              templateKey: template.templateKey,
              templateVersion: template.version,
              authorId: me.uid,
              authorRole: 'tutor',
              residentId,
              tutorId: me.uid,
              answers,
            });
          }}
        />
      </div>

      {submitted ? <div className="text-sm text-green-700">{t('common.submitted')}</div> : null}
    </div>
  );
}
