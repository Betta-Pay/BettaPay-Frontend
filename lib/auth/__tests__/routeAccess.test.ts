import { isAdminRoute, isMerchantRoute } from '../routeAccess';

describe('lib/auth/routeAccess', () => {
  describe('isMerchantRoute', () => {
    it('recognizes exact merchant routes', () => {
      expect(isMerchantRoute('/dashboard')).toBe(true);
      expect(isMerchantRoute('/onboarding')).toBe(true);
      expect(isMerchantRoute('/transactions')).toBe(true);
      expect(isMerchantRoute('/wallet')).toBe(true);
      expect(isMerchantRoute('/fx')).toBe(true);
      expect(isMerchantRoute('/developers')).toBe(true);
      expect(isMerchantRoute('/settings')).toBe(true);
      expect(isMerchantRoute('/payment-links')).toBe(true);
      expect(isMerchantRoute('/notifications')).toBe(true);
    });

    it('recognizes nested merchant prefix paths', () => {
      expect(isMerchantRoute('/payment-links/123')).toBe(true);
      expect(isMerchantRoute('/payment-links/nested/sub')).toBe(true);
      expect(isMerchantRoute('/notifications/settings')).toBe(true);
      expect(isMerchantRoute('/payments/create')).toBe(true);
      expect(isMerchantRoute('/settlement/batches')).toBe(true);
      expect(isMerchantRoute('/settings/api-keys')).toBe(true);
    });

    it('handles trailing-slash variants identically', () => {
      expect(isMerchantRoute('/dashboard/')).toBe(true);
      expect(isMerchantRoute('/payment-links/')).toBe(true);
      expect(isMerchantRoute('/notifications/')).toBe(true);
      expect(isMerchantRoute('/settings/')).toBe(true);
    });

    it('rejects unanchored lookalike prefixes', () => {
      expect(isMerchantRoute('/payment-links-v2')).toBe(false);
      expect(isMerchantRoute('/notifications-center')).toBe(false);
      expect(isMerchantRoute('/payments-faq')).toBe(false);
      expect(isMerchantRoute('/settlement-rules')).toBe(false);
      expect(isMerchantRoute('/settings-backup')).toBe(false);
      expect(isMerchantRoute('/dashboard-metrics')).toBe(false);
      expect(isMerchantRoute('/merchant-faq')).toBe(false);
    });

    it('rejects admin-only routes', () => {
      expect(isMerchantRoute('/overview')).toBe(false);
      expect(isMerchantRoute('/admin/transactions')).toBe(false);
      expect(isMerchantRoute('/anchors')).toBe(false);
    });
  });

  describe('isAdminRoute', () => {
    it('recognizes exact admin routes', () => {
      expect(isAdminRoute('/overview')).toBe(true);
      expect(isAdminRoute('/merchants')).toBe(true);
      expect(isAdminRoute('/anchors')).toBe(true);
      expect(isAdminRoute('/fx-management')).toBe(true);
      expect(isAdminRoute('/compliance')).toBe(true);
      expect(isAdminRoute('/audit')).toBe(true);
      expect(isAdminRoute('/batches')).toBe(true);
      expect(isAdminRoute('/webhooks')).toBe(true);
      expect(isAdminRoute('/assets')).toBe(true);
      expect(isAdminRoute('/alerts')).toBe(true);
    });

    it('recognizes nested admin prefix paths', () => {
      expect(isAdminRoute('/admin/transactions')).toBe(true);
      expect(isAdminRoute('/admin/users/123')).toBe(true);
      expect(isAdminRoute('/merchants/kyb/review')).toBe(true);
      expect(isAdminRoute('/security/logs')).toBe(true);
    });

    it('handles trailing-slash variants identically', () => {
      expect(isAdminRoute('/overview/')).toBe(true);
      expect(isAdminRoute('/admin/')).toBe(true);
      expect(isAdminRoute('/compliance/')).toBe(true);
    });

    it('rejects unanchored lookalike prefixes', () => {
      expect(isAdminRoute('/admin-docs')).toBe(false);
      expect(isAdminRoute('/admin-help')).toBe(false);
      expect(isAdminRoute('/admin_panel')).toBe(false);
      expect(isAdminRoute('/adminhelp')).toBe(false);
      expect(isAdminRoute('/overview-summary')).toBe(false);
      expect(isAdminRoute('/merchants-directory')).toBe(false);
      expect(isAdminRoute('/security-faq')).toBe(false);
    });

    it('rejects merchant-only routes', () => {
      expect(isAdminRoute('/dashboard')).toBe(false);
      expect(isAdminRoute('/payment-links/123')).toBe(false);
      expect(isAdminRoute('/notifications')).toBe(false);
      expect(isAdminRoute('/settlement')).toBe(false);
    });
  });
});
