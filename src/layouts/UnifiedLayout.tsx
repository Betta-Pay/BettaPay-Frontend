import React from 'react';
import { Sidebar } from '../components/Sidebar';

// Fix: A single unified layout used across both Docs and Guides for visual consistency
export const UnifiedLayout = ({ children }) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="content">{children}</main>
    </div>
  );
};
