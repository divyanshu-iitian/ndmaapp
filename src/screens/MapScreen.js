import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Image, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
// import * as Location from 'expo-location'; // DISABLED - Module removed
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { uploadToGCS } from '../utils/gcsHelper';
import { seedTrainings, statusColors } from '../data/trainings';
import { getTrainings, getLiveTrainingLocation, setLiveTrainingLocation, getPreviousTrainingLocations } from '../services/storage';

import ReportsService from '../services/ReportsService';
import eventService from '../services/EventService';
import { authService } from '../services/AuthService'; // Import authService
import DateTimePicker from '@react-native-community/datetimepicker';
import LiveTrainingPin from '../components/LiveTrainingPin';
import ImportLegacyDataModal from '../components/ImportLegacyDataModal';

export default function MapScreen({ route, navigation }) {
  const user = route?.params?.user;
  const mapRef = useRef(null);
  const [mode, setMode] = useState('live'); // 'live' | 'previous' | 'manual'
  const [mapType, setMapType] = useState('standard'); // 'standard' | 'satellite' | 'hybrid'
  const [trainings, setTrainings] = useState(seedTrainings);
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveTrainingImages, setLiveTrainingImages] = useState([]); // For rotating images
  const [previousLocations, setPreviousLocations] = useState([]);
  const [markerCoord, setMarkerCoord] = useState({
    latitude: 22.0797,
    longitude: 82.1391,
  });
  const [locationName, setLocationName] = useState('Bilaspur, Chhattisgarh');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form Mode: 'event' or 'report'
  const [formType, setFormType] = useState('event');

  // Event Creation form modal
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventData, setEventData] = useState({
    title: '',
    theme: 'Disaster Management',
    description: '',
    capacity: '',
    startDate: new Date(),
    endDate: new Date(),
    startTime: new Date(), // using Date obj for picker, will format to HH:MM
    endTime: new Date(),
    type: 'in-person',
    onlineLink: '',
  });

  // Date Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [endDateText, setEndDateText] = useState(''); // Local state for manual input
  const [dateMode, setDateMode] = useState('start'); // 'start' | 'end'
  const [timeMode, setTimeMode] = useState('start'); // 'start' | 'end'
  const [trainingImages, setTrainingImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Image Viewer States
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  // User's live location
  const [userLiveLocation, setUserLiveLocation] = useState(null);

  // Import Legacy Data Modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Training detail modal
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Saved training reports
  const [trainingReports, setTrainingReports] = useState([]);

  // Dashboard Events (from backend)
  const [dashboardEvents, setDashboardEvents] = useState({
    upcoming: [],
    past: [],
    recommended: []
  });

  useEffect(() => {
    loadData();
    // Get user location with delay to avoid race conditions
    setTimeout(() => {
      getUserLocation();
    }, 1000);
  }, []);

  const loadData = async () => {
    try {
      // Check for token first
      const token = await authService.getAccessToken();
      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please login again to continue.',
          [
            { text: 'OK', onPress: () => navigation.navigate('NewAuthLogin') }
          ]
        );
        return;
      }

      const local = await getTrainings();
      if (local && local.length) {
        setTrainings([...seedTrainings, ...local]);
      }

      const live = await getLiveTrainingLocation();
      if (live) {
        setLiveLocation(live);
        setMarkerCoord(live.coordinate);
        if (live.locationName) {
          setLocationName(live.locationName);
        }

        // Fetch live training images from latest report at this location
        try {
          const reports = await ReportsService.getUserReports();
          if (reports.success && reports.reports.length > 0) {
            // Find reports at live location
            // Find reports at live location
            const liveReports = reports.reports.filter(report =>
              report.location &&
              Math.abs(report.location.latitude - live.coordinate.latitude) < 0.001 &&
              Math.abs(report.location.longitude - live.coordinate.longitude) < 0.001
            );

            if (liveReports.length > 0 && liveReports[0].photos) {
              setLiveTrainingImages(liveReports[0].photos);
            }
          }
        } catch (error) {
          console.log('Error loading live training images (ignoring):', error);
        }
      }

      const prev = await getPreviousTrainingLocations();
      setPreviousLocations(prev);

      // Load training reports from cloud
      try {
        const result = await ReportsService.getUserReports();
        if (result && result.success) {
          setTrainingReports(result.reports || []);
        } else {
          // Handle soft error or no reports
          console.log('⚠️ Reports load issue:', result ? result.error : 'Unknown error');
          setTrainingReports([]);
        }
      } catch (error) {
        console.log('Error loading reports (likely JSON parse HTML error from backend):', error);
        setTrainingReports([]);
      }

      // Load Event Dashboard Data
      try {
        const dashboardResult = await eventService.getEventDashboard();
        if (dashboardResult.success) {
          console.log('✅ Dashboard events loaded:',
            dashboardResult.dashboard.upcoming.length, 'upcoming,',
            dashboardResult.dashboard.past.length, 'past');
          setDashboardEvents(dashboardResult.dashboard);
        }
      } catch (error) {
        console.log('Error loading dashboard events:', error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Get user's current location
  const getUserLocation = async () => {
    try {
      // Check if Location is available
      if (!Location) {
        console.log('Location service not available');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return; // Don't show alert to avoid crash
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000, // 10 second timeout
      });

      if (!location || !location.coords) {
        console.log('Could not get location');
        return;
      }

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLiveLocation(userCoords);

      // Center map on user location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...userCoords,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }, 1000);
      }
    } catch (error) {
      console.log('Error getting user location:', error);
      // Silently fail - don't crash the app
    }
  };

  // Reverse geocoding to get location name
  const getLocationName = async (latitude, longitude) => {
    setIsLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Disaster Management Training App',
          },
        }
      );
      const data = await response.json();

      if (data && data.address) {
        const { village, town, city, state_district, state, country } = data.address;
        const locationStr = [village || town || city, state_district, state, country]
          .filter(Boolean)
          .join(', ');
        setLocationName(locationStr || 'Unknown Location');
        return locationStr;
      }
    } catch (error) {
      console.log('Geocoding error:', error);
      setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } finally {
      setIsLoadingLocation(false);
    }
    return null;
  };

  // Handle map tap to add marker in live mode
  const handleMapPress = async (e) => {
    if (mode !== 'live') return;

    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude, longitude });

    // Animate map to new location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 500);
    }

    // Get location name
    const locName = await getLocationName(latitude, longitude);

    // Save to live location
    const newLiveLocation = {
      coordinate: { latitude, longitude },
      title: 'Live Training Location',
      locationName: locName || locationName,
      updatedAt: new Date().toISOString(),
    };

    await setLiveTrainingLocation(newLiveLocation);
    setLiveLocation(newLiveLocation);

    // Clear old images when location changes
    setLiveTrainingImages([]);

    // Show event form modal
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setEventData({
      ...eventData,
      title: '',
      description: '',
      capacity: '',
      startDate: today,
      endDate: today,
      startTime: today,
      endTime: today,
      venue: locName || locationName,
    });
    setEndDateText(today.toISOString().split('T')[0]); // Initialize local text state
    setShowEventForm(true);
  };

  const handleMarkerDragEnd = async (e) => {
    if (mode !== 'live') return;

    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude, longitude });

    // Animate map to follow the marker
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 500);
    }

    // Get location name
    const locName = await getLocationName(latitude, longitude);

    // Save to live location
    const newLiveLocation = {
      coordinate: { latitude, longitude },
      title: 'Live Training Location',
      locationName: locName || locationName,
      updatedAt: new Date().toISOString(),
    };

    await setLiveTrainingLocation(newLiveLocation);
    setLiveLocation(newLiveLocation);

    // Clear old images when location changes
    setLiveTrainingImages([]);

    // Show training form modal
    setShowTrainingForm(true);
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setTrainingImages([...trainingImages, ...result.assets]);
    }
  };

  const removeImage = (index) => {
    setTrainingImages(trainingImages.filter((_, i) => i !== index));
  };

  // Image Viewer Functions
  const openImageViewer = (images, index) => {
    setCurrentImages(images);
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const downloadImage = async (imageUrl) => {
    try {
      const fileName = `training_image_${Date.now()}.jpg`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);

      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Save Image',
      });

      Alert.alert('Success', 'Image saved to device!');
    } catch (error) {
      console.log('Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image');
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (dateMode === 'start') {
        const newStartDate = selectedDate;
        setEventData(prev => ({ ...prev, startDate: newStartDate }));

        // Force endDate to be at least startDate if it's currently earlier
        if (eventData.endDate < newStartDate) {
          setEventData(prev => ({ ...prev, endDate: newStartDate }));
          setEndDateText(newStartDate.toISOString().split('T')[0]);
        }
      } else {
        setEventData(prev => ({ ...prev, endDate: selectedDate }));
        setEndDateText(selectedDate.toISOString().split('T')[0]); // Sync manual input text
      }
    }
  };

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      if (timeMode === 'start') {
        setEventData({ ...eventData, startTime: selectedDate });
      } else {
        setEventData({ ...eventData, endTime: selectedDate });
      }
    }
  };

  const pickDocument = async () => {
    try {
      console.log('📄 MapScreen: Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      console.log('📄 MapScreen: Document picker result:', JSON.stringify(result, null, 2));

      // New API: Check for canceled instead of type === 'success'
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || 'application/pdf',
          type: asset.mimeType || 'application/pdf'
        }));
        console.log('✅ MapScreen: Adding files:', newFiles);
        setUploadedFiles([...uploadedFiles, ...newFiles]);
        Alert.alert('Success', `${newFiles.length} document(s) added!`);
      } else {
        console.log('⚠️ MapScreen: Document picker canceled');
      }
    } catch (error) {
      console.error('❌ MapScreen: Document picker error:', error);
      Alert.alert('Error', `Failed to pick document: ${error.message}`);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleCreateEvent = async () => {
    try {
      // Validate required fields
      if (!eventData.title || !eventData.description || !eventData.capacity) {
        Alert.alert('Error', 'Please fill in Title, Description and Capacity');
        return;
      }

      setUploading(true);

      // Upload images to GCS (Optional for events, but good to have)
      const uploadedImageUrls = [];
      for (const image of trainingImages) { // reusing trainingImages state for event images
        const fileName = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const url = await uploadToGCS(image.uri, 'event-images', fileName, 'image/jpeg');
        uploadedImageUrls.push(url);
      }

      // Format times
      const formatTime = (dateObj) => {
        return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
      };

      // Ensure endDate is valid
      const startDate = new Date(eventData.startDate);
      const endDate = new Date(eventData.endDate);

      // Normalize dates to start of day for accurate comparison (ignore time)
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(endDate);
      eDate.setHours(0, 0, 0, 0);

      // Validate order
      if (eDate < sDate) {
        Alert.alert('Invalid Date', 'End Date must be after Start Date');
        setUploading(false);
        return;
      }

      // If dates are the same, set endDate to end of day to satisfy backend
      if (eDate.getTime() === sDate.getTime()) {
        endDate.setHours(23, 59, 59, 999);
      }

      const newEvent = {
        title: eventData.title,
        theme: eventData.theme, // Default or selected
        description: eventData.description,
        capacity: Number(eventData.capacity),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        defaultStartTime: formatTime(eventData.startTime),
        defaultEndTime: formatTime(eventData.endTime),
        type: eventData.type,
        venue: locationName || 'Map Location',
        latitude: Number(markerCoord.latitude),
        longitude: Number(markerCoord.longitude),
        onlineLink: eventData.onlineLink,
        // photos: uploadedImageUrls, // Backend doesn't support photos in schema
      };

      console.log('📤 MapScreen: Creating event:', newEvent);
      const result = await eventService.createEvent(newEvent);

      if (result.success) {
        console.log('✅ MapScreen: Event created successfully!');
        Alert.alert('Success', 'Event created successfully! Code: ' + (result.event?.code || ''));

        setShowEventForm(false);
        setEventData({ // Reset
          title: '',
          theme: 'Disaster Management',
          description: '',
          capacity: '',
          startDate: new Date(),
          endDate: new Date(),
          startTime: new Date(),
          endTime: new Date(),
          type: 'in-person',
          onlineLink: '',
        });
        setTrainingImages([]);

        // Refresh map data to show new event (if we were fetching events)
        // await loadData(); 
      } else {
        console.error('❌ MapScreen: Failed to create event:', result.error);
        Alert.alert('Error', result.error || 'Failed to create event');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(error);
      setUploading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      if (!eventData.title || !eventData.description || !eventData.capacity) {
        Alert.alert('Error', 'Please fill in Title, Description and Participants');
        return;
      }

      setUploading(true);

      // Upload images
      const uploadedImageUrls = [];
      for (const image of trainingImages) {
        const fileName = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const url = await uploadToGCS(image.uri, 'training-reports', fileName, 'image/jpeg');
        uploadedImageUrls.push(url);
      }

      // Upload files
      const uploadedFileObjects = [];
      // Note: File upload logic for GCS would go here similar to images if needed, 
      // for now assuming we just store metadata or skip deep file upload implementation for brevity
      // unless user provided uploadToGCS supports generic files.

      const reportData = {
        userId: user?.id || 'unknown',
        userName: user?.name || user?.username || 'Trainer',
        trainingTitle: eventData.title,
        trainingType: eventData.theme,
        date: eventData.startDate.toISOString(),
        duration: '2 hours', // Default or calc from start/end time
        description: eventData.description,
        participants: eventData.capacity,
        location: {
          latitude: Number(markerCoord.latitude),
          longitude: Number(markerCoord.longitude)
        },
        locationName: locationName || 'Map Location',
        photos: uploadedImageUrls,
        files: uploadedFiles,
        completionRate: '100', // Default for new report
        attendanceRate: '100',
        feedbackScore: '10',
        practicalScore: '100',
        status: 'submitted'
      };

      console.log('📤 MapScreen: Creating report:', reportData);
      const result = await ReportsService.createReport(reportData);

      if (result.success) {
        console.log('✅ MapScreen: Report created successfully!');
        Alert.alert('Success', 'Training Report submitted successfully!');
        setShowEventForm(false);
        // Reset form
        setEventData({
          title: '',
          theme: 'Disaster Management',
          description: '',
          capacity: '',
          startDate: new Date(),
          endDate: new Date(),
          startTime: new Date(),
          endTime: new Date(),
          type: 'in-person',
          onlineLink: '',
        });
        setTrainingImages([]);
        setUploadedFiles([]);

        // Refresh reports
        loadData();
      } else {
        console.error('❌ MapScreen: Failed to create report:', result.error);
        Alert.alert('Error', result.error || 'Failed to create report');
      }

    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred creating report');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };



  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'Disaster Management Training App',
          },
        }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.log('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const newCoord = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
    setMarkerCoord(newCoord);
    setLocationName(result.display_name);
    setSearchQuery('');
    setSearchResults([]);

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...newCoord,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 500);
    }
  };

  const renderMarkers = () => {
    const markers = [];

    // User's live location (blue dot)
    if (userLiveLocation) {
      markers.push(
        <Marker
          key="user_live_location"
          coordinate={userLiveLocation}
          title="Your Location"
          description="Your current location"
        >
          <View style={styles.userLocationMarker}>
            <View style={styles.userLocationDot} />
          </View>
        </Marker>
      );
    }

    // Training Reports (saved trainings - custom pins with images)
    // In 'live' mode, only show current/recent trainings (today)
    // In 'previous' and 'manual' modes, show all trainings
    if (Array.isArray(trainingReports) && trainingReports.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

      trainingReports.forEach((report) => {
        if (report && report.location) {
          // Filter for live mode - only show today's trainings
          if (mode === 'live') {
            try {
              if (!report.date) {
                return; // Skip if no date
              }

              const reportDate = new Date(report.date);
              reportDate.setHours(0, 0, 0, 0); // Reset to start of day

              // Only show trainings from today
              if (reportDate.getTime() !== today.getTime()) {
                return; // Skip non-today trainings in live mode
              }
            } catch (error) {
              console.log('Date parsing error:', error);
              return;
            }
          }

          // Skip live mode trainings in 'previous' mode
          if (mode === 'previous') {
            try {
              if (!report.date) {
                return;
              }

              const reportDate = new Date(report.date);
              reportDate.setHours(0, 0, 0, 0);

              // Only show trainings before today
              if (reportDate.getTime() >= today.getTime()) {
                return; // Skip today's trainings in previous mode
              }
            } catch (error) {
              console.log('Date parsing error:', error);
              return;
            }
          }

          markers.push(
            <Marker
              key={`report_${report.id}`}
              coordinate={report.location}
              onPress={() => {
                setSelectedTraining(report);
                setShowDetailModal(true);
              }}
            >
              {report.images && report.images.length > 0 ? (
                // Custom pin with first image
                <View style={styles.customImageMarker}>
                  <Image
                    source={{ uri: report.images[0] }}
                    style={styles.markerImage}
                    resizeMode="cover"
                  />
                  {report.images.length > 1 && (
                    <View style={styles.imageCountBadge}>
                      <Text style={styles.imageCountText}>{report.images.length}</Text>
                    </View>
                  )}
                  <View style={styles.markerPointer} />
                </View>
              ) : (
                // Default school icon if no images
                <View style={[styles.customMarker, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="school" size={20} color="#FFFFFF" />
                </View>
              )}
            </Marker>
          );
        }
      });
    }

    if (mode === 'live') {
      markers.push(
        <Marker
          key="live_training"
          coordinate={markerCoord}
          title="Live Training Location"
          description={locationName}
          draggable
          onDragEnd={handleMarkerDragEnd}
          pinColor="#0056D2"
        />
      );
    }

    if (mode === 'previous') {
      previousLocations.forEach((loc, idx) => {
        markers.push(
          <Marker
            key={`prev_${idx}`}
            coordinate={loc.coordinate}
            title={loc.title || 'Previous Training'}
            description={`Archived: ${new Date(loc.archivedAt).toLocaleDateString()}`}
            pinColor="#F57C00"
          />
        );
      });
    }

    // Manual mode: show all trainings from seed + local
    // Manual mode: show all trainings from seed + local
    if (mode === 'manual') {
      trainings.forEach(t => {
        markers.push(
          <Marker
            key={t.id}
            coordinate={{ latitude: t.location.latitude, longitude: t.location.longitude }}
            title={t.title}
            description={`${t.date} • ${t.district} • Trainer: ${t.trainerName} • Participants: ${t.participants}`}
            pinColor={statusColors[t.status] || '#0056D2'}
          />
        );
      });
    }

    // Render events from Dashboard (backend)
    // Show in 'dashboard' mode or 'live' mode
    if (mode === 'dashboard' || mode === 'live') {
      const { upcoming, past, recommended } = dashboardEvents;

      const renderEventSet = (events, color, typeLabel) => {
        return events.map((event, idx) => {
          if (!event.location || !event.location.coordinates) return null;

          // GeoJSON is [lng, lat], MapView needs {latitude, longitude}
          const lat = event.location.coordinates[1];
          const lng = event.location.coordinates[0];

          return (
            <Marker
              key={`${typeLabel}_${event._id || idx}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={event.title}
              description={`${typeLabel} • ${new Date(event.startDate).toLocaleDateString()}`}
              pinColor={color}
            >
              <View style={[styles.dashboardMarker, { borderColor: color }]}>
                <Ionicons name="calendar" size={16} color={color} />
              </View>
            </Marker>
          );
        });
      };

      if (upcoming) markers.push(...renderEventSet(upcoming, '#10B981', 'Upcoming').filter(Boolean));
      if (recommended) markers.push(...renderEventSet(recommended, '#805AD5', 'Recommended').filter(Boolean));
    }

    return markers;
  };

  const initialRegion = {
    latitude: markerCoord.latitude,
    longitude: markerCoord.longitude,
    latitudeDelta: 3.5,
    longitudeDelta: 3.5,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Training Coverage Map</Text>
      </View>

      {mode === 'live' && (
        <View style={styles.instructionBanner}>
          <View style={styles.instructionContent}>
            <Ionicons name="location" size={20} color="#1A365D" />
            <Text style={styles.instructionText}>
              {isLoadingLocation ? 'Getting location...' : locationName}
            </Text>
          </View>
          <Text style={styles.instructionSubtext}>Tap anywhere on map to add training location</Text>
        </View>
      )}

      {/* Mark Current Location Button */}
      {
        mode === 'live' && userLiveLocation && (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.markLocationButton}
              onPress={async () => {
                setMarkerCoord(userLiveLocation);
                if (mapRef.current) {
                  mapRef.current.animateToRegion({
                    ...userLiveLocation,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }, 500);
                }
                const locName = await getLocationName(userLiveLocation.latitude, userLiveLocation.longitude);

                // Save to live location
                const newLiveLocation = {
                  coordinate: userLiveLocation,
                  title: 'Live Training Location',
                  locationName: locName || locationName,
                  updatedAt: new Date().toISOString(),
                };
                await setLiveTrainingLocation(newLiveLocation);
                setLiveLocation(newLiveLocation);

                // Open event form
                setShowEventForm(true);
              }}
            >
              <Ionicons name="navigate-circle" size={24} color="#FFFFFF" />
              <Text style={styles.markLocationButtonText}>Mark Current Location as Live</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attendanceButton}
              onPress={() => {
                if (!liveLocation) {
                  Alert.alert('No Live Location', 'Please mark your current location first');
                  return;
                }
                // Navigate to attendance session screen
                Alert.alert(
                  'Start Attendance',
                  'Would you like to start an attendance session at this location?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Start',
                      onPress: () => {
                        // Navigate to AttendanceSessionScreen with live location
                        const trainingId = `training-${Date.now()}`;
                        navigation.navigate('AttendanceSession', {
                          trainingId: trainingId,
                          trainingType: liveLocation?.trainingType || 'Disaster Management Training',
                          location: liveLocation || {
                            locationName: 'Current Location',
                            lat: initialRegion.latitude,
                            lng: initialRegion.longitude,
                          }
                        });
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="qr-code" size={24} color="#FFFFFF" />
              <Text style={styles.attendanceButtonText}>Start Attendance</Text>
            </TouchableOpacity>
          </View>
        )
      }

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType={mapType}
          initialRegion={initialRegion}
          onPress={handleMapPress}
        >
          {renderMarkers()}
        </MapView>

        {/* Map Type Toggle Button */}
        <TouchableOpacity
          style={styles.mapTypeButton}
          onPress={() => {
            if (mapType === 'standard') setMapType('satellite');
            else if (mapType === 'satellite') setMapType('hybrid');
            else setMapType('standard');
          }}
        >
          <Ionicons name="layers-outline" size={20} color="#2C5282" />
          <Text style={styles.mapTypeText}>
            {mapType === 'standard' ? 'Standard' : mapType === 'satellite' ? 'Satellite' : 'Hybrid'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Event Modal */}
      <Modal
        visible={showEventForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEventForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Event</Text>
              <TouchableOpacity onPress={() => setShowEventForm(false)}>
                <Ionicons name="close-circle" size={28} color="#718096" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>

              {/* Form Type Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleBtn, formType === 'event' && styles.toggleBtnActive]}
                  onPress={() => setFormType('event')}
                >
                  <Text style={[styles.toggleBtnText, formType === 'event' && styles.toggleBtnTextActive]}>New Event</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, formType === 'report' && styles.toggleBtnActive]}
                  onPress={() => setFormType('report')}
                >
                  <Text style={[styles.toggleBtnText, formType === 'report' && styles.toggleBtnTextActive]}>New Report</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formSectionTitle}>
                {formType === 'event' ? 'Create New Event' : 'Submit Training Report'}
              </Text>

              <Text style={styles.inputLabel}>Event Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flood Relief Workshop"
                value={eventData.title}
                onChangeText={(text) => setEventData({ ...eventData, title: text })}
              />

              <Text style={styles.inputLabel}>Event Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the event, agenda, etc."
                multiline
                numberOfLines={3}
                value={eventData.description}
                onChangeText={(text) => setEventData({ ...eventData, description: text })}
              />

              <Text style={styles.inputLabel}>Max Capacity / Participants *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 100"
                keyboardType="numeric"
                value={eventData.capacity}
                onChangeText={(text) => setEventData({ ...eventData, capacity: text })}
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="YYYY-MM-DD"
                  value={eventData.startDate.toISOString().split('T')[0]}
                  onChangeText={(text) => {
                    const parts = text.split('-');
                    if (parts.length === 3) {
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]) - 1;
                      const day = parseInt(parts[2]);
                      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                        const date = new Date(year, month, day);
                        if (!isNaN(date.getTime())) {
                          setEventData({ ...eventData, startDate: date, endDate: date });
                        }
                      }
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => { setDateMode('start'); setShowDatePicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={24} color="#0056D2" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="YYYY-MM-DD"
                  value={endDateText}
                  onChangeText={(text) => {
                    setEndDateText(text);
                    if (text.length === 10) {
                      const parts = text.split('-');
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]) - 1;
                      const day = parseInt(parts[2]);
                      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                        const date = new Date(year, month, day);
                        if (!isNaN(date.getTime())) {
                          setEventData({ ...eventData, endDate: date });
                        }
                      }
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => { setDateMode('end'); setShowDatePicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={24} color="#0056D2" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailHalf}>
                  <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 4 }]}
                      placeholder="09:00"
                      value={eventData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      onChangeText={(text) => {
                        const parts = text.split(':');
                        if (parts.length === 2) {
                          const date = new Date(eventData.startTime);
                          date.setHours(parseInt(parts[0]), parseInt(parts[1]));
                          if (!isNaN(date.getTime())) {
                            setEventData({ ...eventData, startTime: date });
                          }
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => { setTimeMode('start'); setShowTimePicker(true); }}
                    >
                      <Ionicons name="time-outline" size={24} color="#0056D2" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.detailHalf}>
                  <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 4 }]}
                      placeholder="17:00"
                      value={eventData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      onChangeText={(text) => {
                        const parts = text.split(':');
                        if (parts.length === 2) {
                          const date = new Date(eventData.endTime);
                          date.setHours(parseInt(parts[0]), parseInt(parts[1]));
                          if (!isNaN(date.getTime())) {
                            setEventData({ ...eventData, endTime: date });
                          }
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => { setTimeMode('end'); setShowTimePicker(true); }}
                    >
                      <Ionicons name="time-outline" size={24} color="#0056D2" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Event Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={eventData.type}
                  onValueChange={(value) => setEventData({ ...eventData, type: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="In-Person" value="in-person" />
                  <Picker.Item label="Online" value="online" />
                  <Picker.Item label="Hybrid" value="hybrid" />
                </Picker>
              </View>

              {(eventData.type === 'online' || eventData.type === 'hybrid') && (
                <>
                  <Text style={styles.inputLabel}>Online Meeting Link *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://meet.google.com/..."
                    value={eventData.onlineLink}
                    onChangeText={(text) => setEventData({ ...eventData, onlineLink: text })}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Event Theme</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={eventData.theme}
                  onValueChange={(value) => setEventData({ ...eventData, theme: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Disaster Management" value="Disaster Management" />
                  <Picker.Item label="First Aid" value="First Aid" />
                  <Picker.Item label="Fire Safety" value="Fire Safety" />
                  <Picker.Item label="Search & Rescue" value="Search & Rescue" />
                  <Picker.Item label="Flood" value="Flood" />
                  <Picker.Item label="Earthquake" value="Earthquake" />
                </Picker>
              </View>

              {/* Image Gallery Section (Optional) */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Event Banner/Images</Text>
                  <TouchableOpacity onPress={pickImages}>
                    <Ionicons name="add-circle" size={28} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                {trainingImages.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {trainingImages.map((img, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                        <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {showDatePicker && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={dateMode === 'start' ? eventData.startDate : eventData.endDate}
                  mode="date"
                  is24Hour={true}
                  display="default"
                  onChange={onDateChange}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  testID="timePicker"
                  value={timeMode === 'start' ? eventData.startTime : eventData.endTime}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onTimeChange}
                />
              )}

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEventForm(false)}
                  disabled={uploading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, uploading && { opacity: 0.6 }]}
                  onPress={formType === 'event' ? handleCreateEvent : handleCreateReport}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>{formType === 'event' ? 'Creating...' : 'Submitting...'}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name={formType === 'event' ? "calendar" : "document-text"} size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>{formType === 'event' ? 'Create Event' : 'Submit Report'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Training Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Training Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color="#1A365D" />
              </TouchableOpacity>
            </View>

            {selectedTraining && (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Training Title</Text>
                  <Text style={styles.detailValue}>{selectedTraining.trainingTitle}</Text>
                </View>

                {/* Basic Info */}
                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Participants</Text>
                    <Text style={styles.detailValue}>{selectedTraining.participants}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedTraining.duration}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Training Type</Text>
                    <Text style={styles.detailValue}>{selectedTraining.trainingType}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedTraining.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Metrics */}
                {selectedTraining.completionRate && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Completion Rate</Text>
                    <Text style={styles.detailValue}>{selectedTraining.completionRate}%</Text>
                  </View>
                )}

                {selectedTraining.attendanceRate && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Attendance Rate</Text>
                    <Text style={styles.detailValue}>{selectedTraining.attendanceRate}%</Text>
                  </View>
                )}

                {selectedTraining.feedbackScore && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Feedback Score</Text>
                    <Text style={styles.detailValue}>{selectedTraining.feedbackScore}/10</Text>
                  </View>
                )}

                {selectedTraining.practicalScore && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Practical Assessment Score</Text>
                    <Text style={styles.detailValue}>{selectedTraining.practicalScore}%</Text>
                  </View>
                )}

                {/* Location */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedTraining.locationName || 'N/A'}</Text>
                </View>

                {/* Submitted By */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Submitted By</Text>
                  <Text style={styles.detailValue}>{selectedTraining.submittedBy || 'Unknown'}</Text>
                </View>

                {/* Notes */}
                {selectedTraining.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Additional Notes</Text>
                    <Text style={styles.detailValue}>{selectedTraining.notes}</Text>
                  </View>
                )}

                {/* Images */}
                {selectedTraining.images && selectedTraining.images.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Training Images ({selectedTraining.images.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                      {selectedTraining.images.map((imgUrl, idx) => (
                        <View key={idx} style={styles.detailImageContainer}>
                          <Image source={{ uri: imgUrl }} style={styles.detailImage} />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Files */}
                {selectedTraining.files && selectedTraining.files.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Attached Files ({selectedTraining.files.length})</Text>
                    {selectedTraining.files.map((file, idx) => (
                      <View key={idx} style={styles.detailFileItem}>
                        <Ionicons
                          name={file.type?.includes('pdf') ? 'document' : 'document-text'}
                          size={24}
                          color="#10B981"
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.detailFileName}>{file.name}</Text>
                          {file.size && <Text style={styles.detailFileSize}>{(file.size / 1024).toFixed(2)} KB</Text>}
                        </View>
                        <TouchableOpacity
                          onPress={async () => {
                            if (file.url) {
                              try {
                                const supported = await Linking.canOpenURL(file.url);
                                if (supported) {
                                  await Linking.openURL(file.url);
                                } else {
                                  Alert.alert('Error', 'Cannot open this file type');
                                }
                              } catch (error) {
                                Alert.alert('Error', 'Failed to open file');
                              }
                            }
                          }}
                          style={styles.fileActionBtn}
                        >
                          <Ionicons name="open-outline" size={20} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal >

      {/* Image Viewer Modal */}
      < Modal visible={showImageViewer} transparent={true} animationType="fade" >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <Ionicons name="close-circle" size={40} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedImageIndex * 400, y: 0 }}
            style={styles.imageViewerScroll}
          >
            {currentImages.map((img, idx) => (
              <View key={idx} style={styles.imageViewerPage}>
                <Image
                  source={{ uri: img }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.imageViewerActions}>
            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={() => downloadImage(currentImages[selectedImageIndex])}
            >
              <Ionicons name="download" size={24} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', marginLeft: 8, fontWeight: '600' }}>Download</Text>
            </TouchableOpacity>

            <Text style={styles.imageCounter}>
              {selectedImageIndex + 1} / {currentImages.length}
            </Text>

            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={() => Sharing.shareAsync(currentImages[selectedImageIndex])}
            >
              <Ionicons name="share-social" size={24} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', marginLeft: 8, fontWeight: '600' }}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal >

      {/* Import Legacy Data Modal */}
      < ImportLegacyDataModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          loadData(); // Reload data after successful import
        }}
      />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#0056D2' },
  // Search Bar
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
  },
  searchResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A365D',
    letterSpacing: 0.3,
  },
  pickerWrapper: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    overflow: 'hidden',
    minHeight: 55,
    justifyContent: 'center',
  },
  picker: {
    height: 55,
    width: '100%',
    color: '#2D3748',
    fontSize: 16,
  },
  pickerItem: {
    fontSize: 16,
    height: 55,
    color: '#2D3748',
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
  },
  instructionBanner: {
    backgroundColor: '#EBF8FF',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  instructionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#1A365D',
    fontWeight: '600',
    flex: 1,
  },
  instructionSubtext: {
    fontSize: 12,
    color: '#4299E1',
    marginLeft: 28,
  },
  mapContainer: { flex: 1, marginTop: 10, paddingHorizontal: 12, paddingBottom: 12, position: 'relative' },
  map: { flex: 1, borderRadius: 16 },
  mapTypeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapTypeText: {
    marginLeft: 6,
    color: '#2C5282',
    fontWeight: '600',
    fontSize: 13,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 4
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096'
  },
  toggleBtnTextActive: {
    color: '#0056D2'
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
    maxHeight: '90%',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#1A365D',
  },
  formScroll: {
    maxHeight: '85%',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A365D',
    marginTop: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3748',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#38A169',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Image Gallery Styles
  formGroup: {
    marginTop: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageScroll: {
    marginTop: 8,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  // File Upload Styles
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  fileSize: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  // User Location Marker Styles
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  // Custom Marker (School Icon)
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Training Detail Modal Styles
  detailModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  detailScroll: {
    maxHeight: '85%',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailHalf: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A365D',
  },
  detailImageContainer: {
    marginRight: 12,
  },
  detailImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  detailFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  detailFileSize: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  fileActionBtn: {
    padding: 8,
    marginLeft: 8,
  },
  // Custom Image Marker Styles
  customImageMarker: {
    width: 60,
    height: 70,
    alignItems: 'center',
  },
  markerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  imageCountBadge: {
    position: 'absolute',
    top: -5,
    right: 5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  imageCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -3,
  },
  // Mark Location Button Styles
  actionButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  markLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markLocationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageViewerPage: {
    width: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  fullImage: {
    width: 380,
    height: 500,
    borderRadius: 10,
  },
  imageViewerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dashboardMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});


