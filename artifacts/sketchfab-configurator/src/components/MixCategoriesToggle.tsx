import { Layers } from 'lucide-react';

export function MixCategoriesToggle({ enabled, onChange }: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label="Mix categories"
      aria-checked={enabled}
      title={enabled
        ? 'Browse categories without changing visible models. Use Add or Show to add structures; Hide to remove them.'
        : 'Turn on to combine categories without replacing the current view.'}
      onClick={() => onChange(!enabled)}
      data-testid="toggle-mix-categories"
      className={`absolute left-3 top-3 z-30 inline-flex min-h-10 items-center gap-2 rounded-lg border bg-black/80 px-3 py-2 text-xs backdrop-blur-md hover:bg-black/95 focus-visible:outline focus-visible:outline-primary ${enabled ? 'border-primary/70 text-primary' : 'border-white/20 text-white'}`}
    >
      <Layers aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>Mix categories</span>
      <span aria-hidden="true" className={`rounded px-1.5 py-0.5 text-[10px] ${enabled ? 'bg-primary/20' : 'bg-white/10'}`}>{enabled ? 'On' : 'Off'}</span>
    </button>
  );
}
