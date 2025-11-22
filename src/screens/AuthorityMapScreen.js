import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView, Modal, Animated, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Heatmap } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import ReportsService from '../services/ReportsService';

const { width, height } = Dimensions.get('window');

export default function AuthorityMapScreen({ navigation, route }) {
  const user = route?.params?.user || { name: 'Authority', role: 'authority' };
  
  const [allReports, setAllReports] = useState([]);
  const [mapReports, setMapReports] = useState([]);
  const [filter, setFilter] = useState('all'); // all | live | previous | pending
  const [mapType, setMapType] = useState('standard'); // standard | satellite | hybrid
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lastSync, setLastSync] = useState(new Date());
  const [stats, setStats] = useState({ total: 0, live: 0, pending: 0, approved: 0 });
  
  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    const refreshInterval = setInterval(loadData, 30000); // Auto-refresh every 30s
    
    // Pulse animation for live markers
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, allReports]);

  const loadData = async () => {
    console.log('🗺️ Authority Map: Loading reports...');
    const res = await ReportsService.getAllReports();
    if (res.success) {
      console.log('✅ Authority Map: Loaded', res.reports.length, 'reports');
      
      // Debug: Check location data structure
      if (res.reports.length > 0) {
        console.log('📍 Sample report location:', JSON.stringify(res.reports[0].location || res.reports[0].gpsCoordinates, null, 2));
      }
      
      setAllReports(res.reports);
      setLastSync(new Date());
      
      // Compute stats
      const total = res.reports.length;
      const live = res.reports.filter(r => r.status === 'live').length;
      const pending = res.reports.filter(r => r.status === 'pending').length;
      const approved = res.reports.filter(r => r.status === 'accepted').length;
      
      setStats({ total, live, pending, approved });
    }
  };

  const applyFilter = () => {
    let filtered = allReports;
    
    if (filter === 'live') {
      filtered = allReports.filter(r => r.status === 'live');
    } else if (filter === 'previous') {
      filtered = allReports.filter(r => r.status === 'accepted');
    } else if (filter === 'pending') {
      filtered = allReports.filter(r => r.status === 'pending');
    }
    
    setMapReports(filtered);
  };

  const getPinColor = (status) => {
    switch (status) {
      case 'live': return '#FFC107';
      case 'pending': return '#FF9800';
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#2563EB';
    }
  };

  const getPinIcon = (status) => {
    switch (status) {
      case 'live': return 'radio';
      case 'pending': return 'time';
      case 'accepted': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'location';
    }
  };

  const getOrgIcon = (org) => {
    const orgLower = (org || '').toLowerCase();
    if (orgLower.includes('ndma')) return 'shield';
    if (orgLower.includes('nidm')) return 'school';
    if (orgLower.includes('lbsnaa')) return 'people';
    if (orgLower.includes('ati')) return 'book';
    if (orgLower.includes('central')) return 'business';
    return 'business-outline';
  };

  const cycleMapType = () => {
    const types = ['standard', 'satellite', 'hybrid'];
    const current = types.indexOf(mapType);
    const next = (current + 1) % types.length;
    setMapType(types[next]);
  };

  const centerOnIndia = () => {
    mapRef.current?.animateToRegion({
      latitude: 20.5937,
      longitude: 78.9629,
      latitudeDelta: 25,
      longitudeDelta: 25,
    }, 1000);
  };

  const openDetail = (report) => {
    setSelectedPin(report);
    setShowDetail(true);
  };

  const openImageViewer = (images, index) => {
    setCurrentImages(images);
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const openDocument = async (doc) => {
    if (doc.url || doc.uri) {
      const url = doc.url || doc.uri;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this document');
      }
    } else {
      Alert.alert('Error', 'Document URL not available');
    }
  };

  const approveFromMap = async (reportId) => {
    const res = await ReportsService.approveReport(reportId);
    if (res.success) {
      Alert.alert('✅ Approved', 'Training report approved successfully');
      setShowDetail(false);
      loadData();
    } else {
      Alert.alert('Error', res.error || 'Approve failed');
    }
  };

  const rejectFromMap = (reportId) => {
    Alert.prompt(
      '❌ Reject Report',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            const res = await ReportsService.rejectReport(reportId, reason || 'Not specified');
            if (res.success) {
              Alert.alert('❌ Rejected', 'Training report rejected');
              setShowDetail(false);
              loadData();
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const filterButtons = [
    { key: 'all', label: 'All', icon: 'layers-outline', color: '#0047BA' },
    { key: 'live', label: 'Live', icon: 'radio-outline', color: '#FFC107' },
    { key: 'previous', label: 'Approved', icon: 'checkmark-circle-outline', color: '#4CAF50' },
    { key: 'pending', label: 'Pending', icon: 'time-outline', color: '#FF9800' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
        <View>
          <Text style={styles.title}>GIS Explorer</Text>
          <Text style={styles.subtitle}>
            Showing {mapReports.length} of {allReports.length} trainings
          </Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={loadData}>
          <Ionicons name="sync-outline" size={20} color="#0047BA" />
        </TouchableOpacity>
      </Animatable.View>

      {/* Filter Toolbar */}
      <View style={styles.filterToolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filterButtons.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && { backgroundColor: f.color }]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons name={f.icon} size={16} color={filter === f.key ? '#FFFFFF' : f.color} />
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          mapType={mapType}
          initialRegion={{
            latitude: 20.5937,
            longitude: 78.9629,
            latitudeDelta: 25,
            longitudeDelta: 25,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          {mapReports.map((report, idx) => {
            // Check multiple possible location structures
            const lat = report.location?.latitude || report.gpsCoordinates?.latitude || report.latitude;
            const lng = report.location?.longitude || report.gpsCoordinates?.longitude || report.longitude;
            
            if (!lat || !lng) {
              console.log('⚠️ Report missing coords:', report._id, report.trainingTitle);
              return null;
            }
            
            return (
              <Marker
                key={report._id || report.id || idx}
                coordinate={{
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                }}
                onPress={() => openDetail(report)}
                title={report.trainingTitle || 'Training Session'}
                description={`${report.locationName || 'Location'} • ${report.targetOrganization || 'Organization'}`}
              >
                <Animated.View style={[
                  styles.markerContainer,
                  report.status === 'live' && { transform: [{ scale: pulseAnim }] }
                ]}>
                  <View style={[styles.markerWrapper]}>
                    {/* Organization badge */}
                    <View style={styles.orgBadge}>
                      <Ionicons 
                        name={getOrgIcon(report.targetOrganization)} 
                        size={12} 
                        color="#1A365D" 
                      />
                    </View>
                    {/* Status marker */}
                    <View style={[styles.marker, { backgroundColor: getPinColor(report.status) }]}>
                      <Ionicons name={getPinIcon(report.status)} size={18} color="#FFFFFF" />
                    </View>
                  </View>
                </Animated.View>
              </Marker>
            );
          })}
        </MapView>

        {/* Floating Action Buttons */}
        <View style={styles.mapControls}>
          {/* Map Type Toggle */}
          <TouchableOpacity style={styles.controlBtn} onPress={cycleMapType}>
            <MaterialIcons name="layers" size={22} color="#1F2937" />
            <Text style={styles.controlBtnLabel}>
              {mapType === 'standard' ? 'Standard' : mapType === 'satellite' ? 'Satellite' : 'Hybrid'}
            </Text>
          </TouchableOpacity>

          {/* Center on India */}
          <TouchableOpacity style={styles.controlBtn} onPress={centerOnIndia}>
            <Ionicons name="locate-outline" size={22} color="#1F2937" />
          </TouchableOpacity>

          {/* Heatmap Toggle */}
          <TouchableOpacity 
            style={[styles.controlBtn, showHeatmap && styles.controlBtnActive]} 
            onPress={() => setShowHeatmap(!showHeatmap)}
          >
            <MaterialIcons name="bubble-chart" size={22} color={showHeatmap ? '#FFFFFF' : '#1F2937'} />
          </TouchableOpacity>

          {/* Stats Panel */}
          <View style={styles.statsPanel}>
            <View style={styles.statItem}>
              <Ionicons name="radio" size={16} color="#FFC107" />
              <Text style={styles.statValue}>{stats.live}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#FF9800" />
              <Text style={styles.statValue}>{stats.pending}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.statValue}>{stats.approved}</Text>
            </View>
          </View>
        </View>

        {/* Empty State */}
        {mapReports.length === 0 && (
          <Animatable.View animation="fadeIn" style={styles.emptyOverlay}>
            <Ionicons name="map-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No trainings found</Text>
            <Text style={styles.emptySubtext}>Try changing the filter</Text>
          </Animatable.View>
        )}
      </View>

      {/* Detail Modal */}
      <Modal
        visible={showDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="slideInUp" duration={400} style={styles.detailCard}>
            {selectedPin && (
              <>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailTitle}>{selectedPin.trainingType || 'Training'}</Text>
                    <Text style={styles.detailSubtitle}>{selectedPin.location?.name || 'Unknown Location'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getPinColor(selectedPin.status) }]}>
                    <Text style={styles.statusText}>{(selectedPin.status || 'unknown').toUpperCase()}</Text>
                  </View>
                </View>

                {/* Details */}
                <ScrollView style={styles.detailContent}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailLabel}>Trainer:</Text>
                    <Text style={styles.detailValue}>{selectedPin.userName || selectedPin.userEmail || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{selectedPin.date || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailLabel}>Participants:</Text>
                    <Text style={styles.detailValue}>{selectedPin.participants || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>{selectedPin.duration || 'N/A'}</Text>
                  </View>
                  {selectedPin.description && (
                    <View style={styles.detailDescription}>
                      <Text style={styles.descriptionLabel}>Description:</Text>
                      <Text style={styles.descriptionText}>{selectedPin.description}</Text>
                    </View>
                  )}

                  {/* Images Gallery */}
                  {selectedPin.photos && selectedPin.photos.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="images" size={16} color="#1A365D" /> Images ({selectedPin.photos.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesGallery}>
                        {selectedPin.photos.map((img, idx) => (
                          <TouchableOpacity 
                            key={idx} 
                            onPress={() => openImageViewer(selectedPin.photos, idx)}
                            style={styles.imageWrapper}
                          >
                            <Image source={{ uri: img }} style={styles.galleryImage} />
                            <View style={styles.imageOverlay}>
                              <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Documents List */}
                  {selectedPin.documents && selectedPin.documents.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>
                        <Ionicons name="document-text" size={16} color="#1A365D" /> Documents ({selectedPin.documents.length})
                      </Text>
                      {selectedPin.documents.map((doc, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          style={styles.documentItem}
                          onPress={() => openDocument(doc)}
                        >
                          <View style={styles.documentIcon}>
                            <Ionicons 
                              name={doc.type && doc.type.includes('pdf') ? 'document' : 'document-text'} 
                              size={24} 
                              color="#0047BA" 
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.documentName} numberOfLines={1}>
                              {doc.name || 'Document'}
                            </Text>
                            {doc.size && (
                              <Text style={styles.documentSize}>
                                {(doc.size / 1024).toFixed(2)} KB
                              </Text>
                            )}
                          </View>
                          <Ionicons name="open-outline" size={20} color="#0047BA" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.detailActions}>
                  {selectedPin.status === 'pending' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.approveBtn]} 
                        onPress={() => approveFromMap(selectedPin._id)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]} 
                        onPress={() => rejectFromMap(selectedPin._id)}
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.closeBtn]} 
                    onPress={() => setShowDetail(false)}
                  >
                    <Text style={[styles.actionBtnText, { color: '#0047BA' }]}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animatable.View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
          >
            {currentImages.map((img, idx) => (
              <View key={idx} style={styles.imageViewerPage}>
                <Image 
                  source={{ uri: img }} 
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.imageViewerFooter}>
            <Text style={styles.imageCounter}>
              {selectedImageIndex + 1} / {currentImages.length}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  syncBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToolbar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerWrapper: {
    alignItems: 'center',
  },
  orgBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -8,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#1A365D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 10,
    zIndex: 10,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlBtnActive: {
    backgroundColor: '#0047BA',
  },
  controlBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  statsPanel: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  emptyOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    paddingBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailContent: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  detailDescription: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  detailActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  closeBtn: {
    backgroundColor: '#EFF6FF',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Images and Documents
  detailSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 12,
  },
  imagesGallery: {
    marginTop: 8,
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  documentSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Image Viewer
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerPage: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: width,
    height: height * 0.8,
  },
  imageViewerFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imageCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
});
