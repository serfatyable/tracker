'use client';
import RotationBrowser from '../RotationBrowser';
import LeafDetails from '../LeafDetails';
import type { RotationNode } from '../../../types/rotations';

interface RotationBrowseProps {
  rotationId: string;
  searchTerm: string;
  searchScope: 'current' | 'all';
  selectedLeaf: RotationNode | null;
  onSelectLeaf: (leaf: RotationNode | null) => void;
  canLog: boolean;
  onAutoScopeAll: () => void;
}

export default function RotationBrowse({
  rotationId,
  searchTerm,
  searchScope,
  selectedLeaf,
  onSelectLeaf,
  canLog,
  onAutoScopeAll,
}: RotationBrowseProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <RotationBrowser
          selectedRotationId={rotationId}
          searchTerm={searchTerm}
          searchScope={searchScope}
          onSelectLeaf={onSelectLeaf}
          onAutoScopeAll={onAutoScopeAll}
        />
      </div>
      <div className="lg:col-span-2">
        <LeafDetails leaf={selectedLeaf} canLog={canLog} />
      </div>
    </div>
  );
}

