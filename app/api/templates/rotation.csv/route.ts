import { NextResponse } from 'next/server';

export async function GET() {
    const csv = [
        'Category,Subject,Topic,SubTopic,SubSubTopic,ItemTitle,RequiredCount,mcqUrl,Link1,Link2',
        'Knowledge,Respiratory System,V/Q Mismatch,Pathophysiology of V/Q Mismatch,Understand normal V/Q ratio distribution in the lung,V/Q Mismatch – Clinical Applications,3,https://forms.gle/EXAMPLE,https://derangedphysiology.com/main/respiratory-system/ventilation-perfusion-matching,https://www.uptodate.com',
        'Skills,Airway Management,Endotracheal Intubation,Direct vs Video Laryngoscopy,,Airway Troubleshooting – Google Form #ICU-S-01,2,https://forms.gle/EXAMPLE2,https://example.com/asa-algorithm.pdf,',
        'Guidance,Ventilator Weaning,Readiness Criteria,Spontaneous Breathing Trials & Sedation Minimization,,Weaning Readiness Assessment – Google Form #ICU-G-01,1,https://forms.gle/EXAMPLE3,https://www.uptodate.com,https://nejm.org',
    ].join('\n');
    return new NextResponse(csv, {
        headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': 'attachment; filename="rotation-template.csv"'
        }
    });
}


