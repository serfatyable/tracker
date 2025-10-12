import type { Timestamp } from 'firebase/firestore';

export type RotationStatus = 'active' | 'inactive' | 'finished';

export type Rotation = {
    id: string;
    name: string;
    name_en?: string;
    name_he?: string;
    startDate: Timestamp;
    endDate: Timestamp;
    status: RotationStatus;
    isCore?: boolean;
    createdAt: Timestamp;
};

export type RotationNodeType = 'category' | 'subject' | 'topic' | 'subTopic' | 'subSubTopic' | 'leaf';

export type RotationNode = {
    id: string;
    rotationId: string;
    parentId: string | null;
    type: RotationNodeType;
    name: string;
    order: number;
    // leaf-only fields
    requiredCount?: number;
    links?: Array<{ label: string; href: string }>;
    mcqUrl?: string;
};


