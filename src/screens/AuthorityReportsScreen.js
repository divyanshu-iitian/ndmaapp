import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, ScrollView, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ReportsService from '../services/ReportsService';

const { width, height } = Dimensions.get('window');

export default function AuthorityReportsScreen() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const res = await ReportsService.getAllReports();
    if (res.success) {
      setReports(res.reports);
      calculateStats(res.reports);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const calculateStats = (allReports) => {
    setStats({
      pending: allReports.filter(r => r.status === 'pending').length,
      approved: allReports.filter(r => r.status === 'accepted').length,
      rejected: allReports.filter(r => r.status === 'rejected').length,
      total: allReports.length,
    });
  };

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === (filter === 'approved' ? 'accepted' : filter);
    const matchesSearch = searchQuery === '' || 
      r.trainingType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApprove = async (reportId) => {
    Alert.alert(
      'Approve Training',
      'Are you sure you want to approve this training report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const res = await ReportsService.approveReport(reportId);
            if (res.success) {
              Alert.alert('Success', 'Training report approved');
              loadReports();
              setDetailVisible(false);
            } else {
              Alert.alert('Error', res.error || 'Failed to approve');
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }
    const res = await ReportsService.rejectReport(selectedReport._id, rejectReason);
    if (res.success) {
      Alert.alert('Success', 'Training report rejected');
      setRejectVisible(false);
      setDetailVisible(false);
      setRejectReason('');
      loadReports();
    } else {
      Alert.alert('Error', res.error || 'Failed to reject');
    }
  };

  const handleDelete = async (reportId) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to permanently delete this training report? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await ReportsService.deleteReport(reportId);
            if (res.success) {
              Alert.alert('Success', 'Training report deleted permanently');
              loadReports();
              setDetailVisible(false);
            } else {
              Alert.alert('Error', res.error || 'Failed to delete report');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderReportCard = ({ item }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => {
        setSelectedReport(item);
        setDetailVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.trainingType || 'Training'}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.userName || 'Unknown'} • {item.location?.name || 'No location'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status)} size={14} color="#FFF" />
          <Text style={styles.statusText}>{(item.status || 'pending').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>{item.date || 'No date'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>{item.participants || 0} participants</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>{item.duration || 'Not specified'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => {
          setSelectedReport(item);
          setDetailVisible(true);
        }}>
          <Ionicons name="eye-outline" size={18} color="#0047BA" />
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
        
        {item.status === 'pending' && (
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickBtn, styles.approveBtn]}
              onPress={() => handleApprove(item._id)}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickBtn, styles.rejectBtn]}
              onPress={() => {
                setSelectedReport(item);
                setRejectVisible(true);
              }}
            >
              <Ionicons name="close" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item._id)}
            >
              <Ionicons name="trash" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Show delete button for approved/rejected reports too */}
        {(item.status === 'accepted' || item.status === 'rejected') && (
          <TouchableOpacity 
            style={[styles.quickBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item._id)}
          >
            <Ionicons name="trash" size={16} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const filterOptions = [
    { key: 'all', label: 'All', icon: 'layers-outline', count: stats.total },
    { key: 'pending', label: 'Pending', icon: 'time-outline', count: stats.pending },
    { key: 'approved', label: 'Approved', icon: 'checkmark-circle-outline', count: stats.approved },
    { key: 'rejected', label: 'Rejected', icon: 'close-circle-outline', count: stats.rejected },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Approvals</Text>
          <Text style={styles.headerSubtitle}>{filteredReports.length} reports</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color="#0047BA" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by trainer, location, or type..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filterOptions.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterChip, filter === opt.key && styles.filterChipActive]}
            onPress={() => setFilter(opt.key)}
          >
            <Ionicons 
              name={opt.icon} 
              size={16} 
              color={filter === opt.key ? '#FFF' : '#4B5563'} 
            />
            <Text style={[styles.filterChipText, filter === opt.key && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
            <View style={[styles.countBadge, filter === opt.key && styles.countBadgeActive]}>
              <Text style={[styles.countText, filter === opt.key && styles.countTextActive]}>
                {opt.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reports List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047BA" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Reports Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search' : 'No reports in this category'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item._id}
          renderItem={renderReportCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0047BA']} />
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDetailVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailVisible(false)}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedReport && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Status Badge */}
              <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedReport.status) }]}>
                <Ionicons name={getStatusIcon(selectedReport.status)} size={20} color="#FFF" />
                <Text style={styles.modalStatusText}>
                  {(selectedReport.status || 'pending').toUpperCase()}
                </Text>
              </View>

              {/* Title */}
              <Text style={styles.modalTrainingTitle}>{selectedReport.trainingType || 'Training'}</Text>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoItemLabel}>Trainer</Text>
                    <Text style={styles.infoItemValue}>{selectedReport.userName || 'Unknown'}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={20} color="#6B7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoItemLabel}>Location</Text>
                    <Text style={styles.infoItemValue}>{selectedReport.location?.name || 'Not specified'}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoItemLabel}>Date</Text>
                    <Text style={styles.infoItemValue}>{selectedReport.date || 'Not specified'}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="people-outline" size={20} color="#6B7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoItemLabel}>Participants</Text>
                    <Text style={styles.infoItemValue}>{selectedReport.participants || 0} people</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoItemLabel}>Duration</Text>
                    <Text style={styles.infoItemValue}>{selectedReport.duration || 'Not specified'}</Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              {selectedReport.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{selectedReport.description}</Text>
                </View>
              )}

              {/* Action Buttons */}
              {selectedReport.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveActionBtn]}
                    onPress={() => handleApprove(selectedReport._id)}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectActionBtn]}
                    onPress={() => {
                      setDetailVisible(false);
                      setRejectVisible(true);
                    }}
                  >
                    <Ionicons name="close-circle" size={22} color="#FFF" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Delete Button - Available for all statuses */}
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteActionBtn]}
                onPress={() => handleDelete(selectedReport._id)}
              >
                <Ionicons name="trash" size={22} color="#FFF" />
                <Text style={styles.actionBtnText}>Delete Report</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={rejectVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRejectVisible(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Reject Training Report</Text>
            <Text style={styles.rejectModalSubtitle}>Please provide a reason for rejection</Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#9CA3AF"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.rejectModalActions}>
              <TouchableOpacity 
                style={[styles.rejectModalBtn, styles.cancelBtn]}
                onPress={() => {
                  setRejectVisible(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.rejectModalBtn, styles.confirmRejectBtn]}
                onPress={handleReject}
              >
                <Text style={styles.confirmRejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },

  // Filters
  filtersContainer: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0047BA',
    borderColor: '#0047BA',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  countTextActive: {
    color: '#FFF',
  },

  // List
  listContent: {
    padding: 20,
    paddingTop: 8,
  },

  // Report Card
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0047BA',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  deleteBtn: {
    backgroundColor: '#DC2626',
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },

  // Detail Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
    marginTop: 20,
    marginBottom: 16,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  modalTrainingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  infoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoItemLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveActionBtn: {
    backgroundColor: '#10B981',
  },
  rejectActionBtn: {
    backgroundColor: '#EF4444',
  },
  deleteActionBtn: {
    backgroundColor: '#DC2626',
    marginTop: 10,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // Reject Modal
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  rejectModalSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 120,
    marginBottom: 20,
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmRejectBtn: {
    backgroundColor: '#EF4444',
  },
  confirmRejectBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
