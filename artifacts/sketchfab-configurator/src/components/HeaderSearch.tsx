import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import { AnatomySearch } from './home/AnatomySearch';

export const OPEN_SEARCH_EVENT = 'aa:open-search';
export const openHeaderSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(OPEN_SEARCH_EVENT, h);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, h);
  }, []);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button ref={triggerRef} type="button" className="hs-trigger" aria-label="Find a structure" data-testid="button-open-search">
          <Search size={15} aria-hidden /><span className="hs-label">Find</span>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="hs-overlay" />
        <DialogPrimitive.Content className="hs-panel" aria-describedby={undefined}
          onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
          onCloseAutoFocus={(e) => {
            // Mobile opens search from the hamburger, not the hidden desktop trigger.
            if (!triggerRef.current?.getClientRects().length) {
              e.preventDefault();
              document.querySelector<HTMLButtonElement>('[data-testid="button-nav-toggle"]')?.focus();
            }
          }}
          data-testid="dialog-anatomy-search">
          <DialogPrimitive.Title className="sr-only">Find a structure</DialogPrimitive.Title>
          <DialogPrimitive.Close className="hs-close" aria-label="Close search" data-testid="button-close-search">
            <X size={16} />
          </DialogPrimitive.Close>
          <div className="hs-scroll">
            <AnatomySearch variant="dialog" titleId="hs-title" inputRef={inputRef} onNavigate={() => setOpen(false)} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
