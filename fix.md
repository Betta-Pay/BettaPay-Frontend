Description: Navigating between pages is instant with no transition animation. Adding a subtle page transition (fade + slight slide) using framer-motion (already installed) would improve perceived polish and smoothness.

Requirements:

Add a page transition wrapper using framer-motion AnimatePresence
The transition should be a subtle fade (opacity 0 → 1) with a slight upward slide (y: 4px → 0)
Duration should be short (~200ms) to avoid feeling sluggish
Respect prefers-reduced-motion — disable animations when set
Apply to the main content area in both merchant and admin layouts
Suggested execution steps:

Create components/shared/PageTransition.tsx wrapping motion.div with fade + slide animation
In app/(merchant)/layout.tsx, wrap {children} with <PageTransition>
In app/(admin)/layout.tsx, wrap {children} with <PageTransition>
Use usePathname() as the animation key so transitions fire on route change
Add motion-safe: or check for reduced motion preference