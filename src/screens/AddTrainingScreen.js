import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Dimensions, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLiveTrainingLocation, getPreviousTrainingLocations, getTrainingReports } from '../services/storage';
import { uploadToGCS } from '../utils/gcsHelper';
import ReportsService from '../services/ReportsService';
import AnimatedMapPin from '../components/AnimatedMapPin';

const { width } = Dimensions.get('window');

const TRAINING_TYPES = ['Flood Response', 'Earthquake Drill', 'Fire Safety', 'First Aid', 'Cyclone Preparedness', 'Search & Rescue', 'Other'];
const EFFECTIVENESS_OPTIONS = ['Excellent', 'Good', 'Average', 'Poor'];

const AddTrainingScreen = ({ route, navigation }) => {
  const [userName, setUserName] = useState('Trainer');
  const [userId, setUserId] = useState(null);
  const editReport = route?.params?.editReport || null;
  const isEditMode = !!editReport;
  
  const mapRef = useRef(null);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [previousLocations, setPreviousLocations] = useState([]);
  const [manualMarker, setManualMarker] = useState(null);
  const [trainingType, setTrainingType] = useState('');
  const [participants, setParticipants] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveness, setEffectiveness] = useState('');
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showEffectivenessDropdown, setShowEffectivenessDropdown] = useState(false);
  const [trainingImages, setTrainingImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [trainingPoints, setTrainingPoints] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showTrainingDetailModal, setShowTrainingDetailModal] = useState(false);
  const [attendanceSessionToken, setAttendanceSessionToken] = useState(null);
  const [attendanceLinked, setAttendanceLinked] = useState(false);

  useEffect(() => {
    loadUserData();
    loadLocations();
    loadTrainingPoints();
    
    // Check if attendance session token was passed from AttendanceSession
    if (route?.params?.session_token) {
      console.log('📋 Attendance session token received:', route.params.session_token);
      setAttendanceSessionToken(route.params.session_token);
      setAttendanceLinked(true);
      Alert.alert('Attendance Linked!', 'This training report will include live attendance data.');
    }
    
    // Populate form if editing
    if (isEditMode && editReport) {
      console.log('📝 Edit mode - Loading report data:', JSON.stringify(editReport, null, 2));
      Alert.alert('Edit Mode', `Loading report: ${editReport.description || 'No description'}`);
      
      setTrainingType(editReport.trainingType || '');
      setParticipants(editReport.participants?.toString() || '');
      setDuration(editReport.duration || '');
      setDescription(editReport.description || '');
      setEffectiveness(editReport.effectiveness || '');
      setTrainingDate(editReport.date || new Date().toISOString().split('T')[0]);
      
      // Set location if available
      if (editReport.location) {
        const locationCoord = {
          latitude: editReport.location.latitude,
          longitude: editReport.location.longitude,
        };
        
        setSelectedLocation({
          name: editReport.location.name,
          coordinate: locationCoord
        });
        setManualMarker(locationCoord);
        
        // Animate map to location after a short delay
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: locationCoord.latitude,
              longitude: locationCoord.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 1000);
          }
        }, 500);
      }
      
      // Set photos
      if (editReport.photos && editReport.photos.length > 0) {
        setTrainingImages(editReport.photos.map(url => ({ uri: url, name: 'photo.jpg' })));
      }
      
      // Set documents
      if (editReport.documents && editReport.documents.length > 0) {
        setUploadedFiles(editReport.documents.map(doc => ({
          uri: doc.url,
          name: doc.name || 'document.pdf',
          type: doc.type || 'application/pdf'
        })));
      }
    }
  }, []);

  const loadUserData = async () => {
    try {
      if (route?.params?.user) {
        setUserName(route.params.user.name || 'Trainer');
        setUserId(route.params.user.id || route.params.user._id);
        return;
      }

      const [sessionUser, userData] = await Promise.all([
        AsyncStorage.getItem('@ndma_session_user'),
        AsyncStorage.getItem('userData'),
      ]);

      if (sessionUser) {
        const user = JSON.parse(sessionUser);
        setUserName(user.name || 'Trainer');
        setUserId(user.id || user._id);
      } else if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Trainer');
        setUserId(user.id || user._id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserName('Trainer');
    }
  };

  const loadLocations = async () => {
    try {
      const live = await getLiveTrainingLocation();
      const previous = await getPreviousTrainingLocations();
      if (live) setLiveLocation(live);
      if (previous && previous.length > 0) setPreviousLocations(previous);
    } catch (error) {
      console.log('Error loading locations:', error);
    }
  };

  const loadTrainingPoints = async () => {
    try {
      console.log('📍 Loading training points from cloud...');
      // Try to load from cloud first
      const result = await ReportsService.getUserReports();
      
      let trainings = [];
      if (result.success && result.reports) {
        trainings = result.reports;
        console.log(`✅ Loaded ${trainings.length} reports from cloud`);
      } else {
        console.log('⚠️ Failed to load from cloud, trying local storage...');
        // Fallback to local storage
        trainings = await getTrainingReports();
        console.log(`✅ Loaded ${trainings.length} reports from local storage`);
      }

      if (trainings && trainings.length > 0) {
        const points = trainings
          .filter(t => t.location && t.location.latitude && t.location.longitude)
          .map(t => ({
            id: t._id || t.id,
            coordinate: {
              latitude: t.location.latitude,
              longitude: t.location.longitude,
            },
            title: t.trainingType || 'Training',
            fullData: t,
          }));
        setTrainingPoints(points);
        console.log('✅ Loaded training points:', points.length);
      }
    } catch (error) {
      console.log('❌ Error loading training points:', error);
    }
  };

  const handleMapPress = (e) => {
    const coordinate = e.nativeEvent.coordinate;
    setManualMarker(coordinate);
    setSelectedLocation({ type: 'manual', coordinate, name: 'Dropped Pin' });
    setShowPinModal(true);
  };

  const selectLiveLocation = () => {
    if (liveLocation) {
      setSelectedLocation({ type: 'live', coordinate: liveLocation.coordinate, name: 'Live Location' });
      setShowPinModal(true);
    }
  };

  const selectPreviousLocation = (loc) => {
    setSelectedLocation({ type: 'previous', coordinate: loc.coordinate, name: loc.name || 'Previous Location' });
    setShowPinModal(true);
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
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

  const pickDocument = async () => {
    try {
      console.log('📄 Opening document picker...');
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
      
      console.log('📄 Document picker result:', JSON.stringify(result, null, 2));
      
      // New API: Check for canceled instead of type === 'success'
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || 'application/pdf',
          type: asset.mimeType || 'application/pdf'
        }));
        console.log('✅ Adding files:', newFiles);
        setUploadedFiles([...uploadedFiles, ...newFiles]);
        Alert.alert('Success', `${newFiles.length} document(s) added!`);
      } else {
        console.log('⚠️ Document picker canceled or no files selected');
      }
    } catch (error) {
      console.error('❌ Document picker error:', error);
      Alert.alert('Error', `Failed to pick document: ${error.message}`);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    // Only location and training type are required
    if (activeTab === 'map' && !selectedLocation) {
      Alert.alert('Error', 'Please select a location on map');
      return false;
    }
    if (!trainingType) {
      Alert.alert('Error', 'Training type is required');
      return false;
    }
    // All other fields are optional!
    return true;
  };

  const saveTraining = async () => {
    console.log("--- AddTrainingScreen: Starting to save training ---");
    
    if (!validateForm()) {
      return;
    }

    setUploading(true);
    try {
      console.log("--- AddTrainingScreen: Uploading files to GCS ---");
      const photoUrls = await uploadFiles(trainingImages, 'photos');
      const documentUrls = await uploadFiles(uploadedFiles, 'documents');
      console.log("--- AddTrainingScreen: GCS Upload complete ---", { photoUrls, documentUrls });

      // Get user info from route params - NO AsyncStorage!
      const userName = user?.name || editReport?.userName || 'Unknown';
      const userEmail = user?.email || editReport?.userEmail || 'unknown@example.com';
      console.log("--- AddTrainingScreen: User info ---", { userName, userEmail });

      const reportData = {
        userName: userName,
        userEmail: userEmail,
        trainingType,
        location: {
          name: selectedLocation.name,
          latitude: selectedLocation.coordinate.latitude,
          longitude: selectedLocation.coordinate.longitude,
        },
        date: trainingDate,
        participants: participants ? Number(participants) : 0,
        duration: duration || '',
        description: description || '',
        effectiveness: effectiveness || '',
        photos: photoUrls || [],
        documents: documentUrls || [], // Already in correct format from uploadFiles
        ...(attendanceSessionToken && { session_token: attendanceSessionToken }) // Include attendance token if available
      };

      let result;
      if (isEditMode) {
        console.log("--- AddTrainingScreen: Calling ReportsService.updateReport with data ---", JSON.stringify(reportData, null, 2));
        result = await ReportsService.updateReport(editReport._id, reportData);
      } else {
        console.log("--- AddTrainingScreen: Calling ReportsService.createReport with data ---", JSON.stringify(reportData, null, 2));
        result = await ReportsService.createReport(reportData);
      }
      
      if (result.success) {
        console.log(`--- AddTrainingScreen: Report ${isEditMode ? 'update' : 'creation'} successful ---`);
        Alert.alert("Success", `Training report ${isEditMode ? 'updated' : 'saved'} successfully!`);
        // Clear form and navigate back
        setTrainingType('');
        setParticipants('');
        setDuration('');
        setDescription('');
        setEffectiveness('');
        setTrainingImages([]);
        setUploadedFiles([]);
        setSelectedLocation(null);
        setManualMarker(null);
        navigation.goBack();
      } else {
        throw new Error(result.error || "The server rejected the report.");
      }
    } catch (error) {
      console.error("❌ AddTrainingScreen: Error saving training:", error);
      Alert.alert("Error", `Failed to save training report: ${error.message}`);
    } finally {
      setUploading(false);
      console.log("--- AddTrainingScreen: Finished saving training ---");
    }
  };

  const uploadFiles = async (files, type) => {
    const uploadedUrls = [];
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop();
        const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const url = await uploadToGCS(file.uri, `training-${type}`, fileName, file.mimeType || file.type);
        
        if (type === 'documents') {
          // For documents, return object with url, name, type
          uploadedUrls.push({
            url: url,
            name: file.name,
            type: file.mimeType || file.type || 'application/pdf',
            size: file.size
          });
        } else {
          // For photos, just return URL string
          uploadedUrls.push(url);
        }
        
        console.log(`✅ ${type === 'photos' ? 'Image' : 'Document'} uploaded:`, fileName);
      } catch (error) {
        console.error(`❌ Error uploading ${type === 'photos' ? 'image' : 'document'}:`, error);
      }
    }
    return uploadedUrls;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Training Report' : 'Add Training Report'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <Ionicons name="map" size={20} color={activeTab === 'map' ? '#007AFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>Map Location</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
          onPress={() => setActiveTab('manual')}
        >
          <Ionicons name="create" size={20} color={activeTab === 'manual' ? '#007AFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>Manual Entry</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'map' ? (
          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: 20.5937,
                longitude: 78.9629,
                latitudeDelta: 20,
                longitudeDelta: 20,
              }}
              onPress={handleMapPress}
            >
              {liveLocation && (
                <Marker coordinate={liveLocation.coordinate} onPress={selectLiveLocation}>
                  <View style={[styles.marker, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="radio" size={20} color="#FFFFFF" />
                  </View>
                </Marker>
              )}
              {previousLocations.map((loc, index) => (
                <Marker key={index} coordinate={loc.coordinate} onPress={() => selectPreviousLocation(loc)}>
                  <View style={[styles.marker, { backgroundColor: '#6B7280' }]}>
                    <Ionicons name="location" size={20} color="#FFFFFF" />
                  </View>
                </Marker>
              ))}
              {manualMarker && (
                <Marker 
                  coordinate={manualMarker}
                  draggable
                  onDragEnd={(e) => {
                    const newCoordinate = e.nativeEvent.coordinate;
                    setManualMarker(newCoordinate);
                    setSelectedLocation({ type: 'manual', coordinate: newCoordinate, name: 'Dropped Pin' });
                  }}
                >
                  <View style={[styles.marker, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="pin" size={20} color="#FFFFFF" />
                  </View>
                </Marker>
              )}
              
              {/* Saved Training Points */}
              {trainingPoints.map((point) => (
                <AnimatedMapPin key={point.id} training={point.fullData} />
              ))}
            </MapView>
            {selectedLocation && (
              <View style={styles.selectedCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedName}>📍 {selectedLocation.name}</Text>
                  <Text style={styles.selectedCoords}>
                    {selectedLocation.coordinate.latitude.toFixed(4)}, {selectedLocation.coordinate.longitude.toFixed(4)}
                  </Text>
                  {selectedLocation.type === 'manual' && (
                    <Text style={styles.dragHint}>💡 Drag pin to move or tap to place new</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.clearBtn}
                  onPress={() => {
                    setManualMarker(null);
                    setSelectedLocation(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.mapInstructions}>
              <Text style={styles.instructionText}>
                📍 Tap on map to drop a pin for training location
              </Text>
              <Text style={styles.instructionSubtext}>
                Switch to "Manual Entry" tab to fill training details
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
          {attendanceLinked && (
            <View style={styles.attendanceLinkedBanner}>
              <View style={styles.attendanceLinkedContent}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendanceLinkedTitle}>✅ Live Attendance Linked!</Text>
                  <Text style={styles.attendanceLinkedText}>
                    This report will include trainee attendance details
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'manual' && liveLocation && (
            <TouchableOpacity
              style={styles.liveLocationBtn}
              onPress={() => {
                setSelectedLocation({
                  type: 'live',
                  coordinate: liveLocation.coordinate,
                  name: 'Live Training Location',
                });
                Alert.alert('Location Set', 'Using live training location');
              }}
            >
              <View style={styles.liveLocationContent}>
                <View style={[styles.liveIndicator, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="radio" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveLocationTitle}>🔴 Use Live Training Location</Text>
                  <Text style={styles.liveLocationSubtext}>
                    {liveLocation.coordinate.latitude.toFixed(4)}, {liveLocation.coordinate.longitude.toFixed(4)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#10B981" />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Training Type *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}
            >
              <Text style={[styles.dropdownText, !trainingType && { color: '#9CA3AF' }]}>
                {trainingType || 'Select training type'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {TRAINING_TYPES.map((type, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setTrainingType(type);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{type}</Text>
                      {trainingType === type && (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={trainingDate}
              onChangeText={setTrainingDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Participants *</Text>
            <TextInput
              style={styles.input}
              value={participants}
              onChangeText={setParticipants}
              placeholder="Number of participants"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 2 hours"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Training details..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Effectiveness</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowEffectivenessDropdown(!showEffectivenessDropdown)}
            >
              <Text style={[styles.dropdownText, !effectiveness && { color: '#9CA3AF' }]}>
                {effectiveness || 'Select effectiveness rating'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {showEffectivenessDropdown && (
              <View style={styles.dropdownList}>
                {EFFECTIVENESS_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setEffectiveness(option);
                      setShowEffectivenessDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{option}</Text>
                    {effectiveness === option && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Training Images</Text>
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

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Documents (PDF/CSV)</Text>
              <TouchableOpacity onPress={pickDocument}>
                <Ionicons name="document-attach" size={28} color="#10B981" />
              </TouchableOpacity>
            </View>
            {uploadedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <Ionicons name="document" size={20} color="#6B7280" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  {file.size && (
                    <Text style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => removeFile(index)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, uploading && { opacity: 0.5 }]}
            onPress={saveTraining}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{isEditMode ? 'Update Training Report' : 'Save Training Report'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        )}
      </ScrollView>

      {/* Pin Drop Training Report Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 Training Report</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <Ionicons name="close-circle" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {selectedLocation && (
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Selected Location</Text>
                  <Text style={styles.locationText}>
                    📍 {selectedLocation.coordinate.latitude.toFixed(4)}, {selectedLocation.coordinate.longitude.toFixed(4)}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Training Type *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                >
                  <Text style={[styles.dropdownText, !trainingType && { color: '#9CA3AF' }]}>
                    {trainingType || 'Select training type'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showTypeDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {TRAINING_TYPES.map((type, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setTrainingType(type);
                            setShowTypeDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{type}</Text>
                          {trainingType === type && (
                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={trainingDate}
                  onChangeText={setTrainingDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Participants *</Text>
                <TextInput
                  style={styles.input}
                  value={participants}
                  onChangeText={setParticipants}
                  placeholder="Number of participants"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Duration</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="e.g., 2 hours"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Training details..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Effectiveness</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowEffectivenessDropdown(!showEffectivenessDropdown)}
                >
                  <Text style={[styles.dropdownText, !effectiveness && { color: '#9CA3AF' }]}>
                    {effectiveness || 'Select effectiveness rating'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showEffectivenessDropdown && (
                  <View style={styles.dropdownList}>
                    {EFFECTIVENESS_OPTIONS.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setEffectiveness(option);
                          setShowEffectivenessDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{option}</Text>
                        {effectiveness === option && (
                          <Ionicons name="checkmark" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Training Images</Text>
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

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Documents (PDF/CSV)</Text>
                  <TouchableOpacity onPress={pickDocument}>
                    <Ionicons name="document-attach" size={28} color="#10B981" />
                  </TouchableOpacity>
                </View>
                {uploadedFiles.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <Ionicons name="document" size={20} color="#6B7280" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                      {file.size && (
                        <Text style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => removeFile(index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, uploading && { opacity: 0.5 }]}
                onPress={() => {
                  setShowPinModal(false);
                  saveTraining();
                }}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>{isEditMode ? 'Update Training Report' : 'Save Training Report'}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Start Attendance Button */}
              <TouchableOpacity
                style={styles.attendanceBtn}
                onPress={() => {
                  if (!trainingType || !selectedLocation) {
                    Alert.alert('Required Fields', 'Please select training type and location first');
                    return;
                  }
                  setShowPinModal(false);
                  navigation.navigate('AttendanceSession', {
                    trainingId: editReport?._id || 'temp_id', // Use temp ID for new trainings
                    trainingType,
                    location: selectedLocation
                  });
                }}
              >
                <Ionicons name="qr-code" size={22} color="#0047BA" />
                <Text style={styles.attendanceBtnText}>Start Attendance</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Training Detail Modal (for saved pins) */}
      <Modal
        visible={showTrainingDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTrainingDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Training Details</Text>
              <TouchableOpacity onPress={() => setShowTrainingDetailModal(false)}>
                <Ionicons name="close-circle" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedTraining && (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Training Type</Text>
                  <Text style={styles.detailValue}>{selectedTraining.trainingType}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>📅 {selectedTraining.date}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Participants</Text>
                  <Text style={styles.detailValue}>👥 {selectedTraining.participants}</Text>
                </View>

                {selectedTraining.duration && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>⏱️ {selectedTraining.duration}</Text>
                  </View>
                )}

                {selectedTraining.effectiveness && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Effectiveness</Text>
                    <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '600' }]}>
                      ⭐ {selectedTraining.effectiveness}
                    </Text>
                  </View>
                )}

                {selectedTraining.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedTraining.description}</Text>
                  </View>
                )}

                {selectedTraining.location && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      📍 {selectedTraining.location.name || 'Training Location'}
                    </Text>
                    <Text style={styles.detailCoords}>
                      {selectedTraining.location.latitude.toFixed(4)}, {selectedTraining.location.longitude.toFixed(4)}
                    </Text>
                  </View>
                )}

                {selectedTraining.images && selectedTraining.images.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Images ({selectedTraining.images.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesGallery}>
                      {selectedTraining.images.map((img, idx) => (
                        <Image key={idx} source={{ uri: img }} style={styles.galleryImage} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedTraining.files && selectedTraining.files.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Attached Files ({selectedTraining.files.length})</Text>
                    {selectedTraining.files.map((file, idx) => (
                      <View key={idx} style={styles.fileDetailItem}>
                        <Ionicons 
                          name={file.type?.includes('pdf') ? 'document' : 'document-text'} 
                          size={24} 
                          color="#10B981" 
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.fileName}>{file.name}</Text>
                          <Text style={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 15, color: '#6B7280' },
  tabTextActive: { color: '#007AFF', fontWeight: '600' },
  map: { width: width, height: 280 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  selectedCoords: { fontSize: 13, color: '#6B7280' },
  dragHint: { fontSize: 12, color: '#007AFF', marginTop: 4, fontStyle: 'italic' },
  clearBtn: {
    padding: 8,
    marginLeft: 12,
  },
  mapInstructions: {
    backgroundColor: '#F0F9FF',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  instructionSubtext: {
    fontSize: 14,
    color: '#3B82F6',
  },
  liveLocationBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  liveLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveLocationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  liveLocationSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  form: { padding: 16 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: { fontSize: 15, color: '#1F2937', flex: 1 },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: { fontSize: 15, color: '#1F2937', flex: 1 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  imageScroll: { marginTop: 8 },
  imageContainer: { marginRight: 12, position: 'relative' },
  thumbnail: { width: 100, height: 100, borderRadius: 12 },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  fileSize: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  attendanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#0047BA',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  attendanceBtnText: { color: '#0047BA', fontSize: 16, fontWeight: '600' },
  attendanceLinkedBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  attendanceLinkedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendanceLinkedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  attendanceLinkedText: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A365D',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  locationInfo: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  detailCoords: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  imagesGallery: {
    marginTop: 8,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
  },
  fileDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
});

export default AddTrainingScreen;
