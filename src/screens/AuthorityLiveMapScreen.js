import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ReportsService from '../services/ReportsService';
import { getOrganizationColor, getOrganizationName } from '../utils/organizationLogos';

const { width } = Dimensions.get('window');

const AuthorityLiveMapScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showOrgFilter, setShowOrgFilter] = useState(false);
  const [stats, setStats] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.6139, // Delhi coordinates as default
    longitude: 77.2090,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  const organizations = ['all', 'NDMA', 'LBSNAA', 'ATI', 'SDMA'];

  useEffect(() => {
    fetchLiveMapData();
  }, [selectedOrg, selectedDate]);

  const fetchLiveMapData = async () => {
    try {
      setLoading(true);
      
      // Format date as YYYY-MM-DD
      const dateString = selectedDate.toISOString().split('T')[0];
      
      const response = await ReportsService.getLiveMapData(
        selectedOrg !== 'all' ? selectedOrg : null,
        dateString
      );

      if (response.success) {
        setReports(response.reports);
        setStats(response.stats);

        // Center map on first report if available
        if (response.reports.length > 0) {
          const firstReport = response.reports[0];
          setMapRegion({
            latitude: firstReport.location.latitude,
            longitude: firstReport.location.longitude,
            latitudeDelta: 5,
            longitudeDelta: 5,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching live map data:', error);
      Alert.alert('Error', 'Failed to load training locations');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderOrganizationFilter = () => (
    <Modal
      visible={showOrgFilter}
      transparent
      animationType="slide"
      onRequestClose={() => setShowOrgFilter(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Organization</Text>
            <TouchableOpacity onPress={() => setShowOrgFilter(false)}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.orgList}>
            {organizations.map((org) => (
              <TouchableOpacity
                key={org}
                style={[
                  styles.orgItem,
                  selectedOrg === org && styles.orgItemSelected,
                ]}
                onPress={() => {
                  setSelectedOrg(org);
                  setShowOrgFilter(false);
                }}
              >
                <View
                  style={[
                    styles.orgColorDot,
                    { backgroundColor: getOrganizationColor(org) },
                  ]}
                />
                <Text
                  style={[
                    styles.orgItemText,
                    selectedOrg === org && styles.orgItemTextSelected,
                  ]}
                >
                  {org === 'all' ? 'All Organizations' : getOrganizationName(org)}
                </Text>
                {selectedOrg === org && (
                  <Ionicons name="checkmark" size={24} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderStatsBar = () => (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Ionicons name="location" size={20} color="#3B82F6" />
        <Text style={styles.statValue}>{reports.length}</Text>
        <Text style={styles.statLabel}>Trainings</Text>
      </View>

      {stats?.byOrganization && (
        <View style={styles.statItem}>
          <Ionicons name="business" size={20} color="#10B981" />
          <Text style={styles.statValue}>
            {Object.keys(stats.byOrganization).length}
          </Text>
          <Text style={styles.statLabel}>Organizations</Text>
        </View>
      )}

      <View style={styles.statItem}>
        <Ionicons name="people" size={20} color="#F59E0B" />
        <Text style={styles.statValue}>{stats?.total || 0}</Text>
        <Text style={styles.statLabel}>Total Reports</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Training Map</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchLiveMapData}
        >
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowOrgFilter(true)}
        >
          <Ionicons name="business" size={20} color="#3B82F6" />
          <Text style={styles.filterButtonText}>
            {selectedOrg === 'all' ? 'All Orgs' : selectedOrg}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#3B82F6" />
          <Text style={styles.filterButtonText}>{formatDate(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      {!loading && renderStatsBar()}

      {/* Map */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading training locations...</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No trainings found</Text>
          <Text style={styles.emptySubtext}>
            Try selecting a different date or organization
          </Text>
        </View>
      ) : (
        <MapView style={styles.map} region={mapRegion}>
          {reports.map((report, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: report.location.latitude,
                longitude: report.location.longitude,
              }}
              pinColor={getOrganizationColor(report.userOrganization)}
            >
              <View
                style={[
                  styles.customMarker,
                  {
                    backgroundColor: getOrganizationColor(
                      report.userOrganization
                    ),
                  },
                ]}
              >
                <Ionicons name="business" size={20} color="#FFFFFF" />
              </View>
              <Callout
                style={styles.callout}
                onPress={() =>
                  navigation.navigate('ReportDetail', { reportId: report._id })
                }
              >
                <View style={styles.calloutContent}>
                  <Text style={styles.calloutOrg}>{report.userOrganization}</Text>
                  <Text style={styles.calloutTitle}>{report.trainingType}</Text>
                  <Text style={styles.calloutLocation}>
                    📍 {report.location.name}
                  </Text>
                  <Text style={styles.calloutTrainer}>
                    👤 {report.userName}
                  </Text>
                  {report.hasLiveAttendance && (
                    <View style={styles.attendanceBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.attendanceBadgeText}>
                        {report.attendanceCount} attended
                      </Text>
                    </View>
                  )}
                  <Text style={styles.calloutDate}>
                    🗓️ {new Date(report.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.calloutTap}>Tap to view details</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Organization Filter Modal */}
      {renderOrganizationFilter()}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3B82F6',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  customMarker: {
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
    shadowRadius: 3,
    elevation: 5,
  },
  callout: {
    width: 250,
  },
  calloutContent: {
    padding: 10,
    gap: 6,
  },
  calloutOrg: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  calloutLocation: {
    fontSize: 14,
    color: '#4B5563',
  },
  calloutTrainer: {
    fontSize: 13,
    color: '#6B7280',
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  attendanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  calloutDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  calloutTap: {
    fontSize: 11,
    color: '#3B82F6',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  orgList: {
    padding: 10,
  },
  orgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
    gap: 12,
  },
  orgItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  orgColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  orgItemText: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
  },
  orgItemTextSelected: {
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default AuthorityLiveMapScreen;
