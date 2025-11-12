export type ParsedRow = {
  Category: string;
  Subject?: string;
  Topic?: string;
  SubTopic?: string;
  ItemTitle?: string;
  ItemTitleFrom?: 'item' | 'subTopic' | 'topic';
  RequiredCount?: string;
  mcqUrl?: string;
  Resources?: string;
  notes_en?: string;
  notes_he?: string;
  Links?: Array<{ label: string; href: string }>; // aggregated from Link1_Label/Link1_URL pairs
};

/**
 * Parse Excel file directly (more reliable than CSV conversion)
 * Uses XLSX.utils.sheet_to_json like other imports
 */
export async function parseRotationExcel(buffer: ArrayBuffer): Promise<{
  header: string[];
  rows: ParsedRow[];
}> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0] as string];
  if (!firstSheet) {
    throw new Error('No sheets found in Excel file');
  }

  // Convert to JSON with header row (2D array)
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

  if (jsonData.length < 2) {
    return { header: [], rows: [] };
  }

  const headerRow = jsonData[0] as string[];
  const header = headerRow.map((h) => String(h || '').trim());

  // Find column indices using flexible matching
  const findColumnIndex = (possibleNames: string[]): number => {
    for (let idx = 0; idx < header.length; idx++) {
      const h = header[idx] || '';
      const hNorm = h.toLowerCase().replace(/\s+/g, '').replace(/:/g, '').replace(/\./g, '');
      for (const name of possibleNames) {
        const nameNorm = name.toLowerCase().replace(/\s+/g, '');
        // Exact match (after normalization)
        if (hNorm === nameNorm) {
          return idx;
        }
        // Header contains the name (e.g., "Item Title" contains "itemtitle")
        if (hNorm.length >= nameNorm.length && hNorm.includes(nameNorm)) {
          return idx;
        }
        // Name contains the header (e.g., "itemtitle" contains "item" - but be careful)
        // Only allow this if the header is at least 3 chars to avoid false matches
        if (hNorm.length >= 3 && nameNorm.includes(hNorm)) {
          return idx;
        }
      }
    }
    return -1;
  };

  // Try to find columns with multiple variations
  const categoryCol = findColumnIndex([
    'Category',
    'category',
    'קטגוריה', // Hebrew: category
  ]);
  const subjectCol = findColumnIndex([
    'Subject',
    'subject',
    'נושא', // Hebrew: subject
  ]);
  const topicCol = findColumnIndex([
    'Topic',
    'topic',
    'נושא משנה', // Hebrew: subtopic (might be used)
  ]);
  const subTopicCol = findColumnIndex([
    'SubTopic',
    'Sub Topic',
    'subtopic',
    'sub topic',
    'תת נושא', // Hebrew: subtopic
  ]);
  let itemTitleCol = findColumnIndex([
    'ItemTitle',
    'Item Title',
    'ItemTitle:',
    'Item Title:',
    'itemtitle',
    'item title',
    'Item',
    'כותרת פריט', // Hebrew: item title
    'פריט', // Hebrew: item
    'תיאור', // Hebrew: description
  ]);

  // If ItemTitle column not found, try to find it by position (5th column is common)
  // This is a fallback for files that might have different column names
  if (itemTitleCol === -1 && header.length >= 5) {
    // Try column index 4 (5th column, 0-indexed) as fallback
    const fallbackCol = header[4];
    if (fallbackCol && String(fallbackCol).trim().length > 0) {
      // Use it if it looks like it might be ItemTitle (has some content)
      itemTitleCol = 4;
    }
  }
  const requiredCountCol = findColumnIndex([
    'RequiredCount',
    'Required Count',
    'requiredcount',
    'required count',
  ]);
  const mcqUrlCol = findColumnIndex(['mcqUrl', 'mcq Url', 'mcqurl', 'mcq url']);
  const resourcesCol = findColumnIndex(['Resources', 'resources']);
  const notesEnCol = findColumnIndex(['notes_en', 'notes en', 'Notes (EN)', 'notes_en']);
  const notesHeCol = findColumnIndex(['notes_he', 'notes he', 'Notes (HE)', 'notes_he']);

  // Find link columns
  const linkColumns: Array<{ num: number; labelCol: number; urlCol: number }> = [];
  header.forEach((h, idx) => {
    const match = String(h || '').match(/^Link(\d+)[_\s](Label|URL)$/i);
    if (match) {
      const num = parseInt(match[1]!, 10);
      const type = match[2]!.toLowerCase();
      const existing = linkColumns.find((l) => l.num === num);
      if (existing) {
        if (type === 'label') existing.labelCol = idx;
        else existing.urlCol = idx;
      } else {
        linkColumns.push({
          num,
          labelCol: type === 'label' ? idx : -1,
          urlCol: type === 'url' ? idx : -1,
        });
      }
    }
  });

  const rows: ParsedRow[] = [];

  // Process data rows (skip header row)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const getValue = (colIdx: number): string => {
      if (colIdx === -1 || colIdx >= row.length) return '';
      const val = row[colIdx];
      return String(val || '').trim();
    };

    // Collect links
    const linkPairs: Array<{ label: string; href: string }> = [];
    linkColumns.forEach((link) => {
      const href = getValue(link.urlCol);
      if (href) {
        const label = getValue(link.labelCol) || `Link ${link.num}`;
        linkPairs.push({ label, href });
      }
    });

    // Get values
    const category = getValue(categoryCol);
    const subject = getValue(subjectCol);
    const topic = getValue(topicCol);
    const subTopicValue = getValue(subTopicCol);
    const subTopic = subTopicValue || undefined;
    let itemTitle = getValue(itemTitleCol);
    let itemTitleFrom: 'item' | 'subTopic' | 'topic' = 'item';

    // Fallback logic: If ItemTitle is empty, use SubTopic; if that's also empty, use Topic
    if (!itemTitle || itemTitle.trim().length === 0) {
      if (subTopic && subTopic.trim().length > 0) {
        itemTitle = subTopic;
        itemTitleFrom = 'subTopic';
      } else if (topic && topic.trim().length > 0) {
        itemTitle = topic;
        itemTitleFrom = 'topic';
      }
    }

    const parsedRow: ParsedRow = {
      Category: category,
      Subject: subject,
      Topic: topic,
      SubTopic: subTopic,
      ItemTitle: itemTitle,
      ItemTitleFrom: itemTitleFrom,
      RequiredCount: getValue(requiredCountCol),
      mcqUrl: getValue(mcqUrlCol) || undefined,
      Resources: getValue(resourcesCol) || undefined,
      notes_en: getValue(notesEnCol) || undefined,
      notes_he: getValue(notesHeCol) || undefined,
      Links: linkPairs,
    };

    rows.push(parsedRow);
  }

  return { header, rows };
}

/**
 * Find column value by matching multiple possible header names (case-insensitive, handles spaces)
 */
function findColumnValue(rec: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    // Try exact match first
    if (rec[name] !== undefined) return rec[name] || '';
    // Try case-insensitive match
    const found = Object.keys(rec).find(
      (key) => key.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, ''),
    );
    if (found !== undefined) return rec[found] || '';
  }
  return '';
}

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
      const match = h.match(/^Link(\d+)[_\s](Label|URL)$/i);
      if (match) {
        linkNumbers.add(parseInt(match[1]!, 10));
      }
    });

    // For each link number, create a link object if URL exists
    Array.from(linkNumbers)
      .sort((a, b) => a - b)
      .forEach((num) => {
        const labelKey = header.find((h) => h.match(new RegExp(`^Link${num}[_\\s]Label$`, 'i')));
        const urlKey = header.find((h) => h.match(new RegExp(`^Link${num}[_\\s]URL$`, 'i')));
        const label = labelKey ? rec[labelKey] || '' : '';
        const href = urlKey ? rec[urlKey] || '' : '';
        if (href) {
          // Only add if URL is provided
          linkPairs.push({
            label: label || `Link ${num}`, // Fallback to "Link N" if label is empty
            href,
          });
        }
      });

    const row: ParsedRow = {
      Category: findColumnValue(rec, ['Category', 'category']),
      Subject: findColumnValue(rec, ['Subject', 'subject']),
      Topic: findColumnValue(rec, ['Topic', 'topic']),
      SubTopic: findColumnValue(rec, ['SubTopic', 'Sub Topic', 'subtopic', 'sub topic']),
      ItemTitle: findColumnValue(rec, ['ItemTitle', 'Item Title', 'itemtitle', 'item title']),
      ItemTitleFrom: 'item',
      RequiredCount: findColumnValue(rec, [
        'RequiredCount',
        'Required Count',
        'requiredcount',
        'required count',
      ]),
      mcqUrl: findColumnValue(rec, ['mcqUrl', 'mcq Url', 'mcqurl', 'mcq url']),
      Resources: findColumnValue(rec, ['Resources', 'resources']),
      notes_en: findColumnValue(rec, ['notes_en', 'notes en', 'Notes (EN)', 'notes_en']),
      notes_he: findColumnValue(rec, ['notes_he', 'notes he', 'Notes (HE)', 'notes_he']),
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

/**
 * Map category name (English or Hebrew) to normalized English category
 */
function normalizeCategory(category: string): 'Knowledge' | 'Skills' | 'Guidance' | null {
  const catTrimmed = category.trim();
  const catLower = catTrimmed.toLowerCase();

  // English categories (case-insensitive)
  if (catLower === 'knowledge') return 'Knowledge';
  if (catLower === 'skills') return 'Skills';
  if (catLower === 'guidance') return 'Guidance';

  // Hebrew categories: ידע (Knowledge), מיומנות (Skills), הדרכה (Guidance)
  // Note: Hebrew doesn't have lowercase, so we check the trimmed value directly
  if (catTrimmed === 'ידע') return 'Knowledge';
  if (catTrimmed === 'מיומנות') return 'Skills';
  if (catTrimmed === 'הדרכה') return 'Guidance';

  return null;
}

export function normalizeParsedRows(rows: ParsedRow[]): {
  leaves: NormalizedLeaf[];
  errors: string[];
} {
  const errors: string[] = [];
  const leaves: NormalizedLeaf[] = [];

  // Track if we've shown the column debug message
  let shownColumnDebug = false;

  rows.forEach((r, idx) => {
    const rowNum = idx + 2; // header is line 1

    // Normalize category (accept both English and Hebrew)
    const normalizedCategory = normalizeCategory(r.Category);
    if (!normalizedCategory && r.Category) {
      errors.push(
        `Row ${rowNum}: invalid Category '${r.Category}'. Valid values: Knowledge/Skills/Guidance or ידע/מיומנות/הדרכה`,
      );
    }

    // Apply fallback logic: ItemTitle → SubTopic → Topic
    let itemTitle = (r.ItemTitle || '').trim();
    let subTopic = (r.SubTopic || '').trim();
    const topic = (r.Topic || '').trim();
    let fallbackSource: 'item' | 'subTopic' | 'topic' = r.ItemTitleFrom || 'item';

    if (!itemTitle || itemTitle.length === 0) {
      if (subTopic && subTopic.length > 0) {
        itemTitle = subTopic;
        fallbackSource = 'subTopic';
      } else if (topic && topic.length > 0) {
        itemTitle = topic;
        fallbackSource = 'topic';
      }
    }

    if (fallbackSource === 'subTopic') {
      subTopic = '';
    }

    const subject = (r.Subject || '').trim();

    // Only show column mapping error if ItemTitle column is completely missing AND we can't fallback
    if (!itemTitle && !shownColumnDebug && idx === 0) {
      shownColumnDebug = true;
      // Check if ItemTitle column exists but is empty vs doesn't exist at all
      const hasItemTitleColumn = 'ItemTitle' in r;
      if (!hasItemTitleColumn) {
        const parsedFields = Object.entries(r)
          .filter(([_, v]) => v && String(v).trim().length > 0)
          .map(([k]) => k)
          .join(', ');
        if (parsedFields) {
          errors.push(
            `Note: 'ItemTitle' column not found in Excel file. Using fallback: SubTopic → Topic. Parsed fields from first row: ${parsedFields}.`,
          );
        }
      }
    }

    if (!itemTitle) {
      errors.push(
        `Row ${rowNum}: ItemTitle is required (tried fallback: SubTopic → Topic, but both are empty)`,
      );
    }
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

    if (normalizedCategory && itemTitle && subject && topic) {
      const effectiveSubTopic = subTopic ? subTopic : undefined;
      leaves.push({
        category: normalizedCategory,
        subject,
        topic,
        subTopic: effectiveSubTopic,
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
