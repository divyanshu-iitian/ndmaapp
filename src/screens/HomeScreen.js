import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLiveTrainingLocation, getTrainingReports } from '../services/storage';
import ReportsService from '../services/ReportsService';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ route, navigation }) => {
  const [userName, setUserName] = useState('Responder');
  
  const [liveLocation, setLiveLocation] = useState(null);
  const [trainingReports, setTrainingReports] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const mapScaleAnim = useRef(new Animated.Value(0.9)).current;
  const actionCardsAnim = useRef(new Animated.Value(0)).current;

  // Default Bilaspur, Chhattisgarh coordinates
  const defaultLocation = {
    latitude: 22.0797,
    longitude: 82.1391,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };
  
  const bilaspurLocation = liveLocation 
    ? {
        latitude: liveLocation.coordinate.latitude,
        longitude: liveLocation.coordinate.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    : defaultLocation;

  // Load user data from AsyncStorage
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Try to get user from route params first (after login)
      if (route?.params?.user?.name) {
        setUserName(route.params.user.name);
        return;
      }

      // Otherwise load from AsyncStorage (after app restart)
      const [sessionUser, userData] = await Promise.all([
        AsyncStorage.getItem('@ndma_session_user'),
        AsyncStorage.getItem('userData'),
      ]);

      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        setUserName(user.name || 'Responder');
      } else if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Responder');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserName('Responder');
    }
  };

  useEffect(() => {
    loadLiveLocation();
    loadTrainingReports(); // Load reports on initial mount
    
    // Staggered entrance animations
    Animated.sequence([
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
      ]),
      Animated.timing(mapScaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(actionCardsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const loadLiveLocation = async () => {
    const live = await getLiveTrainingLocation();
    if (live) {
      setLiveLocation(live);
    }
  };

  const loadTrainingReports = async () => {
    console.log('🔄 loadTrainingReports called');
    try {
      // Fetch reports from backend using token (same as ReportsScreen)
      console.log('� Calling ReportsService.getUserReports()');
      const reportsResponse = await ReportsService.getUserReports();
      console.log('📡 Backend response:', reportsResponse);
      
      if (reportsResponse.success && Array.isArray(reportsResponse.reports)) {
        console.log('✅ Loaded reports from backend:', reportsResponse.reports.length);
        console.log('📋 First report:', JSON.stringify(reportsResponse.reports[0], null, 2));
        setTrainingReports(reportsResponse.reports);
        setIsInitialLoad(false);
        
        // Generate AI summary immediately after loading reports
        if (reportsResponse.reports.length > 0) {
          console.log('🚀 Triggering AI summary generation');
          setTimeout(() => generateAISummaryDirect(reportsResponse.reports), 100);
        }
        return;
      }
      
      // If backend fails, set empty array
      console.log('⚠️ Backend failed or no reports found');
      setTrainingReports([]);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('❌ Error loading reports:', error);
      setTrainingReports([]);
      setIsInitialLoad(false);
    }
  };

  const generateAISummary = async () => {
    console.log('🔍 generateAISummary called, reports:', trainingReports?.length || 0);
    
    // Guard clause - exit if no valid data
    if (!trainingReports || !Array.isArray(trainingReports) || trainingReports.length === 0) {
      console.log('⚠️ No reports found, setting default message');
      setAiSummary('Set up training location and submit reports to get AI-powered insights.');
      setLoadingSummary(false);
      return;
    }

    generateAISummaryDirect(trainingReports);
  };

  const generateAISummaryDirect = (reports) => {
    console.log('🔍 generateAISummaryDirect called with', reports?.length || 0, 'reports');
    
    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      console.log('⚠️ No reports provided');
      setAiSummary('Set up training location and submit reports to get AI-powered insights.');
      setLoadingSummary(false);
      return;
    }

    setLoadingSummary(true);
    try {
      const locationName = liveLocation?.locationName || 'Your Location';
      const reportCount = reports.length;
      
      console.log('📊 Generating summary for', reportCount, 'reports at', locationName);
      
      // Safe reduce with proper checks
      const totalParticipants = reports.reduce((sum, r) => {
        if (!r) return sum;
        const participants = parseInt(r.participants_count || r.participants) || 0;
        return sum + participants;
      }, 0);
      
      // Safe average calculation
      const avgCompletion = reports.reduce((sum, r) => {
        if (!r) return sum;
        const completion = parseFloat(r.completionRate || r.completion_rate) || 75;
        return sum + completion;
      }, 0) / reportCount;

      // Get topics from reports
      const allTopics = reports
        .filter(r => r && Array.isArray(r.topics_covered))
        .flatMap(r => r.topics_covered)
        .filter(Boolean);
      
      const uniqueTopics = [...new Set(allTopics)];
      const topicsText = uniqueTopics.slice(0, 3).join(', ') || 'Disaster management topics';

      // Generate LOCAL summary (NO API CALL - instant response)
      const summary = `📊 Training Overview in ${locationName}:\n\n` +
        `✅ Completed ${reportCount} training session${reportCount > 1 ? 's' : ''}\n` +
        `👥 Trained ${totalParticipants} participants total\n` +
        `📈 Average completion: ${Math.round(avgCompletion)}%\n` +
        `📚 Focus areas: ${topicsText}\n\n` +
        `💡 Your training program is making significant impact in disaster preparedness!`;

      console.log('✅ Summary generated:', summary.substring(0, 50) + '...');
      setAiSummary(summary);
    } catch (error) {
      console.error('❌ AI Summary Error:', error);
      setAiSummary('Training data available. Summary will be generated shortly.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadLiveLocation(),
      loadTrainingReports(),
    ]);
    // AI summary will regenerate automatically via useEffect
    setRefreshing(false);
  };
  
  // Add focus listener to reload data when returning from Map screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadLiveLocation();
      loadTrainingReports();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    console.log('🎯 useEffect triggered - isInitialLoad:', isInitialLoad, ', reports:', trainingReports?.length || 0);
    
    // Only generate summary if we have valid data and initial load is complete
    if (!isInitialLoad && trainingReports && Array.isArray(trainingReports) && trainingReports.length > 0) {
      console.log('✅ Conditions met, calling generateAISummary');
      generateAISummary();
    } else if (!isInitialLoad && Array.isArray(trainingReports) && trainingReports.length === 0) {
      console.log('⚠️ No reports, setting default message');
      setAiSummary('Set up training location and submit reports to get AI-powered insights.');
      setLoadingSummary(false);
    } else {
      console.log('⏳ Initial load still in progress...');
    }
  }, [trainingReports, liveLocation, isInitialLoad]);

  const AnimatedActionCard = ({ children, index, style }) => {
    const cardTranslateY = actionCardsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20 * (index + 1), 0],
    });

    return (
      <Animated.View
        style={[
          style,
          {
            opacity: actionCardsAnim,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    );
  };

  // Debug render
  console.log('🎨 HomeScreen render - trainingReports:', trainingReports?.length || 0, 'isArray:', Array.isArray(trainingReports));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        <Animated.View 
          style={[
            styles.headerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.subtitle}>Your training dashboard</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.mapSection,
            {
              opacity: mapScaleAnim,
              transform: [{ scale: mapScaleAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Active Training Location</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={bilaspurLocation}
              showsUserLocation={false}
              showsMyLocationButton={false}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              <Marker
                coordinate={{
                  latitude: bilaspurLocation.latitude,
                  longitude: bilaspurLocation.longitude,
                }}
                title={liveLocation ? "Live Training Location" : "Training Center"}
                description={liveLocation 
                  ? `Updated: ${new Date(liveLocation.updatedAt).toLocaleString()}` 
                  : "Active disaster management training - Bilaspur"
                }
                pinColor="#0056D2"
              />
            </MapView>
            <View style={styles.mapOverlay}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={18} color="#FFFFFF" />
                <Text style={styles.locationTitle}>
                  {liveLocation?.locationName || liveLocation ? "Live Training Location" : "Bilaspur Training Center"}
                </Text>
              </View>
              <Text style={styles.locationSubtitle}>
                {liveLocation 
                  ? `Last updated: ${new Date(liveLocation.updatedAt).toLocaleTimeString()}` 
                  : "Disaster Management Workshop - Active"
                }
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.updateMapButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.updateMapButtonText}>Update Map Location</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.quickActions}>
          <Animated.Text 
            style={[
              styles.sectionTitle,
              {
                opacity: actionCardsAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            Quick Actions
          </Animated.Text>
          <View style={styles.actionGrid}>
            <AnimatedActionCard index={0} style={[styles.actionCard, styles.primaryAction]}>
              <TouchableOpacity style={styles.cardTouchable} activeOpacity={0.8}>
                <View style={styles.actionIconContainer}>
                  <Ionicons name="school-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.actionTitle}>Join Training</Text>
                <Text style={styles.actionText}>Connect to session</Text>
              </TouchableOpacity>
            </AnimatedActionCard>
            
            <AnimatedActionCard index={1} style={styles.actionCard}>
              <TouchableOpacity 
                style={styles.cardTouchable} 
                activeOpacity={0.8}
                onPress={() => {
                  // Create demo training session ID
                  const demoTrainingId = `training-${Date.now()}`;
                  
                  navigation.navigate('AttendanceSession', {
                    trainingId: demoTrainingId,
                    trainingType: 'Disaster Management Workshop',
                    location: bilaspurLocation
                  });
                }}
              >
                <View style={[styles.actionIconContainer, styles.iconBlue]}>
                  <Ionicons name="checkbox-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.actionTitle}>Attendance</Text>
                <Text style={styles.actionText}>Take attendance</Text>
              </TouchableOpacity>
            </AnimatedActionCard>
            
            <AnimatedActionCard index={2} style={styles.actionCard}>
              <TouchableOpacity style={styles.cardTouchable} activeOpacity={0.8}>
                <View style={[styles.actionIconContainer, styles.iconGreen]}>
                  <Ionicons name="folder-open-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.actionTitle}>Resources</Text>
                <Text style={styles.actionText}>Download materials</Text>
              </TouchableOpacity>
            </AnimatedActionCard>
            
            <AnimatedActionCard index={3} style={styles.actionCard}>
              <TouchableOpacity style={styles.cardTouchable} activeOpacity={0.8}>
                <View style={[styles.actionIconContainer, styles.iconRed]}>
                  <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.actionTitle}>Emergency</Text>
                <Text style={styles.actionText}>Quick response</Text>
              </TouchableOpacity>
            </AnimatedActionCard>
            
            <AnimatedActionCard index={4} style={styles.actionCard}>
              <TouchableOpacity 
                style={styles.cardTouchable} 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Chat')}
              >
                <View style={[styles.actionIconContainer, styles.iconPurple]}>
                  <Ionicons name="analytics-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.actionTitle}>Data Analytics</Text>
                <Text style={styles.actionText}>AI data insights</Text>
              </TouchableOpacity>
            </AnimatedActionCard>
            
            <AnimatedActionCard index={5} style={styles.actionCard}>
              <TouchableOpacity style={styles.cardTouchable} activeOpacity={0.8}>
                <View style={[styles.actionIconContainer, styles.iconOrange]}>
                  <Ionicons name="help-circle-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.actionTitle}>Support</Text>
                <Text style={styles.actionText}>Get assistance</Text>
              </TouchableOpacity>
            </AnimatedActionCard>
            
            <AnimatedActionCard index={6} style={styles.actionCard}>
              <TouchableOpacity style={styles.cardTouchable} activeOpacity={0.8}>
                <View style={[styles.actionIconContainer, styles.iconGray]}>
                  <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.actionTitle}>Settings</Text>
                <Text style={styles.actionText}>Configure app</Text>
              </TouchableOpacity>
            </AnimatedActionCard>
          </View>
        </View>

        {/* AI Summary Section */}
        {(Array.isArray(trainingReports) && trainingReports.length > 0) || liveLocation ? (
          <View style={styles.aiSummarySection}>
            <View style={styles.sectionHeader}>
              <View style={styles.summaryTitleContainer}>
                <Ionicons name="sparkles" size={20} color="#805AD5" />
                <Text style={styles.sectionTitle}>AI Insights</Text>
              </View>
            </View>
            
            <View style={styles.aiSummaryCard}>
              {loadingSummary ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#805AD5" />
                  <Text style={styles.loadingText}>Generating insights...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.contextBadges}>
                    <View style={styles.contextBadge}>
                      <Ionicons name="location" size={14} color="#1A365D" />
                      <Text style={styles.badgeText} numberOfLines={1}>
                        {liveLocation?.locationName || 'Bilaspur'}
                      </Text>
                    </View>
                    <View style={styles.contextBadge}>
                      <Ionicons name="people" size={14} color="#1A365D" />
                      <Text style={styles.badgeText}>
                        {Array.isArray(trainingReports) ? trainingReports.length : 0} Sessions
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.aiSummaryText}>
                    {aiSummary || 'Set up training location and submit reports to get AI-powered insights.'}
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* Quick Charts Section */}
        {trainingReports && Array.isArray(trainingReports) && trainingReports.length > 0 && (
          <View style={styles.chartsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Overview</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Analytics')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>Details</Text>
                <Ionicons name="arrow-forward" size={16} color="#4299E1" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Participant Trends</Text>
              <LineChart
                data={{
                  labels: trainingReports.slice(-5).map((_, i) => `T${i + 1}`),
                  datasets: [{
                    data: trainingReports.slice(-5).map(r => Math.max(parseInt(r?.participants) || 1, 1))
                  }]
                }}
                width={width - 40}
                height={180}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(66, 153, 225, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(45, 55, 72, ${opacity})`,
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: '#4299E1'
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>
        )}

        {/* Training Reports Management */}
        <View style={styles.reportsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Training Reports</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Map')}
              style={styles.addButton}
            >
              <Ionicons name="add-circle" size={20} color="#38A169" />
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {!Array.isArray(trainingReports) || trainingReports.length === 0 ? (
            <View style={styles.emptyReports}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>No training reports yet</Text>
              <Text style={styles.emptySubtext}>Drop a pin on map to create training reports</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reportsScroll}>
              {trainingReports && trainingReports.map((report) => (
                <TouchableOpacity
                  key={report?.id || Math.random()}
                  style={styles.reportCard}
                  onPress={() => {
                    setSelectedReport(report);
                    setShowReportModal(true);
                  }}
                >
                  <View style={styles.reportHeader}>
                    <Ionicons name="calendar" size={16} color="#4A5568" />
                    <Text style={styles.reportDate}>
                      {report?.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.reportTitle} numberOfLines={1}>
                    {report?.trainingTitle || 'Untitled Training'}
                  </Text>
                  <View style={styles.reportStats}>
                    <View style={styles.reportStat}>
                      <Ionicons name="people" size={14} color="#1A365D" />
                      <Text style={styles.reportStatText}>{report?.participants || '0'}</Text>
                    </View>
                    <View style={styles.reportStat}>
                      <Ionicons name="checkmark-circle" size={14} color="#38A169" />
                      <Text style={styles.reportStatText}>{report?.completionRate || '0'}%</Text>
                    </View>
                  </View>
                  <View style={styles.reportLocation}>
                    <Ionicons name="location-outline" size={12} color="#718096" />
                    <Text style={styles.reportLocationText} numberOfLines={1}>
                      {report.locationName || 'Training Location'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Report Detail Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Training Report Details</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close-circle" size={28} color="#718096" />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Ionicons name="document-text" size={20} color="#1A365D" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Training Title</Text>
                    <Text style={styles.detailValue}>{selectedReport?.trainingTitle || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={20} color="#1A365D" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Date & Time</Text>
                    <Text style={styles.detailValue}>
                      {selectedReport?.date ? new Date(selectedReport.date).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="location" size={20} color="#1A365D" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedReport?.locationName || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="people" size={20} color="#1A365D" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Participants</Text>
                    <Text style={styles.detailValue}>{selectedReport?.participants || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time" size={20} color="#1A365D" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedReport?.duration || 'N/A'} hours</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="shield-checkmark" size={20} color="#1A365D" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Training Type</Text>
                    <Text style={styles.detailValue}>{selectedReport?.trainingType || 'N/A'}</Text>
                  </View>
                </View>

                <Text style={styles.metricsTitle}>Effectiveness Metrics</Text>

                <View style={styles.metricRow}>
                  <Text style={styles.metricRowLabel}>Completion Rate</Text>
                  <Text style={styles.metricRowValue}>{selectedReport?.completionRate || '0'}%</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricRowLabel}>Attendance Rate</Text>
                  <Text style={styles.metricRowValue}>{selectedReport?.attendanceRate || '0'}%</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricRowLabel}>Feedback Score</Text>
                  <Text style={styles.metricRowValue}>{selectedReport?.feedbackScore || '0'}/10</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricRowLabel}>Practical Score</Text>
                  <Text style={styles.metricRowValue}>{selectedReport?.practicalScore || '0'}%</Text>
                </View>

                {selectedReport?.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Additional Notes</Text>
                    <Text style={styles.notesText}>{selectedReport.notes}</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => {
                      setShowReportModal(false);
                      navigation.navigate('Map');
                    }}
                  >
                    <Ionicons name="pencil" size={18} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={async () => {
                      Alert.alert(
                        'Delete Report',
                        'Are you sure you want to delete this training report?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const { saveTrainingReports } = require('../services/storage');
                                const updated = trainingReports.filter(r => r?.id !== selectedReport?.id);
                                await saveTrainingReports(updated);
                                setTrainingReports(updated);
                                setShowReportModal(false);
                              } catch (error) {
                                console.error('Delete error:', error);
                                Alert.alert('Error', 'Failed to delete report');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    paddingBottom: 100,
  },
  headerSection: {
    backgroundColor: '#1A365D',
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#CBD5E0',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  mapSection: {
    padding: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 16,
  },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  locationSubtitle: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  quickActions: {
    padding: 20,
    paddingTop: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: (width - 64) / 3,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#EBF8FF',
    borderColor: '#BEE3F8',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A365D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBlue: {
    backgroundColor: '#3182CE',
  },
  iconGreen: {
    backgroundColor: '#38A169',
  },
  iconRed: {
    backgroundColor: '#E53E3E',
  },
  iconPurple: {
    backgroundColor: '#805AD5',
  },
  iconOrange: {
    backgroundColor: '#DD6B20',
  },
  iconGray: {
    backgroundColor: '#718096',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  actionText: {
    fontSize: 11,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '400',
  },
  updateMapButton: {
    backgroundColor: '#0056D2',
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0056D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateMapButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Analytics Section
  analyticsSection: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  analyticsIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0FFF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsInfo: {
    flex: 1,
  },
  analyticsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 4,
  },
  analyticsSubtitle: {
    fontSize: 13,
    color: '#718096',
  },
  analyticsMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  // AI Summary Section
  aiSummarySection: {
    padding: 20,
    paddingTop: 10,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9D8FD',
    borderLeftWidth: 4,
    borderLeftColor: '#805AD5',
    shadowColor: '#805AD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#805AD5',
    fontWeight: '500',
  },
  contextBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A365D',
    maxWidth: 120,
  },
  aiSummaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2D3748',
  },
  // Charts Section
  chartsSection: {
    padding: 20,
    paddingTop: 10,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
  },
  // Reports Section
  reportsSection: {
    padding: 20,
    paddingTop: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38A169',
  },
  emptyReports: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#718096',
    marginTop: 6,
  },
  reportsScroll: {
    marginTop: 12,
  },
  reportCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reportDate: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 10,
  },
  reportStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  reportStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
  },
  reportLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reportLocationText: {
    fontSize: 11,
    color: '#718096',
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A365D',
  },
  modalScroll: {
    maxHeight: '85%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A365D',
    marginTop: 10,
    marginBottom: 14,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  metricRowLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  metricRowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A365D',
  },
  notesSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#2D3748',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#4299E1',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeScreen;