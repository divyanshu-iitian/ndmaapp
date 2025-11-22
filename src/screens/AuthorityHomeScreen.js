import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReportsService from '../services/ReportsService';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function AuthorityHomeScreen({ navigation, route }) {
  const [userName, setUserName] = useState('Authority');
  const [allReports, setAllReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadUserData();
    loadAllReports();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadUserData = async () => {
    try {
      if (route?.params?.user) {
        setUserName(route.params.user.name || 'Authority');
        return;
      }

      const sessionUser = await AsyncStorage.getItem('@ndma_session_user');
      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        setUserName(user.name || 'Authority');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAllReports = async () => {
    try {
      console.log('🔄 Authority: Loading all reports...');
      const res = await ReportsService.getAllReports();
      
      if (res.success && Array.isArray(res.reports)) {
        console.log('✅ Authority: Loaded', res.reports.length, 'reports');
        setAllReports(res.reports);
        generateAIInsights(res.reports);
      } else {
        console.log('⚠️ Authority: No reports found');
        setAllReports([]);
      }
    } catch (error) {
      console.error('❌ Authority: Error loading reports:', error);
      setAllReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateAIInsights = (reports) => {
    if (!reports || reports.length === 0) {
      setAiInsights('No training data available yet. Reports will appear here once trainers submit them.');
      setLoadingInsights(false);
      return;
    }

    setLoadingInsights(true);
    try {
      const accepted = reports.filter(r => r.status === 'accepted');
      const pending = reports.filter(r => r.status === 'pending');
      const rejected = reports.filter(r => r.status === 'rejected');

      // Calculate trainer stats
      const trainersSet = new Set(reports.map(r => r.userId || r.userEmail));
      const trainerCount = trainersSet.size;

      // Calculate location stats
      const locationsSet = new Set(reports.map(r => r.locationName || 'Unknown'));
      const locationCount = locationsSet.size;

      // Calculate participant stats
      const totalParticipants = reports.reduce((sum, r) => {
        const count = parseInt(r.participants_count || r.participants) || 0;
        return sum + count;
      }, 0);

      // Get top topics
      const allTopics = reports
        .filter(r => Array.isArray(r.topics_covered))
        .flatMap(r => r.topics_covered)
        .filter(Boolean);
      const topicCounts = {};
      allTopics.forEach(t => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([topic]) => topic);

      // Generate insight
      const insight = `📊 National Training Overview:\n\n` +
        `✅ Approved: ${accepted.length} sessions | 🟡 Pending: ${pending.length}\n` +
        `👥 Total Participants: ${totalParticipants.toLocaleString()}\n` +
        `🎓 Active Trainers: ${trainerCount} | 📍 Locations: ${locationCount}\n` +
        `🔥 Top Focus: ${topTopics.slice(0, 2).join(', ') || 'Various topics'}\n\n` +
        `💡 The nationwide disaster management training program is making significant progress with consistent trainer participation across multiple regions.`;

      setAiInsights(insight);
    } catch (error) {
      console.error('❌ Error generating insights:', error);
      setAiInsights('Training data is being analyzed. Insights will be available shortly.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllReports();
  };

  // Calculate stats
  const accepted = allReports.filter(r => r.status === 'accepted');
  const pending = allReports.filter(r => r.status === 'pending');
  const rejected = allReports.filter(r => r.status === 'rejected');
  const trainersSet = new Set(allReports.map(r => r.userId || r.userEmail));
  const locationsSet = new Set(allReports.map(r => r.locationName || 'Unknown'));
  
  const totalParticipants = allReports.reduce((sum, r) => {
    return sum + (parseInt(r.participants_count || r.participants) || 0);
  }, 0);

  // Prepare chart data
  const statusData = [
    { name: 'Approved', count: accepted.length, color: '#10B981', legendFontColor: '#374151' },
    { name: 'Pending', count: pending.length, color: '#F59E0B', legendFontColor: '#374151' },
    { name: 'Rejected', count: rejected.length, color: '#EF4444', legendFontColor: '#374151' },
  ];

  // Organization breakdown
  const orgCounts = {};
  allReports.forEach(r => {
    const org = r.targetOrganization || 'Other';
    orgCounts[org] = (orgCounts[org] || 0) + 1;
  });

  const orgData = Object.entries(orgCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Monthly trend (last 6 months)
  const monthlyData = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = month.toLocaleDateString('en-US', { month: 'short' });
    monthlyData[key] = 0;
  }

  allReports.forEach(r => {
    if (r.date) {
      const reportDate = new Date(r.date);
      const monthKey = reportDate.toLocaleDateString('en-US', { month: 'short' });
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey]++;
      }
    }
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A365D" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A365D']} />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={styles.greeting}>Welcome, {userName}</Text>
            <Text style={styles.subtitle}>National Training Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1A365D" />
            {pending.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pending.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
          <View style={styles.statsRow}>
            <TouchableOpacity style={[styles.statCard, styles.totalCard]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="document-text" size={24} color="#FFF" />
              </View>
              <Text style={styles.statValue}>{allReports.length}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, styles.pendingCard]}
              onPress={() => navigation.navigate('Reports')}
            >
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={24} color="#FFF" />
              </View>
              <Text style={styles.statValue}>{pending.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={[styles.statCard, styles.trainersCard]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people" size={24} color="#FFF" />
              </View>
              <Text style={styles.statValue}>{trainersSet.size}</Text>
              <Text style={styles.statLabel}>Active Trainers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.statCard, styles.participantsCard]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="school" size={24} color="#FFF" />
              </View>
              <Text style={styles.statValue}>{totalParticipants.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* AI Insights */}
        <Animated.View style={[styles.insightsSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>AI Insights</Text>
            </View>
          </View>
          
          <View style={styles.insightsCard}>
            {loadingInsights ? (
              <View style={styles.loadingInsightsContainer}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.loadingInsightsText}>Analyzing data...</Text>
              </View>
            ) : (
              <>
                <View style={styles.insightsBadges}>
                  <View style={styles.insightBadge}>
                    <Ionicons name="location" size={14} color="#1A365D" />
                    <Text style={styles.badgeLabel}>{locationsSet.size} Locations</Text>
                  </View>
                  <View style={styles.insightBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.badgeLabel}>{accepted.length} Approved</Text>
                  </View>
                </View>
                <Text style={styles.insightsText}>{aiInsights}</Text>
              </>
            )}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Reports')}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.actionGradient}
              >
                <Ionicons name="time-outline" size={28} color="#FFF" />
                <Text style={styles.actionLabel}>Review Pending</Text>
                {pending.length > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{pending.length}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('AuthorityLiveMap')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionGradient}
              >
                <Ionicons name="map-outline" size={28} color="#FFF" />
                <Text style={styles.actionLabel}>Live Map</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('AuthorityAnalytics')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.actionGradient}
              >
                <Ionicons name="stats-chart-outline" size={28} color="#FFF" />
                <Text style={styles.actionLabel}>Analytics</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Map')}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.actionGradient}
              >
                <Ionicons name="expand-outline" size={28} color="#FFF" />
                <Text style={styles.actionLabel}>GIS Explorer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Distribution Chart */}
        {allReports.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Status Distribution</Text>
            <View style={styles.chartCard}>
              <PieChart
                data={statusData}
                width={width - 60}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(26, 54, 93, ${opacity})`,
                }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          </View>
        )}

        {/* Monthly Trend */}
        {allReports.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Training Trend (6 Months)</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={{
                  labels: Object.keys(monthlyData),
                  datasets: [{ data: Object.values(monthlyData).map(v => Math.max(v, 1)) }]
                }}
                width={width - 60}
                height={200}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(26, 54, 93, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#1A365D'
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>
        )}

        {/* Organization Distribution */}
        {orgData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Top Organizations</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={{
                  labels: orgData.map(([org]) => org.slice(0, 8)),
                  datasets: [{ data: orgData.map(([, count]) => count) }]
                }}
                width={width - 60}
                height={200}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
                  style: { borderRadius: 16 },
                }}
                style={styles.chart}
                showValuesOnTopOfBars
              />
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {allReports.slice(0, 5).map((report, index) => (
            <View key={report.id || index} style={styles.activityCard}>
              <View style={[
                styles.activityIcon,
                report.status === 'accepted' && styles.acceptedIcon,
                report.status === 'pending' && styles.pendingIcon,
                report.status === 'rejected' && styles.rejectedIcon,
              ]}>
                <Ionicons 
                  name={
                    report.status === 'accepted' ? 'checkmark' : 
                    report.status === 'pending' ? 'time' : 'close'
                  } 
                  size={16} 
                  color="#FFF" 
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  {report.trainingTitle || 'Training Session'}
                </Text>
                <Text style={styles.activityMeta}>
                  {report.userName || 'Trainer'} • {report.locationName || 'Location'}
                </Text>
              </View>
              <Text style={styles.activityTime}>
                {report.date ? new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A365D',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  totalCard: {
    backgroundColor: '#1A365D',
  },
  pendingCard: {
    backgroundColor: '#F59E0B',
  },
  trainersCard: {
    backgroundColor: '#10B981',
  },
  participantsCard: {
    backgroundColor: '#8B5CF6',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    opacity: 0.9,
    marginTop: 4,
  },
  insightsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  insightsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingInsightsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingInsightsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  insightsBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  insightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  insightsText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    fontWeight: '500',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  chartSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  activitySection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  acceptedIcon: {
    backgroundColor: '#10B981',
  },
  pendingIcon: {
    backgroundColor: '#F59E0B',
  },
  rejectedIcon: {
    backgroundColor: '#EF4444',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
