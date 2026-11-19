import { Link, useLocation } from 'wouter';
import { Check, ChevronDown, TriangleAlert } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { AtlasNavigationMenu } from '../data/atlasNavigation';

export function AtlasResourceNotice({ notice }: { notice?: string }) {
  if (!notice) return null;
  return (
    <span className="mt-3 flex gap-2 border-t border-white/15 pt-3 text-xs leading-relaxed text-white/80"
      data-testid="atlas-resource-notice">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-white/90" aria-hidden="true" />
      <span>
        <span className="mb-1 block font-medium text-white">Resource-intensive 3D model</span>
        {notice}
      </span>
    </span>
  );
}

export function AtlasDropdown({ menu, mobile = false, onNavigate }: {
  menu: AtlasNavigationMenu;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const active = menu.views.some((view) => view.href === location);
  const testId = menu.id === 'full-atlas' ? 'button-explore-atlas'
    : `button-${menu.id}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="sn-cta focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-white"
          aria-current={active ? 'page' : undefined}
          data-testid={`${testId}${mobile ? '-mobile' : ''}`}
        >
          {menu.label} <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mobile ? 'start' : 'end'}
        sideOffset={8}
        aria-label={menu.label}
        className="z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-xl border-white/20 bg-[#0a0a09] p-1.5 text-[#ece9e3] shadow-2xl"
      >
        {menu.comingSoon && (
          <DropdownMenuItem disabled data-testid={`notice-${menu.id}-coming-soon`}
            className="rounded-lg px-3 py-3 text-sm data-[disabled]:opacity-100">
            Coming soon
          </DropdownMenuItem>
        )}
        {menu.views.map((view) => (
          <DropdownMenuItem
            key={view.id}
            asChild
            onSelect={onNavigate}
            className="cursor-pointer rounded-lg px-3 py-3 focus:bg-white/10 focus:text-white"
          >
            <Link
              href={view.href}
              aria-current={location === view.href ? 'page' : undefined}
              data-testid={`link-atlas-${view.id}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{view.label}</span>
                <span className="mt-1 block text-xs text-white/50">{view.description}</span>
                <AtlasResourceNotice notice={view.resourceNotice} />
              </span>
              {location === view.href && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
