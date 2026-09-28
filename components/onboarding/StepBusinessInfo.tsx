import { Controller, type Control } from "react-hook-form";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";

const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United States"] as const;

type Props = {
  data: OnboardingData;
  errors: Record<string, string>;
  onChange: (data: Partial<OnboardingData>) => void;
  control: Control<OnboardingData>;
};

export function StepBusinessInfo({ data, errors, onChange, control }: Props) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Business information</h2>
        <p className="text-sm text-muted-foreground">This appears on payment records and receipts.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" autoFocus value={data.businessName} onChange={(event) => onChange({ businessName: event.target.value })} aria-invalid={!!errors.businessName} />
        {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Business type</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["individual", "business"] as const).map((type) => (
            <button key={type} type="button" onClick={() => onChange({ businessType: type })} className={`rounded-lg border p-3 text-left capitalize ${data.businessType === type ? "border-primary bg-primary/5" : "border-border"}`}>
              {type}
            </button>
          ))}
        </div>
        {errors.businessType && <p className="text-sm text-destructive">{errors.businessType}</p>}
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        {/* The Select is a controlled custom component, so it needs the
            Controller wrapper to be part of the form: `field` binds the value
            to React Hook Form (the wizard's single source of truth and what
            `trigger("country")` validates), while `onChange` still routes
            through the page so the value is trimmed and persisted. */}
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <Select
              value={field.value || null}
              onValueChange={(value) => {
                field.onChange(value);
                onChange({ country: (value as string | null) ?? "" });
              }}
            >
              <SelectTrigger
                id="country"
                className="w-full"
                aria-invalid={!!errors.country}
                aria-describedby={errors.country ? "country-error" : undefined}
              >
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.country && <p id="country-error" className="text-sm text-destructive">{errors.country}</p>}
      </div>
    </section>
  );
}
