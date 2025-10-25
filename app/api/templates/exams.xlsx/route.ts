import { NextResponse } from 'next/server';

import { generateExamsTemplate } from '@/lib/exams/excel';

export const dynamic = 'force-dynamic';

/**
 * GET /api/templates/exams.xlsx
 * Download Excel template for bulk exam import
 */
export async function GET() {
  try {
    const buffer = generateExamsTemplate();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="exams-template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating exams template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
