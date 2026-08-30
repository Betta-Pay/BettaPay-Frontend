// This barrel is the authenticated app shell (sidebars, top bar, mobile nav)
// and pulls in the wallet/auth stores and axios. The public marketing
// `Header` / `Footer` are intentionally NOT re-exported here so a marketing
// page can't drag the app shell into its bundle by importing the barrel
// (issue #584). Import them directly:
//   import Header from "@/components/layout/Header";
//   import Footer from "@/components/layout/Footer";
export * from './Topbar';
export * from './MobileBottomNav';
export * from './AdminSidebar';
export * from './MerchantSidebar';
export * from './MobileNavDrawer';
export * from './ThemePreferenceSync';
export { default as Footer } from './Footer';
export { default as Header } from './Header';
