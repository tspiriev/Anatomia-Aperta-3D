import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp } from 'lucide-react';

interface Hotkey {
  key: string;
  label: string;
  requiresSelection?: boolean;
}

const HOTKEYS: Hotkey[] = [
  { key: 'I', label: 'Show only selected / restore', requiresSelection: true },
  { key: 'R', label: 'Restore previous view' },
  { key: 'H', label: 'Hide selected mesh', requiresSelection: true },
  { key: 'Ctrl/⌘+Z', label: 'Undo last hide' },
  { key: 'A', label: 'Show all / unfade all' },
  { key: 'F', label: 'Fullscreen' },
  { key: 'Esc', label: 'Exit fullscreen' },
];

interface HotkeyReferenceProps {
  hasSelection: boolean;
}

export function HotkeyReference({ hasSelection }: HotkeyReferenceProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 z-20 select-none">
      <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-md shadow-lg overflow-hidden">
        {/* Header / toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-white/5 transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <span className="text-[10px] font-semibold tracking-widest text-white uppercase flex-1">
            Hotkeys
          </span>
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-white" />
          ) : (
            <ChevronUp className="w-3 h-3 text-white" />
          )}
        </button>

        {/* Key list */}
        {expanded && (
          <div className="px-3 pb-2.5 flex flex-col gap-1">
            {HOTKEYS.map(({ key, label, requiresSelection }) => {
              return (
                <div
                  key={key}
                  className="flex items-center gap-2.5"
                  title={requiresSelection && !hasSelection ? 'Select a mesh to use this shortcut' : undefined}
                >
                  <kbd className="min-w-[28px] h-5 px-1 inline-flex items-center justify-center rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white leading-none flex-shrink-0">
                    {key}
                  </kbd>
                  <span className="text-[10px] text-white whitespace-nowrap">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
