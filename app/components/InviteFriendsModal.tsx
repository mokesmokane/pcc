import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inviteService, Contact } from '../services/invite.service';
import { useCurrentProfile } from '../hooks/queries/useProfile';

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InviteFriendsModal({ visible, onClose }: InviteFriendsModalProps) {
  const { data: profile } = useCurrentProfile();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter((contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const fetchedContacts = await inviteService.getContacts();
      setContacts(fetchedContacts);
      setFilteredContacts(fetchedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSendInvites = async () => {
    if (selectedContacts.size === 0) {
      return;
    }

    setSending(true);
    try {
      // Get phone numbers from selected contacts
      const phoneNumbers: string[] = [];
      selectedContacts.forEach((contactId) => {
        const contact = contacts.find((c) => c.id === contactId);
        if (contact?.phoneNumbers && contact.phoneNumbers.length > 0) {
          phoneNumbers.push(contact.phoneNumbers[0]);
        }
      });

      const message = inviteService.generateInviteMessage(profile?.firstName);
      await inviteService.sendSMSInvites(phoneNumbers, message);

      // Reset and close
      setSelectedContacts(new Set());
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error sending invites:', error);
    } finally {
      setSending(false);
    }
  };

  const handleShareGeneral = async () => {
    try {
      const message = inviteService.generateInviteMessage(profile?.firstName);
      await inviteService.shareInvite(message);
    } catch (error) {
      console.error('Error sharing invite:', error);
    }
  };

  const handleClose = () => {
    setSelectedContacts(new Set());
    setSearchQuery('');
    onClose();
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.has(item.id);
    const phoneNumber = item.phoneNumbers?.[0] || '';

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => toggleContactSelection(item.id)}
      >
        <View style={styles.contactInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{item.name}</Text>
            {phoneNumber && <Text style={styles.contactPhone}>{phoneNumber}</Text>}
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#403837" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareGeneral}>
          <Ionicons name="share-outline" size={20} color="#E05F4E" />
          <Text style={styles.shareButtonText}>Share Invite Link</Text>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8B8680" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts"
            placeholderTextColor="#8B8680"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Selected Count */}
        {selectedContacts.size > 0 && (
          <View style={styles.selectedCountContainer}>
            <Text style={styles.selectedCountText}>
              {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        {/* Contacts List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E05F4E" />
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#C4BFB9" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No contacts found' : 'No contacts available'}
                </Text>
              </View>
            }
          />
        )}

        {/* Send Button */}
        {selectedContacts.size > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSendInvites}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>
                  Send Invites ({selectedContacts.size})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#403837',
  },
  placeholder: {
    width: 36,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E05F4E',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#403837',
  },
  selectedCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E05F4E',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E05F4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactDetails: {
    marginLeft: 12,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#403837',
  },
  contactPhone: {
    fontSize: 14,
    color: '#8B8680',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C4BFB9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#E05F4E',
    borderColor: '#E05F4E',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B8680',
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F4F1ED',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E5E1',
  },
  sendButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
