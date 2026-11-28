#!/usr/bin/env node
/**
 * Locale parity check.
 *
 * Compares every locale dictionary under `lib/i18n/` against the reference
 * locale (`en.json`) and fails when:
 *
 *   - a nested key is missing from a locale (it would render as a raw key),
 *   - a locale has an extra key the reference does not define (unused text),
 *   - a `{{placeholder}}` in a value differs from the reference (the string
 *     would render with an unfilled or misnamed variable), or
 *   - a dictionary is not valid JSON.
 *
 * Exit codes:
 *   0 - every locale matches the reference
 *   1 - one or more locales diverge from the reference
 *   2 - the check itself cannot run (locales directory or reference file missing or unreadable)
 *
 * Set `I18N_LOCALES_DIR` to check a different directory; the parity tests use this.
 *
 * Run locally with `npm run i18n:check`; it also runs in CI (.github/workflows/i18n.yml).
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REFERENCE_LOCALE = "en";
const defaultLocalesDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "lib", "i18n");
const localesDir = process.env.I18N_LOCALES_DIR
  ? resolve(process.env.I18N_LOCALES_DIR)
  : defaultLocalesDir;

const PLACEHOLDER_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Recursively collect `[dot.path, value]` pairs for every leaf of a nested object. */
function flattenLeaves(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [[prefix, value]];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenLeaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** Sorted set of `{{name}}` placeholder names in a value. Non-strings have none. */
function placeholdersOf(value) {
  if (typeof value !== "string") return [];
  return [...new Set([...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]))].sort();
}

function formatPlaceholders(names) {
  return names.length === 0 ? "none" : names.map((name) => `{{${name}}}`).join(", ");
}

function loadDictionary(locale) {
  try {
    const data = JSON.parse(readFileSync(join(localesDir, `${locale}.json`), "utf8"));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function listLocales() {
  return readdirSync(localesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length))
    .sort();
}

function main() {
  let localeFiles;
  try {
    localeFiles = listLocales();
  } catch (error) {
    console.error(`✖ Cannot read locales directory ${localesDir}: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  if (!localeFiles.includes(REFERENCE_LOCALE)) {
    console.error(`✖ Reference locale "${REFERENCE_LOCALE}.json" not found in ${localesDir}`);
    process.exitCode = 2;
    return;
  }

  const reference = loadDictionary(REFERENCE_LOCALE);
  if (!reference.ok) {
    console.error(`✖ ${REFERENCE_LOCALE}.json is not valid JSON: ${reference.error}`);
    process.exitCode = 2;
    return;
  }

  const referenceLeaves = new Map(flattenLeaves(reference.data));
  const otherLocales = localeFiles.filter((locale) => locale !== REFERENCE_LOCALE);
  let hasDivergence = false;

  for (const locale of otherLocales) {
    const dictionary = loadDictionary(locale);
    if (!dictionary.ok) {
      hasDivergence = true;
      console.error(`✖ ${locale}: invalid JSON - ${dictionary.error}`);
      continue;
    }

    const localeLeaves = new Map(flattenLeaves(dictionary.data));
    const missing = [...referenceLeaves.keys()].filter((key) => !localeLeaves.has(key)).sort();
    const extra = [...localeLeaves.keys()].filter((key) => !referenceLeaves.has(key)).sort();

    const placeholderIssues = [];
    for (const [key, referenceValue] of referenceLeaves) {
      if (!localeLeaves.has(key)) continue;
      const expected = placeholdersOf(referenceValue);
      const actual = placeholdersOf(localeLeaves.get(key));
      if (expected.join("|") !== actual.join("|")) {
        placeholderIssues.push({ key, expected, actual });
      }
    }

    if (missing.length === 0 && extra.length === 0 && placeholderIssues.length === 0) {
      console.log(`✔ ${locale}: ${localeLeaves.size} keys - in sync with ${REFERENCE_LOCALE}`);
      continue;
    }

    hasDivergence = true;
    console.error(`✖ ${locale}: diverges from ${REFERENCE_LOCALE}`);
    for (const key of missing) console.error(`    missing: ${key}`);
    for (const key of extra) console.error(`    extra:   ${key}`);
    for (const { key, expected, actual } of placeholderIssues) {
      console.error(
        `    placeholder: ${key} (expected ${formatPlaceholders(expected)}, found ${formatPlaceholders(actual)})`,
      );
    }
  }

  if (hasDivergence) {
    console.error(
      `\nLocale parity check failed. Every locale must share the exact key set and placeholders as ${REFERENCE_LOCALE}.json.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${otherLocales.length} locale(s) match ${REFERENCE_LOCALE}.json.`);
}

main();
