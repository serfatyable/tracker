import { describe, it, expect } from 'vitest';

import { parseRotationCsvText, normalizeParsedRows } from '../../../../lib/rotations/import';

const sampleCsv = [
  'Category,Subject,Topic,SubTopic,ItemTitle,RequiredCount,mcqUrl,Resources,notes_en,notes_he,Link1_Label,Link1_URL,Link2_Label,Link2_URL',
  "Knowledge,Respiratory System,V/Q Mismatch,Pathophysiology of V/Q Mismatch,V/Q Mismatch – Clinical Applications,3,https://forms.gle/EXAMPLE,Miller's Anesthesia Ch.12,Clinical considerations for V/Q mismatch,שיקולים קליניים,Deranged Physiology,https://derangedphysiology.com/main/respiratory-system/ventilation-perfusion-matching,UpToDate,https://www.uptodate.com",
  'Skills,Airway Management,Endotracheal Intubation,,Airway Troubleshooting – Google Form #ICU-S-01,2,https://forms.gle/EXAMPLE2,ASA Algorithm Guide,Practice various techniques,תרגול טכניקות שונות,ASA PDF,https://example.com/asa-algorithm.pdf,,',
].join('\n');

describe('CSV Import parsing', () => {
  it('parses and normalizes rows', () => {
    const { rows } = parseRotationCsvText(sampleCsv);
    const { leaves, errors } = normalizeParsedRows(rows);
    expect(errors).toEqual([]);
    expect(leaves.length).toBe(2);
    const first = leaves[0]!;
    expect(first).toMatchObject({
      category: 'Knowledge',
      subject: 'Respiratory System',
      topic: 'V/Q Mismatch',
      itemTitle: 'V/Q Mismatch – Clinical Applications',
      requiredCount: 3,
    });
    const links0 = first.links ?? [];
    expect(links0.length).toBe(2);
    expect(links0[0]).toMatchObject({ label: 'Deranged Physiology', href: expect.any(String) });
    expect(links0[1]).toMatchObject({ label: 'UpToDate', href: expect.any(String) });
    const second = leaves[1]!;
    expect(second).toMatchObject({ category: 'Skills', requiredCount: 2 });
    const links1 = second.links ?? [];
    expect(links1.length).toBe(1);
    expect(links1[0]).toMatchObject({ label: 'ASA PDF' });
  });

  it('validates required fields', () => {
    const badCsv = [
      'Category,Subject,Topic,SubTopic,ItemTitle,RequiredCount,mcqUrl,Resources,notes_en,notes_he,Link1_Label,Link1_URL',
      'Knowledge,,,,',
    ].join('\n');
    const { rows } = parseRotationCsvText(badCsv);
    const { leaves, errors } = normalizeParsedRows(rows);
    expect(leaves.length).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validates notes length limits', () => {
    const longNote = 'a'.repeat(501);
    const csvWithLongNotes = [
      'Category,Subject,Topic,SubTopic,ItemTitle,RequiredCount,mcqUrl,Resources,notes_en,notes_he,Link1_Label,Link1_URL',
      `Knowledge,Test,Test Topic,Test SubTopic,Test Item,1,,,${longNote},valid note,,`,
    ].join('\n');
    const { rows } = parseRotationCsvText(csvWithLongNotes);
    const { errors } = normalizeParsedRows(rows);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('notes_en exceeds 500 characters'))).toBe(true);
  });

  it('handles optional SubTopic', () => {
    const csvWithoutSubTopic = [
      'Category,Subject,Topic,SubTopic,ItemTitle,RequiredCount,mcqUrl,Resources,notes_en,notes_he,Link1_Label,Link1_URL',
      'Skills,Airway,Intubation,,Basic Intubation,1,,,some resource,test note,,',
    ].join('\n');
    const { rows } = parseRotationCsvText(csvWithoutSubTopic);
    const { leaves, errors } = normalizeParsedRows(rows);
    expect(errors).toEqual([]);
    expect(leaves.length).toBe(1);
    expect(leaves[0]!.subTopic).toBeUndefined();
  });

  it('parses custom link labels', () => {
    const csvWithLinks = [
      'Category,Subject,Topic,SubTopic,ItemTitle,RequiredCount,mcqUrl,Resources,notes_en,notes_he,Link1_Label,Link1_URL,Link2_Label,Link2_URL,Link3_Label,Link3_URL',
      'Knowledge,Test,Test Topic,,Test Item,1,,,,,ASA Guidelines,https://asa.org,UpToDate Article,https://uptodate.com,,https://example.com',
    ].join('\n');
    const { rows } = parseRotationCsvText(csvWithLinks);
    const { leaves, errors } = normalizeParsedRows(rows);
    expect(errors).toEqual([]);
    expect(leaves.length).toBe(1);
    const links = leaves[0]!.links;
    expect(links.length).toBe(3);
    expect(links[0]).toMatchObject({ label: 'ASA Guidelines', href: 'https://asa.org' });
    expect(links[1]).toMatchObject({ label: 'UpToDate Article', href: 'https://uptodate.com' });
    expect(links[2]).toMatchObject({ label: 'Link 3', href: 'https://example.com' }); // Empty label defaults to "Link 3"
  });
});
