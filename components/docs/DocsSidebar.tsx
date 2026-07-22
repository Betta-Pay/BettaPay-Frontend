"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { docsNavigation } from '@/lib/docs/navigation';

interface NavTreeProps {
  activeSection: string;
  onNavigate?: () => void;
}

/** The nested navigation list, shared by the desktop rail and the mobile drawer. */
function NavTree({ activeSection, onNavigate }: NavTreeProps) {
  return (
    <nav aria-label="Documentation" className="space-y-6">
      {docsNavigation.map((group) => (
        <div key={group.id}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.id === activeSection;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={onNavigate}
                    aria-current={active ? 'location' : undefined}
                    className={cn(
                      'block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-primary bg-primary/5 font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {item.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface DocsSidebarProps {
  activeSection: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/**
 * Persistent documentation navigation. Renders a fixed 280px rail on desktop
 * (≥ lg) and a slide-out drawer on smaller viewports, both driven by the same
 * nav tree and the scroll-spy `activeSection`.
 */
export function DocsSidebar({ activeSection, mobileOpen, onMobileClose }: DocsSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll, move focus into the drawer and close on Escape while open.
  useEffect(() => {
    if (!mobileOpen) return;

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-[280px] shrink-0 border-r border-border lg:block">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-8">
          <NavTree activeSection={activeSection} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-300 lg:hidden',
          // `invisible` (visibility: hidden) also removes the drawer's links from
          // the tab order — opacity alone would leave focusable content inside an
          // aria-hidden subtree, letting keyboard users tab into an unseen menu.
          mobileOpen ? 'opacity-100' : 'pointer-events-none invisible opacity-0',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onMobileClose}
          aria-hidden="true"
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-border bg-card shadow-xl transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Documentation navigation"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold text-foreground">Documentation</span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onMobileClose}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <NavTree activeSection={activeSection} onNavigate={onMobileClose} />
          </div>
        </div>
      </div>
    </>
  );
}
