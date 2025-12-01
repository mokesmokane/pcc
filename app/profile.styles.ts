import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8B8680',
    marginTop: 12,
  },

  // Header section (coral background)
  headerSection: {
    backgroundColor: '#E05F4E',
    paddingTop: 8,
    paddingBottom: 70, // Extra space for avatar overlap
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },

  // Avatar section (overlaps header)
  avatarSection: {
    alignItems: 'flex-start',
    paddingLeft: 24,
    marginTop: -60, // Pull up to overlap header
    marginBottom: 16,
    zIndex: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#7DD3C0', // Teal border
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F6F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#7DD3C0',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#E05F4E',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#E05F4E',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Content section
  contentSection: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },

  // Name
  nameText: {
    fontSize: 28,
    color: '#E05F4E',
    fontFamily: 'PaytoneOne_400Regular',
    marginBottom: 8,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationText: {
    fontSize: 14,
    color: '#403837',
    marginLeft: 4,
  },

  // Bio section
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: 15,
    color: '#403837',
    lineHeight: 22,
    marginBottom: 24,
  },
  bioPlaceholder: {
    fontSize: 15,
    color: '#8B8680',
    lineHeight: 22,
    marginBottom: 24,
  },
  bioInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#403837',
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },

  // Interests section
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  interestEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  interestText: {
    fontSize: 14,
    color: '#403837',
    fontWeight: '500',
  },

  // Form fields (for edit mode)
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B8680',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#403837',
  },
  helperText: {
    fontSize: 12,
    color: '#8B8680',
    marginTop: 6,
  },
  readOnlyField: {
    backgroundColor: '#F8F6F3',
    borderWidth: 1,
    borderColor: '#E8E5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#8B8680',
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
  },
  saveButton: {
    backgroundColor: '#E05F4E',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Edit button
  editButton: {
    position: 'absolute',
    top: 8,
    right: 16,
    padding: 8,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  keyboardView: {
    flex: 1,
  },
});
