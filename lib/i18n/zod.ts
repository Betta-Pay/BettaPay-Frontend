import { z } from "zod";

import { translate } from "./runtime";

/**
 * Localizes Zod's built-in validation messages through i18next.
 *
 * The repo is on Zod 4, which removed the error map internals that
 * `zod-i18n-map` depends on (it throws `defaultErrorMap is not a function` and
 * its v3 issue codes no longer match). Zod 4 ships a first-class hook for this
 * — {@link z.config}’s `customError` — so the same result is achieved without
 * that dependency: each issue code is mapped to a key under `zod.errors.*`,
 * resolved against the active i18next instance at parse time.
 *
 * Schema-level messages (e.g. the domain copy in `lib/utils/validation.ts`)
 * take precedence and are translated separately via `translate(...)`.
 */

const SIZED_ORIGINS = new Set(["string", "number", "array"]);
const NAMED_FORMATS = new Set(["email", "url", "regex"]);

function sizeKey(kind: "tooSmall" | "tooBig", origin: string, inclusive: boolean): string {
  const group = SIZED_ORIGINS.has(origin) ? origin : "default";
  return `zod.errors.${kind}.${group}${inclusive ? "" : "Exclusive"}`;
}

export function configureZodI18n(): void {
  z.config({
    customError: (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          if (issue.input === undefined) {
            return translate("zod.errors.invalidTypeNoReceived", { expected: issue.expected });
          }
          return translate("zod.errors.invalidType", {
            expected: issue.expected,
            received: typeof issue.input,
          });
        }
        case "too_small":
          return translate(sizeKey("tooSmall", issue.origin, issue.inclusive), {
            minimum: issue.minimum,
          });
        case "too_big":
          return translate(sizeKey("tooBig", issue.origin, issue.inclusive), {
            maximum: issue.maximum,
          });
        case "invalid_format":
          return translate(
            `zod.errors.invalidFormat.${NAMED_FORMATS.has(issue.format) ? issue.format : "default"}`,
          );
        case "invalid_value":
          return translate("zod.errors.invalidValue", { values: issue.values.join(", ") });
        case "not_multiple_of":
          return translate("zod.errors.notMultipleOf", { divisor: issue.divisor });
        case "unrecognized_keys":
          return translate("zod.errors.unrecognizedKeys", { keys: issue.keys.join(", ") });
        case "invalid_union":
          return translate("zod.errors.invalidUnion");
        case "invalid_key":
          return translate("zod.errors.invalidKey");
        case "invalid_element":
          return translate("zod.errors.invalidElement");
        default:
          // Return undefined so Zod keeps its own message for codes we do not
          // translate, rather than surfacing a raw translation key.
          return undefined;
      }
    },
  });
}

// Configure once on import so any module defining schemas gets the localized
// error map without extra wiring.
configureZodI18n();
