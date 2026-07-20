"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/components/guides/prose";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Sticky table of contents built from the H2/H3 headings inside the element
 * with id `containerId`. Highlights the section currently in view (scroll-spy)
 * and smooth-scrolls on click. Renders a sticky sidebar on desktop and a
 * collapsible drawer on mobile.
 */
export default function GuideTOC({ containerId }: { containerId: string }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibility = useRef<Map<string, boolean>>(new Map());

  // Build the heading list once the content has mounted.
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const headings = Array.from(
      container.querySelectorAll<HTMLHeadingElement>("h2, h3")
    );

    const collected: TocItem[] = headings.map((heading) => {
      const text = heading.textContent?.trim() ?? "";
      // Headings from the prose helpers already carry an id; fall back to
      // slugifying their text so anchors always resolve.
      if (!heading.id) heading.id = slugify(text);
      return {
        id: heading.id,
        text,
        level: heading.tagName === "H3" ? 3 : 2,
      };
    });

    setItems(collected);

    // Scroll-spy: a heading is "active" once it enters the top of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibility.current.set(entry.target.id, entry.isIntersecting);
        });
        const firstVisible = collected.find(
          (item) => visibility.current.get(item.id) === true
        );
        if (firstVisible) setActiveId(firstVisible.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [containerId]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Reflect the anchor in the URL without an extra jump.
      window.history.replaceState(null, "", `#${id}`);
      setActiveId(id);
      setMobileOpen(false);
    },
    []
  );

  if (items.length === 0) return null;

  const list = (
    <ul className="space-y-1 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            onClick={(event) => handleClick(event, item.id)}
            className={cn(
              "block border-l-2 py-1 transition-colors",
              item.level === 3 ? "pl-6" : "pl-3",
              activeId === item.id
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="Table of contents"
        className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          On this page
        </p>
        {list}
      </nav>

      {/* Mobile: collapsible drawer */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
        >
          <span className="flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground" />
            On this page
          </span>
          <span className="text-xs text-muted-foreground">
            {mobileOpen ? "Hide" : "Show"}
          </span>
        </button>
        {mobileOpen && (
          <nav
            aria-label="Table of contents"
            className="mt-2 rounded-lg border border-border bg-card p-4"
          >
            {list}
          </nav>
        )}
      </div>
    </>
  );
}
