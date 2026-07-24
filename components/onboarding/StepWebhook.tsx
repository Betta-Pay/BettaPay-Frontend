import { useState } from "react";
import { Beaker } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";
type Props = { data: OnboardingData; errors: Record<string, string>; onChange: (data: Partial<OnboardingData>) => void };
export function StepWebhook({ data, errors, onChange }: Props) { const [tested, setTested] = useState(false); return <section className="space-y-5"><div><h2 className="text-lg font-semibold">Webhook configuration</h2><p className="text-sm text-muted-foreground">Optional. Receive a notification when payment events occur.</p></div><div className="space-y-2"><Label htmlFor="webhookUrl">Webhook URL</Label><Input id="webhookUrl" type="url" placeholder="https://your-app.com/webhooks/bettapay" value={data.webhookUrl} onChange={(event) => { setTested(false); onChange({ webhookUrl: event.target.value }); }} aria-invalid={!!errors.webhookUrl} />{errors.webhookUrl && <p className="text-sm text-destructive">{errors.webhookUrl}</p>}</div><Button type="button" variant="outline" disabled={!data.webhookUrl || !!errors.webhookUrl} onClick={() => setTested(true)}><Beaker className="mr-2 h-4 w-4" />Test endpoint</Button>{tested && <p className="text-sm text-green-600">Test event queued. Check your endpoint logs.</p>}</section>; }
