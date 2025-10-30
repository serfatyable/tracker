import type { OnCallAssignment } from '../../types/onCall';

import { buildIcsCalendar, simpleHash } from './buildMorningMeetingsIcs';

interface OnCallShift {
  date: Date;
  shiftType: string;
  dateKey: string;
}

export function buildOnCallIcs(
  assignments: OnCallAssignment[] | OnCallShift[],
  userName?: string,
): string {
  const events = assignments.map((a: any) => {
    // Handle new shift format
    if (a.date && a.shiftType) {
      const shift = a as OnCallShift;
      const start = shift.date;
      const end = new Date(start);
      end.setHours(23, 59, 59); // End of day
      const title = `On Call — ${shift.shiftType}`;
      const uid = `oncall-${simpleHash(`${shift.dateKey}-${shift.shiftType}`)}@tracker`;
      return { uid, title, start, end };
    }

    // Handle legacy assignment format
    const assignment = a as OnCallAssignment;
    const start = (assignment.startAt as any).seconds
      ? new Date((assignment.startAt as any).seconds * 1000)
      : (assignment.startAt as any as Date);
    const end = (assignment.endAt as any).seconds
      ? new Date((assignment.endAt as any).seconds * 1000)
      : (assignment.endAt as any as Date);
    const title = `On Call — ${assignment.stationKey}`;
    const uid = `oncall-${assignment.id}-${simpleHash(`${assignment.userId}-${assignment.dateKey}-${assignment.stationKey}`)}@tracker`;
    return { uid, title, start, end };
  });
  const name = userName ? `${userName} — On Call` : 'On Call';
  return buildIcsCalendar(name, events as any);
}
