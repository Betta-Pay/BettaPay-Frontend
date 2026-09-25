- closes #310
- closes #313
- closes #318
- closes #319

### Changes Made:
- **Webhooks**: Integrated explicit URL parsing/validation in `WebhookConfig` to reject malformed endpoints before saving.
- **Fee Rules**: Hooked up the `FeeRulesEditor` form submission to actually persist to the `/api/settings/fee-rules` backend route.
- **SDKs**: Gutted the hardcoded SDK mock data at `/sdks` and replaced it with a dynamic `useSDKList` fetch combined with client-side filtering logic.
- **Layout Consistency**: Refactored the app to use a new `UnifiedLayout` for both the guides and docs pages, eliminating visual disjointedness.
