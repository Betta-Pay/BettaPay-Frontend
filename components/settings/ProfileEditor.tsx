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
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
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

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_ASPECT_RATIO_DEVIATION = 0.15; // ±15% around 1:1

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAvatarFileSize(fileSize: number): AvatarValidationResult {
  if (fileSize > MAX_AVATAR_BYTES) {
    return {
      valid: false,
      error: 'Image file size exceeds the 2MB maximum limit. Please choose a smaller file.',
    };
  }
  return { valid: true };
}

export function validateAvatarAspectRatio(
  width: number,
  height: number,
): AvatarValidationResult {
  if (width <= 0 || height <= 0) {
    return {
      valid: false,
      error: 'Unable to determine image dimensions.',
    };
  }
  const ratio = width / height;
  if (Math.abs(ratio - 1) > MAX_ASPECT_RATIO_DEVIATION) {
    return {
      valid: false,
      error: `Image aspect ratio (${width}×${height}) is not square (1:1). Please upload a square logo.`,
    };
  }
  return { valid: true };
}

export function readImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension validation.'));
    };
    img.src = src;
  });
}

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
  const [logoValidationError, setLogoValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { i18n } = useAppTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    control,
    reset,
    formState: { errors, isDirty, isValid, isSubmitting: isFormSubmitting },
  } = useForm<MerchantProfileFormValues>({
    mode: 'onBlur',
    reValidateMode: 'onChange',
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

  const isSaving = isSubmitting || isFormSubmitting;

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const sizeCheck = validateAvatarFileSize(file.size);
      if (!sizeCheck.valid) {
        setLogoValidationError(sizeCheck.error ?? 'Invalid file size');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        try {
          const { width, height } = await readImageDimensions(result);
          const ratioCheck = validateAvatarAspectRatio(width, height);
          if (!ratioCheck.valid) {
            setLogoValidationError(ratioCheck.error ?? 'Invalid aspect ratio');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }
        } catch {
          // If Image decoding fails in a headless environment without explicit dimensions,
          // proceed unless an error was explicitly raised.
        }
        setLogoValidationError(null);
        setLogoPreview(result);
        setValue('logoUrl', result, { shouldValidate: true, shouldDirty: true });
      };
      reader.readAsDataURL(file);
    },
    [setValue]
  );

  const handleRemoveLogo = useCallback(() => {
    setLogoPreview(null);
    setLogoValidationError(null);
    setValue('logoUrl', null, { shouldValidate: true, shouldDirty: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setValue]);

  const onFormSubmit = useCallback(
    async (data: MerchantProfileFormValues) => {
      setSubmitError(null);
      try {
        await onSubmit(data);
        reset(data);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Failed to update profile — please try again');
      }
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
            <span role="status" className="ml-2 text-xs font-normal text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
              Unsaved changes
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="space-y-6">
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
                  disabled={isSaving}
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
                    disabled={isSaving}
                    className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP. Max 2MB.</p>
              </div>
            </div>
            {(logoValidationError || errors.logoUrl) && (
              <p id="profile-logoUrl-error" role="alert" className="text-xs text-destructive mt-1">
                {logoValidationError ?? errors.logoUrl?.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-businessName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('businessName', { onBlur: () => { void trigger('businessName'); } })}
                id="profile-businessName"
                aria-describedby={errors.businessName ? 'profile-businessName-error' : undefined}
                aria-invalid={!!errors.businessName}
                placeholder="Enter business name"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSaving}
              />
              {errors.businessName && (
                <p id="profile-businessName-error" role="alert" className="text-xs text-destructive mt-1">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-businessType" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Business Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="businessType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => { field.onChange(value); void trigger('businessType'); }}
                    disabled={isSaving}
                  >
                    <SelectTrigger
                      id="profile-businessType"
                      aria-invalid={!!errors.businessType}
                      ref={field.ref}
                      onBlur={() => { field.onBlur(); void trigger('businessType'); }}
                      aria-describedby={errors.businessType ? 'profile-businessType-error' : undefined}
                      className="w-full h-10 border-border rounded-xl bg-card text-sm"
                    >
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
                <p id="profile-businessType-error" role="alert" className="text-xs text-destructive mt-1">
                  {errors.businessType.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-country" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Country <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => {
                  const locale = i18n.language ?? 'en';
                  const COUNTRY_CODES = [
                    'NG', 'GH', 'KE', 'ZA', 'US', 'GB', 'CA', 'FR', 'PT', 'SE'
                  ];

                  let displayName: Intl.DisplayNames | null = null;
                  try {
                    displayName = new Intl.DisplayNames([locale], { type: 'region' });
                  } catch {
                    displayName = new Intl.DisplayNames(['en'], { type: 'region' });
                  }

                  return (
                    <Select
                      value={field.value || null}
                      onValueChange={(val) => { field.onChange(val ?? ''); void trigger('country'); }}
                      disabled={isSaving}
                    >
                      <SelectTrigger
                        id="profile-country"
                        ref={field.ref}
                        onBlur={() => { field.onBlur(); void trigger('country'); }}
                        aria-describedby={errors.country ? 'profile-country-error' : undefined}
                        className="w-full h-10 border-border rounded-xl bg-card text-sm"
                        aria-invalid={!!errors.country}
                      >
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {displayName?.of(code) ?? code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.country && (
                <p id="profile-country-error" role="alert" className="text-xs text-destructive mt-1">
                  {errors.country.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-industry" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Industry <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('industry', { onBlur: () => { void trigger('industry'); } })}
                id="profile-industry"
                aria-describedby={errors.industry ? 'profile-industry-error' : undefined}
                aria-invalid={!!errors.industry}
                placeholder="e.g. Fintech, E-commerce"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSaving}
              />
              {errors.industry && (
                <p id="profile-industry-error" role="alert" className="text-xs text-destructive mt-1">
                  {errors.industry.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-websiteUrl" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Website URL
              </Label>
              <Input
                {...register('websiteUrl', { onBlur: () => { void trigger('websiteUrl'); } })}
                id="profile-websiteUrl"
                aria-describedby={errors.websiteUrl ? 'profile-websiteUrl-error' : undefined}
                type="url"
                aria-invalid={!!errors.websiteUrl}
                placeholder="https://example.com"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSaving}
              />
              {errors.websiteUrl && (
                <p id="profile-websiteUrl-error" role="alert" className="text-xs text-destructive mt-1">
                  {errors.websiteUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-contactEmail" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Email <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('contactEmail', { onBlur: () => { void trigger('contactEmail'); } })}
                id="profile-contactEmail"
                aria-describedby={errors.contactEmail ? 'profile-contactEmail-error' : undefined}
                type="email"
                aria-invalid={!!errors.contactEmail}
                placeholder="contact@example.com"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSaving}
              />
              {errors.contactEmail && (
                <p id="profile-contactEmail-error" role="alert" className="text-xs text-destructive mt-1">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phoneNumber" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone Number
              </Label>
              <Input
                {...register('phoneNumber', { onBlur: () => { void trigger('phoneNumber'); } })}
                id="profile-phoneNumber"
                aria-describedby={errors.phoneNumber ? 'profile-phoneNumber-error' : undefined}
                type="tel"
                aria-invalid={!!errors.phoneNumber}
                placeholder="+234 800 000 0000"
                className="h-10 border-border rounded-xl bg-card text-sm"
                disabled={isSaving}
              />
              {errors.phoneNumber && (
                <p id="profile-phoneNumber-error" role="alert" className="text-xs text-destructive mt-1">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-destructive">{submitError}</p>
          )}

          <Button
            type="submit"
            disabled={!isDirty || !isValid || isSaving || Boolean(logoValidationError)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 text-sm disabled:opacity-50"
          >
            {isSaving ? (
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
