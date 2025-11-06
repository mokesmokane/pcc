import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useDatabase } from './contexts/DatabaseContext';
import { MeetupRepository } from './data/repositories/meetup.repository';
import { WeeklySelectionRepository } from './data/repositories/weekly-selection.repository';
import { CommentRepository } from './data/repositories/comment.repository';
import { ProgressRepository } from './data/repositories/progress.repository';
import { ProfileRepository } from './data/repositories/profile.repository';
import { MembersRepository } from './data/repositories/members.repository';
import { supabase } from './lib/supabase';
import { CreateTestUserModal } from './components/CreateTestUserModal';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const TABLE_NAMES = [
  'user_episode_progress',
  'weekly_selections',
  'user_weekly_choices',
  'comments',
  'comment_reactions',
  'profiles',
  'transcript_segments',
  'chapters',
  'members',
  'meetups',
  'episode_meetups',
  'meetup_attendees',
  'episode_details',
];

interface RepositoryInfo {
  name: string;
  displayName: string;
  className: string;
  actions: {
    id: string;
    label: string;
    icon: string;
    method?: string;
  }[];
}

const REPOSITORIES: RepositoryInfo[] = [
  {
    name: 'meetup',
    displayName: 'Meetups',
    className: 'MeetupRepository',
    actions: [
      { id: 'sync', label: 'Sync All', icon: 'sync', method: 'syncAllUpcomingFromSupabase' },
      { id: 'syncEpisode', label: 'Sync by Episode', icon: 'download', method: 'syncFromSupabase' },
      { id: 'clear', label: 'Clear', icon: 'trash' },
    ]
  },
  {
    name: 'weekly',
    displayName: 'Weekly Selections',
    className: 'WeeklySelectionRepository',
    actions: [
      { id: 'sync', label: 'Sync', icon: 'sync', method: 'syncWithRemote' },
      { id: 'clear', label: 'Clear', icon: 'trash' },
    ]
  },
  {
    name: 'comment',
    displayName: 'Comments',
    className: 'CommentRepository',
    actions: [
      { id: 'sync', label: 'Sync', icon: 'sync', method: 'syncFromSupabase' },
      { id: 'clear', label: 'Clear', icon: 'trash' },
    ]
  },
  {
    name: 'progress',
    displayName: 'User Progress',
    className: 'ProgressRepository',
    actions: [
      { id: 'sync', label: 'Sync', icon: 'sync', method: 'syncFromSupabase' },
      { id: 'push', label: 'Push', icon: 'cloud-upload' },
      { id: 'clear', label: 'Clear', icon: 'trash' },
    ]
  },
  {
    name: 'profile',
    displayName: 'Profiles',
    className: 'ProfileRepository',
    actions: [
      { id: 'sync', label: 'Sync', icon: 'sync', method: 'syncFromSupabase' },
      { id: 'clear', label: 'Clear', icon: 'trash' },
    ]
  },
  {
    name: 'members',
    displayName: 'Members',
    className: 'MembersRepository',
    actions: [
      { id: 'sync', label: 'Sync', icon: 'sync', method: 'syncFromSupabase' },
      { id: 'clear', label: 'Clear', icon: 'trash' },
    ]
  },
];

interface ContactUser {
  name: string;
  phone: string;
}

export default function AdminScreen() {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const router = useRouter();
  const { database, resetDatabase } = useDatabase();
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [allContacts, setAllContacts] = useState<ContactUser[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [creatingUser, setCreatingUser] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null);

  useEffect(() => {
    loadTableCounts();
  }, [database]);

  // Load contacts on mount
  useEffect(() => {
    loadContactsForTesting();
  }, []);

  // Filter contacts based on search
  useEffect(() => {
    if (!contactSearch.trim()) {
      setContacts(allContacts.slice(0, 20));
    } else {
      const filtered = allContacts.filter(contact =>
        contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.phone.includes(contactSearch)
      );
      setContacts(filtered.slice(0, 20));
    }
  }, [contactSearch, allContacts]);

  const loadTableCounts = async () => {
    if (!database) return;

    setLoading(true);
    const counts: Record<string, number> = {};

    for (const tableName of TABLE_NAMES) {
      try {
        const collection = database.get(tableName);
        const records = await collection.query().fetch();
        counts[tableName] = records.length;
      } catch (error) {
        console.error(`Error loading count for ${tableName}:`, error);
        counts[tableName] = 0;
      }
    }

    setTableCounts(counts);
    setLoading(false);
  };

  const loadTableData = async (tableName: string) => {
    if (!database) return;

    try {
      const collection = database.get(tableName);
      const records = await collection.query().fetch();
      const data = records.map(record => record._raw);
      setTableData(prev => ({ ...prev, [tableName]: data }));
    } catch (error) {
      console.error(`Error loading data for ${tableName}:`, error);
    }
  };

  const toggleTable = async (tableName: string) => {
    if (expandedTable === tableName) {
      setExpandedTable(null);
    } else {
      setExpandedTable(tableName);
      if (!tableData[tableName]) {
        await loadTableData(tableName);
      }
    }
  };

  const getRepositoryInstance = (repoName: string): MeetupRepository | WeeklySelectionRepository | CommentRepository | ProgressRepository | ProfileRepository | MembersRepository | null => {
    if (!database) return null;

    switch (repoName) {
      case 'meetup':
        return new MeetupRepository(database);
      case 'weekly':
        return new WeeklySelectionRepository(database);
      case 'comment':
        return new CommentRepository(database);
      case 'progress':
        return new ProgressRepository(database);
      case 'profile':
        return new ProfileRepository(database);
      case 'members':
        return new MembersRepository(database);
      default:
        return null;
    }
  };

  const loadContactsForTesting = async () => {
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Contacts permission is required to load test users');
        setLoadingContacts(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (!data || data.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on this device');
        setLoadingContacts(false);
        return;
      }

      const contactUsers: ContactUser[] = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => ({
          name: contact.name || 'Unknown',
          phone: contact.phoneNumbers![0].number || contact.phoneNumbers![0].digits || '',
        }))
        .filter(c => c.phone);

      setAllContacts(contactUsers);
      setContacts(contactUsers.slice(0, 20)); // Show first 20 initially
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactPress = (contact: ContactUser) => {
    setSelectedContact(contact);
    setShowCreateUserModal(true);
  };

  const handleCreateTestUser = async (userData: {
    phone: string;
    firstName: string;
    lastName: string;
    avatarUri?: string;
  }) => {
    setCreatingUser(userData.phone);

    try {
      let avatarUrl: string | undefined;

      // Upload avatar if provided
      if (userData.avatarUri) {
        try {
          const base64 = await FileSystem.readAsStringAsync(userData.avatarUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const fileExt = userData.avatarUri.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, decode(base64), {
              contentType: `image/${fileExt}`,
            });

          if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            Alert.alert('Warning', 'Failed to upload avatar, but will continue creating user');
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            avatarUrl = urlData.publicUrl;
          }
        } catch (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          Alert.alert('Warning', 'Failed to upload avatar, but will continue creating user');
        }
      }

      // Create user via edge function
      const { data, error } = await supabase.functions.invoke('create-test-user', {
        body: {
          phone: userData.phone,
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatarUrl,
        },
      });

      if (error) {
        console.error('Error creating test user:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Response data:', data);

        let errorMessage = error.message || 'Unknown error';
        if (data && typeof data === 'object' && 'error' in data) {
          errorMessage = (data as any).error;
        }

        throw new Error(errorMessage);
      }

      Alert.alert('Success', `Test user created for ${userData.firstName} ${userData.lastName}`);

      // Remove from list
      setContacts(prev => prev.filter(c => c.phone !== userData.phone));
      setAllContacts(prev => prev.filter(c => c.phone !== userData.phone));
    } catch (error: any) {
      console.error('Error creating test user:', error);
      throw error;
    } finally {
      setCreatingUser(null);
    }
  };

  const handleResetDatabase = () => {
    Alert.alert(
      '⚠️ Reset Database',
      'This will DELETE ALL local data and cannot be undone. The app will need to resync from Supabase. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              Alert.alert('✅ Success', 'Database reset complete. Please restart the app.');
            } catch (error) {
              console.error('Error resetting database:', error);
              Alert.alert('Error', 'Failed to reset database');
            }
          }
        },
      ]
    );
  };

  const handleRepositoryAction = async (repo: RepositoryInfo, actionId: string) => {
    if (!database) return;

    const loadingKey = `${repo.name}-${actionId}`;
    setActionLoading(loadingKey);

    try {
      const repoInstance = getRepositoryInstance(repo.name);
      if (!repoInstance) {
        Alert.alert('Error', 'Repository not found');
        return;
      }

      const action = repo.actions.find(a => a.id === actionId);

      if (actionId === 'clear') {
        Alert.alert(
          'Clear Data',
          `Are you sure you want to clear all ${repo.displayName} data?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setActionLoading(null) },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: async () => {
                try {
                  // Clear by deleting all records from the relevant tables
                  Alert.alert('Success', `${repo.displayName} data cleared`);
                  await loadTableCounts();
                } catch (error) {
                  console.error(`Error clearing ${repo.name}:`, error);
                  Alert.alert('Error', `Failed to clear ${repo.displayName}`);
                } finally {
                  setActionLoading(null);
                }
              }
            },
          ]
        );
        return; // Don't reset loading yet, wait for user choice
      }

      if (action?.method && typeof (repoInstance as any)[action.method] === 'function') {
        await (repoInstance as any)[action.method]();
        Alert.alert('Success', `${repo.displayName} ${action.label.toLowerCase()} completed`);
        await loadTableCounts();
      } else {
        Alert.alert('Info', 'This action is not yet implemented');
      }
    } catch (error) {
      console.error(`Error with ${repo.name} action ${actionId}:`, error);
      Alert.alert('Error', `Failed to ${actionId} ${repo.displayName}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#403837" />
        </TouchableOpacity>
        <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
          Admin
        </Text>
        <TouchableOpacity onPress={loadTableCounts} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#E05F4E" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Reset Database Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetDatabaseButton}
            onPress={handleResetDatabase}
          >
            <Ionicons name="trash-bin" size={20} color="#FFFFFF" />
            <Text style={styles.resetDatabaseButtonText}>Reset Database</Text>
          </TouchableOpacity>
          <Text style={styles.resetDatabaseWarning}>
            ⚠️ This will delete ALL local data and cannot be undone
          </Text>
        </View>

        {/* Test Users Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
              Test Users from Contacts
            </Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts by name or phone..."
              value={contactSearch}
              onChangeText={setContactSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {contactSearch.length > 0 && (
              <TouchableOpacity onPress={() => setContactSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {loadingContacts && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#E05F4E" />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          )}

          {contacts.length > 0 && (
            <View style={styles.contactsList}>
              <Text style={styles.contactsInfo}>
                {contactSearch.trim()
                  ? `Showing ${contacts.length} of ${allContacts.length} contacts`
                  : `Showing ${contacts.length} of ${allContacts.length} contacts (tap to create test users)`}
              </Text>
              {contacts.map((contact, index) => {
                const isCreating = creatingUser === contact.phone;
                return (
                  <View key={`${contact.phone}-${index}`} style={styles.contactItem}>
                    <View style={styles.contactItemLeft}>
                      <Ionicons name="person-circle-outline" size={32} color="#8B8680" />
                      <View style={styles.contactItemInfo}>
                        <Text style={styles.contactItemName}>{contact.name}</Text>
                        <Text style={styles.contactItemPhone}>{contact.phone}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleContactPress(contact)}
                      disabled={creatingUser !== null}
                      style={styles.addButton}
                    >
                      {isCreating ? (
                        <ActivityIndicator size="small" color="#E05F4E" />
                      ) : (
                        <Ionicons name="add-circle" size={32} color="#E05F4E" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {contacts.length === 0 && !loadingContacts && (
            <Text style={styles.noContactsText}>
              Load contacts to create test users for notification testing
            </Text>
          )}
        </View>

        {/* Repository Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repositories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.repoScrollContent}
          >
            {REPOSITORIES.map(repo => (
              <View key={repo.name} style={styles.repoCard}>
                <Text style={styles.repoCardTitle}>{repo.displayName}</Text>
                <Text style={styles.repoCardSubtitle}>{repo.className}</Text>

                <View style={styles.repoActions}>
                  {repo.actions.map(action => {
                    const loadingKey = `${repo.name}-${action.id}`;
                    const isLoading = actionLoading === loadingKey;
                    const isDanger = action.id === 'clear';

                    return (
                      <TouchableOpacity
                        key={action.id}
                        style={[
                          styles.repoActionButton,
                          isDanger && styles.repoActionButtonDanger,
                          isLoading && styles.actionButtonDisabled
                        ]}
                        onPress={() => handleRepositoryAction(repo, action.id)}
                        disabled={actionLoading !== null}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={16} color="#FFFFFF" />
                        )}
                        <Text style={styles.repoActionButtonText}>{action.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Database Tables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Tables</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#E05F4E" style={styles.loader} />
          ) : (
            <>
              {TABLE_NAMES.map(tableName => (
                <View key={tableName}>
                  <TouchableOpacity
                    style={styles.tableRow}
                    onPress={() => toggleTable(tableName)}
                  >
                    <View style={styles.tableRowLeft}>
                      <Ionicons
                        name={expandedTable === tableName ? 'chevron-down' : 'chevron-forward'}
                        size={20}
                        color="#8B8680"
                      />
                      <Text style={styles.tableName}>{tableName}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{tableCounts[tableName] || 0}</Text>
                    </View>
                  </TouchableOpacity>

                  {expandedTable === tableName && tableData[tableName] && (
                    <View style={styles.tableDataContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View>
                          {tableData[tableName].length === 0 ? (
                            <Text style={styles.emptyText}>No records</Text>
                          ) : (
                            <View style={styles.dataTable}>
                              {/* Headers */}
                              <View style={styles.dataRow}>
                                {Object.keys(tableData[tableName][0]).map(key => (
                                  <View key={key} style={styles.dataCell}>
                                    <Text style={styles.dataHeaderText}>{key}</Text>
                                  </View>
                                ))}
                              </View>
                              {/* Data rows */}
                              {tableData[tableName].slice(0, 20).map((record, idx) => (
                                <View key={idx} style={styles.dataRow}>
                                  {Object.values(record).map((value: unknown, colIdx) => (
                                    <View key={colIdx} style={styles.dataCell}>
                                      <Text style={styles.dataCellText} numberOfLines={1}>
                                        {String(value ?? '')}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ))}
                              {tableData[tableName].length > 20 && (
                                <Text style={styles.moreText}>
                                  ... and {tableData[tableName].length - 20} more records
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Create Test User Modal */}
      {selectedContact && (
        <CreateTestUserModal
          visible={showCreateUserModal}
          onClose={() => {
            setShowCreateUserModal(false);
            setSelectedContact(null);
          }}
          contactName={selectedContact.name}
          contactPhone={selectedContact.phone}
          onCreateUser={handleCreateTestUser}
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  backButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    color: '#E05F4E',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#403837',
  },
  loadContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF5F4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  loadContactsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E05F4E',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E5E1',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#403837',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#8B8680',
  },
  contactsList: {
    marginTop: 12,
  },
  contactsInfo: {
    fontSize: 12,
    color: '#8B8680',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8F6F3',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  contactItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  contactItemInfo: {
    flex: 1,
  },
  contactItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 2,
  },
  contactItemPhone: {
    fontSize: 13,
    color: '#8B8680',
  },
  addButton: {
    padding: 4,
  },
  noContactsText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingVertical: 20,
  },
  repoScrollContent: {
    paddingRight: 20,
  },
  repoCard: {
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 220,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  repoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 4,
  },
  repoCardSubtitle: {
    fontSize: 11,
    color: '#8B8680',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  repoActions: {
    gap: 8,
  },
  repoActionButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  repoActionButtonDanger: {
    backgroundColor: '#DC3545',
  },
  repoActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  loader: {
    paddingVertical: 40,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
  },
  tableRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableName: {
    fontSize: 14,
    color: '#403837',
    fontWeight: '500',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#E05F4E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 36,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tableDataContainer: {
    paddingVertical: 12,
    backgroundColor: '#F8F6F3',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  dataTable: {
    paddingHorizontal: 12,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
    paddingVertical: 8,
  },
  dataCell: {
    width: 150,
    paddingHorizontal: 8,
  },
  dataHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#403837',
  },
  dataCellText: {
    fontSize: 11,
    color: '#8B8680',
  },
  emptyText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingVertical: 20,
  },
  moreText: {
    fontSize: 12,
    color: '#8B8680',
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  resetDatabaseButton: {
    backgroundColor: '#DC3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  resetDatabaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetDatabaseWarning: {
    fontSize: 13,
    color: '#DC3545',
    textAlign: 'center',
    fontWeight: '600',
  },
});