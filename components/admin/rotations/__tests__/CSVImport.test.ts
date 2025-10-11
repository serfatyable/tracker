import { describe, it, expect } from 'vitest';
import { parseRotationCsvText, normalizeParsedRows } from '../../../../lib/rotations/import';

const sampleCsv = [
  'Category,Subject,Topic,SubTopic,SubSubTopic,ItemTitle,RequiredCount,mcqUrl,Link1,Link2',
  'Knowledge,Respiratory System,V/Q Mismatch,Pathophysiology of V/Q Mismatch,,V/Q Mismatch – Clinical Applications,3,https://forms.gle/EXAMPLE,https://derangedphysiology.com/main/respiratory-system/ventilation-perfusion-matching,https://www.uptodate.com',
  'Skills,Airway Management,Endotracheal Intubation,Direct vs Video Laryngoscopy,,Airway Troubleshooting – Google Form #ICU-S-01,2,https://forms.gle/EXAMPLE2,https://example.com/asa-algorithm.pdf,',
].join('\n');

describe('CSV Import parsing', () => {
  it('parses and normalizes rows', () => {
    const { rows } = parseRotationCsvText(sampleCsv);
    const { leaves, errors } = normalizeParsedRows(rows);
    expect(errors).toEqual([]);
    expect(leaves.length).toBe(2);
    const first = leaves[0]!;
    expect(first).toMatchObject({
      category: 'Knowledge', subject: 'Respiratory System', topic: 'V/Q Mismatch', itemTitle: 'V/Q Mismatch – Clinical Applications', requiredCount: 3,
    });
    const links0 = first.links ?? [];
    expect(links0.length).toBe(2);
    const second = leaves[1]!;
    expect(second).toMatchObject({ category: 'Skills', requiredCount: 2 });
  });

  it('validates required fields', () => {
    const badCsv = ['Category,Subject,Topic,SubTopic,SubSubTopic,ItemTitle,RequiredCount,mcqUrl', 'Knowledge,,,,' ].join('\n');
    const { rows } = parseRotationCsvText(badCsv);
    const { leaves, errors } = normalizeParsedRows(rows);
    expect(leaves.length).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});


