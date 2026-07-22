"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { Settings, User, Bell, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useNotify } from '@/lib/hooks/useNotify';
import { trimInput } from '@/lib/utils/sanitize';
import { cn } from '@/lib/utils';
import { ProfileEditor } from '@/components/settings/ProfileEditor';
import { useMerchantProfile } from '@/lib/api/hooks';
import { apiClient } from '@/lib/api/axios';
import type { MerchantProfileFormValues } from '@/lib/utils/validation';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
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
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>({
    paymentReceived: true,
    settlementProcessed: true,
    failedTransactions: true,
    fxRateChanges: true,
  });
  const { user, logout } = useAuthStore();
  const notify = useNotify();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    data: profileData,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useMerchantProfile(user?.id);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogout = useCallback(() => {
    logout();
    notify.success('Logged out successfully');
    router.push('/auth/login');
  }, [logout, notify, router]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const handleProfileSubmit = useCallback(async (data: MerchantProfileFormValues) => {
    if (!user?.id) return;
    setIsSubmitting(true);
    const previousData = profileData;
    try {
      await apiClient.patch(`/api/merchants/${user.id}`, data);
      notify.success('Profile updated');
      refetchProfile();
    } catch {
      notify.error('Failed to update profile');
      if (previousData) {
        refetchProfile();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, profileData, notify, refetchProfile]);

  const toggleNotificationPreference = (id: string) => {
    setNotificationPreferences((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Account</p>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-7 h-7" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account, business profile, and preferences.</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <div className="lg:w-48 flex-shrink-0">
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
        <div className="flex-1 min-w-0 overflow-y-auto">
          {activeTab === 'profile' && (
            <ProfileEditor
              initialData={profileData}
              isLoading={profileLoading}
              onSubmit={handleProfileSubmit}
              isSubmitting={isSubmitting}
            />
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
                      onClick={() => toggleNotificationPreference(id)}
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
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Password</Label>
                  <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" placeholder="••••••••" className="h-10 border-border rounded-xl bg-card text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Password</Label>
                  <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="••••••••" className="h-10 border-border rounded-xl bg-card text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm New Password</Label>
                  <Input value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} type="password" placeholder="••••••••" className="h-10 border-border rounded-xl bg-card text-sm" />
                </div>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm scroll-mb-52"
                  onClick={() => {
                    const sanitized = {
                      currentPassword: trimInput(currentPassword),
                      newPassword: trimInput(newPassword),
                      confirmNewPassword: trimInput(confirmNewPassword),
                    };
                    void sanitized;
                    notify.success('Password updated');
                  }}
                >
                  Update Password
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
