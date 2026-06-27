"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { Settings, User, Building2, Bell, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'business', label: 'Business', icon: Building2 },
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
  const [activeTab, setActiveTab] = useState('profile');
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>({
    paymentReceived: true,
    settlementProcessed: true,
    failedTransactions: true,
    fxRateChanges: true,
  });
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const toggleNotificationPreference = (id: string) => {
    setNotificationPreferences((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">Account</p>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-7 h-7" /> Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account, business profile, and preferences.</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <div className="lg:w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                  activeTab === id
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                )}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <div className="pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-white text-xl font-bold">
                    {user?.name?.charAt(0) ?? 'M'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{user?.name ?? 'Merchant User'}</p>
                    <p className="text-sm text-slate-400">{user?.email ?? 'merchant@example.com'}</p>
                    <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full capitalize">{user?.role ?? 'merchant'}</span>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</Label>
                    <Input defaultValue={user?.name ?? ''} className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</Label>
                    <Input defaultValue={user?.email ?? ''} type="email" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</Label>
                  <Input placeholder="+234 800 000 0000" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-10 px-6 text-sm" onClick={() => toast.success('Profile updated')}>
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'business' && (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Name</Label>
                    <Input defaultValue="Merchant Corp" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registration Number</Label>
                    <Input placeholder="RC-1234567" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Name</Label>
                    <Input placeholder="e.g. GTBank" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Number</Label>
                    <Input placeholder="0123456789" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                  </div>
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-10 px-6 text-sm" onClick={() => toast.success('Business info saved')}>
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationOptions.map(({ id, label, desc }) => (
                  <div key={id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
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
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Password</Label>
                  <Input type="password" placeholder="••••••••" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</Label>
                  <Input type="password" placeholder="••••••••" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm New Password</Label>
                  <Input type="password" placeholder="••••••••" className="h-10 border-slate-200 rounded-xl bg-white text-sm" />
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-10 px-6 text-sm" onClick={() => toast.success('Password updated')}>
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
