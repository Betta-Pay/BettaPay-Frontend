let hasWarnedMissingGoogleClientId = false;

export function shouldWarnMissingGoogleClientId(): boolean {
  if (hasWarnedMissingGoogleClientId) return false;
  hasWarnedMissingGoogleClientId = true;
  return true;
}

export function __resetGoogleWarnForTests() {
  hasWarnedMissingGoogleClientId = false;
}
