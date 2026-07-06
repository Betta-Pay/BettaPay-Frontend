"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, User, Building2, Bell, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const { user, logout } = useAuthStore();
  const notify = useNotify();

  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profilePhone, setProfilePhone] = useState('');

  const [bizName, setBizName] = useState('Merchant Corp');
  const [bizRegNumber, setBizRegNumber] = useState('');
  const [bizBankName, setBizBankName] = useState('');
  const [bizAccountNumber, setBizAccountNumber] = useState('');

  const handleLogout = useCallback(() => {
    logout();
    notify.success('Logged out successfully');
    router.push('/auth/login');
  }, [logout, notify, router]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

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
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    {user?.name?.charAt(0) ?? 'M'}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{user?.name ?? 'Merchant User'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email ?? 'merchant@example.com'}</p>
                    <span className="inline-block mt-1 text-xs bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full capitalize">{user?.role ?? 'merchant'}</span>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                    <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="h-10 border-border rounded-xl bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                    <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} type="email" className="h-10 border-border rounded-xl bg-card text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</Label>
                  <Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+234 800 000 0000" className="h-10 border-border rounded-xl bg-card text-sm" />
                </div>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm scroll-mb-52"
                  onClick={() => {
                    notify.success('Profile updated');
                  }}
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'business' && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Name</Label>
                    <Input value={bizName} onChange={(e) => setBizName(e.target.value)} className="h-10 border-border rounded-xl bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration Number</Label>
                    <Input value={bizRegNumber} onChange={(e) => setBizRegNumber(e.target.value)} className="h-10 border-border rounded-xl bg-card text-sm" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bank Name</Label>
                    <Input value={bizBankName} onChange={(e) => setBizBankName(e.target.value)} className="h-10 border-border rounded-xl bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Number</Label>
                    <Input value={bizAccountNumber} onChange={(e) => setBizAccountNumber(e.target.value)} className="h-10 border-border rounded-xl bg-card text-sm" />
                  </div>
                </div>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm"
                  onClick={() => {
                    notify.success('Business info updated');
                  }}
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
