- closes #311
- closes #312
- closes #314
- closes #315

### Changes Made:
- **`ComparisonTable`**: Stripped out hardcoded elements and connected it to the live `usePricingData` hook.
- **`VolumeCalculator`**: Discarded static values and implemented actual fee calculation logic based on volume input.
- **`GuideProgress`**: Introduced `localStorage` persistence so user reading progress isn't wiped on reload.
- **`GuideCard`**: Hooked the component up to the backend via `useGuideData` instead of using dummy strings.
