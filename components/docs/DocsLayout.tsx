"use client";

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { docsSectionIds } from '@/lib/docs/navigation';
import { useScrollSpy } from '@/lib/hooks/useScrollSpy';
import { DocsSidebar } from './DocsSidebar';
import { DocsTOC } from './DocsTOC';
import { DocsBreadcrumbs } from './DocsBreadcrumbs';

interface DocsLayoutProps {
  children: React.ReactNode;
}

/**
 * Two-column documentation shell: a 280px sidebar (a slide-out drawer under lg),
 * an 800px-max content column, and a right-hand table of contents on xl. The
 * active section is tracked once here via scroll spy and shared with the
 * sidebar, breadcrumbs and TOC.
 */
export function DocsLayout({ children }: DocsLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useScrollSpy(docsSectionIds);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      {/* Mobile navigation bar (hamburger + breadcrumb) */}
      <div className="sticky top-16 z-30 flex h-12 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open documentation navigation"
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <DocsBreadcrumbs activeSection={activeSection} />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        <DocsSidebar
          activeSection={activeSection}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main id="docs-content" className="min-w-0 flex-1">
          <div className="mx-auto max-w-[800px] px-6 py-10 lg:py-12">
            <DocsBreadcrumbs activeSection={activeSection} className="mb-8 hidden lg:flex" />
            {children}
          </div>
        </main>

        <DocsTOC activeSection={activeSection} />
      </div>

      <Footer />
    </div>
  );
}
