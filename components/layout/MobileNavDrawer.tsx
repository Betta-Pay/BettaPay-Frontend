"use client";

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from '@/components/layout/MerchantSidebar';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer = ({ isOpen, onClose }: MobileNavDrawerProps) => {
  const pathname = usePathname();
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      firstLinkRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            id="mobile-nav"
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col border-r border-slate-100 md:hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm shadow-amber-200">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">BettaPay</span>
              </Link>
              <button
                onClick={onClose}
                aria-label="Close navigation"
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    ref={index === 0 ? firstLinkRef : undefined}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-amber-600' : 'text-slate-400')} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
