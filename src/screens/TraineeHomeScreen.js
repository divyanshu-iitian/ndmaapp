import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAttendanceHeartbeat } from '../hooks/useAttendanceHeartbeat';
import eventService from '../services/EventService';

const { width } = Dimensions.get('window');

// Badge Definitions
const BADGES_POOL = [
  { id: 1, name: 'First Responder', icon: 'medkit', color: ['#EF4444', '#B91C1C'], bg: '#FEF2F2' },
  { id: 2, name: 'Fire Safety', icon: 'flame', color: ['#F97316', '#C2410C'], bg: '#FFF7ED' },
  { id: 3, name: 'Flood Rescue', icon: 'water', color: ['#3B82F6', '#1D4ED8'], bg: '#EFF6FF' },
  { id: 4, name: 'CPR Certified', icon: 'heart', color: ['#EC4899', '#BE185D'], bg: '#FDF2F8' },
  { id: 5, name: 'Search & Rescue', icon: 'search', color: ['#8B5CF6', '#6D28D9'], bg: '#F5F3FF' },
  { id: 6, name: 'Disaster Ready', icon: 'shield-alt', lib: 'FontAwesome5', color: ['#10B981', '#047857'], bg: '#ECFDF5' },
  { id: 7, name: 'Team Leader', icon: 'people', color: ['#F59E0B', '#B45309'], bg: '#FFFBEB' },
  { id: 8, name: 'Map Navigator', icon: 'map', color: ['#6366F1', '#4338CA'], bg: '#EEF2FF' },
];

const TraineeHomeScreen = ({ route, navigation }) => {
  const { status: attendanceStatus } = useAttendanceHeartbeat(true);

  const [userName, setUserName] = useState('Trainee');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard Data
  const [upcomingTrainings, setUpcomingTrainings] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [stats, setStats] = useState({
    totalAttended: 0,
    totalMissed: 0,
    upcomingCount: 0,
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeout = useRef(null);

  useEffect(() => {
    loadUserData();
    loadDashboardData();
    generateRandomBadges();
  }, []);

  const generateRandomBadges = () => {
    const shuffled = [...BADGES_POOL].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 3;
    setMyBadges(shuffled.slice(0, count));
  };

  const loadUserData = async () => {
    try {
      if (route?.params?.user) {
        setUserName(route.params.user.name || 'Trainee');
        setUserId(route.params.user.id || route.params.user._id);
        return;
      }
      const [sessionUser, userData] = await Promise.all([
        AsyncStorage.getItem('@ndma_session_user'),
        AsyncStorage.getItem('userData'),
      ]);

      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        setUserName(user.name || 'Trainee');
        setUserId(user.id || user._id);
      } else if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Trainee');
        setUserId(user.id || user._id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserName('Trainee');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const dashboard = await eventService.getEventDashboard();

      if (dashboard.success) {
        const upcoming = dashboard.dashboard.upcoming || [];
        setUpcomingTrainings(upcoming);

        const past = dashboard.dashboard.past || [];

        setStats({
          totalAttended: past.length,
          totalMissed: 0,
          upcomingCount: upcoming.length,
        });
      } else {
        setUpcomingTrainings([]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!text.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    // Debounce search
    searchTimeout.current = setTimeout(async () => {
      try {
        const result = await eventService.searchEvents({ query: text });
        if (result.success) {
          setSearchResults(result.events || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  const joinCurrentEventAndMark = async () => {
    const activeEvent = upcomingTrainings[0];

    if (!activeEvent) {
      Alert.alert('No Event', 'There are no upcoming events to join right now.');
      return;
    }

    Alert.alert(
      'Join & Mark Attendance',
      `Joining "${activeEvent.title}" and marking attendance...`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            navigation.navigate('TraineeEventDetail', { event: activeEvent });
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderEventList = (events, title, emptyMessage) => (
    <Animatable.View animation="fadeInUp" duration={500} style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>{emptyMessage || 'No events found'}</Text>
        </View>
      ) : (
        events.map((event, index) => (
          <TouchableOpacity
            key={event._id || event.id}
            onPress={() => navigation.navigate('TraineeEventDetail', { event: event })}
            activeOpacity={0.9}
          >
            <Animatable.View animation="fadeInUp" delay={index * 100} style={styles.eventCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                style={styles.eventCardGradient}
              >
                <View style={styles.eventInfo}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconDate}>{new Date(event.startDate || event.date).getDate()}</Text>
                    <Text style={styles.iconMonth}>{new Date(event.startDate || event.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    <View style={styles.eventMeta}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{event.defaultStartTime || '09:00'}</Text>
                      <View style={styles.dotSeparator} />
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{event.venue || 'Online'}</Text>
                    </View>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>View</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animatable.View>
          </TouchableOpacity>
        ))
      )}
    </Animatable.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modern Header Profile Card */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.headerCard}>
          <LinearGradient
            colors={['#1E40AF', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{userName}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>Verified Trainee</Text>
                  <MaterialIcons name="verified" size={12} color="#60A5FA" />
                </View>
              </View>
              <TouchableOpacity style={styles.notificationBtn}>
                <Ionicons name="notifications" size={20} color="#1E40AF" />
                <View style={styles.notifDot} />
              </TouchableOpacity>
            </View>

            {/* Quick Stats in Header */}
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{stats.totalAttended}</Text>
                <Text style={styles.headerStatLabel}>Completed</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{myBadges.length}</Text>
                <Text style={styles.headerStatLabel}>Badges</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{stats.upcomingCount}</Text>
                <Text style={styles.headerStatLabel}>Upcoming</Text>
              </View>
            </View>
          </LinearGradient>
        </Animatable.View>

        {/* Search Bar */}
        <Animatable.View animation="fadeInUp" delay={100} style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trainings, events..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </Animatable.View>

        {/* Content Switching: Search Results VS Dashboard */}
        {searchQuery.length > 0 ? (
          <View style={{ minHeight: 400 }}>
            {renderEventList(searchResults, 'Search Results', 'No matching events found.')}
          </View>
        ) : (
          <>
            {/* Action Buttons Row */}
            <Animatable.View animation="fadeInUp" delay={200} style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#EEF2FF' }]}
                onPress={() => navigation.navigate('JoinAttendance')}
              >
                <Ionicons name="qr-code" size={24} color="#4F46E5" />
                <Text style={[styles.quickActionText, { color: '#4F46E5' }]}>Scan QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#ECFDF5' }]}
                onPress={joinCurrentEventAndMark}
              >
                <Ionicons name="wifi" size={24} color="#059669" />
                <Text style={[styles.quickActionText, { color: '#059669' }]}>Smart Sync</Text>
                {attendanceStatus === 'success' && <View style={styles.onlineDot} />}
              </TouchableOpacity>
            </Animatable.View>

            {/* Badges Section */}
            <Animatable.View animation="fadeInRight" delay={400} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Achievements</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
                {myBadges.map((badge, index) => (
                  <LinearGradient
                    key={badge.id}
                    colors={badge.bg === '#FEF2F2' ? ['#FEF2F2', '#FECACA'] : [badge.bg, '#F3F4F6']}
                    style={styles.badgeCard}
                  >
                    <View style={[styles.badgeIcon, { backgroundColor: '#FFF' }]}>
                      {badge.lib === 'FontAwesome5' ? (
                        <FontAwesome5 name={badge.icon} size={24} color={badge.color[1]} />
                      ) : (
                        <Ionicons name={badge.icon} size={24} color={badge.color[1]} />
                      )}
                    </View>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeEarned}>Earned recently</Text>
                  </LinearGradient>
                ))}
              </ScrollView>
            </Animatable.View>

            {/* Upcoming Trainings */}
            {renderEventList(upcomingTrainings, 'Upcoming Sessions', 'No upcoming sessions scheduled.')}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Header
  headerCard: {
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  headerGradient: {
    padding: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#BFDBFE',
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E0F2FE',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },

  // Header Stats
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerStatLabel: {
    fontSize: 11,
    color: '#DBEAFE',
    marginTop: 2,
    fontWeight: '500',
  },
  headerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: -8, // slight overlap visual
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginLeft: -4,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Badges
  badgesScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10, // Shadow space
  },
  badgeCard: {
    width: 120,
    height: 140,
    borderRadius: 20,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeEarned: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },

  // Events
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  eventCardGradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  iconDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E40AF',
  },
  iconMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F293B',
    marginBottom: 6,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});

export default TraineeHomeScreen;
