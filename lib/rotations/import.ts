export type ParsedRow = {
  Category: string;
  Subject?: string;
  Topic?: string;
  SubTopic?: string;
  ItemTitle?: string;
  RequiredCount?: string;
  mcqUrl?: string;
  Resources?: string;
  notes_en?: string;
  notes_he?: string;
  Links?: Array<{ label: string; href: string }>; // aggregated from Link1_Label/Link1_URL pairs
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

    // collect links from Link1_Label/Link1_URL, Link2_Label/Link2_URL, etc.
    const linkPairs: Array<{ label: string; href: string }> = [];
    const linkNumbers = new Set<number>();

    // Find all link numbers by scanning for both _Label and _URL patterns
    header.forEach((h) => {
      const match = h.match(/^Link(\d+)_(Label|URL)$/i);
      if (match) {
        linkNumbers.add(parseInt(match[1]!, 10));
      }
    });

    // For each link number, create a link object if URL exists
    Array.from(linkNumbers)
      .sort((a, b) => a - b)
      .forEach((num) => {
        const label = rec[`Link${num}_Label`] || '';
        const href = rec[`Link${num}_URL`] || '';
        if (href) {
          // Only add if URL is provided
          linkPairs.push({
            label: label || `Link ${num}`, // Fallback to "Link N" if label is empty
            href,
          });
        }
      });

    const row: ParsedRow = {
      Category: rec['Category'] || '',
      Subject: rec['Subject'] || '',
      Topic: rec['Topic'] || '',
      SubTopic: rec['SubTopic'] || '',
      ItemTitle: rec['ItemTitle'] || '',
      RequiredCount: rec['RequiredCount'] || '',
      mcqUrl: rec['mcqUrl'] || '',
      Resources: rec['Resources'] || '',
      notes_en: rec['notes_en'] || '',
      notes_he: rec['notes_he'] || '',
      Links: linkPairs,
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
  itemTitle: string;
  requiredCount: number;
  mcqUrl?: string;
  resources?: string;
  notes_en?: string;
  notes_he?: string;
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
    const links = r.Links || []; // Links are already in {label, href} format from parsing
    const resources = (r.Resources || '').trim() || undefined;
    const notes_en = (r.notes_en || '').trim() || undefined;
    const notes_he = (r.notes_he || '').trim() || undefined;

    // Validate notes length (max 500 chars each)
    if (notes_en && notes_en.length > 500) {
      errors.push(`Row ${rowNum}: notes_en exceeds 500 characters (${notes_en.length} chars)`);
    }
    if (notes_he && notes_he.length > 500) {
      errors.push(`Row ${rowNum}: notes_he exceeds 500 characters (${notes_he.length} chars)`);
    }

    if (allowedCats.has(r.Category) && itemTitle && subject && topic) {
      leaves.push({
        category: r.Category as any,
        subject,
        topic,
        subTopic: (r.SubTopic || '').trim() || undefined,
        itemTitle,
        requiredCount,
        mcqUrl: (r.mcqUrl || '').trim() || undefined,
        resources,
        notes_en,
        notes_he,
        links,
      });
    }
  });
  return { leaves, errors };
}
