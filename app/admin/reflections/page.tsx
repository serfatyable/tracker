'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseApp } from '../../../lib/firebase/client';
import type { Audience, Reflection, ReflectionTemplate } from '../../../types/reflections';
import Button from '../../../components/ui/Button';

function TemplatesTab() {
  const [audience, setAudience] = useState<Audience>('resident');
  const [templates, setTemplates] = useState<ReflectionTemplate[]>([]);
  const [selected, setSelected] = useState<ReflectionTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const db = getFirestore(getFirebaseApp());
      const qRef = query(
        collection(db, 'reflectionTemplates'),
        where('audience', '==', audience),
        orderBy('version', 'desc'),
      );
      const snap = await getDocs(qRef);
      if (!cancelled)
        setTemplates(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReflectionTemplate[],
        );
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [audience]);

  const latest = templates.filter((t) => t.status === 'published')[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label>Audience</label>
        <select
          className="border rounded px-2 py-1"
          value={audience}
          onChange={(e) => setAudience(e.target.value as Audience)}
        >
          <option value="resident">resident</option>
          <option value="tutor">tutor</option>
        </select>
        <Button variant="outline" onClick={() => setSelected(latest || null)}>
          Edit latest
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setSelected(
              latest
                ? { ...latest, id: undefined, status: 'draft', version: (latest.version || 0) + 1 }
                : ({
                    templateKey: audience === 'resident' ? 'default_resident' : 'default_tutor',
                    version: 1,
                    status: 'draft',
                    audience,
                    taskTypes: ['*'],
                    sections: [],
                  } as any),
            )
          }
        >
          Create draft
        </Button>
      </div>
      {selected ? (
        <TemplateEditor template={selected} onClose={() => setSelected(null)} />
      ) : (
        <div className="text-sm opacity-70">Select audience to view/publish templates.</div>
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
}: {
  template: ReflectionTemplate;
  onClose: () => void;
}) {
  const [working, setWorking] = useState<ReflectionTemplate>(template);
  const [saving, setSaving] = useState(false);
  const db = getFirestore(getFirebaseApp());

  const onAddSection = () => {
    const idx = (working.sections?.length || 0) + 1;
    const id = `section_${idx}`;
    setWorking({
      ...working,
      sections: [
        ...(working.sections || []),
        {
          id,
          order: idx,
          name: { en: `Section ${idx}`, he: `סעיף ${idx}` },
          purpose: { en: '', he: '' },
          prompts: [],
        },
      ],
    });
  };
  const onAddPrompt = (sectionId: string) => {
    const next = { ...working };
    const s = next.sections.find((x) => x.id === sectionId)!;
    const cnt = (s.prompts?.length || 0) + 1;
    s.prompts.push({
      id: `${sectionId}.prompt_${cnt}`,
      order: cnt,
      label: { en: `Prompt ${cnt}`, he: `שאלה ${cnt}` },
      required: true,
    });
    setWorking(next);
  };

  const onSaveDraft = async () => {
    setSaving(true);
    try {
      if (working.id) {
        await updateDoc(doc(db, 'reflectionTemplates', working.id), {
          ...working,
          updatedAt: serverTimestamp(),
        } as any);
      } else {
        await addDoc(collection(db, 'reflectionTemplates'), {
          ...working,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as any);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };
  const onPublish = async () => {
    setSaving(true);
    try {
      if (working.id) {
        await updateDoc(doc(db, 'reflectionTemplates', working.id), {
          status: 'published',
          publishedAt: serverTimestamp(),
        } as any);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="font-semibold">
          Editing template v{working.version} ({working.status})
        </div>
        <div className="text-xs opacity-70">{working.audience}</div>
      </div>
      <div className="space-y-3">
        {working.sections?.map((s) => (
          <div key={s.id} className="border rounded p-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{s.name.en}</div>
              <Button size="sm" variant="outline" onClick={() => onAddPrompt(s.id)}>
                Add prompt
              </Button>
            </div>
            <div className="text-xs opacity-70">{s.purpose.en}</div>
            <div className="space-y-2 mt-2">
              {s.prompts.map((p) => (
                <div key={p.id} className="grid grid-cols-2 gap-2 items-center">
                  <input
                    className="border rounded px-2 py-1"
                    value={p.label.en}
                    onChange={(e) => {
                      const next = { ...working };
                      const sec = next.sections.find((x) => x.id === s.id)!;
                      const pr = sec.prompts.find((x) => x.id === p.id)!;
                      pr.label.en = e.target.value;
                      setWorking(next);
                    }}
                  />
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      checked={!!p.required}
                      onChange={(e) => {
                        const next = { ...working } as ReflectionTemplate;
                        const sec = next.sections.find((x) => x.id === s.id)!;
                        const pr = sec.prompts.find((x) => x.id === p.id)!;
                        pr.required = e.target.checked;
                        setWorking(next);
                      }}
                    />{' '}
                    Required
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={onAddSection}>
          Add section
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onSaveDraft} disabled={saving}>
          Save draft
        </Button>
        <Button onClick={onPublish} disabled={saving || !working.id}>
          Publish
        </Button>
      </div>
    </div>
  );
}

function SubmissionsTab() {
  const [rows, setRows] = useState<Reflection[]>([]);
  const [selected, setSelected] = useState<Reflection | null>(null);
  const [comment, setComment] = useState('');
  const db = getFirestore(getFirebaseApp());

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const qRef = query(collection(db, 'reflections'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(qRef);
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Reflection[];
      if (!cancelled) setRows(list);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSaveComment = async () => {
    if (!selected) return;
    await updateDoc(doc(db, 'reflections', selected.id as string), {
      adminComment: { text: comment, adminId: 'me', createdAt: serverTimestamp() },
    } as any);
    setSelected(null);
    setComment('');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="border rounded p-2 text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">
                {r.taskType} — {r.authorRole}
              </div>
              <div className="text-xs opacity-70">{r.taskOccurrenceId}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-70">
                {r.submittedAt?.toDate?.()?.toLocaleString?.() || ''}
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                Open
              </Button>
            </div>
          </div>
        ))}
        {!rows.length ? <div className="text-sm opacity-70">No submissions yet.</div> : null}
      </div>
      {selected ? (
        <div className="border rounded p-3 space-y-2">
          <div className="font-semibold">Reflection detail</div>
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(selected.answers, null, 2)}
          </pre>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="Admin comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button onClick={onSaveComment}>Save</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminReflectionsPage() {
  const [tab, setTab] = useState<'templates' | 'submissions'>('templates');
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Reflections</h1>
      <div className="flex items-center gap-2">
        <Button
          variant={tab === 'templates' ? 'default' : 'outline'}
          onClick={() => setTab('templates')}
        >
          Templates
        </Button>
        <Button
          variant={tab === 'submissions' ? 'default' : 'outline'}
          onClick={() => setTab('submissions')}
        >
          Submissions
        </Button>
      </div>
      {tab === 'templates' ? <TemplatesTab /> : <SubmissionsTab />}
    </div>
  );
}
