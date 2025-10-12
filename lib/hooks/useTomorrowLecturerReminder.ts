'use client';
import { useEffect, useState } from 'react';
import { useCurrentUserProfile } from './useCurrentUserProfile';
import { listMorningMeetingsByDateRange } from '../morning-meetings/store';

export function useTomorrowLecturerReminder() {
  const { data: me } = useCurrentUserProfile();
  const [meeting, setMeeting] = useState<any | null>(null);
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!me || me.settings?.morningMeetings?.reminderOptIn !== true) return;
      const now = new Date();
      // Only after 12:00 local time
      const localHour = new Date().getHours();
      if (localHour < 12) return;
      const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const dayAfter = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 0, 0, 0));
      const rows = await listMorningMeetingsByDateRange(tomorrowStart, dayAfter);
      const mine = rows.find((r: any) => {
        if (r.lecturerUserId && r.lecturerUserId === me.uid) return true;
        if (me.email && r.lecturerEmailResolved && r.lecturerEmailResolved === me.email) return true;
        const a = String(me.fullName || '').trim().toLowerCase();
        const b = String(r.lecturer || '').trim().toLowerCase();
        return a && b && (a === b || b.includes(a) || a.includes(b));
      });
      if (!cancelled) {
        setMeeting(mine || null);
        setShow(!!mine);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [me?.uid, me?.email, me?.fullName, me?.settings?.morningMeetings?.reminderOptIn]);

  return { show, meeting } as const;
}


