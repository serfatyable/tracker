export type ParsedRow = {
  Category: string;
  Subject?: string;
  Topic?: string;
  SubTopic?: string;
  SubSubTopic?: string;
  ItemTitle?: string;
  RequiredCount?: string;
  mcqUrl?: string;
  Links?: string[]; // aggregated from Link1..LinkN
};

export function parseRotationCsvText(text: string): { header: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { header: [], rows: [] };
  const rawHeader = lines.shift() as string;
  const header = rawHeader.split(',').map((s) => s.trim());
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    const cols = line.split(',');
    const rec: any = {};
    header.forEach((h, i) => {
      rec[h] = (cols[i] || '').trim();
    });
    // collect links
    const linkCols = header.filter((h) => /^Link\d+$/i.test(h));
    const links = linkCols.map((h) => rec[h]).filter((v: string) => !!v);
    const row: ParsedRow = {
      Category: rec['Category'] || '',
      Subject: rec['Subject'] || '',
      Topic: rec['Topic'] || '',
      SubTopic: rec['SubTopic'] || '',
      SubSubTopic: rec['SubSubTopic'] || '',
      ItemTitle: rec['ItemTitle'] || '',
      RequiredCount: rec['RequiredCount'] || '',
      mcqUrl: rec['mcqUrl'] || '',
      Links: links,
    };
    rows.push(row);
  }
  return { header, rows };
}

export type NormalizedLeaf = {
  category: 'Knowledge' | 'Skills' | 'Guidance';
  subject: string;
  topic: string;
  subTopic?: string;
  subSubTopic?: string;
  itemTitle: string;
  requiredCount: number;
  mcqUrl?: string;
  links: Array<{ label: string; href: string }>;
};

export function normalizeParsedRows(rows: ParsedRow[]): {
  leaves: NormalizedLeaf[];
  errors: string[];
} {
  const errors: string[] = [];
  const leaves: NormalizedLeaf[] = [];
  const allowedCats = new Set(['Knowledge', 'Skills', 'Guidance']);
  rows.forEach((r, idx) => {
    const rowNum = idx + 2; // header is line 1
    if (!allowedCats.has(r.Category))
      errors.push(`Row ${rowNum}: invalid Category '${r.Category}'`);
    const itemTitle = (r.ItemTitle || '').trim();
    const subject = (r.Subject || '').trim();
    const topic = (r.Topic || '').trim();
    if (!itemTitle) errors.push(`Row ${rowNum}: ItemTitle is required`);
    if (!subject) errors.push(`Row ${rowNum}: Subject is required`);
    if (!topic) errors.push(`Row ${rowNum}: Topic is required`);
    const required = parseInt(String(r.RequiredCount || '0'), 10);
    const requiredCount = Number.isFinite(required) && required >= 0 ? required : 0;
    const links = (r.Links || []).map((href, i) => ({ label: `Link ${i + 1}`, href }));
    if (allowedCats.has(r.Category) && itemTitle && subject && topic) {
      leaves.push({
        category: r.Category as any,
        subject,
        topic,
        subTopic: (r.SubTopic || '').trim() || undefined,
        subSubTopic: (r.SubSubTopic || '').trim() || undefined,
        itemTitle,
        requiredCount,
        mcqUrl: (r.mcqUrl || '').trim() || undefined,
        links,
      });
    }
  });
  return { leaves, errors };
}
