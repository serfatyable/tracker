import type { Exam } from '@/types/exam';

/**
 * Generate an ICS (iCalendar) file for exams
 */
export function generateExamICS(exams: Exam[], language: 'en' | 'he' = 'en'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const events = exams
    .map((exam) => {
      // Combine all subject titles for the event summary
      const subjectTitles = exam.subjects.map((subject) =>
        language === 'he' ? subject.titleHe : subject.titleEn,
      );
      const title = subjectTitles.join(' + ');

      const examDate = exam.examDate.toDate();

      // Format date for ICS (YYYYMMDD)
      const dateStr = (examDate.toISOString().split('T')[0] || '').replace(/-/g, '');

      // Create event description with all subjects and their details
      const parts = [];

      // Add exam link if exists
      if (exam.examLink) {
        parts.push(`${language === 'he' ? 'קישור למבחן' : 'Exam Link'}: ${exam.examLink}`);
      }

      // Add each subject's details
      exam.subjects.forEach((subject, idx) => {
        if (exam.subjects.length > 1) {
          const subjectTitle = language === 'he' ? subject.titleHe : subject.titleEn;
          parts.push(`\\n${language === 'he' ? 'נושא' : 'Subject'} ${idx + 1}: ${subjectTitle}`);
        }

        const description = language === 'he' ? subject.descriptionHe : subject.descriptionEn;
        if (description) {
          parts.push(description);
        }

        if (subject.topics.length > 0) {
          parts.push(`${language === 'he' ? 'נושאים' : 'Topics'}: ${subject.topics.join(', ')}`);
        }

        if (subject.bookChapters.length > 0) {
          parts.push(
            `${language === 'he' ? 'פרקים' : 'Chapters'}: ${subject.bookChapters.join(', ')}`,
          );
        }

        if (subject.examLink && subject.examLink !== exam.examLink) {
          parts.push(`${language === 'he' ? 'קישור' : 'Link'}: ${subject.examLink}`);
        }
      });

      const eventDescription = parts.join('\\n').replace(/\n/g, '\\n');

      return [
        'BEGIN:VEVENT',
        `UID:exam-${exam.id}@tracker.app`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `SUMMARY:${escapeICS(title)}`,
        eventDescription ? `DESCRIPTION:${escapeICS(eventDescription)}` : '',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        `CATEGORIES:${language === 'he' ? 'מבחן' : 'Exam'}`,
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join('\r\n');
    })
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tracker//Exam Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${language === 'he' ? 'מבחנים חודשיים' : 'Monthly Exams'}`,
    `X-WR-CALDESC:${language === 'he' ? 'מבחנים חודשיים בהתמחות' : 'Monthly exams schedule'}`,
    'X-WR-TIMEZONE:Asia/Jerusalem',
    events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Download ICS file
 */
export function downloadExamICS(
  exams: Exam[],
  filename: string,
  language: 'en' | 'he' = 'en',
): void {
  const icsContent = generateExamICS(exams, language);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
