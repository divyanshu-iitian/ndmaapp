import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MongoDBService from '../services/MongoDBService';

const TraineeHomeScreen = ({ route, navigation }) => {
  const [userName, setUserName] = useState('Trainee');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingTrainings, setUpcomingTrainings] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [stats, setStats] = useState({
    totalAttended: 0,
    totalMissed: 0,
    upcomingCount: 0,
  });

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

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
      // TODO: Fetch from backend
      // const trainings = await MongoDBService.getUpcomingTrainings();
      // const attendance = await MongoDBService.getMyAttendance(user.id);
      
      // Dummy data for now
      setUpcomingTrainings([]);
      setMyAttendance([]);
      setStats({
        totalAttended: 0,
        totalMissed: 0,
        upcomingCount: 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5282" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Animatable.View animation="fadeInDown" style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="person" size={14} color="#2C5282" />
              <Text style={styles.roleText}>Trainee</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#2D3748" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </Animatable.View>

        {/* Stats Cards */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#EBF8FF' }]}>
            <MaterialIcons name="check-circle" size={28} color="#2C5282" />
            <Text style={styles.statValue}>{stats.totalAttended}</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF5F5' }]}>
            <MaterialIcons name="cancel" size={28} color="#E53E3E" />
            <Text style={styles.statValue}>{stats.totalMissed}</Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FFF4' }]}>
            <MaterialIcons name="event" size={28} color="#38A169" />
            <Text style={styles.statValue}>{stats.upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
        </Animatable.View>

        {/* Quick Actions */}
        <Animatable.View animation="fadeIn" delay={400} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('JoinAttendance')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EBF8FF' }]}>
                <Ionicons name="qr-code-outline" size={24} color="#2C5282" />
              </View>
              <Text style={styles.actionText}>Join Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#F0FFF4' }]}>
                <Ionicons name="checkmark-done" size={24} color="#38A169" />
              </View>
              <Text style={styles.actionText}>My Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFFAF0' }]}>
                <Ionicons name="document-text" size={24} color="#DD6B20" />
              </View>
              <Text style={styles.actionText}>Certificates</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="help-circle" size={24} color="#805AD5" />
              </View>
              <Text style={styles.actionText}>Help</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Upcoming Trainings */}
        <Animatable.View animation="fadeIn" delay={600} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Trainings</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingTrainings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#A0AEC0" />
              <Text style={styles.emptyText}>No upcoming trainings</Text>
              <Text style={styles.emptySubtext}>Check the map for nearby sessions</Text>
            </View>
          ) : (
            upcomingTrainings.map((training, index) => (
              <Animatable.View
                key={training.id}
                animation="fadeInUp"
                delay={700 + index * 100}
                style={styles.trainingCard}
              >
                <View style={styles.trainingHeader}>
                  <View style={styles.trainingIcon}>
                    <Ionicons name="school" size={20} color="#2C5282" />
                  </View>
                  <View style={styles.trainingInfo}>
                    <Text style={styles.trainingTitle}>{training.title}</Text>
                    <Text style={styles.trainingDate}>{training.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: '#EBF8FF' }]}>
                    <Text style={[styles.statusText, { color: '#2C5282' }]}>Upcoming</Text>
                  </View>
                </View>
              </Animatable.View>
            ))
          )}
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C5282',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
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
    color: '#1A202C',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5282',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  trainingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainingInfo: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  trainingDate: {
    fontSize: 13,
    color: '#718096',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default TraineeHomeScreen;
