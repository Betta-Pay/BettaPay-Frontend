import { isIP } from "node:net";

/** True for a syntactically valid IPv4 or IPv6 address. */
export function isValidIp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 45 && isIP(value) !== 0;
}
