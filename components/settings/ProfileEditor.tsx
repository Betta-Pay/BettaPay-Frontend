"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Upload, X, Building2 } from 'lucide-react';
import {
  merchantProfileSchema,
  type MerchantProfileFormValues,
} from '@/lib/utils/validation';
import type { MerchantProfile } from '@/lib/types';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
] as const;

interface ProfileEditorProps {
  initialData: MerchantProfile | null;
  isLoading: boolean;
  onSubmit: (data: MerchantProfileFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProfileEditor({
  initialData,
  isLoading,
  onSubmit,
  isSubmitting = false,
}: ProfileEditorProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<MerchantProfileFormValues>({
    resolver: zodResolver(merchantProfileSchema),
    defaultValues: {
      businessName: '',
      businessType: 'individual',
      country: '',
      industry: '',
      websiteUrl: '',
      contactEmail: '',
      phoneNumber: '',
      logoUrl: null,
    },
  });



  useEffect(() => {
    if (initialData) {
      reset({
        businessName: initialData.businessName ?? '',
        businessType: initialData.businessType ?? 'individual',
        country: initialData.country ?? '',
        industry: initialData.industry ?? '',
        websiteUrl: initialData.websiteUrl ?? '',
        contactEmail: initialData.contactEmail ?? '',
        phoneNumber: initialData.phoneNumber ?? '',
        logoUrl: initialData.logoUrl ?? null,
      });
      setLogoPreview(initialData.logoUrl ?? null);
    }
  }, [initialData, reset]);

  // Warn the user if they try to leave via browser back/close with unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers ignore the custom message but still show the prompt.
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setLogoPreview(result);
          setValue('logoUrl', result, { shouldValidate: true, shouldDirty: true });
        };
        reader.readAsDataURL(file);
      }
    },
    [setValue]
  );

  const handleRemoveLogo = useCallback(() => {
    setLogoPreview(null);
    setValue('logoUrl', null, { shouldValidate: true, shouldDirty: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setValue]);



  const onFormSubmit = useCallback(
    async (data: MerchantProfileFormValues) => {
      await onSubmit(data);
      // Reset dirty state after a successful save so the guard clears.
      reset(data);
    },
    [onSubmit, reset]
  );

  if (isLoading) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Business Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Business Profile
          {isDirty && (
            <span className="ml-2 text-xs font-normal text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
              Unsaved changes
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Business Logo
            </Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Logo
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isSubmitting}
                    className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, SVG or WebP. Max 2MB.
                </p>
                {/* TODO: Integrate with cloud storage for production uploads */}
              </div>
            </div>
            {errors.logoUrl && (
              <p className="text-xs text-destructive mt-1">
                {errors.logoUrl.message}
              </p>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Business Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('businessName')}
                aria-invalid={!!errors.businessName}
                placeholder="Enter business name"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.businessName && (
                <p className="text-xs text-destructive mt-1">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            {/* Business Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Business Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="businessType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full h-10 border-border rounded-xl bg-card text-sm">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.businessType && (
                <p className="text-xs text-destructive mt-1">
                  {errors.businessType.message}
                </p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Country <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('country')}
                aria-invalid={!!errors.country}
                placeholder="e.g. Nigeria"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.country && (
                <p className="text-xs text-destructive mt-1">
                  {errors.country.message}
                </p>
              )}
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Industry <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('industry')}
                aria-invalid={!!errors.industry}
                placeholder="e.g. Fintech, E-commerce"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.industry && (
                <p className="text-xs text-destructive mt-1">
                  {errors.industry.message}
                </p>
              )}
            </div>

            {/* Website URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Website URL
              </Label>
              <Input
                {...register('websiteUrl')}
                type="url"
                aria-invalid={!!errors.websiteUrl}
                placeholder="https://example.com"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.websiteUrl && (
                <p className="text-xs text-destructive mt-1">
                  {errors.websiteUrl.message}
                </p>
              )}
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Email <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('contactEmail')}
                type="email"
                aria-invalid={!!errors.contactEmail}
                placeholder="contact@example.com"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.contactEmail && (
                <p className="text-xs text-destructive mt-1">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone Number
              </Label>
              <Input
                {...register('phoneNumber')}
                type="tel"
                aria-invalid={!!errors.phoneNumber}
                placeholder="+234 800 000 0000"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive mt-1">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit — disabled until the form has unsaved changes */}
          <Button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProfileEditor({
  initialData,
  isLoading,
  onSubmit,
  isSubmitting = false,
}: ProfileEditorProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<MerchantProfileFormValues>({
    resolver: zodResolver(merchantProfileSchema),
    defaultValues: {
      businessName: '',
      businessType: 'individual',
      country: '',
      industry: '',
      websiteUrl: '',
      contactEmail: '',
      phoneNumber: '',
      logoUrl: null,
    },
  });



  useEffect(() => {
    if (initialData) {
      reset({
        businessName: initialData.businessName ?? '',
        businessType: initialData.businessType ?? 'individual',
        country: initialData.country ?? '',
        industry: initialData.industry ?? '',
        websiteUrl: initialData.websiteUrl ?? '',
        contactEmail: initialData.contactEmail ?? '',
        phoneNumber: initialData.phoneNumber ?? '',
        logoUrl: initialData.logoUrl ?? null,
      });
      setLogoPreview(initialData.logoUrl ?? null);
    }
  }, [initialData, reset]);

  // Warn the user if they try to leave via browser back/close with unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers ignore the custom message but still show the prompt.
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setLogoPreview(result);
          setValue('logoUrl', result, { shouldValidate: true, shouldDirty: true });
        };
        reader.readAsDataURL(file);
      }
    },
    [setValue]
  );

  const handleRemoveLogo = useCallback(() => {
    setLogoPreview(null);
    setValue('logoUrl', null, { shouldValidate: true, shouldDirty: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setValue]);



  const onFormSubmit = useCallback(
    async (data: MerchantProfileFormValues) => {
      await onSubmit(data);
      // Reset dirty state after a successful save so the guard clears.
      reset(data);
    },
    [onSubmit, reset]
  );

  if (isLoading) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Business Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Business Profile
          {isDirty && (
            <span className="ml-2 text-xs font-normal text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
              Unsaved changes
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Business Logo
            </Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Logo
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isSubmitting}
                    className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, SVG or WebP. Max 2MB.
                </p>
                {/* TODO: Integrate with cloud storage for production uploads */}
              </div>
            </div>
            {errors.logoUrl && (
              <p className="text-xs text-destructive mt-1">
                {errors.logoUrl.message}
              </p>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Business Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('businessName')}
                aria-invalid={!!errors.businessName}
                placeholder="Enter business name"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.businessName && (
                <p className="text-xs text-destructive mt-1">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            {/* Business Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Business Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="businessType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full h-10 border-border rounded-xl bg-card text-sm">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.businessType && (
                <p className="text-xs text-destructive mt-1">
                  {errors.businessType.message}
                </p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Country <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('country')}
                aria-invalid={!!errors.country}
                placeholder="e.g. Nigeria"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.country && (
                <p className="text-xs text-destructive mt-1">
                  {errors.country.message}
                </p>
              )}
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Industry <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('industry')}
                aria-invalid={!!errors.industry}
                placeholder="e.g. Fintech, E-commerce"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.industry && (
                <p className="text-xs text-destructive mt-1">
                  {errors.industry.message}
                </p>
              )}
            </div>

            {/* Website URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Website URL
              </Label>
              <Input
                {...register('websiteUrl')}
                type="url"
                aria-invalid={!!errors.websiteUrl}
                placeholder="https://example.com"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.websiteUrl && (
                <p className="text-xs text-destructive mt-1">
                  {errors.websiteUrl.message}
                </p>
              )}
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Email <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('contactEmail')}
                type="email"
                aria-invalid={!!errors.contactEmail}
                placeholder="contact@example.com"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.contactEmail && (
                <p className="text-xs text-destructive mt-1">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone Number
              </Label>
              <Input
                {...register('phoneNumber')}
                type="tel"
                aria-invalid={!!errors.phoneNumber}
                placeholder="+234 800 000 0000"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSubmitting}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive mt-1">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit — disabled until the form has unsaved changes */}
          <Button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
=======
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  websiteUrl: z.string().regex(/^https:\/\/.*/, 'Website URL must start with https://'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditorProps {
  initialName?: string;
  initialEmail?: string;
  initialWebsiteUrl?: string;
}

export default function ProfileEditor({ initialName = '', initialEmail = '', initialWebsiteUrl = '' }: ProfileEditorProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});

  const handleSubmit = () => {
    const result = profileSchema.safeParse({ name, email, websiteUrl });
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProfileFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ProfileFormValues;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    toast.success('Profile updated successfully');
  };

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">Profile Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 border-slate-200 rounded-xl bg-white text-sm"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && <p id="name-error" className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="h-10 border-slate-200 rounded-xl bg-white text-sm"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && <p id="email-error" className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Website URL</Label>
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-10 border-slate-200 rounded-xl bg-white text-sm"
            aria-invalid={!!errors.websiteUrl}
            aria-describedby={errors.websiteUrl ? 'websiteUrl-error' : undefined}
          />
          {errors.websiteUrl && <p id="websiteUrl-error" className="text-xs text-red-500">{errors.websiteUrl}</p>}
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-10 px-6 text-sm" onClick={handleSubmit}>
          Save Changes
        </Button>
>>>>>>> 1d3c7ee (fix: enforce https protocol for merchant websiteUrl)
      </CardContent>
    </Card>
  );
}
