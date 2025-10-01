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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space for MiniPlayer
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#F4F1ED',
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#E05F4E',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: '#403837',
    marginTop: 8,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#F4F1ED',
    marginBottom: 8,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#F8F6F3',
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F8F6F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#E05F4E',
  },
  editPhotoButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  editPhotoText: {
    fontSize: 16,
    color: '#E05F4E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  avatarButton: {
    position: 'relative',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: '#E05F4E',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: 13,
    color: '#8B8680',
    marginTop: 12,
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#403837',
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
  emailGroup: {
    marginBottom: 20,
  },
  emailText: {
    backgroundColor: '#F8F6F3',
    borderWidth: 1,
    borderColor: '#E8E5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#8B8680',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
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
  saveButtonDisabled: {
    backgroundColor: '#C4C1BB',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F4F1ED',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    color: '#E05F4E',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    padding: 4,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#E05F4E',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F4F1ED',
  },
  form: {
    paddingHorizontal: 20,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 12,
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
  errorText: {
    fontSize: 16,
    color: '#8B8680',
    textAlign: 'center',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E8E5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E05F4E',
  },
});