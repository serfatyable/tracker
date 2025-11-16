export type Audience = 'resident' | 'tutor';

export type TemplateStatus = 'draft' | 'published';

export type LocalizedString = {
  en: string;
  he: string;
};

export type ReflectionPrompt = {
  id: string; // stable slug key
  order: number;
  label: LocalizedString;
  required: boolean;
};

export type ReflectionSection = {
  id: string; // stable slug key
  order: number;
  name: LocalizedString;
  purpose: LocalizedString;
  prompts: ReflectionPrompt[];
};

export type ReflectionTemplate = {
  id?: string; // Firestore document id (version document)
  templateKey: string; // e.g., default_resident, default_tutor
  version: number;
  status: TemplateStatus;
  audience: Audience;
  taskTypes: string[]; // ['*'] for default
  sections: ReflectionSection[];
  createdAt?: any;
  updatedAt?: any;
  publishedAt?: any;
  publishedBy?: string;
};

export type AuthorRole = Audience;

export type AdminComment = {
  text: string;
  adminId: string;
  createdAt: any;
};

export type Reflection = {
  id?: string; // Firestore document id (taskOccurrenceId_authorId[_residentId])
  taskOccurrenceId: string;
  taskType: string;
  templateKey: string;
  templateVersion: number;
  authorId: string;
  authorRole: AuthorRole;
  residentId: string;
  tutorId?: string | null;
  answers: Record<string, string>; // promptId -> text
  submittedAt: any;
  adminComment?: AdminComment;
};

export type ReflectionListItem = Pick<
  Reflection,
  'id' | 'taskOccurrenceId' | 'taskType' | 'authorRole' | 'submittedAt' | 'residentId' | 'tutorId'
>;
