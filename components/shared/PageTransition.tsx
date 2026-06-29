"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? {} : { opacity: 0, y: -4 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
