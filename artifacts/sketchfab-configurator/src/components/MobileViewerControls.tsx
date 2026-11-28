import { useState, type ReactNode } from 'react';
import { ChevronDown, ListTree, Rows3, X, Eye, EyeOff, Focus, Undo2, RotateCcw } from 'lucide-react';

export type MobileSheetId = 'collections' | 'anatomy';

interface ControlsProps {
  open: MobileSheetId | null;
  onToggle: (id: MobileSheetId) => void;
  selectedName?: string;
  selectedSystem?: string;
  selectedVisible: boolean;
  controlsAvailable: boolean;
  canUndo: boolean;
  canRestore: boolean;
  isIsolated: boolean;
  onToggleVisibility: () => void;
  onIsolate: () => void;
  onUndo: () => void;
  onRestore: () => void;
}

/** Compact phone navigation: two dropdown triggers and a one-line selection readout. */
export function MobileViewerControls({
  open, onToggle, selectedName, selectedSystem, selectedVisible, controlsAvailable,
  canUndo, canRestore, isIsolated, onToggleVisibility, onIsolate, onUndo, onRestore,
}: ControlsProps) {
  const [notice, setNotice] = useState('');
  const quickAction = (id: string, label: string, Icon: typeof Eye, disabled: boolean, action: () => void, message: string, pressed?: boolean) => (
    <button type="button" data-testid={`button-mobile-${id}`} disabled={!controlsAvailable || disabled}
      aria-label={label} aria-pressed={pressed}
      onClick={() => { action(); setNotice(message); }}
      className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-black/85 px-2 text-[11px] font-medium text-white backdrop-blur-md disabled:opacity-40 active:bg-white/20 focus-visible:outline focus-visible:outline-primary">
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}
    </button>
  );
  const trigger = (id: MobileSheetId, label: string, Icon: typeof Rows3) => (
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-expanded={open === id}
      aria-controls={`mobile-sheet-${id}`}
      data-testid={`button-mobile-${id}`}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium backdrop-blur-md focus-visible:outline focus-visible:outline-primary ${open === id ? 'border-primary/70 bg-black/90 text-primary' : 'border-white/20 bg-black/75 text-white'}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
      <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${open === id ? 'rotate-180' : ''}`} />
    </button>
  );
  return (
    <div className="atlas-mobile-controls absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1.5 px-2 pt-2">
      <div role="status" aria-live="polite" aria-atomic="true" data-testid="mobile-selected-structure"
        className="pointer-events-none self-start max-w-full truncate rounded-md bg-black/70 px-2.5 py-1 text-[11px] text-white backdrop-blur-md">
        {selectedName
          ? <><span className="text-white/55">{selectedSystem ? `${selectedSystem} · ` : ''}</span><span className="font-medium">{selectedName}</span></>
          : <span className="text-white/60">{notice || 'Tap a structure for quick controls'}</span>}
      </div>
      {(selectedName || canUndo || canRestore) && !open && (
        <div className="flex gap-1.5" role="group" aria-label="Quick structure controls">
          {quickAction('visibility', selectedVisible ? 'Hide' : 'Show', selectedVisible ? EyeOff : Eye,
            !selectedName, onToggleVisibility, `${selectedName ?? 'Structure'} ${selectedVisible ? 'hidden — tap Undo to bring it back' : 'shown'}.`)}
          {quickAction('isolate', isIsolated ? 'Unisolate' : 'Isolate', Focus,
            !selectedName, onIsolate, isIsolated ? 'Previous view restored.' : 'Selected structure isolated.', isIsolated)}
          {quickAction('undo', 'Undo', Undo2, !canUndo, onUndo, 'Last hide undone.')}
          {quickAction('restore', 'Restore', RotateCcw, !canRestore, onRestore, 'Previous view restored.')}
        </div>
      )}
      <div className="flex gap-2">
        {trigger('collections', 'Collections', Rows3)}
        {trigger('anatomy', 'Anatomy', ListTree)}
      </div>
    </div>
  );
}

interface SheetProps {
  id: MobileSheetId;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/** Bounded, scrollable bottom sheet. Always explicitly opened, with a clear close control. */
export function MobileSheet({ id, title, onClose, children, className = '' }: SheetProps) {
  return (
    <section id={`mobile-sheet-${id}`} role="dialog" aria-label={title} data-testid={`mobile-sheet-${id}`}
      className={`atlas-mobile-sheet flex flex-col rounded-t-2xl border border-white/15 bg-sidebar text-foreground shadow-2xl ${className}`}>
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} data-testid={`button-close-mobile-${id}`}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-white/10 focus-visible:outline focus-visible:outline-primary">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>
      <div className="atlas-mobile-sheet-body min-h-0 flex-1 overflow-auto overscroll-contain">{children}</div>
    </section>
  );
}
