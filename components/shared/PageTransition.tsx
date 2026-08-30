"use client";

import { useEffect, useRef, type ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  routingKey?: string;
}

const scrollCoordinateCache: Record<string, number> = {};

export function PageTransition({ children, routingKey = '' }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        scrollCoordinateCache[routingKey] =
          window.scrollY || document.documentElement.scrollTop;
      }
    };
  }, [routingKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const targetScrollDepth = scrollCoordinateCache[routingKey] || 0;
      window.scrollTo({
        top: targetScrollDepth,
        behavior: 'auto',
      });
    }
  }, [routingKey]);

  return (
    <div
      ref={containerRef}
      className="persistent-page-shell"
      style={{
        width: '100%',
        minHeight: '100vh',
        transition: 'opacity 200ms ease-in-out',
      }}
    >
      {children}
    </div>
  );
}
