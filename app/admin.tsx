import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useDatabase } from './contexts/DatabaseContext';
import { useAuth } from './contexts/AuthContext';
import { useWeeklySelections } from './contexts/WeeklySelectionsContext';
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
import curatedPodcastsData from './data/curated-podcasts.json';

type AdminTab = 'database' | 'podcasts';

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

interface CuratedPodcast {
  original_name: string;
  itunes_name?: string;
  feed_url: string;
  itunes_id?: number;
  artwork?: string;
  error?: string;
}

// Type the imported JSON data
const curatedPodcasts = curatedPodcastsData as Record<string, CuratedPodcast[]>;

// Category mapping: matches the JSON keys from curated-podcasts.json
const CATEGORY_MAP: { id: string; label: string }[] = [
  { id: 'Art & Design', label: 'Art & Design' },
  { id: 'Comedy', label: 'Comedy' },
  { id: 'Culture', label: 'Culture' },
  { id: 'Entrepreneurship', label: 'Entrepreneurship' },
  { id: 'Health', label: 'Health' },
  { id: 'History', label: 'History' },
  { id: 'Music', label: 'Music' },
  { id: 'Personal Development', label: 'Personal Development' },
  { id: 'Philosophy', label: 'Philosophy' },
  { id: 'Politics', label: 'Politics' },
  { id: 'Relationships', label: 'Relationships' },
  { id: 'Science', label: 'Science' },
  { id: 'Technology', label: 'Technology' },
];

export default function AdminScreen() {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const router = useRouter();
  const { database, resetDatabase, weeklySelectionRepository } = useDatabase();
  const { user } = useAuth();
  const { clearUserChoice, refreshSelections } = useWeeklySelections();
  const [activeTab, setActiveTab] = useState<AdminTab>('database');
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

  // Podcast tab state
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>('');

  // Category browser state
  const [selectedCategory, setSelectedCategory] = useState<string | 'weekly'>('weekly'); // 'weekly' for main selections tab
  const [categoryPodcasts, setCategoryPodcasts] = useState<CuratedPodcast[]>([]);
  const [selectedEpisodeForCategory, setSelectedEpisodeForCategory] = useState<{
    episode_title: string;
    podcast_title: string;
    artwork_url: string | null;
  } | null>(null);
  const [loadingSelection, setLoadingSelection] = useState(false);

  // Weekly selections state (the 3 main picks)
  const [allCategorySelections, setAllCategorySelections] = useState<{
    id: string;
    category: string;
    episode_id: string;
    episode_title: string;
    podcast_title: string;
    artwork_url: string | null;
    about_this_podcast: string | null;
  }[]>([]);
  const [weeklySelections, setWeeklySelections] = useState<{
    episode_id: string;
    order_position: number;
  }[]>([]);
  const [loadingWeeklySelections, setLoadingWeeklySelections] = useState(false);
  const [savingWeeklySelection, setSavingWeeklySelection] = useState<string | null>(null);
  const [copyingFromPreviousWeek, setCopyingFromPreviousWeek] = useState(false);

  // Generate week start dates (Mondays) for upcoming weeks (2-week intervals = 6 options)
  const getWeekStartDates = () => {
    const dates: { label: string; value: string }[] = [];
    const today = new Date();

    // Find this week's Monday
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    // Generate 6 weeks going forward (every 2 weeks)
    for (let i = 0; i < 6; i++) {
      const weekDate = new Date(monday);
      weekDate.setDate(monday.getDate() + (i * 14)); // 2-week intervals going forward

      const dayStr = weekDate.getDate().toString().padStart(2, '0');
      const monthStr = (weekDate.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = weekDate.getFullYear();

      dates.push({
        label: `${dayStr}/${monthStr}/${yearStr}`,
        value: weekDate.toISOString().split('T')[0], // YYYY-MM-DD for queries
      });
    }
    return dates;
  };

  const weekStartDates = getWeekStartDates();

  // Set default selected week on mount
  useEffect(() => {
    if (weekStartDates.length > 0 && !selectedWeekStart) {
      setSelectedWeekStart(weekStartDates[0].value);
    }
  }, []);

  useEffect(() => {
    loadTableCounts();
  }, [database]);

  // Load curated podcasts for selected category
  const loadCuratedPodcasts = (categoryId: string) => {
    const podcasts = curatedPodcasts[categoryId] || [];
    // Filter out podcasts without feed URLs
    const validPodcasts = podcasts.filter(p => p.feed_url && p.feed_url.length > 0);
    setCategoryPodcasts(validPodcasts);
  };

  // Fetch existing selection for week+category
  const fetchExistingSelection = async (weekStart: string, category: string) => {
    if (!weekStart || !category) return;

    setLoadingSelection(true);
    try {
      const { data, error } = await supabase
        .from('weekly_category_selections')
        .select(`
          episode_id,
          podcast_episodes!inner(
            episode_title,
            podcast_title,
            artwork_url
          )
        `)
        .eq('week_start', weekStart)
        .eq('category', category)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is okay
          console.error('Error fetching selection:', error);
        }
        setSelectedEpisodeForCategory(null);
        return;
      }

      if (data && data.podcast_episodes) {
        const episode = data.podcast_episodes as any;
        setSelectedEpisodeForCategory({
          episode_title: episode.episode_title,
          podcast_title: episode.podcast_title,
          artwork_url: episode.artwork_url,
        });
      } else {
        setSelectedEpisodeForCategory(null);
      }
    } catch (error) {
      console.error('Error fetching selection:', error);
      setSelectedEpisodeForCategory(null);
    } finally {
      setLoadingSelection(false);
    }
  };

  // Fetch all category selections for the week (for weekly tab)
  const fetchAllCategorySelections = async (weekStart: string) => {
    if (!weekStart) return;

    setLoadingWeeklySelections(true);
    try {
      const { data, error } = await supabase
        .from('weekly_category_selections')
        .select(`
          id,
          category,
          episode_id,
          podcast_episodes!inner(
            episode_title,
            podcast_title,
            artwork_url,
            about_this_podcast
          )
        `)
        .eq('week_start', weekStart);

      if (error) {
        console.error('Error fetching category selections:', error);
        return;
      }

      if (data) {
        const selections = data.map((item: any) => ({
          id: item.id,
          category: item.category,
          episode_id: item.episode_id,
          episode_title: item.podcast_episodes?.episode_title || '',
          podcast_title: item.podcast_episodes?.podcast_title || '',
          artwork_url: item.podcast_episodes?.artwork_url || null,
          about_this_podcast: item.podcast_episodes?.about_this_podcast || null,
        }));
        setAllCategorySelections(selections);
      }
    } catch (error) {
      console.error('Error fetching category selections:', error);
    } finally {
      setLoadingWeeklySelections(false);
    }
  };

  // Fetch current weekly selections (the 3 main picks)
  const fetchWeeklySelections = async (weekStart: string) => {
    if (!weekStart) return;

    try {
      const { data, error } = await supabase
        .from('weekly_selections')
        .select('episode_id, order_position')
        .eq('week_start', weekStart)
        .order('order_position');

      if (error) {
        console.error('Error fetching weekly selections:', error);
        return;
      }

      setWeeklySelections(data || []);
    } catch (error) {
      console.error('Error fetching weekly selections:', error);
    }
  };

  // Add episode to weekly selections (or replace if already have 3)
  const addToWeeklySelections = async (episodeId: string, replacePosition?: number) => {
    console.log('addToWeeklySelections called', { episodeId, weeklySelectionsCount: weeklySelections.length, replacePosition });

    // If we already have 3 and no replace position specified, ask which to replace
    if (weeklySelections.length >= 3 && !replacePosition) {
      Alert.alert(
        'Replace Selection',
        'You already have 3 weekly selections. Which one do you want to replace?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: '#1', onPress: () => addToWeeklySelections(episodeId, 1) },
          { text: '#2', onPress: () => addToWeeklySelections(episodeId, 2) },
          { text: '#3', onPress: () => addToWeeklySelections(episodeId, 3) },
        ]
      );
      return;
    }

    setSavingWeeklySelection(episodeId);
    try {
      const orderPosition = replacePosition || weeklySelections.length + 1;

      // If replacing, delete the existing one first
      if (replacePosition) {
        console.log('Deleting existing selection at position', replacePosition);
        const { error: deleteError } = await supabase
          .from('weekly_selections')
          .delete()
          .eq('week_start', selectedWeekStart)
          .eq('order_position', replacePosition);

        if (deleteError) {
          console.error('Error deleting existing selection:', deleteError);
        }
      }

      console.log('Inserting weekly selection', { week_start: selectedWeekStart, episode_id: episodeId, order_position: orderPosition });

      const { data, error } = await supabase
        .from('weekly_selections')
        .insert({
          week_start: selectedWeekStart,
          episode_id: episodeId,
          order_position: orderPosition,
        })
        .select();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Error adding to weekly selections:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        Alert.alert('Error', error.message);
        return;
      }

      // Refresh the list
      await fetchWeeklySelections(selectedWeekStart);
      Alert.alert('Success!', `Episode ${replacePosition ? 'replaced as' : 'added as'} #${orderPosition} for the week`);
    } catch (error: any) {
      console.error('Error adding to weekly selections:', error);
      console.error('Error stack:', error?.stack);
      Alert.alert('Error', error?.message || 'Unknown error');
    } finally {
      setSavingWeeklySelection(null);
    }
  };

  // Remove episode from weekly selections
  const removeFromWeeklySelections = async (episodeId: string) => {
    setSavingWeeklySelection(episodeId);
    try {
      const { error } = await supabase
        .from('weekly_selections')
        .delete()
        .eq('week_start', selectedWeekStart)
        .eq('episode_id', episodeId);

      if (error) {
        console.error('Error removing from weekly selections:', error);
        Alert.alert('Error', error.message);
        return;
      }

      // Re-fetch to update order positions
      await fetchWeeklySelections(selectedWeekStart);
      Alert.alert('Removed', 'Episode removed from weekly selections');
    } catch (error: any) {
      console.error('Error removing from weekly selections:', error);
      Alert.alert('Error', error.message);
    } finally {
      setSavingWeeklySelection(null);
    }
  };

  // Copy category selections from the most recent previous week that has data
  const copyFromPreviousWeek = async () => {
    if (!selectedWeekStart) return;

    setCopyingFromPreviousWeek(true);
    try {
      // Find the most recent week that has category selections before the selected week
      const { data: previousWeekData, error: weekError } = await supabase
        .from('weekly_category_selections')
        .select('week_start')
        .lt('week_start', selectedWeekStart)
        .order('week_start', { ascending: false })
        .limit(1);

      if (weekError) {
        console.error('Error finding previous week:', weekError);
        Alert.alert('Error', 'Failed to find previous week data');
        return;
      }

      if (!previousWeekData || previousWeekData.length === 0) {
        Alert.alert('No Previous Data', 'No previous week with category selections found');
        return;
      }

      const previousWeekStart = previousWeekData[0].week_start;
      console.log('Copying from previous week:', previousWeekStart, 'to', selectedWeekStart);

      // Fetch previous week's category selections
      const { data: previousSelections, error: fetchError } = await supabase
        .from('weekly_category_selections')
        .select('category, episode_id')
        .eq('week_start', previousWeekStart);

      if (fetchError) {
        console.error('Error fetching previous week selections:', fetchError);
        Alert.alert('Error', 'Failed to fetch previous week selections');
        return;
      }

      if (!previousSelections || previousSelections.length === 0) {
        Alert.alert('No Selections', 'No category selections found in the previous week');
        return;
      }

      console.log('Found', previousSelections.length, 'selections to copy');

      // Insert each selection for the new week
      let successCount = 0;
      for (const sel of previousSelections) {
        const { error: insertError } = await supabase
          .from('weekly_category_selections')
          .insert({
            week_start: selectedWeekStart,
            category: sel.category,
            episode_id: sel.episode_id,
          });

        if (insertError) {
          console.error('Error copying selection:', insertError);
        } else {
          successCount++;
        }
      }

      Alert.alert('Copied!', `Copied ${successCount} of ${previousSelections.length} category selections from ${previousWeekStart}`);

      // Refresh the list
      await fetchAllCategorySelections(selectedWeekStart);
    } catch (error: any) {
      console.error('Error copying from previous week:', error);
      Alert.alert('Error', error?.message || 'Failed to copy selections');
    } finally {
      setCopyingFromPreviousWeek(false);
    }
  };

  // Load podcasts and selection when category or week changes
  useEffect(() => {
    if (activeTab === 'podcasts' && selectedCategory && selectedCategory !== 'weekly') {
      loadCuratedPodcasts(selectedCategory);
      fetchExistingSelection(selectedWeekStart, selectedCategory);
    }
    if (activeTab === 'podcasts' && selectedCategory === 'weekly' && selectedWeekStart) {
      fetchAllCategorySelections(selectedWeekStart);
      fetchWeeklySelections(selectedWeekStart);
    }
  }, [selectedCategory, selectedWeekStart, activeTab]);

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

  const handleClearPodcastChoice = () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    Alert.alert(
      '🎧 Clear Podcast Choice',
      'This will remove your selected podcast for this week so you can test the selection flow again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await weeklySelectionRepository.clearUserWeeklyChoices(user.id);
              // Also clear the context state
              clearUserChoice();
              // Refresh to sync state
              await refreshSelections();
              Alert.alert('✅ Success', 'Podcast choice cleared. Go back to weekly selection to choose again.');
            } catch (error) {
              console.error('Error clearing podcast choice:', error);
              Alert.alert('Error', 'Failed to clear podcast choice');
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

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'database' && styles.tabActive]}
          onPress={() => setActiveTab('database')}
        >
          <Ionicons
            name="server-outline"
            size={18}
            color={activeTab === 'database' ? '#E05F4E' : '#8B8680'}
          />
          <Text style={[styles.tabText, activeTab === 'database' && styles.tabTextActive]}>
            Database
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'podcasts' && styles.tabActive]}
          onPress={() => setActiveTab('podcasts')}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={activeTab === 'podcasts' ? '#E05F4E' : '#8B8680'}
          />
          <Text style={[styles.tabText, activeTab === 'podcasts' && styles.tabTextActive]}>
            Podcast Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Database Tab Content */}
      {activeTab === 'database' && (
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

        {/* Clear Podcast Choice Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.clearChoiceButton}
            onPress={handleClearPodcastChoice}
          >
            <Ionicons name="refresh-circle" size={20} color="#FFFFFF" />
            <Text style={styles.resetDatabaseButtonText}>Clear My Podcast Choice</Text>
          </TouchableOpacity>
          <Text style={styles.clearChoiceHint}>
            🧪 Removes your selected podcast for testing the selection flow
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
      )}

      {/* Podcast Search Tab Content */}
      {activeTab === 'podcasts' && (
        <>
          {/* Week Sub-Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weekTabsContainer}
            contentContainerStyle={styles.weekTabsContent}
          >
            {weekStartDates.map((week) => (
              <TouchableOpacity
                key={week.value}
                style={[
                  styles.weekTab,
                  selectedWeekStart === week.value && styles.weekTabActive,
                ]}
                onPress={() => setSelectedWeekStart(week.value)}
              >
                <Text
                  style={[
                    styles.weekTabText,
                    selectedWeekStart === week.value && styles.weekTabTextActive,
                  ]}
                >
                  {week.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabsContainer}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {/* Weekly Selections Tab (first) */}
            <TouchableOpacity
              style={[
                styles.categoryTab,
                styles.weeklyTab,
                selectedCategory === 'weekly' && styles.weeklyTabActive,
              ]}
              onPress={() => setSelectedCategory('weekly')}
            >
              <Ionicons
                name="star"
                size={14}
                color={selectedCategory === 'weekly' ? '#FFFFFF' : '#E05F4E'}
              />
              <Text
                style={[
                  styles.categoryTabText,
                  styles.weeklyTabText,
                  selectedCategory === 'weekly' && styles.weeklyTabTextActive,
                ]}
              >
                Weekly 3
              </Text>
            </TouchableOpacity>

            {CATEGORY_MAP.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.id && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category.id && styles.categoryTabTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.scrollView}>
            {/* Weekly Selections Section (when weekly tab is active) */}
            {selectedCategory === 'weekly' ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
                  Weekly Selections
                </Text>
                <Text style={styles.weekIndicator}>
                  Week of {weekStartDates.find(w => w.value === selectedWeekStart)?.label || ''} • {weeklySelections.length}/3 selected
                </Text>

                {/* Current Weekly Selections */}
                {weeklySelections.length > 0 && (
                  <View style={styles.currentWeeklySelections}>
                    <Text style={styles.currentSelectionsLabel}>Current Weekly Picks:</Text>
                    {weeklySelections.map((sel, index) => {
                      const episode = allCategorySelections.find(e => e.episode_id === sel.episode_id);
                      if (!episode) return null;
                      return (
                        <View key={sel.episode_id} style={styles.weeklySelectionItem}>
                          <View style={styles.weeklySelectionNumber}>
                            <Text style={styles.weeklySelectionNumberText}>{index + 1}</Text>
                          </View>
                          {episode.artwork_url && (
                            <ExpoImage
                              source={{ uri: episode.artwork_url }}
                              style={styles.weeklySelectionImage}
                              contentFit="cover"
                            />
                          )}
                          <View style={styles.weeklySelectionInfo}>
                            <Text style={styles.weeklySelectionTitle} numberOfLines={1}>
                              {episode.episode_title}
                            </Text>
                            <Text style={styles.weeklySelectionPodcast} numberOfLines={1}>
                              {episode.podcast_title}
                            </Text>
                            <Text style={styles.weeklySelectionCategory}>
                              {episode.category}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeFromWeeklySelections(sel.episode_id)}
                            disabled={savingWeeklySelection !== null}
                          >
                            {savingWeeklySelection === sel.episode_id ? (
                              <ActivityIndicator size="small" color="#DC3545" />
                            ) : (
                              <Ionicons name="close-circle" size={24} color="#DC3545" />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Available Category Selections */}
                <Text style={styles.availableSelectionsLabel}>
                  Available from Categories ({allCategorySelections.length}):
                </Text>

                {loadingWeeklySelections ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#E05F4E" />
                    <Text style={styles.loadingText}>Loading category selections...</Text>
                  </View>
                ) : allCategorySelections.length === 0 ? (
                  <View>
                    <View style={styles.noSelectionBanner}>
                      <Ionicons name="alert-circle-outline" size={18} color="#E05F4E" />
                      <Text style={styles.noSelectionText}>No category selections yet.</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyFromPreviousButton}
                      onPress={copyFromPreviousWeek}
                      disabled={copyingFromPreviousWeek}
                    >
                      {copyingFromPreviousWeek ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.copyFromPreviousButtonText}>Copy from Previous Week</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.orText}>or select episodes in each category tab</Text>
                  </View>
                ) : (
                  <View style={styles.categorySelectionsList}>
                    {allCategorySelections.map((episode) => {
                      const isInWeekly = weeklySelections.some(s => s.episode_id === episode.episode_id);
                      return (
                        <View
                          key={episode.id}
                          style={[styles.categorySelectionCard, isInWeekly && styles.categorySelectionCardSelected]}
                        >
                          {episode.artwork_url && (
                            <ExpoImage
                              source={{ uri: episode.artwork_url }}
                              style={styles.categorySelectionImage}
                              contentFit="cover"
                            />
                          )}
                          <View style={styles.categorySelectionInfo}>
                            <Text style={styles.categorySelectionPodcast} numberOfLines={1}>
                              {episode.podcast_title}
                            </Text>
                            <Text style={styles.categorySelectionTitle} numberOfLines={2}>
                              {episode.episode_title}
                            </Text>
                            {episode.about_this_podcast && (
                              <Text style={styles.categorySelectionDescription} numberOfLines={2}>
                                {episode.about_this_podcast}
                              </Text>
                            )}
                            <Text style={styles.categorySelectionCategory}>
                              {episode.category}
                            </Text>
                          </View>
                          {isInWeekly ? (
                            <View style={styles.inWeeklyBadge}>
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.addToWeeklyButton,
                                savingWeeklySelection !== null && styles.addToWeeklyButtonDisabled
                              ]}
                              onPress={() => {
                                console.log('Button pressed!', episode.episode_id);
                                addToWeeklySelections(episode.episode_id);
                              }}
                              disabled={savingWeeklySelection !== null}
                            >
                              {savingWeeklySelection === episode.episode_id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Ionicons name="add" size={20} color="#FFFFFF" />
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
            /* Category Podcasts Section */
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>
                Top {CATEGORY_MAP.find(c => c.id === selectedCategory)?.label} Podcasts
              </Text>
              <Text style={styles.weekIndicator}>
                Week of {weekStartDates.find(w => w.value === selectedWeekStart)?.label || ''}
              </Text>

              {/* Selected Episode Banner */}
              {loadingSelection ? (
                <View style={styles.selectedEpisodeBanner}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.selectedEpisodeLoading}>Checking for selection...</Text>
                </View>
              ) : selectedEpisodeForCategory ? (
                <View style={styles.selectedEpisodeBanner}>
                  <View style={styles.selectedEpisodeHeader}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.selectedEpisodeLabel}>Selected for this week</Text>
                  </View>
                  <View style={styles.selectedEpisodeContent}>
                    {selectedEpisodeForCategory.artwork_url && (
                      <ExpoImage
                        source={{ uri: selectedEpisodeForCategory.artwork_url }}
                        style={styles.selectedEpisodeImage}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.selectedEpisodeInfo}>
                      <Text style={styles.selectedEpisodeTitle} numberOfLines={2}>
                        {selectedEpisodeForCategory.episode_title}
                      </Text>
                      <Text style={styles.selectedEpisodePodcast} numberOfLines={1}>
                        {selectedEpisodeForCategory.podcast_title}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.noSelectionBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color="#E05F4E" />
                  <Text style={styles.noSelectionText}>No episode selected for this week</Text>
                </View>
              )}

              {categoryPodcasts.length > 0 ? (
                <View style={styles.categoryPodcastsList}>
                  {categoryPodcasts.map((podcast, index) => (
                    <TouchableOpacity
                      key={`${podcast.original_name}-${index}`}
                      style={styles.categoryPodcastCard}
                      onPress={() => router.push({
                        pathname: '/admin-podcast-detail',
                        params: {
                          podcastTitle: podcast.itunes_name || podcast.original_name,
                          podcastImage: podcast.artwork || '',
                          feedUrl: podcast.feed_url,
                          weekStart: selectedWeekStart,
                          category: selectedCategory,
                        }
                      })}
                    >
                      {podcast.artwork && (
                        <ExpoImage source={{ uri: podcast.artwork }} style={styles.categoryPodcastImage} contentFit="cover" />
                      )}
                      <View style={styles.categoryPodcastInfo}>
                        <Text style={styles.categoryPodcastTitle} numberOfLines={2}>
                          {podcast.itunes_name || podcast.original_name}
                        </Text>
                        <Text style={styles.categoryPodcastRating}>
                          #{index + 1} in {selectedCategory}
                        </Text>
                        {podcast.feed_url && (
                          <Text style={styles.categoryPodcastCategories} numberOfLines={1}>
                            RSS available
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#C4C1BB" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.placeholderText}>No podcasts found for this category</Text>
              )}
            </View>
            )}

          </ScrollView>
        </>
      )}

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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#E05F4E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8680',
  },
  tabTextActive: {
    color: '#E05F4E',
  },
  placeholderText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
  weekTabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
    maxHeight: 50,
  },
  weekTabsContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F1ED',
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  weekTabActive: {
    backgroundColor: '#E05F4E',
    borderColor: '#E05F4E',
  },
  weekTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8680',
  },
  weekTabTextActive: {
    color: '#FFFFFF',
  },
  categoryTabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
    maxHeight: 44,
  },
  categoryTabsContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
    paddingVertical: 6,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F4F1ED',
  },
  categoryTabActive: {
    backgroundColor: '#403837',
  },
  weeklyTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  weeklyTabActive: {
    backgroundColor: '#E05F4E',
    borderColor: '#E05F4E',
  },
  weeklyTabText: {
    color: '#E05F4E',
  },
  weeklyTabTextActive: {
    color: '#FFFFFF',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B8680',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  weekIndicator: {
    fontSize: 12,
    color: '#8B8680',
    marginBottom: 12,
  },
  selectedEpisodeBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  selectedEpisodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  selectedEpisodeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  selectedEpisodeLoading: {
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 8,
  },
  selectedEpisodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedEpisodeImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#C8E6C9',
  },
  selectedEpisodeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedEpisodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  selectedEpisodePodcast: {
    fontSize: 12,
    color: '#4CAF50',
  },
  noSelectionBanner: {
    backgroundColor: '#FFF5F4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E05F4E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noSelectionText: {
    fontSize: 13,
    color: '#E05F4E',
    fontWeight: '500',
  },
  copyFromPreviousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  copyFromPreviousButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orText: {
    fontSize: 12,
    color: '#8B8680',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  // Weekly selections styles
  currentWeeklySelections: {
    marginBottom: 20,
  },
  currentSelectionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 12,
  },
  weeklySelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  weeklySelectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  weeklySelectionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weeklySelectionImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#C8E6C9',
    marginRight: 10,
  },
  weeklySelectionInfo: {
    flex: 1,
  },
  weeklySelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  weeklySelectionPodcast: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 2,
  },
  weeklySelectionCategory: {
    fontSize: 11,
    color: '#81C784',
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 4,
  },
  availableSelectionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 12,
    marginTop: 8,
  },
  categorySelectionsList: {
    gap: 8,
  },
  categorySelectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  categorySelectionCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  categorySelectionImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
    marginRight: 10,
  },
  categorySelectionInfo: {
    flex: 1,
  },
  categorySelectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  categorySelectionPodcast: {
    fontSize: 15,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 2,
  },
  categorySelectionDescription: {
    fontSize: 11,
    color: '#8B8680',
    lineHeight: 15,
    marginBottom: 4,
  },
  categorySelectionCategory: {
    fontSize: 11,
    color: '#E05F4E',
    fontWeight: '500',
  },
  addToWeeklyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E05F4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToWeeklyButtonDisabled: {
    opacity: 0.5,
  },
  inWeeklyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPodcastsList: {
    gap: 8,
  },
  categoryPodcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  categoryPodcastImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  categoryPodcastInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  categoryPodcastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 4,
  },
  categoryPodcastRating: {
    fontSize: 12,
    color: '#E05F4E',
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryPodcastCategories: {
    fontSize: 11,
    color: '#8B8680',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: '#FFF5F4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E05F4E',
    gap: 6,
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
  },
  searchTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F4F1ED',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  searchTypeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8680',
  },
  searchTypeTextActive: {
    color: '#403837',
  },
  searchButton: {
    backgroundColor: '#E05F4E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chartCategoriesButton: {
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#E05F4E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  chartCategoriesButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E05F4E',
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8680',
    marginBottom: 12,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E5E1',
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 2,
  },
  resultAuthor: {
    fontSize: 13,
    color: '#E05F4E',
    marginBottom: 4,
  },
  ratingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  ratingBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#403837',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statBadge: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#E8E5E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoriesText: {
    fontSize: 10,
    color: '#8B8680',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 12,
    color: '#8B8680',
    lineHeight: 16,
  },
  episodeMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  episodeMetaText: {
    fontSize: 11,
    color: '#8B8680',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B8680',
    minWidth: 65,
  },
  metaValue: {
    fontSize: 10,
    color: '#403837',
    flex: 1,
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
  clearChoiceButton: {
    backgroundColor: '#6C757D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  clearChoiceHint: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
});