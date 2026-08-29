import React from 'react';

interface PageTransitionProps {
  children: any;
"use client";

import React, { useEffect, useRef } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  routingKey?: string; // The active route path (e.g., location.pathname or router.asPath)
}

// Global dictionary cache to store viewport depths across client-side navigation
const scrollCoordinateCache: Record<string, number> = {};

export function PageTransition({ children, routingKey = "" }: PageTransitionProps) {
export function PageTransition({ children, routingKey = '' }: PageTransitionProps) {
  const containerRef = React.useRef(null);

  // Capture scroll coordinates immediately prior to unmounting the current active route
  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        scrollCoordinateCache[routingKey] = window.scrollY || document.documentElement.scrollTop;
      }
    };
  }, [routingKey]);

  // Restore cached scroll position the millisecond the new page route settles
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const targetScrollDepth = scrollCoordinateCache[routingKey] || 0;
      
      // Execute an instantaneous jump to eliminate jumpy layout bounce or refetch flashes
      window.scrollTo({
        top: targetScrollDepth,
        behavior: 'auto'
      });
    }
  }, [routingKey]);

  // Acceptance Criteria: Persistent page shell structure animating ONLY inner content opacity
  return (
    <div 
      ref={containerRef}
      className="persistent-page-shell"
      style={{
        width: '100%',
        minHeight: '100vh',
        transition: 'opacity 200ms ease-in-out'
      }}
    >
      {children}
    </div>
  );
}
