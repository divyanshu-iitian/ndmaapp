import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Animated, ActivityIndicator, RefreshControl, Dimensions, Modal, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker } from 'react-native-maps';
import { getTrainingReports } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../services/config';
import { authService } from '../services/AuthService';

const ExploreScreen = ({ navigation }) => {
  // Animation values
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  // Disaster alerts state
  const [disasterAlerts, setDisasterAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Map disaster zones with coordinates
  const [disasterZones, setDisasterZones] = useState([]);

  // Nearby Users
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Training points
  const [trainingPoints, setTrainingPoints] = useState([]);

  // Training details modal
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);

  // Image viewer states
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  // File viewer functions
  const openFile = async (file) => {
    try {
      if (file.url) {
        const supported = await Linking.canOpenURL(file.url);
        if (supported) {
          await Linking.openURL(file.url);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const downloadFile = async (file) => {
    try {
      const fileUri = FileSystem.documentDirectory + file.name;
      const downloadResumable = FileSystem.createDownloadResumable(
        file.url,
        fileUri
      );
      const { uri } = await downloadResumable.downloadAsync();

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Success', `File saved to ${uri}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  // Open image in full view
  const openImageViewer = (images, index) => {
    setCurrentImages(images);
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  // Download and save image
  const downloadImage = async (imageUrl) => {
    try {
      const fileName = `training_image_${Date.now()}.jpg`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Save Image',
        });
        Alert.alert('Success', 'Image saved to device!');
      } else {
        Alert.alert('Success', `Image saved to ${uri}`);
      }
    } catch (error) {
      console.error('Download image error:', error);
      Alert.alert('Error', 'Failed to download image');
    }
  };

  const featured = [
    {
      emoji: '🌪️',
      title: 'Cyclone readiness toolkit',
      description: 'Updated step-by-step checklists for coastal districts.'
    },
    {
      emoji: '🚨',
      title: 'Incident command refresher',
      description: 'Micro-learning series for incident commanders on duty.'
    },
    {
      emoji: '🛰️',
      title: 'Satellite monitoring 101',
      description: 'Learn to interpret IMSD satellite data in the field.'
    },
  ];

  // Fetch disaster alerts from multiple sources
  const fetchDisasterAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const alerts = [];
      const zones = [];


      // 1. Fetch from SACHET API
      console.log('📡 Fetching SACHET alerts from:', `${API_BASE_URL}/sachet/all-alerts`);
      const sachetResponse = await fetch(`${API_BASE_URL}/sachet/all-alerts`);
      const sachetResult = await sachetResponse.json();

      if (sachetResult.success && sachetResult.data) {
        const data = sachetResult.data;

        // --- Process Earthquake Alerts ---
        if (data.earthquakes && data.earthquakes.alerts) {
          data.earthquakes.alerts.forEach((eq, idx) => {
            // Earthquake format: distinct lat/long fields
            const lat = parseFloat(eq.latitude);
            const lon = parseFloat(eq.longitude);

            if (!isNaN(lat) && !isNaN(lon)) {
              const colors = ['#0891B2', '#DC2626', '#EA580C']; // Cyan, Red, Orange based on mag?
              const magnitude = parseFloat(eq.magnitude) || 0;
              let color = '#0891B2';
              let severity = 'low';
              if (magnitude > 6) { color = '#DC2626'; severity = 'high'; }
              else if (magnitude > 4) { color = '#EA580C'; severity = 'medium'; }

              alerts.push({
                type: 'earthquake',
                severity,
                title: `Earthquake: Mag ${eq.magnitude}`,
                location: eq.direction || `Lat: ${lat}, Lon: ${lon}`,
                description: eq.warning_message,
                icon: 'pulse-outline',
                color: color,
                time: eq.effective_start_time
              });

              zones.push({
                id: `eq-${idx}-${Date.now()}`,
                name: `Earthquake ${magnitude}`,
                coordinate: { latitude: lat, longitude: lon },
                radius: magnitude * 10000,
                color: `${color}40`, // 25% opacity
                strokeColor: color,
                icon: 'pulse-outline',
                severity
              });
            }
          });
        }

        // --- Process Nowcast (Weather) Alerts ---
        if (data.nowcast && data.nowcast.nowcastDetails) {
          data.nowcast.nowcastDetails.forEach((nc, idx) => {
            // Nowcast format: location.coordinates [lng, lat]
            if (nc.location && nc.location.coordinates) {
              const lng = nc.location.coordinates[0];
              const lat = nc.location.coordinates[1];

              let color = '#F59E0B'; // Yellow/Amber
              if (nc.severity_color === 'red') color = '#DC2626';
              if (nc.severity_color === 'orange') color = '#EA580C';

              alerts.push({
                type: 'weather',
                severity: nc.severity || 'medium',
                title: nc.event_category || 'Weather Alert',
                location: nc.area_description,
                description: `${nc.events}. ${nc.severity}`,
                icon: 'thunderstorm-outline',
                color: color,
                time: nc.effective_start_time
              });

              zones.push({
                id: `nc-${idx}-${Date.now()}`,
                name: nc.event_category,
                coordinate: { latitude: lat, longitude: lng },
                radius: 15000,
                color: `${color}40`,
                strokeColor: color,
                icon: 'thunderstorm-outline',
                severity: nc.severity || 'medium'
              });
            }
          });
        }

        // --- Process General Alerts ---
        if (Array.isArray(data.general)) {
          data.general.forEach((gen, idx) => {
            // General format: centroid "lng,lat" string
            if (gen.centroid) {
              const [lngStr, latStr] = gen.centroid.split(',');
              const lat = parseFloat(latStr);
              const lng = parseFloat(lngStr);

              if (!isNaN(lat) && !isNaN(lng)) {
                let color = '#7C3AED'; // Purple
                if (gen.severity_color === 'red') color = '#DC2626';

                alerts.push({
                  type: 'general',
                  severity: gen.severity || 'medium',
                  title: gen.disaster_type,
                  location: gen.area_description,
                  description: gen.warning_message,
                  icon: 'alert-circle-outline',
                  color: color,
                  time: gen.effective_start_time
                });

                zones.push({
                  id: `gen-${idx}-${Date.now()}`,
                  name: gen.disaster_type,
                  coordinate: { latitude: lat, longitude: lng },
                  radius: 20000,
                  color: `${color}40`,
                  strokeColor: color,
                  icon: 'alert-circle-outline',
                  severity: gen.severity || 'medium'
                });
              }
            }
          });
        }
      }

      setDisasterAlerts(alerts);
      setDisasterZones(zones);

      // Load training points from storage (kept as is)
      try {
        console.log('📍 Loading training points from storage...');
        const trainings = await getTrainingReports();
        console.log('📦 Retrieved trainings:', trainings ? trainings.length : 0);
        if (trainings && trainings.length > 0) {
          const points = trainings
            .filter(t => t.location && t.location.latitude && t.location.longitude)
            .map(t => ({
              id: t.id || `training-${Date.now()}-${Math.random()}`,
              coordinate: {
                latitude: t.location.latitude,
                longitude: t.location.longitude,
              },
              title: t.trainingType || 'Training',
              description: `Participants: ${t.participants || 0}`,
              effectiveness: t.effectiveness || 'N/A',
              fullData: t,
            }));
          setTrainingPoints(points);
          console.log('✅ Loaded training points:', points.length);
          console.log('📊 First point sample:', JSON.stringify(points[0], null, 2));
        } else {
          console.log('⚠️ No trainings found or no location data');
        }
      } catch (err) {
        console.log('❌ Training points load error:', err);
      }

      setLoadingAlerts(false);
    } catch (error) {
      console.error('Error fetching disaster alerts:', error);
      setLoadingAlerts(false);
    }
  };

  // Fetch nearby users
  const fetchNearbyUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/location/nearby?maxDistance=50000`, { // 50km
        method: 'GET'
      });
      const data = await response.json();
      if (data && data.nearbyUsers) {
        setNearbyUsers(data.nearbyUsers);
        console.log('👥 Loaded nearby users:', data.nearbyUsers.length);
      }
      setLoadingUsers(false);
    } catch (error) {
      console.log('Error fetching nearby users:', error);
      setLoadingUsers(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDisasterAlerts(), fetchNearbyUsers()]);
    setRefreshing(false);
  };

  useEffect(() => {
    // Fetch disaster alerts on mount
    fetchDisasterAlerts();
    fetchNearbyUsers();

    // Staggered entrance animations
    Animated.sequence([
      // Header animation
      Animated.parallel([
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Cards animation
      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const AnimatedCard = ({ children, index, isPrimary }) => {
    const cardTranslateY = cardsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [40 + (index * 15), 0],
    });

    const cardScale = cardsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.95, 1],
    });

    return (
      <Animated.View
        style={[
          styles.card,
          isPrimary && styles.cardPrimary,
          {
            opacity: cardsAnim,
            transform: [
              { translateY: cardTranslateY },
              { scale: cardScale },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View
          style={{
            opacity: headerFadeAnim,
            transform: [{ translateY: headerSlideAnim }],
          }}
        >
          <Text style={styles.title}>Explore & Alerts</Text>
          <Text style={styles.subtitle}>
            Real-time disaster alerts and learning resources for India.
          </Text>
        </Animated.View>

        {/* India Disaster Map */}
        <View style={styles.mapSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map" size={24} color="#3B82F6" />
            <Text style={styles.sectionTitle}>India Disaster Map</Text>
          </View>

          {loadingAlerts ? (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          ) : (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: 20.5937,
                  longitude: 78.9629,
                  latitudeDelta: 25,
                  longitudeDelta: 25,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
              >
                {/* Disaster zones as colored circles */}
                {disasterZones.map((zone) => (
                  <React.Fragment key={zone.id}>
                    <Circle
                      center={zone.coordinate}
                      radius={zone.radius}
                      fillColor={zone.color}
                      strokeColor={zone.strokeColor}
                      strokeWidth={2}
                    />
                    <Marker
                      coordinate={zone.coordinate}
                      title={zone.name}
                      description={`Risk Level: ${zone.severity.toUpperCase()}`}
                    >
                      <View style={[styles.markerContainer, { backgroundColor: zone.strokeColor }]}>
                        <Ionicons name={zone.icon} size={20} color="#FFFFFF" />
                      </View>
                    </Marker>
                  </React.Fragment>
                ))}

                {/* Training points */}
                {trainingPoints.map((point) => (
                  <Marker
                    key={point.id}
                    coordinate={point.coordinate}
                    title={point.title}
                    description={point.description}
                    onPress={() => {
                      console.log('🗺️ Training marker clicked:', point.id);
                      console.log('📍 Full data:', JSON.stringify(point.fullData, null, 2));
                      setSelectedTraining(point.fullData);
                      setShowTrainingModal(true);
                      console.log('✅ Modal state set to true');
                    }}
                  >
                    <View style={styles.trainingMarker}>
                      <Ionicons name="school" size={24} color="#FFFFFF" />
                    </View>
                  </Marker>
                ))}

                {/* Nearby Active Users */}
                {nearbyUsers.map((u, idx) => {
                  if (!u.location || !u.location.coordinates) return null;
                  const lat = u.location.coordinates[1];
                  const lng = u.location.coordinates[0];
                  return (
                    <Marker
                      key={`user-${u._id || idx}`}
                      coordinate={{ latitude: lat, longitude: lng }}
                      title={u.username}
                      description={u.role || 'Active User'}
                    >
                      <View style={styles.userMarker}>
                        {u.profilePhoto ? (
                          <Image source={{ uri: u.profilePhoto }} style={styles.userMarkerImage} />
                        ) : (
                          <View style={styles.userMarkerFallback}>
                            <Text style={styles.userMarkerInitials}>{(u.username || 'U')[0]}</Text>
                          </View>
                        )}
                      </View>
                    </Marker>
                  );
                })}
              </MapView>

              {/* Map Legend */}
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#DC2626' }]} />
                  <Text style={styles.legendText}>High Risk</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#EA580C' }]} />
                  <Text style={styles.legendText}>Medium</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#CA8A04' }]} />
                  <Text style={styles.legendText}>Low</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#CA8A04' }]} />
                  <Text style={styles.legendText}>Low</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#3B82F6', borderRadius: 8 }]} />
                  <Text style={styles.legendText}>Users</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Disaster Alerts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <Text style={styles.sectionTitle}>Live Disaster Alerts</Text>
          </View>

          {loadingAlerts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Fetching latest alerts...</Text>
            </View>
          ) : disasterAlerts.length > 0 ? (
            <View style={styles.alertsList}>
              {disasterAlerts.map((alert, index) => (
                <AnimatedCard key={`${alert.type}-${index}`} index={index} isPrimary={false}>
                  <View style={styles.alertCard}>
                    <View style={styles.alertHeader}>
                      <View style={styles.alertIconContainer}>
                        <Ionicons name={alert.icon} size={28} color={alert.color} />
                      </View>
                      <View style={[styles.alertBadge, { backgroundColor: alert.color }]}>
                        <Text style={styles.alertBadgeText}>{alert.severity.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <View style={styles.alertLocation}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.alertLocationText}>{alert.location}</Text>
                    </View>
                    <Text style={styles.alertDescription}>{alert.description}</Text>
                    <View style={styles.alertFooter}>
                      <View style={styles.alertTime}>
                        <Ionicons name="time-outline" size={14} color="#94A3B8" />
                        <Text style={styles.alertTimeText}>{alert.time}</Text>
                      </View>
                    </View>
                  </View>
                </AnimatedCard>
              ))}
            </View>
          ) : (
            <View style={styles.noAlertsContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.noAlertsText}>No active disaster alerts</Text>
              <Text style={styles.noAlertsSubtext}>All clear in monitored regions</Text>
            </View>
          )}
        </View>

        {/* Learning Paths Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school" size={24} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Learning Paths</Text>
          </View>

          <View style={styles.list}>
            {featured.map((item, index) => (
              <AnimatedCard key={item.title} index={index + disasterAlerts.length} isPrimary={index === 0}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </AnimatedCard>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Training Details Modal */}
      <Modal
        visible={showTrainingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTrainingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Training Details</Text>
              <TouchableOpacity onPress={() => setShowTrainingModal(false)}>
                <Ionicons name="close-circle" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedTraining && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Training Type</Text>
                  <Text style={styles.detailValue}>{selectedTraining.trainingType}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{selectedTraining.date}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Participants</Text>
                  <Text style={styles.detailValue}>{selectedTraining.participants}</Text>
                </View>

                {selectedTraining.duration && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedTraining.duration}</Text>
                  </View>
                )}

                {selectedTraining.effectiveness && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Effectiveness</Text>
                    <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '600' }]}>
                      {selectedTraining.effectiveness}
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
                        <TouchableOpacity
                          key={idx}
                          onPress={() => openImageViewer(selectedTraining.images, idx)}
                        >
                          <Image source={{ uri: img }} style={styles.galleryImage} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedTraining.files && selectedTraining.files.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Attached Files ({selectedTraining.files.length})</Text>
                    {selectedTraining.files.map((file, idx) => (
                      <View key={idx} style={styles.fileItem}>
                        <View style={styles.fileIcon}>
                          <Ionicons
                            name={file.type?.includes('pdf') ? 'document' : 'document-text'}
                            size={24}
                            color="#10B981"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fileName}>{file.name}</Text>
                          <Text style={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</Text>
                        </View>
                        <TouchableOpacity onPress={() => openFile(file)} style={styles.fileButton}>
                          <Ionicons name="open-outline" size={20} color="#10B981" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => downloadFile(file)} style={styles.fileButton}>
                          <Ionicons name="download-outline" size={20} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setShowTrainingModal(false);
                      navigation.navigate('AddTraining', { editReport: selectedTraining });
                    }}
                  >
                    <Ionicons name="create" size={20} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Edit Training</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={showImageViewer} transparent={true} animationType="fade">
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
      </Modal>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
  },
  subtitle: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    marginTop: 4,
  },
  mapSection: {
    gap: 12,
  },
  mapContainer: {
    height: 350,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    height: 350,
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  markerContainer: {
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
    shadowRadius: 3.84,
    elevation: 5,
  },
  trainingMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A365D',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  alertsList: {
    gap: 12,
  },
  alertCard: {
    gap: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertEmoji: {
    fontSize: 32,
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A365D',
  },
  alertLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertLocationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  alertDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  alertTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertTimeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  noAlertsContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  noAlertsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  noAlertsSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  list: {
    gap: 16,
  },
  card: {
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPrimary: {
    backgroundColor: '#EBF8FF',
    borderColor: '#BEE3F8',
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A365D',
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
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  fileButton: {
    padding: 8,
  },
  modalActions: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  editButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  userMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  userMarkerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userMarkerFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  }
});

export default ExploreScreen;
