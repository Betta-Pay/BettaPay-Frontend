29

user avatar


 
15 matches
#28 Ensure all forms are usable with mobile keyboards
Repo Avatar
Betta-Pay/BettaPay-Frontend
Description: When mobile keyboards are open, form fields can be hidden behind the keyboard. The login, register, payment link creation, and settings forms need to be scrollable and the active input should remain visible above the keyboard.

Requirements:

Form containers should be within a scrollable area
The or form wrapper should not have overflow: hidden that prevents scrolling to the focused input
Test all forms with a mobile keyboard open (use Chrome DevTools device emulation)
Ensure the submit button is reachable without scrolling excessively
Suggested execution steps:

Review all form pages and verify the scroll behavior with keyboard open
In app/auth/layout.tsx, ensure the form column uses overflow-y: auto not overflow: hidden
Add scroll-margin-bottom: 200px to form submit buttons so they scroll above the keyboard
Test the settings page form fields (business info, security) with keyboard open
Test the payment link creation dialog — dialogs can be problematic with mobile keyboards