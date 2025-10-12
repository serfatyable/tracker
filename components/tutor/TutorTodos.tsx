'use client';
import { useState } from 'react';

import type { TutorTodo } from '../../lib/firebase/db';
import { createTutorTodo, toggleTutorTodoDone, deleteTutorTodo } from '../../lib/firebase/db';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import Button from '../ui/Button';

type Props = {
  todos: TutorTodo[];
  onRefresh: () => void;
};

export default function TutorTodos({ todos, onRefresh }: Props) {
  const { data: me } = useCurrentUserProfile();
  const [text, setText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onAdd = async () => {
    if (!me || !text.trim()) return;
    setCreating(true);
    try {
      await createTutorTodo({ userId: me.uid, text: text.trim() });
      setText('');
      onRefresh();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="glass-card p-3">
      <div className="font-semibold mb-2">My to-dos</div>
      <div className="mb-2 flex gap-2">
        <input
          className="w-full rounded border px-3 py-1.5 bg-transparent"
          placeholder="Add a to-do..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={onAdd} disabled={creating || !text.trim()}>
          Add
        </Button>
      </div>
      <div className="space-y-1">
        {todos.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between text-sm border rounded px-2 py-1"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!t.done}
                onChange={async (e) => {
                  setBusyId(t.id);
                  try {
                    await toggleTutorTodoDone(t.id, e.target.checked);
                    onRefresh();
                  } finally {
                    setBusyId(null);
                  }
                }}
              />
              <span className={t.done ? 'line-through opacity-60' : ''}>{t.text}</span>
            </label>
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === t.id}
              onClick={async () => {
                setBusyId(t.id);
                try {
                  await deleteTutorTodo(t.id);
                  onRefresh();
                } finally {
                  setBusyId(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        ))}
        {!todos.length ? <div className="text-xs opacity-70">No to-dos yet</div> : null}
      </div>
    </div>
  );
}
