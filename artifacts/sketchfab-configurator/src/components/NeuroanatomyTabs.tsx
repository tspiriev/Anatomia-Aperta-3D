import type { NeuroanatomyMode } from '../data/advancedNeuroanatomy';

const tabs: readonly { id: NeuroanatomyMode; label: string }[] = [
  { id: 'standard', label: 'Standard anatomy' },
  { id: 'advanced', label: 'Advanced neuroanatomy' },
];

export function NeuroanatomyTabs({ mode, onChange, prefix }: {
  mode: NeuroanatomyMode;
  onChange: (mode: NeuroanatomyMode) => void;
  prefix: string;
}) {
  return (
    <div role="tablist" aria-label="Neuroanatomy navigation" className="grid grid-cols-2 gap-1 rounded-md border border-sidebar-border bg-background/60 p-0.5">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`${prefix}-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={mode === tab.id}
          aria-controls={`${prefix}-panel`}
          tabIndex={mode === tab.id ? 0 : -1}
          data-testid={`${prefix}-tab-${tab.id}`}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
              : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
              : event.key === 'Home' ? 0
              : event.key === 'End' ? tabs.length - 1 : null;
            if (next === null) return;
            event.preventDefault();
            onChange(tabs[next].id);
            (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
          }}
          className={`min-h-10 px-2 py-1.5 text-xs lg:text-[11px] leading-snug rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${mode === tab.id ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
