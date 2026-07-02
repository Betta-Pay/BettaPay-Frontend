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
Description: The KPI stat card pattern (icon + title + value + trend) is repeated inline across 3 pages with ~11 instances total. A reusable StatCard component would reduce duplication and ensure consistent styling.

Requirements:

Create components/shared/StatCard.tsx
Props: title, value (ReactNode), icon, trend?, trendLabel?, color? (amber/blue/emerald/purple), className?
Handle the gradient overlay, icon background, and trend display internally
Use the component in dashboard, settlement, and admin overview pages
Suggested execution steps:

Create components/shared/StatCard.tsx
Define the prop interface with all needed fields
Implement the card with gradient overlay, icon, value, and optional trend
Replace the 4 inline stat cards in app/(merchant)/dashboard/page.tsx
Replace the 3 stat cards in app/(merchant)/settlement/page.tsx
Replace the 4 stat cards in app/(admin)/overview/page.tsx
Verify all look identical to the original
Description: Mock data arrays are defined inline at the top of page files: mockChartData in dashboard, mockTransactions in dashboard, mockPaymentLinks in dashboard, mockLinks in payments, mockTxHistory in wallet, mockSettlements in settlement, mockKeys in developers. This clutters page files and makes it hard to swap mock data for real API data.

Requirements:

Create lib/mock/dashboard.ts, lib/mock/transactions.ts, lib/mock/paymentLinks.ts, lib/mock/wallet.ts, lib/mock/settlements.ts, lib/mock/developers.ts
Move all mock data arrays from page files to these dedicated files
Export them as named exports
Import them in the page files
Suggested execution steps:

Create the mock data files under lib/mock/
Move mockChartData, mockTransactions, mockPaymentLinks from app/(merchant)/dashboard/page.tsx
Move mockLinks from app/(merchant)/payments/page.tsx
Move mockTxHistory from app/(merchant)/wallet/page.tsx
Move mockSettlements from app/(merchant)/settlement/page.tsx
Move mockKeys and codeExample from app/(merchant)/developers/page.tsx
Move fxHistory and pairs from app/(merchant)/fx/page.tsx
Move mockChartData from app/(admin)/overview/page.tsx
Update all imports in page files
