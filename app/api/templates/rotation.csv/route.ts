import { NextResponse } from 'next/server';

export async function GET() {
  const csv = [
    'Category,Subject,Topic,SubTopic,ItemTitle,RequiredCount,mcqUrl,Resources,notes_en,notes_he,Link1_Label,Link1_URL,Link2_Label,Link2_URL',
    'Knowledge,Respiratory System,V/Q Mismatch,Pathophysiology of V/Q Mismatch,V/Q Mismatch – Clinical Applications,3,https://forms.gle/EXAMPLE,"Miller\'\'s Anesthesia, 9th Ed, Chapter 12\nVideo: Ventilation-Perfusion Matching",Clinical considerations for V/Q mismatch in perioperative period,שיקולים קליניים עבור אי-התאמת V/Q בתקופה הפרה-אופרטיבית,Deranged Physiology,https://derangedphysiology.com/main/respiratory-system/ventilation-perfusion-matching,UpToDate Article,https://www.uptodate.com',
    'Skills,Airway Management,Endotracheal Intubation,,Airway Troubleshooting – Google Form #ICU-S-01,2,https://forms.gle/EXAMPLE2,"ASA Difficult Airway Algorithm\nVideo: Dr. Smith - Advanced Intubation Techniques",Practice various laryngoscopy techniques with emphasis on video laryngoscopy,תרגול טכניקות לרינגוסקופיה שונות עם דגש על לרינגוסקופיה וידאו,ASA Algorithm PDF,https://example.com/asa-algorithm.pdf,,',
    'Guidance,Ventilator Weaning,Readiness Criteria,,Weaning Readiness Assessment – Google Form #ICU-G-01,1,https://forms.gle/EXAMPLE3,"UpToDate: Ventilator Liberation\nNEJM 2023 Guidelines",Assess readiness using standardized criteria including respiratory rate and tidal volume,הערכת מוכנות באמצעות קריטריונים סטנדרטיים כולל קצב נשימה ונפח גאות,UpToDate: Weaning,https://www.uptodate.com,NEJM Guidelines,https://nejm.org',
  ].join('\n');
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="rotation-template.csv"',
    },
  });
}
