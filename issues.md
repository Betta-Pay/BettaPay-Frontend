#29 Add mobile-friendly empty states
Repo Avatar
Betta-Pay/BettaPay-Frontend
Description: The "No transactions found" empty state in the transactions table is a single centered with colspan. On mobile (card view, per issue #20), the empty state needs to be adapted for the card-based layout with a more helpful message and an illustration or icon.

Requirements:

Create a reusable EmptyState component for use across the app
For transactions: "No transactions match your search" with a clear search button
Include an appropriate icon (e.g., SearchX from lucide-react)
The empty state should be responsive — larger illustration on desktop, compact on mobile
Suggested execution steps:

Create components/shared/EmptyState.tsx with props: icon, title, description, action?
Use the component in the transactions page for both table and card views
Add empty states to: payment links page (no links created yet), wallet activity (no transactions), settlement history (no settlements)
Style the component with the brand's amber/slate palette
Example commit message:

feat(ui): add responsive EmptyState component and apply to all list pages

Created a reusable EmptyState component with icon, title, description,
and optional action button. Applied to transactions, payment links,
wallet activity, and settlement history pages with contextual messages.


#30 Fix long payment link URLs wrapping on mobile
Repo Avatar
Betta-Pay/BettaPay-Frontend
Description: In the payment links page (app/(merchant)/payments/page.tsx), each link card displays the full URL in a font-mono text-xs truncate element. On mobile, even truncated URLs can push action buttons out of alignment. Also, the "Conversion bar" within each card competes for space.

Requirements:

On mobile, stack the URL, conversion bar, and action buttons vertically or in a 2-row layout
Use truncate with a max-width constraint tied to the card width
Ensure the copy and QR buttons remain tappable
Consider hiding the "Created" date on mobile to save space
Suggested execution steps:

In app/(merchant)/payments/page.tsx, add responsive classes to the link card layout
On mobile (max-sm), make each card a vertical stack: label → URL → conversion bar → stats + actions
Add max-w-[180px] sm:max-w-full to the URL display
Hide the "Created" date column on mobile: hidden sm:inline
Test with long URLs and verify nothing overflows
Example commit message:

fix(mobile): restack payment link card content on small screens

Reorganized the payment link card layout for mobile: URL, conversion bar,
and action buttons now stack vertically. Added max-width constraint to URL
display and hid secondary info (created date) on small screens.


#31 Make FX rate page chart responsive on phones
Repo Avatar
Betta-Pay/BettaPay-Frontend
Description: The FX rate line chart and "All Pairs" cards on the FX page use a lg:grid-cols-7 layout that collapses to single column on mobile. The chart itself is within a h-[240px] container which is fine, but the primary rate card with the large ₦1,550 display uses fixed text-5xl sizing.

Requirements:

Reduce the primary rate display from text-5xl to text-3xl sm:text-5xl for mobile
Ensure the 24h range and trend badge wrap properly on narrow screens
The "All Pairs" list should maintain a compact card layout per pair
The info banner at the bottom should have smaller text on mobile
Suggested execution steps:

In app/(merchant)/fx/page.tsx, change the rate: text-3xl sm:text-5xl font-bold
Make the trend badge + 24h range section wrap with flex-wrap on mobile
Test the page at 375px width
Reduce info banner padding and text size on mobile
Example commit message:

fix(mobile): adapt FX rate page for mobile viewports

Reduced primary rate display size on mobile, added flex-wrap to the
trend/range section, and adjusted info banner padding. FX chart and
pair list remain readable on 375px-wide screens.


#32 Improve mobile filter and search experience
Repo Avatar
Betta-Pay/BettaPay-Frontend
Description: The transactions page filter and export buttons, and the payment links page search, use desktop-optimized layouts. On mobile, the search bar and filter buttons should be more prominent and easier to access.

Requirements:

Transactions page: stack search bar above filter/export buttons on mobile
Search should expand to full width on mobile
Filter button should have a badge showing active filter count
Payment links "New Payment Link" button should be full-width on mobile
Suggested execution steps:

In app/(merchant)/transactions/page.tsx, make the search + filter section stack vertically on mobile
Make the search input w-full on mobile
Add a filter count badge to the Filter button when filters are active
In app/(merchant)/payments/page.tsx, make the "New Payment Link" button w-full sm:w-auto
Add a sticky search bar that stays visible while scrolling on mobile
Example commit message:

feat(mobile): improve search and filter UX on mobile

Stacked search bar above filter/export buttons on mobile with full-width
input. Added active filter count badge. Made "New Payment Link" button
full-width on mobile for easier thumb access.