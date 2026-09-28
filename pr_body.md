- closes #289
- closes #317

### Changes Made:
- **`ProfileEditor`**: Implemented `onBlur` handlers for form fields to instantly validate input and display errors without waiting for a full form submission.
- **`useCrossTabAuth`**: Added a missing cleanup function in the `useEffect` hook to properly unbind the `storage` event listener upon unmount, preventing memory leaks and duplicate triggers.
