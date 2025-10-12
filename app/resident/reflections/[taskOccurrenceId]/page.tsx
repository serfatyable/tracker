'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUserProfile } from '../../../../lib/hooks/useCurrentUserProfile';
import { submitReflection, useReflection } from '../../../../lib/hooks/useReflections';
import { useLatestPublishedTemplate } from '../../../../lib/hooks/useReflectionTemplates';
import ReflectionForm from '../../../../components/reflections/ReflectionForm';

export default function ResidentWriteReflectionPage() {
  const params = useParams() as { taskOccurrenceId?: string };
  const taskOccurrenceId = params?.taskOccurrenceId || '';
  const search = useSearchParams();
  const taskType = search?.get('taskType') || 'Task';
  const tutorId = search?.get('tutorId');

  const { data: me } = useCurrentUserProfile();
  const { template } = useLatestPublishedTemplate('resident', taskType);
  const { reflection } = useReflection(taskOccurrenceId || null, me?.uid || null);

  if (!me) return <div className="p-4">Sign in required</div>;
  if (!template) return <div className="p-4">Loading template…</div>;

  const submitted = !!reflection?.submittedAt;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Write reflection</h1>
      <div className="text-sm opacity-70">Task type: {taskType}</div>
      <ReflectionForm
        audience="resident"
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
            authorRole: 'resident',
            residentId: me.uid,
            tutorId: tutorId || null,
            answers,
          });
        }}
      />
      {submitted ? <div className="text-sm text-green-700">Submitted</div> : null}
    </div>
  );
}
