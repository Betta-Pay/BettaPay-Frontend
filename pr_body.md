- closes #316
- closes #328
- closes #329
- closes #334

### Changes Made:
- **`FAQ` Component**: Added a search and filtering input on the pricing page FAQ.
- **`retryWithBackoff`**: Distinguishes between retryable (5xx, network) and non-retryable (400, 401, 403) HTTP errors before retrying.
- **`mock` documentation**: Added a clear `README.md` warning new contributors that files in `mock/` are not real API responses.
- **`useOnlineStatus`**: Fixed SSR hydration mismatch by ensuring it correctly initializes based on `window` existence.
