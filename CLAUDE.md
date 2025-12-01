# Claude Code Guidelines for PCC (Podcast Club)

## UI/UX Rules

### DO NOT use system Alert.alert() dialogs
- **NEVER** use React Native's built-in `Alert.alert()` - they are ugly and inconsistent
- For confirmations (Yes/No, Cancel/Delete): use `ConfirmDialog` component (`app/components/ConfirmDialog.tsx`)
  - Use `confirmStyle="default"` for normal actions
  - Use `confirmStyle="destructive"` for delete/remove actions
- For info messages (OK only): use `InfoDialog` component (`app/components/InfoDialog.tsx`)
  - Use `type="info"` for general info
  - Use `type="success"` for success messages
  - Use `type="error"` for error messages

### Fonts
- Use PaytoneOne for section headers/titles (import from `@expo-google-fonts/paytone-one`)
- Regular text uses system fonts

### Colors
- Background: #F4F1ED
- Card background: #FFFFFF
- Primary accent (coral): #E05F4E
- Text primary: #403837
- Text secondary: #8B8680
- Border/divider: #E8E5E1

### Avatars
- Always use user ID as the DiceBear seed for consistency
- Fallback URL: `https://api.dicebear.com/7.x/avataaars/png?seed=${userId}`
