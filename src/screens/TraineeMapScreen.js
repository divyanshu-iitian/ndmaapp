import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, MAP_TYPES } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
// import * as Location from 'expo-location'; // DISABLED - Module removed

const TraineeMapScreen = ({ route }) => {
  const user = route?.params?.user;
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [location, setLocation] = useState(null);
  const [activeTrainings, setActiveTrainings] = useState([]);
  const [region, setRegion] = useState({
    latitude: 28.6139, // Delhi
    longitude: 77.2090,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    loadUserLocation();
    loadActiveTrainings();
  }, []);

  const loadUserLocation = async () => {
    try {
      /* DISABLED - Location module removed
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show nearby trainings');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const userLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(userLocation);
      setRegion({
        ...userLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      */
      console.log('Location feature disabled');
      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setLoading(false);
    }
  };

  const loadActiveTrainings = async () => {
    try {
      // TODO: Fetch from backend
      // const trainings = await MongoDBService.getActiveTrainings();
      setActiveTrainings([]);
    } catch (error) {
      console.error('Error loading trainings:', error);
    }
  };

  const toggleMapType = () => {
    setMapType((prev) => {
      if (prev === 'standard') return 'satellite';
      if (prev === 'satellite') return 'hybrid';
      return 'standard';
    });
  };

  const getMapTypeLabel = () => {
    if (mapType === 'standard') return 'Standard';
    if (mapType === 'satellite') return 'Satellite';
    return 'Hybrid';
  };

  const centerOnUser = () => {
    if (location) {
      setRegion({
        ...location,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5282" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Trainings</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.mapTypeButton} onPress={toggleMapType}>
            <Ionicons name="layers-outline" size={20} color="#2C5282" />
            <Text style={styles.mapTypeText}>{getMapTypeLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType={mapType}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        toolbarEnabled={false}
      >
        {/* User Location Marker */}
        {location && (
          <Marker
            coordinate={location}
            title="Your Location"
            description="You are here"
          >
            <View style={styles.userMarker}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* Active Training Markers */}
        {activeTrainings.map((training) => (
          <Marker
            key={training.id}
            coordinate={{
              latitude: training.latitude,
              longitude: training.longitude,
            }}
            title={training.title}
            description={training.description}
          >
            <View style={styles.trainingMarker}>
              <Ionicons name="school" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* My Location Button */}
      <TouchableOpacity style={styles.myLocationButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={24} color="#2C5282" />
      </TouchableOpacity>

      {/* Info Card */}
      {activeTrainings.length === 0 && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#718096" />
          <Text style={styles.infoText}>No active trainings nearby</Text>
          <Text style={styles.infoSubtext}>Check back later for upcoming sessions</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  mapTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C5282',
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C5282',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  trainingMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#38A169',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 8,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default TraineeMapScreen;
