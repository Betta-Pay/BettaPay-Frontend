"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
    watch,
    reset,
    formState: { errors },
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

  const businessTypeValue = watch('businessType');

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

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setLogoPreview(result);
          setValue('logoUrl', result, { shouldValidate: true });
        };
        reader.readAsDataURL(file);
      }
    },
    [setValue]
  );

  const handleRemoveLogo = useCallback(() => {
    setLogoPreview(null);
    setValue('logoUrl', null, { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setValue]);

  const handleBusinessTypeChange = useCallback(
    (value: MerchantProfileFormValues['businessType'] | null) => {
      if (!value) return;
      setValue('businessType', value, {
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const onFormSubmit = useCallback(
    async (data: MerchantProfileFormValues) => {
      await onSubmit(data);
    },
    [onSubmit]
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
                aria-invalid={errors.businessName ? 'true' : 'false'}
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
              <Select
                value={businessTypeValue}
                onValueChange={handleBusinessTypeChange}
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
                aria-invalid={errors.country ? 'true' : 'false'}
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
                aria-invalid={errors.industry ? 'true' : 'false'}
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
                aria-invalid={errors.websiteUrl ? 'true' : 'false'}
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
                aria-invalid={errors.contactEmail ? 'true' : 'false'}
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
                aria-invalid={errors.phoneNumber ? 'true' : 'false'}
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

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm"
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
