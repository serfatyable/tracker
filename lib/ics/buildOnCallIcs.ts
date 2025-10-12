import { buildIcsCalendar, simpleHash } from './buildMorningMeetingsIcs';
import type { OnCallAssignment } from '../../types/onCall';

export function buildOnCallIcs(assignments: OnCallAssignment[], userName?: string): string {
  const events = assignments.map((a) => {
    const start = (a.startAt as any).seconds ? new Date((a.startAt as any).seconds * 1000) : (a.startAt as any as Date);
    const end = (a.endAt as any).seconds ? new Date((a.endAt as any).seconds * 1000) : (a.endAt as any as Date);
    const title = `On Call — ${a.stationKey}`;
    const uid = `oncall-${a.id}-${simpleHash(`${a.userId}-${a.dateKey}-${a.stationKey}`)}@tracker`;
    return { uid, title, start, end };
  });
  const name = userName ? `${userName} — On Call` : 'On Call';
  return buildIcsCalendar(name, events as any);
}


