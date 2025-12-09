import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Image, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import eventService from '../services/EventService';
import { useAttendanceHeartbeat, ATTENDANCE_BACKEND_URL } from '../hooks/useAttendanceHeartbeat';

export default function TrainerEventDetailScreen({ route, navigation }) {
    const { event } = route.params;
    const [loading, setLoading] = useState(false);
    const [attendanceEnabled, setAttendanceEnabled] = useState(false);
    const [eventDays, setEventDays] = useState([]);
    const [loadingDays, setLoadingDays] = useState(false);
    const [attendees, setAttendees] = useState([]);
    const [wifiAttendees, setWifiAttendees] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Enable heartbeat check for Trainer too to show status
    const { status: attendanceStatus } = useAttendanceHeartbeat(true);

    // Poll for updates every 5 seconds when attendance is enabled
    useEffect(() => {
        let interval;
        if (attendanceEnabled) {
            interval = setInterval(fetchAttendees, 5000);
        }
        return () => clearInterval(interval);
    }, [attendanceEnabled]);

    useEffect(() => {
        fetchAttendees();
        fetchEventDays();
    }, []);

    const fetchAttendees = async () => {
        try {
            const result = await eventService.getEventAttendees(event._id);
            if (result.success) {
                setAttendees(result.attendees);
                setAttendanceEnabled(result.attendanceEnabled);
            }
            fetchLocalAttendees();
        } catch (error) {
            // Error fetching attendees silently handled or user alerted if needed
        }
    };

    const fetchEventDays = async () => {
        setLoadingDays(true);
        const result = await eventService.getEventDays(event._id);
        if (result.success) {
            setEventDays(result.eventDays);
        }
        setLoadingDays(false);
    };

    const fetchLocalAttendees = async () => {
        try {
            const response = await fetch(`${ATTENDANCE_BACKEND_URL}/api/attendees`);
            const data = await response.json();
            if (data.success) {
                setWifiAttendees(data.attendees);
            }
        } catch (e) {
            // console.log("Local fetch error (expected if offline)", e);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchAttendees(), fetchEventDays()]);
        setRefreshing(false);
    };

    const handleToggleAttendance = async (value) => {
        setAttendanceEnabled(value);
        try {
            const result = await eventService.toggleAttendance(event._id, value);
            if (!result.success) {
                setAttendanceEnabled(!value);
                Alert.alert('Error', result.error || 'Failed to update status');
            } else {
                if (value) fetchAttendees();
            }
        } catch (error) {
            setAttendanceEnabled(!value);
            Alert.alert('Error', 'Connection failed');
        }
    };

    const copyCode = async () => {
        Alert.alert('Event Code', `Share code: ${event.code}`);
    };

    const renderAttendee = (attendee, index) => {
        const isPresent = attendee.status === 'present';
        return (
            <Animatable.View
                key={index}
                animation="fadeInUp"
                delay={index * 50}
                style={[styles.attendeeRow, isPresent && styles.attendeeRowPresent]}
            >
                <View style={[styles.attendeeStrip, { backgroundColor: isPresent ? '#34C759' : '#E5E7EB' }]} />
                <View style={styles.userInfo}>
                    {attendee.user?.profilePhoto ? (
                        <Image source={{ uri: attendee.user.profilePhoto }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, isPresent && styles.avatarPlaceholderPresent]}>
                            <Text style={[styles.avatarInitials, isPresent && styles.avatarInitialsPresent]}>
                                {attendee.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{attendee.user?.username || 'Unknown User'}</Text>
                        <Text style={styles.userEmail}>{attendee.user?.email || ''}</Text>
                    </View>
                </View>

                {isPresent ? (
                    <View style={styles.statusBadgePresent}>
                        <Ionicons name="checkmark-circle" size={14} color="#166534" />
                        <Text style={styles.textPresent}>Present</Text>
                    </View>
                ) : (
                    <View style={styles.statusBadgeJoined}>
                        <Text style={styles.textJoined}>Joined</Text>
                    </View>
                )}
            </Animatable.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Event Dashboard</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Modern Event Card */}
                <Animatable.View animation="fadeInDown" duration={600} style={styles.elevationContainer}>
                    <LinearGradient
                        colors={['#1E3A8A', '#2563EB']} // Deep Blue to Bright Blue
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.eventCard}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.tagContainer}>
                                <View style={styles.themeTag}>
                                    <Text style={styles.themeText}>{event.theme}</Text>
                                </View>
                                <View style={[styles.statusTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
                                    <Text style={styles.statusText}>Live</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={copyCode} activeOpacity={0.8} style={styles.codeButton}>
                                <Text style={styles.codeLabel}>CODE</Text>
                                <Text style={styles.codeValue}>{event.code}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.eventTitle}>{event.title}</Text>

                        <View style={styles.divider} />

                        <View style={styles.metaContainer}>
                            <View style={styles.metaItem}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="calendar" size={18} color="#EFF6FF" />
                                </View>
                                <View>
                                    <Text style={styles.metaLabel}>Date</Text>
                                    <Text style={styles.metaValue}>{new Date(event.startDate).toDateString()}</Text>
                                </View>
                            </View>
                            <View style={styles.metaItem}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="time" size={18} color="#EFF6FF" />
                                </View>
                                <View>
                                    <Text style={styles.metaLabel}>Time</Text>
                                    <Text style={styles.metaValue}>{event.defaultStartTime || '09:00'} - {event.defaultEndTime || '17:00'}</Text>
                                </View>
                            </View>
                            <View style={styles.metaItem}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="location" size={18} color="#EFF6FF" />
                                </View>
                                <View>
                                    <Text style={styles.metaLabel}>Venue</Text>
                                    <Text style={styles.metaValue}>{event.venue || 'Online'}</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animatable.View>

                {/* --- DAILY REPORTS MANAGEMENT (CALENDAR UI) --- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeaderTitle}>Training Schedule & Reports</Text>
                    {loadingDays ? (
                        <ActivityIndicator style={{ padding: 20 }} color="#2563EB" />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                            {eventDays.map((day) => {
                                // Determine Status Color
                                let statusColor = '#E5E7EB'; // Default (Future/Gray)
                                let statusTextColor = '#6B7280';
                                if (day.isCompleted) {
                                    statusColor = '#DEF7EC'; // Green
                                    statusTextColor = '#03543F';
                                } else if (day.status === 'red') { // If logic exists for missed
                                    statusColor = '#FDE8E8';
                                    statusTextColor = '#9B1C1C';
                                } else if (new Date(day.date).toDateString() === new Date().toDateString()) {
                                    statusColor = '#E0E7FF'; // Blue (Today)
                                    statusTextColor = '#3730A3';
                                }

                                return (
                                    <TouchableOpacity
                                        key={day._id}
                                        style={[styles.dayCard, { borderColor: statusColor === '#E0E7FF' ? '#6366F1' : 'transparent', borderWidth: statusColor === '#E0E7FF' ? 1 : 0 }]}
                                        onPress={() => navigation.navigate('EventDayReport', { eventDay: day })}
                                    >
                                        <View style={[styles.dayHeader, { backgroundColor: statusColor }]}>
                                            <Text style={[styles.dayHeaderText, { color: statusTextColor }]}>
                                                DAY {day.dayNumber}
                                            </Text>
                                        </View>
                                        <View style={styles.dayBody}>
                                            <Text style={styles.dayDate}>{new Date(day.date).getDate()}</Text>
                                            <Text style={styles.dayMonth}>{new Date(day.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
                                        </View>
                                        {day.isCompleted && (
                                            <View style={styles.completedBadge}>
                                                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* Attendance Control Panel */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeaderTitle}>Attendance Control</Text>
                    <View style={styles.controlCard}>
                        <View style={styles.controlInfo}>
                            <View style={[styles.controlIcon, { backgroundColor: attendanceEnabled ? '#DCFCE7' : '#F3F4F6' }]}>
                                <MaterialIcons
                                    name={attendanceEnabled ? "network-wifi" : "wifi-off"}
                                    size={24}
                                    color={attendanceEnabled ? "#166534" : "#9CA3AF"}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.controlTitle}>Smart Attendance</Text>
                                <Text style={styles.controlDesc}>
                                    {attendanceEnabled ? "System is active & listening" : "Turn on to allow check-ins"}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                            thumbColor={"#FFFFFF"}
                            ios_backgroundColor="#E5E7EB"
                            onValueChange={handleToggleAttendance}
                            value={attendanceEnabled}
                            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                        />
                    </View>

                    {/* Mini Wifi Monitor - Only show when enabled or connected */}
                    {(attendanceEnabled || attendanceStatus === 'success') && (
                        <Animatable.View animation="fadeIn" style={styles.monitorContainer}>
                            <View style={styles.monitorHeaderRow}>
                                <View style={styles.monitorStatusBadge}>
                                    <View style={[styles.pulseDot, attendanceStatus === 'success' ? styles.pulseGreen : styles.pulseGray]} />
                                    <Text style={styles.monitorStatusText}>
                                        {attendanceStatus === 'success' ? `Local Network: Online (${wifiAttendees.length})` : "Local Network: Scanning..."}
                                    </Text>
                                </View>
                            </View>

                            {wifiAttendees.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wifiList}>
                                    {wifiAttendees.map((wa, idx) => (
                                        <View key={idx} style={styles.wifiAvatar}>
                                            <View style={styles.wifiAvatarBg}>
                                                <Text style={styles.wifiAvatarText}>{wa.name.charAt(0)}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </Animatable.View>
                    )}
                </View>

                {/* Attendees List Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.listHeaderRow}>
                        <Text style={styles.sectionHeaderTitle}>Participant List</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{attendees.length} Total</Text>
                        </View>
                    </View>


                    {attendees.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Image
                                source={{ uri: "https://img.icons8.com/illustrations/author/kPxhkG146D1u/80/0/0/0/0/0/0/1/d2a35606-2583-4a0b-871d-7206d9d13e31.png" }}
                                style={{ width: 120, height: 120, opacity: 0.8 }}
                            />
                            <Text style={styles.emptyTitle}>No Participants Yet</Text>
                            <Text style={styles.emptyDesc}>
                                Share code <Text style={{ fontWeight: 'bold', color: '#2563EB' }}>{event.code}</Text> to start
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.attendeesList}>
                            {attendees.map((attendee, index) => renderAttendee(attendee, index))}
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    backButton: {
        padding: 4,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 50,
    },

    // Gradient Card Styles
    elevationContainer: {
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
        marginBottom: 24,
    },
    eventCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    tagContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    themeTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    themeText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    codeButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    codeValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E3A8A',
        letterSpacing: 1,
    },
    eventTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 20,
        lineHeight: 32,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 20,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metaItem: {
        flex: 1,
        gap: 8,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 2,
    },
    metaValue: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },

    // Sections
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    controlCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    controlInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    controlIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    controlDesc: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },

    // Monitor
    monitorContainer: {
        marginTop: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    monitorHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    monitorStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pulseGreen: { backgroundColor: '#22C55E' },
    pulseGray: { backgroundColor: '#9CA3AF' },
    monitorStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    wifiList: {
        flexDirection: 'row',
        marginTop: 4,
    },
    wifiAvatar: {
        marginRight: -8, // Overlap effect
        borderWidth: 2,
        borderColor: '#FFF',
        borderRadius: 15,
    },
    wifiAvatarBg: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wifiAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E40AF',
    },

    // List
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    countBadge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    attendeesList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    attendeeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
    },
    attendeeRowPresent: {
        backgroundColor: '#F0FDF4',
    },
    attendeeStrip: {
        width: 4,
        height: 24,
        borderRadius: 2,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    avatarPlaceholderPresent: {
        backgroundColor: '#DCFCE7',
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
    },
    avatarInitialsPresent: {
        color: '#166534',
    },
    userDetails: {
        gap: 2,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    userEmail: {
        fontSize: 12,
        color: '#6B7280',
    },
    statusBadgePresent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    textPresent: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
    },
    statusBadgeJoined: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    textJoined: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginTop: 16,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },

    // Day Cards
    daysScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
    dayCard: {
        width: 80,
        height: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginRight: 10,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    dayHeader: { height: 32, alignItems: 'center', justifyContent: 'center' },
    dayHeaderText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    dayBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    dayDate: { fontSize: 24, fontWeight: '800', color: '#111827' },
    dayMonth: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
    completedBadge: {
        position: 'absolute', top: 4, right: 4, backgroundColor: '#34D399', borderRadius: 6, padding: 2
    },
});
