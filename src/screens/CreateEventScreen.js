import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import eventService from '../services/EventService';
import DateTimePicker from '@react-native-community/datetimepicker';

// Themes matching API or general
const THEMES = ['Disaster Management', 'First Aid', 'Fire Safety', 'Search & Rescue', 'Flood Response', 'Earthquake Drill', 'Other'];
const EVENT_TYPES = ['In-Person', 'Online', 'Hybrid'];

export default function CreateEventScreen({ navigation }) {
    // Form State
    const [title, setTitle] = useState('');
    const [theme, setTheme] = useState('');
    const [capacity, setCapacity] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [eventType, setEventType] = useState('In-Person');
    const [description, setDescription] = useState('');

    // Location State
    const [locationName, setLocationName] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null); // { latitude, longitude }
    const [showMapModal, setShowMapModal] = useState(false);

    // UI State
    const [loading, setLoading] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [dateMode, setDateMode] = useState(null); // 'start', 'end', null

    const mapRef = useRef(null);

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || (dateMode === 'start' ? startDate : endDate);
        // IOS toggle annoyance
        if (Platform.OS === 'android') {
            setDateMode(null);
        }

        if (dateMode === 'start') {
            setStartDate(currentDate);
        } else {
            setEndDate(currentDate);
        }
    };

    const validateForm = () => {
        if (!title.trim()) { Alert.alert('Error', 'Please enter a title'); return false; }
        if (!theme) { Alert.alert('Error', 'Please select a theme'); return false; }
        if (!capacity || isNaN(capacity)) { Alert.alert('Error', 'Please enter a valid capacity'); return false; }
        if (eventType !== 'Online' && !selectedLocation) { Alert.alert('Error', 'Please select a location for In-Person/Hybrid events'); return false; }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const payload = {
                title,
                theme,
                capacity: parseInt(capacity),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                type: eventType.toLowerCase(), // API expects lowercase maybe? 'in-person'
                description,
                location: selectedLocation ? {
                    type: 'Point',
                    coordinates: [selectedLocation.longitude, selectedLocation.latitude], // GeoJSON order: [long, lat]
                    name: locationName || 'Selected Location'
                } : undefined,
                venue: locationName || (eventType === 'Online' ? 'Online' : 'TBD')
            };

            // Cleanup type string to match typical API enums if needed
            if (payload.type === 'in-person') payload.type = 'in-person'; // Ensure formatting

            console.log('Creating Event Payload:', payload);
            const result = await eventService.createEvent(payload);

            if (result.success) {
                Alert.alert('Success', 'Event created successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', result.error || 'Failed to create event');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Event</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Title */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Event Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Advanced Flood Safety Workshop"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Theme */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Theme *</Text>
                    <TouchableOpacity style={styles.dropdown} onPress={() => setShowThemeModal(true)}>
                        <Text style={theme ? styles.dropdownText : styles.placeholderText}>
                            {theme || 'Select Theme'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Type */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Event Type *</Text>
                    <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
                        <Text style={styles.dropdownText}>{eventType}</Text>
                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Capacity */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Capacity *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 50"
                        keyboardType="numeric"
                        value={capacity}
                        onChangeText={setCapacity}
                    />
                </View>

                {/* Dates */}
                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity style={styles.dateButton} onPress={() => setDateMode('start')}>
                            <Ionicons name="calendar-outline" size={20} color="#4B5563" />
                            <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>End Date</Text>
                        <TouchableOpacity style={styles.dateButton} onPress={() => setDateMode('end')}>
                            <Ionicons name="calendar-outline" size={20} color="#4B5563" />
                            <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Location (Hidden if Online) */}
                {eventType !== 'Online' && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Location *</Text>
                        <TouchableOpacity style={styles.locationButton} onPress={() => setShowMapModal(true)}>
                            <Ionicons name="map-outline" size={24} color="#0056D2" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.locationName}>
                                    {selectedLocation ? (locationName || 'Location Selected') : 'Select on Map'}
                                </Text>
                                {selectedLocation && (
                                    <Text style={styles.coords}>
                                        {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                                    </Text>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Description */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Event details, agenda, etc."
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#FFF" /> : (
                        <Text style={styles.submitButtonText}>Create Event</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>

            {/* Date Picker */}
            {dateMode && (
                <DateTimePicker
                    value={dateMode === 'start' ? startDate : endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                />
            )}

            {/* Map Modal */}
            <Modal visible={showMapModal} animationType="slide">
                <View style={{ flex: 1 }}>
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1 }}
                        initialRegion={{
                            latitude: 20.5937,
                            longitude: 78.9629,
                            latitudeDelta: 20,
                            longitudeDelta: 20,
                        }}
                        onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
                    >
                        {selectedLocation && (
                            <Marker coordinate={selectedLocation} />
                        )}
                    </MapView>
                    <View style={styles.mapOverlay}>
                        <TextInput
                            style={styles.mapSearch}
                            placeholder="Enter Location Name (e.g. Training Hall A)"
                            value={locationName}
                            onChangeText={setLocationName}
                        />
                        <TouchableOpacity
                            style={styles.confirmLocationBtn}
                            onPress={() => setShowMapModal(false)}
                        >
                            <Text style={styles.confirmLocationText}>Confirm Location</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.closeMapBtn}
                            onPress={() => setShowMapModal(false)}
                        >
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Theme Picker Modal */}
            <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Theme</Text>
                        {THEMES.map((t) => (
                            <TouchableOpacity key={t} style={styles.modalOption} onPress={() => { setTheme(t); setShowThemeModal(false); }}>
                                <Text style={styles.modalOptionText}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShowThemeModal(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Type Picker Modal */}
            <Modal visible={showTypeModal} transparent animationType="fade" onRequestClose={() => setShowTypeModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Event Type</Text>
                        {EVENT_TYPES.map((t) => (
                            <TouchableOpacity key={t} style={styles.modalOption} onPress={() => { setEventType(t); setShowTypeModal(false); }}>
                                <Text style={styles.modalOptionText}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTypeModal(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
    input: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
        padding: 12, fontSize: 16, color: '#1F2937'
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    dropdown: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
        padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
    },
    dropdownText: { fontSize: 16, color: '#1F2937' },
    placeholderText: { fontSize: 16, color: '#9CA3AF' },
    row: { flexDirection: 'row' },
    dateButton: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
        padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8
    },
    dateText: { fontSize: 16, color: '#1F2937' },
    locationButton: {
        backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8,
        padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12
    },
    locationName: { fontSize: 16, fontWeight: '500', color: '#1E3A8A' },
    coords: { fontSize: 12, color: '#6B7280' },
    submitButton: {
        backgroundColor: '#0056D2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20
    },
    submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    disabledButton: { opacity: 0.7 },

    // Map Overlay
    mapOverlay: {
        position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 16, borderRadius: 12, gap: 10
    },
    mapSearch: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10 },
    confirmLocationBtn: { backgroundColor: '#0056D2', padding: 12, borderRadius: 8, alignItems: 'center' },
    confirmLocationText: { color: '#FFF', fontWeight: 'bold' },
    closeMapBtn: { position: 'absolute', top: -40, right: 0, backgroundColor: '#FFF', borderRadius: 20, padding: 8 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalOptionText: { fontSize: 16, textAlign: 'center', color: '#374151' },
    modalCancel: { marginTop: 16, alignItems: 'center' },
    modalCancelText: { color: '#EF4444', fontSize: 16, fontWeight: '600' }
});
