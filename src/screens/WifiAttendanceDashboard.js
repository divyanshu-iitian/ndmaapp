import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ATTENDANCE_BACKEND_URL } from '../hooks/useAttendanceHeartbeat';

export default function WifiAttendanceDashboard({ navigation }) {
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchAttendees = async () => {
        try {
            if (!refreshing) setLoading(true); // Don't show full loader on pull-to-refresh

            const response = await fetch(`${ATTENDANCE_BACKEND_URL}/api/attendees`);
            const data = await response.json();

            if (data.success) {
                setAttendees(data.attendees);
                setLastUpdated(new Date());
            } else {
                console.warn('Failed to fetch attendees');
            }
        } catch (error) {
            console.error('Error fetching attendees:', error);
            Alert.alert('Connection Error', 'Could not connect to Local Attendance Backend. Ensure you are on the same Wi-Fi/Hotspot.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAttendees();
        // Auto-refresh every 5 seconds
        const interval = setInterval(() => {
            fetchAttendees();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAttendees();
    };

    const renderItem = ({ item }) => {
        const lastSeen = new Date(item.lastSeen);
        const secondsAgo = Math.floor((new Date() - lastSeen) / 1000);
        const isOnline = secondsAgo < 120; // 2 minutes threshold

        return (
            <View style={[styles.card, isOnline ? styles.cardActive : styles.cardInactive]}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={24} color={isOnline ? "#155724" : "#721c24"} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.role}>{item.role.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.badge, isOnline ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={styles.badgeText}>{isOnline ? 'ACTIVE' : 'AWAY'}</Text>
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.timeText}>Last seen: {secondsAgo}s ago</Text>
                    <Text style={styles.ipText}>{item.ipAddress}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Wi-Fi Attendance</Text>
                    <Text style={styles.headerSubtitle}>Connected via Hotspot</Text>
                </View>
                <View style={styles.liveIndicator}>
                    <View style={styles.blinkingDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{attendees.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{attendees.filter(a => (new Date() - new Date(a.lastSeen)) / 1000 < 120).length}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                </View>
            </View>

            {loading && !refreshing && attendees.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0056D2" />
                    <Text style={{ marginTop: 10 }}>Scanning Local Network...</Text>
                </View>
            ) : (
                <FlatList
                    data={attendees}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="wifi" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No trainees detected yet.</Text>
                            <Text style={styles.emptySubText}>Ensure they are connected to your Hotspot.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F9FC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    headerSubtitle: { fontSize: 12, color: '#666' },
    liveIndicator: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    blinkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', marginRight: 6 },
    liveText: { color: 'red', fontSize: 10, fontWeight: 'bold' },

    statsBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 10, justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#0056D2' },
    statLabel: { fontSize: 12, color: '#666' },

    listContent: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardActive: { borderLeftWidth: 5, borderLeftColor: '#28a745' },
    cardInactive: { borderLeftWidth: 5, borderLeftColor: '#dc3545', opacity: 0.8 },

    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f2f5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    name: { fontSize: 16, fontWeight: '600', color: '#333' },
    role: { fontSize: 10, color: '#666', fontWeight: 'bold' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeActive: { backgroundColor: '#d4edda' },
    badgeInactive: { backgroundColor: '#f8d7da' },
    badgeText: { fontSize: 10, fontWeight: 'bold' },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
    timeText: { fontSize: 12, color: '#666' },
    ipText: { fontSize: 12, color: '#999', fontFamily: 'monospace' },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 18, color: '#666', marginTop: 16, fontWeight: '600' },
    emptySubText: { fontSize: 14, color: '#999', marginTop: 8 },
});
