import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import eventService from '../services/EventService';
import { useAttendanceHeartbeat } from '../hooks/useAttendanceHeartbeat';

export default function TraineeEventDetailScreen({ route, navigation }) {
    const { event: initialEvent } = route.params;
    const [event, setEvent] = useState(initialEvent);
    const [eventDays, setEventDays] = useState([]);
    const [loadingDays, setLoadingDays] = useState(false);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('joined'); // 'joined' | 'present'
    const [attendanceEnabled, setAttendanceEnabled] = useState(false);

    // Check Local Backend Connectivity
    const { status: attendanceStatus } = useAttendanceHeartbeat(true);

    useEffect(() => {
        const getUserId = async () => {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const u = JSON.parse(userStr);
                setUserId(u.id || u._id);
            }
        };
        getUserId();

        // Initial Load
        fetchEventDetails();
        fetchEventDays();

        // Polling interaction for attendance status
        const interval = setInterval(fetchEventDetails, 5000);
        return () => clearInterval(interval);
    }, [userId]);

    const fetchEventDays = async () => {
        setLoadingDays(true);
        const result = await eventService.getEventDays(initialEvent._id);
        if (result.success) {
            setEventDays(result.eventDays);
        }
        setLoadingDays(false);
    };

    const fetchEventDetails = async () => {
        try {
            const dashboard = await eventService.getEventDashboard();
            if (dashboard.success) {
                const allEvents = [...dashboard.dashboard.upcoming, ...dashboard.dashboard.past];
                const updatedEvent = allEvents.find(e => e._id === initialEvent._id);

                if (updatedEvent) {
                    setEvent(updatedEvent);
                    setAttendanceEnabled(updatedEvent.attendanceEnabled);

                    if (userId && updatedEvent.participants) {
                        const me = updatedEvent.participants.find(p => p.user === userId || p.user?._id === userId);
                        if (me) {
                            setStatus(me.status);
                        }
                    }
                }
            }
        } catch (error) {
            // console.log('Poll error', error);
        }
    };

    const markAttendance = async () => {
        setLoading(true);
        try {
            const dummyLocation = {
                type: 'Point',
                coordinates: [77.2090, 28.6139] // Delhi coordinates
            };

            const result = await eventService.markAttendance(event._id, {
                method: 'location',
                location: dummyLocation,
                device_meta: { type: 'mobile' }
            });
            if (result.success) {
                setStatus('present');
                Alert.alert('Success', 'Attendance Marked Successfully!');
            } else {
                Alert.alert('Status', result.error || 'Failed to mark attendance');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderDayItem = (day) => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = date.getDate();

        let statusColor = '#CBD5E0'; // Gray (Future)
        if (day.status === 'green') statusColor = '#48BB78'; // Completed
        if (day.status === 'red') statusColor = '#F56565'; // Missed
        if (day.status === 'blue') statusColor = '#4299E1'; // In Progress / Planned

        return (
            <Animatable.View key={day._id} animation="fadeInUp" style={styles.dayCard}>
                <View style={[styles.dayIndicator, { backgroundColor: statusColor }]}>
                    <Text style={styles.dayName}>{dayName}</Text>
                    <Text style={styles.dayNumber}>{dayNumber}</Text>
                </View>
                <View style={styles.dayContent}>
                    <Text style={styles.dayTitle}>Day {day.dayNumber}</Text>
                    <Text style={styles.dayTime}>{day.startTime} - {day.endTime}</Text>
                    {day.notes && <Text style={styles.dayNotes}>{day.notes}</Text>}
                </View>
            </Animatable.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details & Schedule</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Premium Gradient Card */}
                <Animatable.View animation="fadeInDown" duration={600} style={styles.elevationContainer}>
                    <LinearGradient
                        colors={['#0F766E', '#14B8A6']} // Teal Gradient for Trainee
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.eventCard}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.tagContainer}>
                                <View style={styles.themeTag}>
                                    <Text style={styles.themeText}>{event.theme}</Text>
                                </View>
                            </View>
                            <View style={styles.codeContainer}>
                                <Text style={styles.codeLabel}>CODE</Text>
                                <Text style={styles.codeValue}>{event.code}</Text>
                            </View>
                        </View>

                        <Text style={styles.eventTitle}>{event.title}</Text>

                        <View style={styles.divider} />

                        <View style={styles.metaContainer}>
                            <View style={styles.metaItem}>
                                <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.metaValue}>{event.venue || 'Online'}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.metaValue}>
                                    {new Date(event.startDate).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animatable.View>

                {/* Local Backend Status Banner */}
                <View style={[
                    styles.attendanceBanner,
                    attendanceStatus === 'success' ? styles.bannerSuccess :
                        attendanceStatus === 'sending' ? styles.bannerSending : styles.bannerIdle
                ]}>
                    <Ionicons
                        name={attendanceStatus === 'success' ? "wifi" : "wifi-outline"}
                        size={20}
                        color={attendanceStatus === 'success' ? "#155724" : "#666"}
                    />
                    <Text style={[
                        styles.bannerText,
                        { color: attendanceStatus === 'success' ? "#155724" : "#333" }
                    ]}>
                        {attendanceStatus === 'success' ? "Connected to Smart System" :
                            attendanceStatus === 'sending' ? "Connecting..." : "Smart System: Offline"}
                    </Text>
                </View>

                <View style={styles.actionContainer}>
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusLabel}>Today's Status:</Text>
                        <View style={[styles.statusBadge, status === 'present' ? styles.presentBadge : styles.joinedBadge]}>
                            <Text style={[styles.statusText, status === 'present' ? styles.presentText : styles.joinedText]}>
                                {status === 'present' ? 'Present' : 'Not Marked'}
                            </Text>
                        </View>
                    </View>

                    {status !== 'present' && (
                        <TouchableOpacity
                            style={[
                                styles.markButton,
                                attendanceEnabled ? {} : styles.disabledButton
                            ]}
                            disabled={!attendanceEnabled || loading}
                            onPress={markAttendance}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <View style={styles.btnIconCircle}>
                                        <MaterialIcons name="touch-app" size={24} color="#007AFF" />
                                    </View>
                                    <Text style={styles.markButtonText}>
                                        {attendanceEnabled ? "Mark Smart Attendance" : "Attendance Disabled"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Daily Schedule</Text>
                </View>

                {loadingDays ? (
                    <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.daysContainer}>
                        {eventDays.length > 0 ? (
                            eventDays.map(renderDayItem)
                        ) : (
                            <Text style={styles.emptyText}>No detailed schedule available.</Text>
                        )}
                    </View>
                )}
            </ScrollView>

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    content: { padding: 20, paddingBottom: 40 },

    // Gradient Card
    elevationContainer: {
        shadowColor: "#0F766E",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
        marginBottom: 20,
    },
    eventCard: {
        borderRadius: 24,
        padding: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    tagContainer: { flexDirection: 'row' },
    themeTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    themeText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
    codeContainer: { alignItems: 'flex-end' },
    codeLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    codeValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
    eventTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 20,
        lineHeight: 32,
    },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
    metaContainer: { flexDirection: 'row', gap: 20 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },

    // Status Section
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    statusLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    presentBadge: { backgroundColor: '#DCFCE7' },
    joinedBadge: { backgroundColor: '#F3F4F6' },
    presentText: { color: '#166534', fontWeight: '600' },
    joinedText: { color: '#6B7280', fontWeight: '600' },

    actionContainer: {
        backgroundColor: '#FFFFFF',
        marginTop: 10,
        padding: 20,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    markButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#007AFF', // Blue button
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        justifyContent: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    btnIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#A0AEC0',
        shadowOpacity: 0,
        elevation: 0,
    },
    markButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },

    // Section Headers
    sectionHeader: { marginTop: 32, marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },

    // Day Cards
    daysContainer: { gap: 16, marginBottom: 24 },
    dayCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    dayIndicator: {
        width: 64,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    dayName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    dayNumber: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    dayContent: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    dayTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    dayTime: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 6,
        fontWeight: '500',
    },
    dayNotes: {
        fontSize: 13,
        color: '#4B5563',
        fontStyle: 'italic',
        lineHeight: 18,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginTop: 20,
    },

    // Banners
    attendanceBanner: {
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        marginBottom: 10,
        backgroundColor: '#FFFFFF',
    },
    bannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    bannerSending: { backgroundColor: '#FEFCE8', borderColor: '#FEF08A' },
    bannerIdle: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
    bannerText: { fontSize: 13, fontWeight: '600' },
});
