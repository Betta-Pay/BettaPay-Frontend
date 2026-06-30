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