'use client';
import { useCurrentUserProfile } from '../../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForTutor } from '../../../lib/hooks/useReflections';

export default function TutorReflectionsIndexPage() {
  const { data: me } = useCurrentUserProfile();
  const { list } = useReflectionsForTutor(me?.uid || null);
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Reflections I wrote</h1>
      <div className="text-sm opacity-70">Recently submitted reflections.</div>
      <div className="space-y-2">
        {(list || []).map((r) => (
          <div key={r.id} className="border rounded p-2 text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">{r.taskType}</div>
              <div className="text-xs opacity-70">{r.taskOccurrenceId}</div>
            </div>
            <div className="text-xs opacity-70">
              {r.submittedAt?.toDate?.()?.toLocaleString?.() || ''}
            </div>
          </div>
        ))}
        {!list?.length ? <div className="text-sm opacity-70">No reflections yet.</div> : null}
      </div>
    </div>
  );
}
