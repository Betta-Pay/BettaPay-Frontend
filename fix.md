Description: Icons across the app use inconsistent sizing: w-4 h-4, w-4.5 h-4.5 (non-standard), w-5 h-5, w-3 h-3, w-3.5 h-3.5. The w-4.5 h-4.5 class is not a standard Tailwind size and may not render correctly. A consistent icon size system improves polish.

Requirements:

Define icon size tokens: icon-sm (12px/3), icon-md (16px/4), icon-lg (20px/5), icon-xl (24px/6)
Remove non-standard sizes like w-4.5 h-4.5
Use the size tokens consistently: sidebar icons = icon-md, card header icons = icon-md, button icons = icon-sm
Create a Tailwind utility or CSS variable for icon sizes
Suggested execution steps:

Search for w-4.5 and h-4.5 across the codebase — replace with w-4 h-4 or w-5 h-5
Define icon size classes or use Tailwind's consistent sizes
In MerchantSidebar.tsx, change w-4.5 h-4.5 → w-4 h-4
In Topbar.tsx, change h-4.5 w-4.5 → h-4 w-4
Create an icon size convention document