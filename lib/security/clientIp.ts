/** Browser-safe IP shape check (the server re-validates with node:net). */
const V4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const V6 = /^[0-9a-f:.]+$/i;

export function looksLikeIp(value: string): boolean {
  const v = value.trim();
  if (V4.test(v)) return true;
  return v.includes(":") && v.length <= 45 && V6.test(v) && v.split(":").length >= 3;
}
