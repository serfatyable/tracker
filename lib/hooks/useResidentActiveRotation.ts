'use client';

import { useContext } from 'react';

import { ResidentActiveRotationContext } from '../../components/resident/ResidentActiveRotationProvider';

export function useResidentActiveRotation() {
  const context = useContext(ResidentActiveRotationContext);

  if (!context) {
    throw new Error(
      'useResidentActiveRotation must be used within a ResidentActiveRotationProvider',
    );
  }

  return context;
}
