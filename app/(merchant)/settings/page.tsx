"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Toggle } from '@/components/ui';
import { Settings, User, Bell, Shield, LogOut, Key, Globe, Percent, Plus, Trash2, RefreshCcw, Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { useAuthStore } from '@/lib/store/authStore';
import { KybDocumentsPanel } from '@/components/kyc/KybDocumentsPanel';
import { isSettlementConfigUnlocked } from '@/lib/kyc/status';
import { useRouter } from 'next/navigation';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';
import { ProfileEditor } from '@/components/settings/ProfileEditor';
import { useMerchantProfile } from '@/lib/api/hooks';
import { apiClient } from '@/lib/api/axios';
import type { MerchantProfileFormValues } from '@/lib/utils/validation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'kyb', label: 'Verification', icon: ShieldCheck },
  { id: 'fees', label: 'Fee Rules', icon: Percent },
  { id: 'webhooks', label: 'Webhooks', icon: Globe },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

const notificationOptions = [
  { id: 'paymentReceived', label: 'Payment received', desc: 'Get notified when a payment is completed' },
  { id: 'settlementProcessed', label: 'Settlement processed', desc: 'Notification when USDC → NGN settlement is done' },
  { id: 'failedTransactions', label: 'Failed transactions', desc: 'Alert on failed or reversed payments' },
  { id: 'fxRateChanges', label: 'FX rate changes', desc: 'Notify on significant rate movements (±5%)' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const { user, logout } = useAuthStore();
  const notify = useNotify();

  // Settlement rule configuration (the fee-rules editor) is gated until the
  // merchant's KYB verification has at least been submitted (issue #458).
  const settlementConfigUnlocked = isSettlementConfigUnlocked(user?.kybStatus);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    data: profileData,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useMerchantProfile(user?.id);

  // Track whether any non-profile tab has unsaved changes so we can guard
  // against accidental navigation. ProfileEditor tracks its own dirty state
  // internally via react-hook-form isDirty; we surface a parallel flag here
  // for the fee/webhook tabs which use uncontrolled local state.
  const tabDirtyRef = useRef(false);

  // Register a beforeunload guard that fires when the user closes the tab or
  // navigates away via the browser address bar.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tabDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Fee Rules State
  const [feeType, setFeeType] = useState<'percentage' | 'flat'>('percentage');
  const [feeRate, setFeeRate] = useState('0.5');
  const [minThreshold, setMinThreshold] = useState('10');

  // Webhook Config State
  const [webhookUrl, setWebhookUrl] = useState('https://example.com/webhooks/bettapay');
  const [webhookSecret, setWebhookSecret] = useState('whsec_live_9876543210abcdef');
  const [showSecret, setShowSecret] = useState(false);
  // API Keys State
  const [apiKeys, setApiKeys] = useState([
    { id: 'key_1', name: 'Production Backend', prefix: 'bp_live_', scopes: ['read', 'write'], created: '2026-06-01' },
    { id: 'key_2', name: 'Staging Integration', prefix: 'bp_test_', scopes: ['read'], created: '2026-07-10' },
  ]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState('write');

  // Security State & Validation
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Derived live errors for immediate feedback (used for rendering)
  const passwordErrors = useMemo<{
    current?: string;
    newPass?: string;
    confirm?: string;
  }>(() => {
    const errors: { current?: string; newPass?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = 'Current password is required';
    }

    if (newPassword.length < 8) {
      errors.newPass = 'Password must be at least 8 characters long';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPass = 'Password must contain at least one number';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPass = 'Password must contain at least one uppercase letter';
    }

    if (confirmNewPassword !== newPassword) {
      errors.confirm = 'Passwords do not match';
    }

    return errors;
  }, [currentPassword, newPassword, confirmNewPassword]);

  const validatePassword = useCallback(() => {
    return Object.keys(passwordErrors).length === 0;
  }, [passwordErrors]);

  const isPasswordValid = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      /[0-9]/.test(newPassword) &&
      /[A-Z]/.test(newPassword) &&
      confirmNewPassword === newPassword
    );
  }, [currentPassword, newPassword, confirmNewPassword]);

  const handlePasswordChange = useCallback(async () => {
    if (!validatePassword()) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      notify.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.message;
      notify.error(apiMessage ?? 'Current password is incorrect or the request failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPassword, newPassword, validatePassword, notify]);

  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>({
    paymentReceived: true,
    settlementProcessed: true,
    failedTransactions: true,
    fxRateChanges: true,
  });

  useEffect(() => {
    const syncPreferences = async () => {
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' });
        const payload = await response.json();

        if (payload?.preferences) {
          setNotificationPreferences({
            paymentReceived: payload.preferences.settlement ?? true,
            settlementProcessed: payload.preferences.settlement ?? true,
            failedTransactions: payload.preferences.webhook_failure ?? true,
            fxRateChanges: payload.preferences.rate_alert ?? true,
          });
        }
      } catch {
        // ignore failed sync; keep client defaults
      }
    };

    syncPreferences();
  }, []);

  const handleNotificationPreferenceToggle = useCallback(async (id: string) => {
    const nextPreferences = {
      ...notificationPreferences,
      [id]: !notificationPreferences[id],
    };

    setNotificationPreferences(nextPreferences);

    const mappedPreferences = {
      settlement: nextPreferences.paymentReceived || nextPreferences.settlementProcessed,
      webhook_failure: nextPreferences.failedTransactions,
      rate_alert: nextPreferences.fxRateChanges,
      kyc: true,
    };

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_preferences', preferences: mappedPreferences }),
    });
  }, [notificationPreferences]);

  const handleLogout = useCallback(() => {
    logout();
    notify.success('Logged out successfully');
    router.push('/auth/login');
  }, [logout, notify, router]);

  const handleTabChange = useCallback((id: string) => {
    // Guard against switching tabs when fee/webhook state is dirty.
    // ProfileEditor handles its own dirty guard internally.
    if (tabDirtyRef.current) {
      const confirmed = window.confirm(
        'You have unsaved changes. Leave this tab and discard them?'
      );
      if (!confirmed) return;
      tabDirtyRef.current = false;
    }
    setActiveTab(id);
  }, []);

  const handleProfileSubmit = useCallback(async (data: MerchantProfileFormValues) => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/api/merchants/${user.id}`, data);
      notify.success('Profile updated');
      refetchProfile();
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.message;
      notify.error(apiMessage ?? 'Failed to update profile — please try again');
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, notify, refetchProfile]);

  const handleRotateWebhookSecret = () => {
    const nextSecret = `whsec_live_${Math.random().toString(36).substring(2, 18)}`;
    setWebhookSecret(nextSecret);
    notify.success('Webhook signing secret rotated');
  };

  const handleTestWebhook = () => {
    notify.info(`Sent ping event to ${webhookUrl}`);
  };

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      notify.error('Key name is required');
      return;
    }
    const newKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      prefix: 'bp_live_',
      scopes: [newKeyScope],
      created: new Date().toISOString().slice(0, 10),
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyModal(false);
    setNewKeyName('');
    notify.success('API key created successfully');
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    notify.info('API key revoked');
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Account</p>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-7 h-7" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account, business profile, fee rules, webhooks, and security.</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                  activeTab === id
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <div className="pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <ProfileEditor
              initialData={profileData}
              isLoading={profileLoading}
              onSubmit={handleProfileSubmit}
              isSubmitting={isSubmitting}
            />
          )}

          {activeTab === 'kyb' && (
            <KybDocumentsPanel
              merchantId={user?.id ?? ''}
              variant="settings"
              allowSimulatedReview
            />
          )}

          {activeTab === 'fees' && !settlementConfigUnlocked && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Fee Rules Editor</CardTitle>
                <CardDescription>Configure auto-deducted processing fee rules and settlement thresholds</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="warning">
                  <Lock aria-hidden="true" />
                  <AlertTitle>Verify your business to configure settlement rules</AlertTitle>
                  <AlertDescription>
                    Settlement rule configuration unlocks once your KYB verification
                    has been submitted for review.{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('kyb')}
                      className="font-semibold underline underline-offset-2"
                    >
                      Go to Verification
                    </button>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {activeTab === 'fees' && settlementConfigUnlocked && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Fee Rules Editor</CardTitle>
                <CardDescription>Configure auto-deducted processing fee rules and settlement thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Fee Deduction Model</Label>
                  <Select value={feeType} onValueChange={(val) => { setFeeType(val as 'percentage' | 'flat'); tabDirtyRef.current = true; }}>
                    <SelectTrigger className="h-10 border-border rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Fee (0.5% standard)</SelectItem>
                      <SelectItem value="flat">Flat Per-Transaction Fee ($1.00 USDC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Fee Rate ({feeType === 'percentage' ? '%' : 'USDC'})</Label>
                    <Input
                      type="number"
                      value={feeRate}
                      onChange={(e) => { setFeeRate(e.target.value); tabDirtyRef.current = true; }}
                      className="h-10 border-border rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Min Settlement Threshold (USDC)</Label>
                    <Input
                      type="number"
                      value={minThreshold}
                      onChange={(e) => { setMinThreshold(e.target.value); tabDirtyRef.current = true; }}
                      className="h-10 border-border rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6"
                  onClick={async () => {
                    try {
                      await apiClient.patch('/api/merchants/fee-rules', { feeType, feeRate, minThreshold });
                      notify.success('Fee rules updated');
                      tabDirtyRef.current = false;
                    } catch (err: unknown) {
                      const apiMessage =
                        (err as { response?: { data?: { error?: string; message?: string } } })
                          ?.response?.data?.error ??
                        (err as { response?: { data?: { error?: string; message?: string } } })
                          ?.response?.data?.message;
                      notify.error(apiMessage ?? 'Failed to save fee rules — please try again');
                    }
                  }}
                >
                  Save Fee Rules
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'webhooks' && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Webhook Configuration</CardTitle>
                <CardDescription>Manage your HTTPS notification endpoint and signing secrets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Webhook Endpoint URL</Label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => { setWebhookUrl(e.target.value); tabDirtyRef.current = true; }}
                    className="h-10 border-border rounded-xl font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Signing Secret</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={webhookSecret}
                      readOnly
                      className="h-10 border-border rounded-xl font-mono text-sm bg-muted flex-1"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" onClick={handleRotateWebhookSecret} className="text-xs gap-1.5">
                      <RefreshCcw className="w-3.5 h-3.5" /> Rotate Secret
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6"
                    onClick={async () => {
                      try {
                        await apiClient.patch('/api/merchants/webhook', { url: webhookUrl });
                        notify.success('Webhook URL saved');
                        tabDirtyRef.current = false;
                      } catch (err: unknown) {
                        const apiMessage =
                          (err as { response?: { data?: { error?: string; message?: string } } })
                            ?.response?.data?.error ??
                          (err as { response?: { data?: { error?: string; message?: string } } })
                            ?.response?.data?.message;
                        notify.error(apiMessage ?? 'Failed to save webhook URL — ensure it is a valid HTTPS endpoint');
                      }
                    }}
                  >
                    Save Webhook Config
                  </Button>
                  <Button variant="outline" onClick={handleTestWebhook} className="rounded-xl h-10 px-4 text-xs font-semibold">
                    Test Ping Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'api-keys' && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">API Keys Management</CardTitle>
                  <CardDescription>Create, scope, and revoke API access keys</CardDescription>
                </div>
                <Button onClick={() => setNewKeyModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl h-9 px-3">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create API Key
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-bold text-sm text-foreground">{key.name}</p>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">{key.prefix}••••••••••••••••</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {key.scopes.map((scope) => (
                          <span key={scope} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold">
                            {scope}
                          </span>
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">Created {key.created}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRevokeKey(key.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationOptions.map(({ id, label, desc }) => (
                  <div key={id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Toggle
                      checked={notificationPreferences[id]}
                      label={label}
                      onClick={() => handleNotificationPreferenceToggle(id)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Security</CardTitle>
                <CardDescription>Update your account password. Passwords must be at least 8 characters long and include an uppercase letter and a number.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Password</Label>
                  <Input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="h-10 border-border rounded-xl bg-card text-sm"
                  />
                  {passwordErrors.current && <p className="text-xs text-destructive mt-1">{passwordErrors.current}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Password</Label>
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="h-10 border-border rounded-xl bg-card text-sm"
                  />
                  {passwordErrors.newPass ? (
                    <p className="text-xs text-destructive mt-1 font-medium">{passwordErrors.newPass}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters with 1 uppercase letter and 1 number</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm New Password</Label>
                  <Input
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="h-10 border-border rounded-xl bg-card text-sm"
                  />
                  {passwordErrors.confirm && <p className="text-xs text-destructive mt-1">{passwordErrors.confirm}</p>}
                </div>

                <Button
                  disabled={!isPasswordValid || isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm disabled:opacity-50"
                  onClick={handlePasswordChange}
                >
                  Update Password
                </Button>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Active sessions</p>
                    <p className="text-xs text-muted-foreground">Review signed-in devices and revoke access.</p>
                  </div>
                  <Button variant="outline" onClick={() => router.push('/settings/sessions')}>
                    Manage sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Key Modal */}
      <Dialog open={newKeyModal} onOpenChange={setNewKeyModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>Assign a friendly label and choose access scopes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input placeholder="e.g. Mobile App Backend" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Access Scope</Label>
              <Select value={newKeyScope} onValueChange={(val) => val && setNewKeyScope(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read Only</SelectItem>
                  <SelectItem value="write">Read & Write</SelectItem>
                  <SelectItem value="admin">Full Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewKeyModal(false)}>Cancel</Button>
            <Button onClick={handleCreateApiKey}>Create Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
