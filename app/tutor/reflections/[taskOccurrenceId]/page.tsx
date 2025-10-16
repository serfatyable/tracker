'use client';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ReflectionForm from '../../../../components/reflections/ReflectionForm';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { useCurrentUserProfile } from '../../../../lib/hooks/useCurrentUserProfile';
import { submitReflection, useReflection } from '../../../../lib/hooks/useReflections';
import { useLatestPublishedTemplate } from '../../../../lib/hooks/useReflectionTemplates';

export default function TutorWriteReflectionPage() {
  const { t } = useTranslation();
  const params = useParams() as { taskOccurrenceId?: string };
  const taskOccurrenceId = params?.taskOccurrenceId || '';
  const search = useSearchParams();
  const taskType = search?.get('taskType') || 'Task';
  const residentId = search?.get('residentId');

  const { data: me } = useCurrentUserProfile();
  const { template } = useLatestPublishedTemplate('tutor', taskType);
  const { reflection } = useReflection(taskOccurrenceId || null, me?.uid || null);

  // Load resident reflection read-only
  const [residentReflection, setResidentReflection] = useState<any | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!residentId || !taskOccurrenceId) return;
      const db = getFirestore(getFirebaseApp());
      const rid = `${taskOccurrenceId}_${residentId}`;
      const snap = await getDoc(doc(db, 'reflections', rid));
      if (!cancelled) setResidentReflection(snap.exists() ? snap.data() : null);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [residentId, taskOccurrenceId]);

  if (!me) return <div className="p-4">{t('common.signInRequired')}</div>;
  if (!template) return <div className="p-4">{t('common.loadingTemplate')}</div>;

  const submitted = !!reflection?.submittedAt;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">{t('reflections.tutorReflection')}</h1>
      {residentReflection ? (
        <div className="rounded border p-3">
          <div className="font-semibold mb-2">{t('reflections.residentReflection')}</div>
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(residentReflection.answers, null, 2)}
          </pre>
        </div>
      ) : null}
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
            residentId: residentId || '',
            tutorId: me.uid,
            answers,
          });
        }}
      />
      {submitted ? <div className="text-sm text-green-700">{t('common.submitted')}</div> : null}
    </div>
  );
}
