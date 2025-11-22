import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
// import * as Location from 'expo-location'; // DISABLED - Module removed
import AttendanceService from '../services/AttendanceService';

const { width } = Dimensions.get('window');

export default function AttendanceSessionScreen({ route, navigation }) {
  const { trainingId, trainingType, location: trainingLocation } = route.params;
  
  const [session, setSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('gps');
  const [radiusM, setRadiusM] = useState(30);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    startSession();
    const interval = setInterval(loadAttendees, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const startSession = async () => {
    setLoading(true);
    
    // Get current location
    /* DISABLED - Location module removed
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Location permission required for attendance', [
        { text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home') }
      ]);
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const locationData = {
      type: 'Point',
      coordinates: [loc.coords.longitude, loc.coords.latitude]
    };
    setCurrentLocation(loc.coords);
    */
    
    // Use default location since Location module is removed
    const locationData = {
      type: 'Point',
      coordinates: [82.1391, 22.0797] // Default: Bilaspur, Chhattisgarh
    };
    setCurrentLocation({ latitude: 22.0797, longitude: 82.1391 });

    // Create session
    const res = await AttendanceService.createSession(
      trainingId,
      mode,
      radiusM,
      '',
      'Trainer Device',
      '',
      locationData
    );

    console.log('📝 Create session response:', res);

    if (res.success) {
      console.log('✅ Session created:', res.session);
      setSession(res.session);
      setSessionActive(true);
      loadAttendees();
    } else {
      console.log('❌ Session creation failed:', res.error);
      Alert.alert(
        'Error', 
        res.error || 'Failed to start attendance session. Please check if backend is running.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home') 
          }
        ]
      );
    }
    setLoading(false);
  };

  const loadAttendees = async () => {
    if (!session?.session_token) {
      console.log('⚠️ No session token, skipping loadAttendees');
      return;
    }
    
    console.log('🔄 Loading attendees for session:', session.session_token);
    const res = await AttendanceService.getSessionAttendance(session.session_token);
    console.log('📋 Full Attendance response:', JSON.stringify(res, null, 2));
    
    if (res.success) {
      console.log('✅ Loaded attendees count:', res.records?.length || 0);
      console.log('📝 Attendees data:', JSON.stringify(res.records, null, 2));
      setAttendees(res.records || []);
    } else {
      console.log('❌ Failed to load attendees:', res.error);
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Attendance Session',
      `Are you sure? ${attendees.length} attendees have marked attendance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            const res = await AttendanceService.endSession(session.session_token);
            if (res.success) {
              Alert.alert('Success', 'Attendance session ended', [
                { 
                  text: 'OK', 
                  onPress: () => {
                    setSessionActive(false);
                    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home');
                  }
                }
              ]);
            } else {
              Alert.alert('Error', res.error || 'Failed to end session');
            }
          }
        }
      ]
    );
  };

  const handleShareQR = async () => {
    try {
      await Share.share({
        message: `Join Training Attendance\nSession Code: ${session?.session_token}\nTraining: ${trainingType}`
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const changeRadius = (delta) => {
    const newRadius = Math.max(10, Math.min(100, radiusM + delta));
    setRadiusM(newRadius);
    Alert.alert('Radius Updated', `GPS radius set to ${newRadius}m. Restart session to apply.`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047BA" />
          <Text style={styles.loadingText}>Starting attendance session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.headerTitle}>Attendance Session</Text>
          <Text style={styles.headerSubtitle}>{trainingType}</Text>
        </View>
        <View style={[styles.statusBadge, sessionActive ? styles.activeBadge : styles.inactiveBadge]}>
          <View style={[styles.statusDot, sessionActive && styles.activeDot]} />
          <Text style={styles.statusText}>{sessionActive ? 'ACTIVE' : 'ENDED'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>Scan QR Code to Join</Text>
          <Text style={styles.sectionSubtitle}>Trainees scan this code to mark attendance</Text>
          
          <View style={styles.qrContainer}>
            {session?.session_token && (
              <QRCode
                value={session.session_token}
                size={width - 120}
                backgroundColor="#FFF"
                color="#000"
              />
            )}
          </View>

          <View style={styles.sessionCodeBox}>
            <Text style={styles.sessionCodeLabel}>Session Code</Text>
            <Text style={styles.sessionCode}>{session?.session_token || 'N/A'}</Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShareQR}>
            <Ionicons name="share-social" size={20} color="#0047BA" />
            <Text style={styles.shareBtnText}>Share Code</Text>
          </TouchableOpacity>
        </View>

        {/* GPS Settings */}
        <View style={styles.settingsSection}>
          <View style={styles.settingRow}>
            <Ionicons name="location" size={24} color="#0047BA" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.settingLabel}>GPS Radius</Text>
              <Text style={styles.settingValue}>{radiusM} meters</Text>
            </View>
            <View style={styles.radiusControls}>
              <TouchableOpacity 
                style={styles.radiusBtn}
                onPress={() => changeRadius(-10)}
              >
                <Ionicons name="remove" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.radiusBtn}
                onPress={() => changeRadius(10)}
              >
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingRow}>
            <Ionicons name="time" size={24} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Started At</Text>
              <Text style={styles.settingValue}>
                {session?.started_at ? new Date(session.started_at).toLocaleTimeString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Attendees List */}
        <View style={styles.attendeesSection}>
          <View style={styles.attendeesHeader}>
            <Text style={styles.sectionTitle}>Attendees</Text>
            <TouchableOpacity 
              onPress={loadAttendees}
              style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}
            >
              <Ionicons name="refresh" size={20} color="#0047BA" />
            </TouchableOpacity>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{attendees.length}</Text>
            </View>
          </View>

          {attendees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyText}>No attendees yet</Text>
              <Text style={styles.emptySubtext}>Waiting for trainees to scan...</Text>
            </View>
          ) : (
            attendees.map((attendee, index) => (
              <View key={index} style={styles.attendeeCard}>
                <View style={styles.attendeeAvatar}>
                  <Ionicons name="person" size={24} color="#0047BA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendeeName}>
                    {attendee.user_name || 'Trainee'}
                  </Text>
                  <Text style={styles.attendeeTime}>
                    {attendee.timestamp ? new Date(attendee.timestamp).toLocaleTimeString() : 'Just now'}
                  </Text>
                  {attendee.user_phone && (
                    <Text style={styles.attendeePhone}>{attendee.user_phone}</Text>
                  )}
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* End Session Button */}
      {sessionActive && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.endSessionBtn}
            onPress={handleEndSession}
          >
            <Ionicons name="stop-circle" size={24} color="#FFF" />
            <Text style={styles.endSessionText}>End Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  activeDot: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  qrSection: {
    backgroundColor: '#FFF',
    padding: 24,
    marginTop: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionCodeBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  sessionCodeLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  sessionCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0047BA',
    marginTop: 4,
    letterSpacing: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    marginTop: 16,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0047BA',
  },
  settingsSection: {
    backgroundColor: '#FFF',
    marginTop: 12,
    padding: 20,
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  radiusControls: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0047BA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeesSection: {
    backgroundColor: '#FFF',
    marginTop: 12,
    padding: 20,
    marginBottom: 20,
  },
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: '#0047BA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  attendeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  attendeeTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  attendeePhone: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  endSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  endSessionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
});
