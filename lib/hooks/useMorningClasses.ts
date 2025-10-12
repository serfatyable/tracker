'use client';
import { useEffect, useState } from 'react';
import type { MorningMeeting } from '../../types/morningMeetings';
import { listMorningMeetingsByDateRange, listMorningMeetingsForMonth } from '../morning-meetings/store';

export function useMorningMeetingsUpcoming(): {
  today: MorningMeeting[] | null;
  tomorrow: MorningMeeting[] | null;
  next7: MorningMeeting[] | null; // next 7 days starting tomorrow
  loading: boolean;
  error: Error | null;
} {
  const [today, setToday] = useState<MorningMeeting[] | null>(null);
  const [tomorrow, setTomorrow] = useState<MorningMeeting[] | null>(null);
  const [next7, setNext7] = useState<MorningMeeting[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const tzNow = now; // keep UTC here; server stores Timestamp; UI will display with tz
        const startToday = new Date(Date.UTC(tzNow.getUTCFullYear(), tzNow.getUTCMonth(), tzNow.getUTCDate(), 0, 0, 0));
        const startTomorrow = new Date(Date.UTC(tzNow.getUTCFullYear(), tzNow.getUTCMonth(), tzNow.getUTCDate() + 1, 0, 0, 0));
        const startNext8 = new Date(Date.UTC(tzNow.getUTCFullYear(), tzNow.getUTCMonth(), tzNow.getUTCDate() + 8, 0, 0, 0));

        const [todayAll, next8All] = await Promise.all([
          listMorningMeetingsByDateRange(startToday, startTomorrow),
          listMorningMeetingsByDateRange(startTomorrow, startNext8),
        ]);
        if (cancelled) return;
        setToday(todayAll);
        // split tomorrow vs rest
        const tomorrowEnd = new Date(Date.UTC(tzNow.getUTCFullYear(), tzNow.getUTCMonth(), tzNow.getUTCDate() + 2, 0, 0, 0));
        const tmrwOnly = next8All.filter((c) => c.date.toMillis() < tomorrowEnd.getTime());
        const afterTmrw = next8All.filter((c) => !tmrwOnly.includes(c));
        setTomorrow(tmrwOnly);
        setNext7([...tmrwOnly, ...afterTmrw]);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { today, tomorrow, next7, loading, error };
}

export function useMorningMeetingsMonth(year: number, month0: number) {
  const [list, setList] = useState<MorningMeeting[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const items = await listMorningMeetingsForMonth(year, month0);
        if (!cancelled) setList(items);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [year, month0]);
  return { list, loading, error };
}


