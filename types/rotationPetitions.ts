import type { Timestamp } from 'firebase/firestore';

export type RotationPetitionType = 'activate' | 'finish';
export type RotationPetitionStatus = 'pending' | 'approved' | 'denied';

export type RotationPetition = {
	id: string;
	residentId: string;
	rotationId: string;
	type: RotationPetitionType;
	status: RotationPetitionStatus;
	requestedAt: Timestamp;
	resolvedAt?: Timestamp;
	resolvedBy?: string;
	reason?: string;
};


