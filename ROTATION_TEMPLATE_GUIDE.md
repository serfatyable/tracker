# Rotation Template Excel Guide

## Overview

This guide explains how to fill the rotation template Excel file for creating or updating rotation syllabi in the Tracker system. This template is designed for rotation managers and program directors to structure their training content.

## Quick Start

### 1. Download the Template

You can download the template from the admin interface:

- **Excel Template:** `/api/templates/rotation.xlsx` (recommended)
- **CSV Template:** `/api/templates/rotation.csv` (for advanced users)

### 2. Understanding the Structure

Each row in the template represents one **learning item** (a task that residents need to complete). The system uses a hierarchical structure:

```
Category → Subject → Topic → SubTopic → ItemTitle
```

## Column Definitions

### Required Columns

#### 1. **Category** (Required)

The top-level classification of the learning item.

**Valid Values:**

- `Knowledge` - Theoretical knowledge items (reading, MCQs, understanding concepts)
- `Skills` - Practical procedural skills (intubation, line placement, etc.)
- `Guidance` - Assessment and management skills (diagnosis, treatment planning)

**Examples:**

```
Knowledge
Skills
Guidance
```

⚠️ **Important:** Category names are case-sensitive. Use exact spelling.

---

#### 2. **Subject** (Required)

A broad subject area within the category. This is the first level of organization.

**Guidelines:**

- Use clear, descriptive names
- Keep consistent across your rotation
- Consider using organ systems, clinical areas, or skill types

**Examples for Knowledge:**

```
Respiratory System
Cardiovascular System
Pharmacology
Monitoring
```

**Examples for Skills:**

```
Airway Management
Vascular Access
Regional Anesthesia
Critical Care Procedures
```

**Examples for Guidance:**

```
Preoperative Assessment
Intraoperative Management
Postoperative Care
Emergency Protocols
```

---

#### 3. **Topic** (Required)

A specific topic within the subject. This creates subcategories for better organization.

**Examples:**

```
Subject: Respiratory System → Topic: V/Q Mismatch
Subject: Airway Management → Topic: Endotracheal Intubation
Subject: Vascular Access → Topic: Central Line Placement
Subject: Preoperative Assessment → Topic: Cardiac Risk Stratification
```

---

#### 4. **SubTopic** (Optional but Recommended)

An even more specific subdivision of the topic. Use this for complex topics that need further breakdown.

**Examples:**

```
Topic: V/Q Mismatch → SubTopic: Pathophysiology of V/Q Mismatch
Topic: Central Line Placement → SubTopic: Internal Jugular Approach
Topic: Regional Anesthesia → SubTopic: Ultrasound-Guided Blocks
```

**When to leave blank:**

- Simple topics that don't need further subdivision
- When the topic itself is specific enough

---

#### 5. **ItemTitle** (Required)

The specific learning item or task title. This is what residents will see and log.

**Best Practices:**

- Be specific and actionable
- Include form identifiers if using Google Forms (e.g., "#ICU-S-01")
- Use clear, concise language
- Include the assessment method if relevant

**Good Examples:**

```
V/Q Mismatch – Clinical Applications
Airway Troubleshooting – Google Form #ICU-S-01
Weaning Readiness Assessment – Google Form #ICU-G-01
Central Line Placement - Ultrasound Guided
Femoral Nerve Block - Supervised Practice
```

**Poor Examples:**

```
V/Q Mismatch (too vague - what specifically should they do?)
Form #1 (not descriptive)
Central Line (too broad)
```

---

#### 6. **RequiredCount** (Required)

The number of times a resident must complete this item.

**Format:** Whole numbers (0 or positive integers)

**Guidelines:**

- **0** = Optional item (for reference/enrichment)
- **1-3** = Common for knowledge items or supervised procedures
- **5-10** = Common for basic skills that need repetition
- **20+** = For fundamental procedures requiring mastery

**Examples by Category:**

Knowledge Items:

```
1-2 for complex theoretical concepts
3-5 for core knowledge areas
```

Skills Items:

```
3-5 for advanced procedures (e.g., difficult airway)
10-20 for intermediate procedures (e.g., central lines)
20-50 for basic procedures (e.g., IV placement)
```

Guidance Items:

```
1-3 for complex decision-making scenarios
5-10 for routine assessments
```

---

### Optional Columns

#### 7. **mcqUrl** (Optional)

URL to a Google Form, quiz, or assessment tool for this item.

**Guidelines:**

- Use full URLs starting with `https://`
- Google Forms are commonly used for knowledge assessments
- Can link to external quiz platforms

**Examples:**

```
https://forms.gle/abc123
https://www.uptodate.com/contents/xyz
https://quizlet.com/12345678/test
```

---

#### 8. **Resources** (Optional)

Learning resources for this item. Can include multiple resources separated by newlines.

**Format:** Free text, use `\n` or actual line breaks for multiple resources

**Best Practices:**

- List textbook chapters with edition numbers
- Include video resources with titles/creators
- Reference clinical guidelines
- Keep each resource on a separate line

**Examples:**

```
Miller's Anesthesia, 9th Ed, Chapter 12
Video: Ventilation-Perfusion Matching
ASA Practice Guidelines 2022
```

```
Morgan & Mikhail's Clinical Anesthesiology, 7th Ed, Chapter 8
UpToDate: Regional Anesthesia Techniques
NYSORA Atlas of Regional Anesthesia
```

---

#### 9. **notes_en** (Optional)

English-language notes or instructions for residents.

**Maximum Length:** 500 characters

**Guidelines:**

- Provide specific learning objectives
- Mention key concepts to focus on
- Include clinical pearls or tips
- Describe what successful completion looks like

**Examples:**

```
Clinical considerations for V/Q mismatch in perioperative period
```

```
Practice various laryngoscopy techniques with emphasis on video laryngoscopy. Focus on difficult airway predictors and rescue techniques.
```

```
Assess readiness using standardized criteria including respiratory rate, tidal volume, and gas exchange. Review weaning protocols.
```

---

#### 10. **notes_he** (Optional)

Hebrew-language notes (translation of notes_en).

**Maximum Length:** 500 characters

**Guidelines:**

- Should mirror the English notes content
- Use clear, professional Hebrew medical terminology
- Right-to-left formatting is automatically handled by the system

**Examples:**

```
שיקולים קליניים עבור אי-התאמת V/Q בתקופה הפרה-אופרטיבית
```

```
תרגול טכניקות לרינגוסקופיה שונות עם דגש על לרינגוסקופיה וידאו
```

---

#### 11-14. **Link Columns** (Optional)

You can add up to multiple external links with custom labels. The system automatically handles Link1, Link2, etc.

**Format:**

- **Link1_Label**: Display text for the first link
- **Link1_URL**: Full URL for the first link
- **Link2_Label**: Display text for the second link
- **Link2_URL**: Full URL for the second link
- (Continue as needed: Link3, Link4, etc.)

**Guidelines:**

- URLs must start with `https://` or `http://`
- If URL is provided but label is empty, system will generate "Link N" as label
- If URL is empty, that link pair will be ignored

**Examples:**

Link 1:

```
Label: Deranged Physiology
URL: https://derangedphysiology.com/main/respiratory-system/ventilation-perfusion-matching
```

Link 2:

```
Label: UpToDate Article
URL: https://www.uptodate.com
```

Link 3:

```
Label: ASA Guidelines PDF
URL: https://www.asahq.org/standards-and-practice-parameters
```

---

## Complete Example Rows

### Example 1: Knowledge Item (Complex)

```
Category: Knowledge
Subject: Respiratory System
Topic: V/Q Mismatch
SubTopic: Pathophysiology of V/Q Mismatch
ItemTitle: V/Q Mismatch – Clinical Applications
RequiredCount: 3
mcqUrl: https://forms.gle/EXAMPLE
Resources: Miller's Anesthesia, 9th Ed, Chapter 12
Video: Ventilation-Perfusion Matching
notes_en: Clinical considerations for V/Q mismatch in perioperative period
notes_he: שיקולים קליניים עבור אי-התאמת V/Q בתקופה הפרה-אופרטיבית
Link1_Label: Deranged Physiology
Link1_URL: https://derangedphysiology.com/main/respiratory-system
Link2_Label: UpToDate Article
Link2_URL: https://www.uptodate.com
```

### Example 2: Skills Item (Simple)

```
Category: Skills
Subject: Airway Management
Topic: Endotracheal Intubation
SubTopic: (leave blank)
ItemTitle: Airway Troubleshooting – Google Form #ICU-S-01
RequiredCount: 2
mcqUrl: https://forms.gle/EXAMPLE2
Resources: ASA Difficult Airway Algorithm
Video: Dr. Smith - Advanced Intubation Techniques
notes_en: Practice various laryngoscopy techniques with emphasis on video laryngoscopy
notes_he: תרגול טכניקות לרינגוסקופיה שונות עם דגש על לרינגוסקופיה וידאו
Link1_Label: ASA Algorithm PDF
Link1_URL: https://example.com/asa-algorithm.pdf
Link2_Label: (leave blank)
Link2_URL: (leave blank)
```

### Example 3: Guidance Item

```
Category: Guidance
Subject: Ventilator Weaning
Topic: Readiness Criteria
SubTopic: (leave blank)
ItemTitle: Weaning Readiness Assessment – Google Form #ICU-G-01
RequiredCount: 1
mcqUrl: https://forms.gle/EXAMPLE3
Resources: UpToDate: Ventilator Liberation
NEJM 2023 Guidelines
notes_en: Assess readiness using standardized criteria including respiratory rate and tidal volume
notes_he: הערכת מוכנות באמצעות קריטריונים סטנדרטיים כולל קצב נשימה ונפח גאות
Link1_Label: UpToDate: Weaning
Link1_URL: https://www.uptodate.com
Link2_Label: NEJM Guidelines
Link2_URL: https://nejm.org
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Wrong Category Spelling

```
❌ knowledge (lowercase)
❌ KNOWLEDGE (uppercase)
✅ Knowledge (correct)
```

### ❌ Mistake 2: Missing Required Fields

```
❌ Leaving Category blank
❌ Leaving Subject blank
❌ Leaving Topic blank
❌ Leaving ItemTitle blank
```

### ❌ Mistake 3: Invalid RequiredCount

```
❌ "three" (text instead of number)
❌ -5 (negative number)
❌ 3.5 (decimal - use whole numbers)
✅ 3 (correct)
✅ 0 (correct for optional items)
```

### ❌ Mistake 4: Notes Too Long

```
❌ 600 characters (exceeds 500 limit)
✅ 450 characters (within limit)
```

### ❌ Mistake 5: Invalid URLs

```
❌ www.example.com (missing protocol)
❌ example (not a URL)
✅ https://www.example.com (correct)
✅ http://example.com (correct)
```

### ❌ Mistake 6: Link URL Without Protocol

```
❌ Link1_URL: uptodate.com
✅ Link1_URL: https://uptodate.com
```

---

## Tips for Organizing Your Rotation

### 1. Start with Structure

Before filling the template, outline your rotation structure on paper:

```
Category: Knowledge
  Subject: Respiratory System
    Topic: Gas Exchange
    Topic: Mechanical Ventilation
    Topic: Respiratory Failure
  Subject: Cardiovascular System
    Topic: Hemodynamics
    Topic: Shock States

Category: Skills
  Subject: Airway Management
    Topic: Basic Airway
    Topic: Advanced Airway
  Subject: Vascular Access
    Topic: Peripheral Access
    Topic: Central Access
```

### 2. Balance Required Counts

- Don't make everything require 10+ repetitions
- Focus high counts on fundamental skills
- Use lower counts (1-3) for complex/specialized items
- Consider using 0 for enrichment/optional items

### 3. Provide Good Resources

- Include at least one primary textbook reference
- Add guidelines when available
- Link to video demonstrations for procedures
- Keep resources up-to-date with latest editions

### 4. Write Clear Notes

- Focus on what residents should pay attention to
- Include clinical context
- Mention common pitfalls or pearls
- Keep under 500 characters (about 2-3 sentences)

### 5. Use Meaningful Links

- Link to official guidelines (ASA, AHA, etc.)
- Include institutional protocols if available
- Add educational websites (Deranged Physiology, NYSORA, etc.)
- Provide form links for assessments

---

## Import Process

### Step 1: Fill the Template

1. Download the Excel template
2. Fill one row per learning item
3. Save the file

### Step 2: Validate Locally

Before importing, check:

- [ ] All required fields filled
- [ ] Category values exactly match: Knowledge, Skills, or Guidance
- [ ] RequiredCount values are whole numbers (0 or positive)
- [ ] Notes under 500 characters
- [ ] URLs start with https:// or http://
- [ ] No empty rows between data rows

### Step 3: Import via Admin Interface

1. Log in as admin
2. Go to **Admin Dashboard** → **Rotations** tab
3. Click **"Import"** button
4. Upload your Excel file
5. Review any validation errors
6. Choose import mode:
   - **Create New Rotation**: Creates a brand new rotation
   - **Merge into Existing**: Adds items to an existing rotation

### Step 4: Review Errors

If the system shows errors:

```
Row 5: invalid Category 'knowledge'
Row 12: ItemTitle is required
Row 18: notes_en exceeds 500 characters (612 chars)
```

Fix these in your Excel file and re-upload.

### Step 5: Confirm Import

Once validation passes:

- Review the preview of items to be imported
- Click **"Confirm Import"**
- The system will create/update the rotation

---

## Data Structure in the System

After import, your data becomes a tree structure:

```
Rotation: ICU Rotation
├── Category: Knowledge
│   ├── Subject: Respiratory System
│   │   ├── Topic: V/Q Mismatch
│   │   │   ├── SubTopic: Pathophysiology
│   │   │   │   └── ItemTitle: V/Q Mismatch – Clinical Applications (leaf)
│   │   │   └── SubTopic: Clinical Applications
│   │   │       └── ItemTitle: V/Q Case Studies (leaf)
│   │   └── Topic: Mechanical Ventilation
│   │       └── ItemTitle: Ventilator Modes Assessment (leaf)
│   └── Subject: Cardiovascular System
│       └── ...
├── Category: Skills
│   ├── Subject: Airway Management
│   │   └── Topic: Intubation
│   │       └── ItemTitle: Direct Laryngoscopy (leaf)
│   └── Subject: Vascular Access
│       └── ...
└── Category: Guidance
    └── Subject: Preop Assessment
        └── ...
```

**Important:** Only the leaf items (ItemTitle) are tasks that residents can log. The hierarchy (Category → Subject → Topic → SubTopic) is for organization and filtering.

---

## Bilingual Support

The system fully supports English and Hebrew:

### English Residents See:

- Category names in English (Knowledge, Skills, Guidance)
- All English field content (notes_en, Link labels)
- Resources in their original language

### Hebrew Residents See:

- Category names in Hebrew (ידע, מיומנויות, הנחיות)
- notes_he when available (falls back to notes_en)
- Resources in their original language
- Right-to-left text layout automatically

**Best Practice:** Always fill both notes_en and notes_he if you have bilingual residents.

---

## Maintenance and Updates

### Adding New Items

1. Download your existing rotation as CSV (if available)
2. Add new rows to the template
3. Import using **"Merge into Existing"** mode
4. New items will be added to the rotation

### Updating Existing Items

⚠️ **Warning:** There's currently no built-in update mechanism. Options:

- Manually edit items in the admin interface
- Delete and re-import the entire rotation (will lose resident progress!)
- Contact system administrator for database updates

### Versioning Your Templates

**Recommended:**

- Save templates with version numbers: `ICU_Rotation_v1.0.xlsx`
- Keep a changelog of major revisions
- Archive old versions before making major changes

---

## Support and Resources

### Need Help?

- Check validation errors carefully - they indicate exactly what's wrong
- Review the example rows in this guide
- Test with a small sample (5-10 items) before importing your full rotation
- Contact the system administrator for database-level issues

### Technical Details

- Import uses `/lib/rotations/import.ts` for parsing
- CSV parsing supports comma-separated values
- Excel parsing uses the XLSX library
- Maximum file size: Check with your system administrator

---

## Appendix: Full Template Structure

```csv
Category,Subject,Topic,SubTopic,ItemTitle,RequiredCount,mcqUrl,Resources,notes_en,notes_he,Link1_Label,Link1_URL,Link2_Label,Link2_URL
```

### All Columns:

1. **Category** (required) - Knowledge | Skills | Guidance
2. **Subject** (required) - Broad subject area
3. **Topic** (required) - Specific topic
4. **SubTopic** (optional) - Further subdivision
5. **ItemTitle** (required) - Specific task/item
6. **RequiredCount** (required) - Number (0+)
7. **mcqUrl** (optional) - Quiz/form URL
8. **Resources** (optional) - Learning materials
9. **notes_en** (optional) - English notes (max 500 chars)
10. **notes_he** (optional) - Hebrew notes (max 500 chars)
11. **Link1_Label** (optional) - First link label
12. **Link1_URL** (optional) - First link URL
13. **Link2_Label** (optional) - Second link label
14. **Link2_URL** (optional) - Second link URL
    15-N. **Link3+** - Additional links (extend as needed)

---

## Version History

- **v1.0** - Initial guide created
- Template supports unlimited link pairs (Link1, Link2, Link3, ...)
- System automatically validates all fields on import
