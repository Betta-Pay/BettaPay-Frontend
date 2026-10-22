import { codeSnippets, type Language } from '@/components/developers/codeSnippets';
import { SDKS } from '@/lib/sdks';

/**
 * Per-SDK code paths shown by the playground: how to install it, and a
 * quickstart that makes the same quote request the "Try it" panel runs.
 *
 * Install commands come from `lib/sdks.ts`; the quickstart for the four
 * languages that `codeSnippets.ts` covers is that file's `get-fx-quote`
 * operation, so the playground and the developer console can never show two
 * different samples for the same call.
 */
export interface SdkSample {
  id: string;
  install: string;
  quickstart: string;
}

const RUST_QUICKSTART = `use bettapay::{BettaPay, QuoteRequest};

#[tokio::main]
async fn main() -> Result<(), bettapay::Error> {
    let client = BettaPay::new("bp_test_YOUR_DEV_KEY");

    let quote = client
        .fx()
        .quote(QuoteRequest {
            from: "USDC".into(),
            to: "NGN".into(),
            amount: 50.0,
        })
        .await?;

    println!("{}", quote.converted);
    // Output: 82521
    Ok(())
}`;

const LANGUAGE_BY_SDK: Record<string, Language | 'rust'> = {
  typescript: 'javascript',
  python: 'python',
  php: 'php',
  go: 'go',
  rust: 'rust',
};

function quickstartFor(sdkId: string): string {
  const language = LANGUAGE_BY_SDK[sdkId];
  if (language === 'rust') return RUST_QUICKSTART;
  return codeSnippets['get-fx-quote'][language];
}

export const SDK_SAMPLES: readonly SdkSample[] = SDKS.map((sdk) => ({
  id: sdk.id,
  install: sdk.installCommand,
  quickstart: quickstartFor(sdk.id),
}));

export function getSdkSample(id: string): SdkSample | undefined {
  return SDK_SAMPLES.find((sample) => sample.id === id);
}

/** Rust is outside `codeSnippets.ts`'s four-language shape; exported for tests. */
export const RUST_SAMPLE = RUST_QUICKSTART;

/**
 * Every TypeScript snippet the docs show, keyed by a stable name. Consumed by
 * `scripts/extract-sdk-snippets.mjs`, which writes them to disk so
 * `npm run typecheck:snippets` can compile each one against `sdk.d.ts`.
 */
export function getTypeScriptSnippets(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [operation, languages] of Object.entries(codeSnippets)) {
    out[operation] = languages.javascript;
  }
  return out;
}

/** Every displayed snippet in every language, for copy/display tests. */
export function getAllDisplayedSnippets(): Array<{ name: string; code: string }> {
  const items: Array<{ name: string; code: string }> = [];
  for (const [operation, languages] of Object.entries(codeSnippets)) {
    for (const [language, code] of Object.entries(languages)) {
      items.push({ name: `${operation}/${language}`, code });
    }
  }
  for (const sample of SDK_SAMPLES) {
    items.push({ name: `${sample.id}/install`, code: sample.install });
    items.push({ name: `${sample.id}/quickstart`, code: sample.quickstart });
  }
  return items;
}
