import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import eventService from '../services/EventService';
import { ATTENDANCE_BACKEND_URL } from '../hooks/useAttendanceHeartbeat';

export default function EventDayReportScreen({ route, navigation }) {
    const { eventDay } = route.params;
    const [loading, setLoading] = useState(false);
    const [photos, setPhotos] = useState(eventDay.photos || []);
    const [syncing, setSyncing] = useState(false);
    const [localAttendees, setLocalAttendees] = useState([]);

    // Fetch local attendees for preview
    const fetchLocalAttendees = async () => {
        try {
            const response = await fetch(`${ATTENDANCE_BACKEND_URL}/api/attendees`);
            const data = await response.json();
            if (data.success) {
                setLocalAttendees(data.attendees);
            }
        } catch (e) {
            console.log("Local fetch error", e);
            Alert.alert('Connection Error', 'Could not connect to Local Wi-Fi Backend. Ensure you are connected to the same network.');
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadPhoto(result.assets[0].uri);
        }
    };

    const handleCamera = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async (uri) => {
        setLoading(true);
        const result = await eventService.uploadEventDayPhotos(eventDay._id, uri);
        if (result.success) {
            setPhotos(result.eventDay.photos);
            Alert.alert('Success', 'Photo uploaded successfully');
        } else {
            Alert.alert('Error', result.error || 'Failed to upload photo');
        }
        setLoading(false);
    };

    const handleSyncAttendance = async () => {
        if (localAttendees.length === 0) {
            Alert.alert('No Data', 'No attendees found on local network to sync.');
            return;
        }

        setSyncing(true);
        // extracting userIds
        const userIds = localAttendees.map(a => a.userId).filter(id => id);

        const result = await eventService.bulkMarkAttendance(eventDay._id, userIds);
        if (result.success) {
            Alert.alert('Sync Complete', `Successfully synced ${result.count} attendees.`);
        } else {
            Alert.alert('Sync Failed', result.error);
        }
        setSyncing(false);
    };

    const handleSubmitReport = async () => {
        Alert.alert(
            'Confirm Submission',
            'Are you sure you want to mark this day as Completed? This will finalize the report.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    onPress: async () => {
                        setLoading(true);
                        const result = await eventService.completeEventDay(eventDay._id);
                        setLoading(false);
                        if (result.success) {
                            Alert.alert('Success', 'Daily Report Submitted!', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } else {
                            Alert.alert('Error', result.error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Report: Day {eventDay.dayNumber}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Info Card */}
                <View style={styles.card}>
                    <Text style={styles.dateText}>
                        {new Date(eventDay.date).toDateString()}
                    </Text>
                    <Text style={styles.timeText}>
                        {eventDay.startTime} - {eventDay.endTime}
                    </Text>
                    <View style={[styles.statusBadge, eventDay.isCompleted ? styles.completed : styles.pending]}>
                        <Text style={styles.statusText}>
                            {eventDay.isCompleted ? 'Report Submitted' : 'Pending Submission'}
                        </Text>
                    </View>
                </View>

                {/* 1. Photo Gallery Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Session Photos</Text>
                    <Text style={styles.sectionDesc}>Upload photos of the training session.</Text>

                    <ScrollView horizontal style={styles.photoList}>
                        <TouchableOpacity style={styles.addPhotoBtn} onPress={() => {
                            Alert.alert('Upload Photo', 'Choose source', [
                                { text: 'Camera', onPress: handleCamera },
                                { text: 'Gallery', onPress: handlePickImage },
                                { text: 'Cancel', style: 'cancel' }
                            ]);
                        }}>
                            <Ionicons name="camera-outline" size={32} color="#0056D2" />
                            <Text style={styles.addPhotoText}>Add Photo</Text>
                        </TouchableOpacity>

                        {photos.map((photo, index) => (
                            <Image key={index} source={{ uri: photo.url || photo }} style={styles.thumbnail} />
                        ))}
                    </ScrollView>
                </View>

                {/* 2. Attendance Sync Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Sync Attendance</Text>
                    <Text style={styles.sectionDesc}>
                        Pull attendance data from local Wi-Fi attendees.
                    </Text>

                    <View style={styles.syncContainer}>
                        <View style={styles.syncStats}>
                            <Text style={styles.syncCount}>{localAttendees.length}</Text>
                            <Text style={styles.syncLabel}>Local Devices Found</Text>
                        </View>

                        <View style={{ gap: 10, flex: 1 }}>
                            <TouchableOpacity
                                style={styles.refreshBtn}
                                onPress={fetchLocalAttendees}
                            >
                                <Ionicons name="refresh" size={16} color="#4B5563" />
                                <Text style={styles.refreshText}>Scan Network</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.syncBtn, localAttendees.length === 0 && styles.disabledBtn]}
                                onPress={handleSyncAttendance}
                                disabled={localAttendees.length === 0 || syncing}
                            >
                                {syncing ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <MaterialIcons name="sync" size={20} color="#FFF" />
                                        <Text style={styles.syncBtnText}>Sync to Cloud</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 3. Final Submit */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Submit Report</Text>
                    <Text style={styles.sectionDesc}>
                        Finalize this day's report. This action is irreversible.
                    </Text>

                    <TouchableOpacity
                        style={[styles.submitBtn, eventDay.isCompleted && styles.disabledBtn]}
                        onPress={handleSubmitReport}
                        disabled={eventDay.isCompleted || loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : (
                            <Text style={styles.submitBtnText}>
                                {eventDay.isCompleted ? 'Already Submitted' : 'Submit Daily Report'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
    },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    content: { padding: 20 },
    card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20 },
    dateText: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    timeText: { fontSize: 14, color: '#6B7280', marginVertical: 4 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 8 },
    completed: { backgroundColor: '#DEF7EC' },
    pending: { backgroundColor: '#FEF3C7' },
    statusText: { fontSize: 12, fontWeight: 'bold', color: '#03543F' }, // logic for completed color?? fix later if needed

    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
    sectionDesc: { fontSize: 14, color: '#6B7280', marginBottom: 12 },

    photoList: { flexDirection: 'row' },
    addPhotoBtn: {
        width: 100, height: 100, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: '#F3F4F6'
    },
    addPhotoText: { fontSize: 12, color: '#0056D2', marginTop: 4 },
    thumbnail: { width: 100, height: 100, borderRadius: 8, marginRight: 12 },

    syncContainer: {
        flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 16, gap: 16, alignItems: 'center'
    },
    syncStats: { alignItems: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
    syncCount: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    syncLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center', width: 60 },

    refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8, gap: 6 },
    refreshText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },

    syncBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#0056D2', borderRadius: 8, gap: 8
    },
    syncBtnText: { color: '#FFF', fontWeight: '600' },

    submitBtn: {
        backgroundColor: '#059669', padding: 16, borderRadius: 12, alignItems: 'center'
    },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    disabledBtn: { backgroundColor: '#9CA3AF' }
});
