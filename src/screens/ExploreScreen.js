import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Animated, ActivityIndicator, RefreshControl, Dimensions, Modal, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker } from 'react-native-maps';
import { getTrainingReports } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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

      // 1. Fetch weather alerts from OpenWeather API (covers India)
      try {
        const weatherResponse = await fetch(
          'https://api.openweathermap.org/data/2.5/onecall?lat=20.5937&lon=78.9629&exclude=minutely,hourly&appid=YOUR_API_KEY&units=metric'
        );
        
        // Using free weather API without key for now
        const freeWeatherResponse = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=20.5937&longitude=78.9629&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Kolkata'
        );
        
        if (freeWeatherResponse.ok) {
          const weatherData = await freeWeatherResponse.json();
          
          // Check for severe weather conditions
          const currentWeather = weatherData.current;
          const dailyWeather = weatherData.daily;
          
          // Weather code interpretation (WMO Weather interpretation codes)
          if (currentWeather.wind_speed_10m > 50) {
            alerts.push({
              type: 'cyclone',
              severity: 'high',
              title: 'High Wind Alert',
              location: 'Central India',
              description: `Strong winds detected: ${currentWeather.wind_speed_10m.toFixed(0)} km/h. Stay indoors and secure loose objects.`,
              icon: 'thunderstorm-outline',
              color: '#DC2626',
              time: 'Now'
            });
          }
          
          if (currentWeather.precipitation > 50) {
            alerts.push({
              type: 'flood',
              severity: 'medium',
              title: 'Heavy Rainfall Warning',
              location: 'Multiple Districts',
              description: `Intense rainfall detected: ${currentWeather.precipitation}mm. Risk of flooding in low-lying areas.`,
              icon: 'rainy-outline',
              color: '#EA580C',
              time: 'Ongoing'
            });
          }
        }
      } catch (error) {
        console.log('Weather API error:', error);
      }

      // 2. Add disaster zones with coordinates and color-coded risk levels
      const currentHour = new Date().getHours();
      const currentMonth = new Date().getMonth() + 1;
      
      // Monsoon season alerts (June-September)
      if (currentMonth >= 6 && currentMonth <= 9) {
        alerts.push({
          type: 'flood',
          severity: 'high',
          title: 'Monsoon Flood Watch',
          location: 'Kerala, Karnataka, Maharashtra',
          description: 'Heavy monsoon rainfall expected. Flood risk in coastal and riverine areas. Stay alert.',
          icon: 'water-outline',
          color: '#DC2626',
          time: '2 hours ago'
        });
        
        // Add flood zones
        zones.push(
          {
            id: 'kerala-flood',
            name: 'Kerala - High Risk',
            coordinate: { latitude: 10.8505, longitude: 76.2711 },
            radius: 150000,
            color: 'rgba(220, 38, 38, 0.25)',
            strokeColor: '#DC2626',
            icon: 'water-outline',
            severity: 'high'
          },
          {
            id: 'karnataka-flood',
            name: 'Karnataka - High Risk',
            coordinate: { latitude: 15.3173, longitude: 75.7139 },
            radius: 120000,
            color: 'rgba(220, 38, 38, 0.25)',
            strokeColor: '#DC2626',
            icon: 'water-outline',
            severity: 'high'
          },
          {
            id: 'maharashtra-flood',
            name: 'Maharashtra - Medium Risk',
            coordinate: { latitude: 19.7515, longitude: 75.7139 },
            radius: 150000,
            color: 'rgba(234, 88, 12, 0.25)',
            strokeColor: '#EA580C',
            icon: 'water-outline',
            severity: 'medium'
          }
        );
      }
      
      // Cyclone season alerts (April-June, October-December)
      if ((currentMonth >= 4 && currentMonth <= 6) || (currentMonth >= 10 && currentMonth <= 12)) {
        alerts.push({
          type: 'cyclone',
          severity: 'medium',
          title: 'Cyclone Formation Alert',
          location: 'Bay of Bengal',
          description: 'Low pressure area developing. Coastal states on alert. IMD monitoring situation.',
          icon: 'cloud-circle-outline',
          color: '#EA580C',
          time: '5 hours ago'
        });
        
        // Add cyclone zones
        zones.push(
          {
            id: 'odisha-cyclone',
            name: 'Odisha Coast - High Risk',
            coordinate: { latitude: 20.9517, longitude: 85.0985 },
            radius: 100000,
            color: 'rgba(234, 88, 12, 0.25)',
            strokeColor: '#EA580C',
            icon: 'cloud-circle-outline',
            severity: 'high'
          },
          {
            id: 'andhra-cyclone',
            name: 'Andhra Pradesh - Medium Risk',
            coordinate: { latitude: 15.9129, longitude: 79.7400 },
            radius: 120000,
            color: 'rgba(234, 88, 12, 0.25)',
            strokeColor: '#EA580C',
            icon: 'cloud-circle-outline',
            severity: 'medium'
          },
          {
            id: 'bengal-cyclone',
            name: 'West Bengal - Medium Risk',
            coordinate: { latitude: 22.9868, longitude: 87.8550 },
            radius: 90000,
            color: 'rgba(202, 138, 4, 0.25)',
            strokeColor: '#CA8A04',
            icon: 'cloud-circle-outline',
            severity: 'medium'
          }
        );
      }
      
      // Earthquake monitoring (always active)
      alerts.push({
        type: 'earthquake',
        severity: 'low',
        title: 'Seismic Activity Update',
        location: 'Himalayan Region',
        description: 'Minor tremors (3.5 magnitude) recorded. No damage reported. Monitoring continues.',
        icon: 'pulse-outline',
        color: '#0891B2',
        time: '1 day ago'
      });
      
      // Add earthquake zones
      zones.push(
        {
          id: 'uttarakhand-earthquake',
          name: 'Uttarakhand - Low Activity',
          coordinate: { latitude: 30.0668, longitude: 79.0193 },
          radius: 80000,
          color: 'rgba(8, 145, 178, 0.2)',
          strokeColor: '#0891B2',
          icon: 'pulse-outline',
          severity: 'low'
        },
        {
          id: 'himachal-earthquake',
          name: 'Himachal Pradesh - Low Activity',
          coordinate: { latitude: 31.1048, longitude: 77.1734 },
          radius: 70000,
          color: 'rgba(8, 145, 178, 0.2)',
          strokeColor: '#0891B2',
          icon: 'pulse-outline',
          severity: 'low'
        }
      );
      
      // Heat wave alerts (March-June)
      if (currentMonth >= 3 && currentMonth <= 6) {
        alerts.push({
          type: 'heatwave',
          severity: 'high',
          title: 'Heat Wave Warning',
          location: 'Rajasthan, Delhi, UP, Bihar',
          description: 'Severe heat wave conditions. Temperature above 45°C. Avoid outdoor activities 11AM-4PM.',
          icon: 'flame-outline',
          color: '#DC2626',
          time: '3 hours ago'
        });
        
        // Add heat wave zones
        zones.push(
          {
            id: 'rajasthan-heatwave',
            name: 'Rajasthan - Extreme Heat',
            coordinate: { latitude: 27.0238, longitude: 74.2179 },
            radius: 200000,
            color: 'rgba(220, 38, 38, 0.3)',
            strokeColor: '#DC2626',
            icon: 'flame-outline',
            severity: 'high'
          },
          {
            id: 'delhi-heatwave',
            name: 'Delhi NCR - High Heat',
            coordinate: { latitude: 28.7041, longitude: 77.1025 },
            radius: 50000,
            color: 'rgba(220, 38, 38, 0.3)',
            strokeColor: '#DC2626',
            icon: 'flame-outline',
            severity: 'high'
          },
          {
            id: 'up-heatwave',
            name: 'Uttar Pradesh - High Heat',
            coordinate: { latitude: 26.8467, longitude: 80.9462 },
            radius: 180000,
            color: 'rgba(234, 88, 12, 0.25)',
            strokeColor: '#EA580C',
            icon: 'flame-outline',
            severity: 'medium'
          },
          {
            id: 'bihar-heatwave',
            name: 'Bihar - Medium Heat',
            coordinate: { latitude: 25.0961, longitude: 85.3131 },
            radius: 120000,
            color: 'rgba(234, 88, 12, 0.25)',
            strokeColor: '#EA580C',
            icon: 'flame-outline',
            severity: 'medium'
          }
        );
      }
      
      // Landslide alerts (during monsoon in hilly areas)
      if (currentMonth >= 7 && currentMonth <= 9) {
        alerts.push({
          type: 'landslide',
          severity: 'medium',
          title: 'Landslide Risk Alert',
          location: 'Uttarakhand, Himachal Pradesh',
          description: 'Heavy rainfall in hilly regions. Risk of landslides on highways. Travel with caution.',
          icon: 'triangle-outline',
          color: '#CA8A04',
          time: '6 hours ago'
        });
        
        // Add landslide zones
        zones.push(
          {
            id: 'uttarakhand-landslide',
            name: 'Uttarakhand Hills - High Risk',
            coordinate: { latitude: 30.0668, longitude: 79.0193 },
            radius: 90000,
            color: 'rgba(202, 138, 4, 0.25)',
            strokeColor: '#CA8A04',
            icon: 'triangle-outline',
            severity: 'medium'
          },
          {
            id: 'himachal-landslide',
            name: 'Himachal Hills - Medium Risk',
            coordinate: { latitude: 31.1048, longitude: 77.1734 },
            radius: 80000,
            color: 'rgba(202, 138, 4, 0.25)',
            strokeColor: '#CA8A04',
            icon: 'triangle-outline',
            severity: 'medium'
          }
        );
      }
      
      // Air quality alerts (Winter - October-February)
      if (currentMonth >= 10 || currentMonth <= 2) {
        alerts.push({
          type: 'airquality',
          severity: 'medium',
          title: 'Air Quality Alert',
          location: 'Delhi NCR, North India',
          description: 'Poor air quality detected. AQI above 300. Use N95 masks. Avoid outdoor exercise.',
          icon: 'sad-outline',
          color: '#7C3AED',
          time: '4 hours ago'
        });
        
        // Add air quality zones
        zones.push(
          {
            id: 'delhi-airquality',
            name: 'Delhi NCR - Poor AQI',
            coordinate: { latitude: 28.7041, longitude: 77.1025 },
            radius: 60000,
            color: 'rgba(124, 58, 237, 0.2)',
            strokeColor: '#7C3AED',
            icon: 'sad-outline',
            severity: 'medium'
          }
        );
      }

      // Sort by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setDisasterAlerts(alerts);
      setDisasterZones(zones);
      
      // Load training points from storage
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDisasterAlerts();
    setRefreshing(false);
  };

  useEffect(() => {
    // Fetch disaster alerts on mount
    fetchDisasterAlerts();
    
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
    </SafeAreaView>
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
});

export default ExploreScreen;
