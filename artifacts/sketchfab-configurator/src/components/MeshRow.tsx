import type { Ref } from 'react';
import { Blend, Eye, EyeOff } from 'lucide-react';
import type { SceneNode } from '../types/sketchfab';
import { isAlwaysOpaqueStructure } from '../lib/materialTransparency';

interface MeshRowProps {
  node: SceneNode;
  isSelected: boolean;
  isFaded: boolean;
  systemLabel?: string;
  selectedRowRef: Ref<HTMLDivElement>;
  onSelect: (instanceID: number) => void;
  onToggleFade: (instanceID: number) => void;
  toggleVisibility: (instanceID: number, visible: boolean) => void;
  disableFade?: boolean;
}

export function MeshRow({
  node, isSelected, isFaded, systemLabel, selectedRowRef, onSelect, onToggleFade, toggleVisibility, disableFade = false,
}: MeshRowProps) {
  return (
    <div
      ref={isSelected ? selectedRowRef : undefined}
      data-instance-id={node.instanceID}
      className={[
        'flex min-h-12 lg:min-h-0 items-center gap-1 rounded px-1.5 lg:px-2 lg:py-1.5 transition-colors select-none',
        isSelected ? 'bg-primary/15 text-primary' : 'hover:bg-sidebar-accent',
      ].join(' ')}
    >
      <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${isSelected ? 'bg-primary' : 'bg-transparent'}`} />
      <button
        type="button"
        onClick={() => onSelect(node.instanceID)}
        aria-label={`Select ${node.name}`}
        aria-pressed={isSelected}
        data-testid={`button-select-mesh-${node.instanceID}`}
        title={node.name}
        className={`min-w-0 min-h-11 lg:min-h-0 flex-1 rounded px-1 lg:px-0 text-left text-xs leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${isFaded ? 'italic opacity-70' : ''} ${!node.visible ? 'text-muted-foreground' : ''}`}
      >
        <span className="block break-words lg:truncate">{node.name}</span>
        {systemLabel && <span className="block text-[11px] lg:text-[10px] text-muted-foreground mt-0.5 lg:truncate">{systemLabel}</span>}
      </button>
      {!disableFade && !isAlwaysOpaqueStructure(node) && <button
        type="button"
        onClick={() => onToggleFade(node.instanceID)}
        data-testid={`button-fade-mesh-${node.instanceID}`}
        className={`flex h-10 w-10 lg:h-auto lg:w-auto lg:p-1 items-center justify-center rounded shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${isFaded ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'}`}
        aria-label={`${isFaded ? 'Unfade' : 'Fade'} ${node.name}`}
        title={isFaded ? 'Unfade mesh' : 'Fade mesh'}
      >
        <Blend className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
      </button>}
      <button
        type="button"
        onClick={() => toggleVisibility(node.instanceID, !node.visible)}
        data-testid={`button-visibility-mesh-${node.instanceID}`}
        className={`flex h-10 w-10 lg:h-auto lg:w-auto lg:p-1 items-center justify-center rounded shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${node.visible ? 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground' : 'text-muted-foreground/60 hover:bg-sidebar-accent hover:text-foreground'}`}
        aria-label={`${node.visible ? 'Hide' : 'Show'} ${node.name}`}
        title={node.visible ? 'Hide mesh' : 'Show mesh'}
      >
        {node.visible ? <Eye className="w-4 h-4 lg:w-3.5 lg:h-3.5" /> : <EyeOff className="w-4 h-4 lg:w-3.5 lg:h-3.5" />}
      </button>
    </div>
  );
}