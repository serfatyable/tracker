import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import {
  rateLimiters,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/middleware/rateLimit';

/**
 * GET /api/templates/rotation.xlsx
 * Download rotation template
 *
 * SECURITY: Rate limiting prevents bandwidth abuse (60 downloads per hour per IP)
 */
export async function GET(req: Request) {
  // ✅ RATE LIMITING: Prevent template download abuse
  const identifier = getClientIdentifier(req);
  const rateLimitResponse = await checkRateLimit(identifier, rateLimiters?.templateDownload ?? null);
  if (rateLimitResponse) {
    return rateLimitResponse; // 429 Too Many Requests
  }
  // Create workbook with sample data
  const data = [
    [
      'Category',
      'Subject',
      'Topic',
      'SubTopic',
      'ItemTitle',
      'RequiredCount',
      'mcqUrl',
      'Resources',
      'notes_en',
      'notes_he',
      'Link1_Label',
      'Link1_URL',
      'Link2_Label',
      'Link2_URL',
    ],
    [
      'Knowledge',
      'Respiratory System',
      'V/Q Mismatch',
      'Pathophysiology of V/Q Mismatch',
      'V/Q Mismatch – Clinical Applications',
      3,
      'https://forms.gle/EXAMPLE',
      "Miller's Anesthesia, 9th Ed, Chapter 12\nVideo: Ventilation-Perfusion Matching",
      'Clinical considerations for V/Q mismatch in perioperative period',
      'שיקולים קליניים עבור אי-התאמת V/Q בתקופה הפרה-אופרטיבית',
      'Deranged Physiology',
      'https://derangedphysiology.com/main/respiratory-system/ventilation-perfusion-matching',
      'UpToDate Article',
      'https://www.uptodate.com',
    ],
    [
      'Skills',
      'Airway Management',
      'Endotracheal Intubation',
      '',
      'Airway Troubleshooting – Google Form #ICU-S-01',
      2,
      'https://forms.gle/EXAMPLE2',
      'ASA Difficult Airway Algorithm\nVideo: Dr. Smith - Advanced Intubation Techniques',
      'Practice various laryngoscopy techniques with emphasis on video laryngoscopy',
      'תרגול טכניקות לרינגוסקופיה שונות עם דגש על לרינגוסקופיה וידאו',
      'ASA Algorithm PDF',
      'https://example.com/asa-algorithm.pdf',
      '',
      '',
    ],
    [
      'Guidance',
      'Ventilator Weaning',
      'Readiness Criteria',
      '',
      'Weaning Readiness Assessment – Google Form #ICU-G-01',
      1,
      'https://forms.gle/EXAMPLE3',
      'UpToDate: Ventilator Liberation\nNEJM 2023 Guidelines',
      'Assess readiness using standardized criteria including respiratory rate and tidal volume',
      'הערכת מוכנות באמצעות קריטריונים סטנדרטיים כולל קצב נשימה ונפח גאות',
      'UpToDate: Weaning',
      'https://www.uptodate.com',
      'NEJM Guidelines',
      'https://nejm.org',
    ],
  ];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 12 }, // Category
    { wch: 20 }, // Subject
    { wch: 25 }, // Topic
    { wch: 30 }, // SubTopic
    { wch: 40 }, // ItemTitle
    { wch: 15 }, // RequiredCount
    { wch: 30 }, // mcqUrl
    { wch: 50 }, // Resources
    { wch: 50 }, // notes_en
    { wch: 50 }, // notes_he
    { wch: 25 }, // Link1_Label
    { wch: 50 }, // Link1_URL
    { wch: 25 }, // Link2_Label
    { wch: 50 }, // Link2_URL
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rotation Template');

  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(excelBuffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="rotation-template.xlsx"',
    },
  });
}
