'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { signPayload, SIGNATURE_HEADER, TIMESTAMP_HEADER } from '@/lib/webhooks/hmac';
import { validateWebhookUrl } from '@/lib/webhooks/validateUrl';

const SAMPLE_BODY = JSON.stringify({
  id: 'evt_sample',
  type: 'payment.completed',
  data: { amountUsdc: 25 },
});

export function UrlValidator() {
  const [value, setValue] = useState('');
  const result = value ? validateWebhookUrl(value) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">URL validator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="wh-url-check">Target URL</Label>
        <Input
          id="wh-url-check"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com/webhooks"
          aria-describedby="wh-url-result"
          aria-invalid={result ? !result.valid : undefined}
        />
        <p id="wh-url-result" role="status" className="flex min-h-5 items-center gap-1.5 text-sm">
          {result &&
            (result.valid ? (
              <><CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> Looks good: public HTTPS endpoint.</>
            ) : (
              <><XCircle className="size-4 text-destructive" aria-hidden="true" /> {result.reason}</>
            ))}
        </p>
      </CardContent>
    </Card>
  );
}

/** Dev aid: computes the same HMAC the delivery worker sends, in the browser. */
export function SignaturePreview() {
  const [secret, setSecret] = useState('whsec_dev_secret');
  const [body, setBody] = useState(SAMPLE_BODY);
  const [timestamp] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [signature, setSignature] = useState('');

  useEffect(() => {
    let live = true;
    if (!globalThis.crypto?.subtle) {
      setSignature('WebCrypto is unavailable in this context (requires HTTPS or localhost).');
      return;
    }
    signPayload(secret, timestamp, body).then((s) => live && setSignature(`sha256=${s}`));
    return () => {
      live = false;
    };
  }, [secret, body, timestamp]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Signature check preview</CardTitle>
        <p className="text-xs text-muted-foreground">
          Dev aid. Computed locally with WebCrypto; secrets entered here are never sent anywhere.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="wh-sig-secret">Signing secret</Label>
          <Input id="wh-sig-secret" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" spellCheck={false} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wh-sig-body">Sample payload</Label>
          <textarea
            id="wh-sig-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            spellCheck={false}
            className="w-full rounded-lg border border-input bg-transparent p-2 font-mono text-xs"
          />
        </div>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs" aria-live="polite">
{`${TIMESTAMP_HEADER}: ${timestamp}
${SIGNATURE_HEADER}: ${signature}

signed string = "${timestamp}.<body>"  (HMAC-SHA256, hex)`}
        </pre>
      </CardContent>
    </Card>
  );
}
