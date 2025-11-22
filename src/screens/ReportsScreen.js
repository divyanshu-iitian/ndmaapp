import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Image, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ReportsService from '../services/ReportsService';
import OrganizationPicker from '../components/OrganizationPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReportsScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('NDMA');
  const [loading, setLoading] = useState(false);
  
  // Image viewer states
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  useEffect(() => {
    loadReports();
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Reports screen focused - reloading...');
      loadReports();
    });
    return unsubscribe;
  }, [navigation]);

  const loadReports = async () => {
    setLoading(true);
    console.log('--- ReportsScreen: Starting to load reports ---');
    try {
      console.log('--- ReportsScreen: Calling ReportsService.getUserReports (token-based) ---');
      const result = await ReportsService.getUserReports();

      if (result.success) {
        console.log(`✅ ReportsScreen: Successfully fetched ${result.reports.length} reports from cloud.`);
        setReports(result.reports);
      } else {
        console.error('❌ ReportsScreen: Failed to fetch reports from cloud.', result.error);
        Alert.alert('Error', result.error || 'Could not load reports from the cloud.');
        setReports([]);
      }
    } catch (error) {
      console.error('❌ ReportsScreen: A critical error occurred in loadReports.', error);
      Alert.alert('Critical Error', 'An unexpected error occurred while loading reports.');
      setReports([]);
    } finally {
      console.log('--- ReportsScreen: Finished loading reports ---');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const viewReport = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const deleteReport = async (reportId) => {
    Alert.alert('Delete Report', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const result = await ReportsService.deleteReport(reportId);
            
            if (result.success) {
              const updated = reports.filter(r => r._id !== reportId);
              setReports(updated);
              setShowDetailModal(false);
              Alert.alert('Success', 'Report deleted');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete report');
            }
          } catch (error) {
            Alert.alert('Error', `Failed to delete: ${error.message}`);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const editReport = (report) => {
    setShowDetailModal(false);
    navigation.navigate('AddTraining', { editReport: report });
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training Reports</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTraining')}>
          <Ionicons name="add-circle" size={28} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyText}>No reports yet</Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {reports.map((report, index) => (
              <TouchableOpacity 
                key={report.id || index} 
                style={styles.reportCard}
                onPress={() => viewReport(report)}
              >
                <View style={styles.reportHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{report.trainingType || 'Training'}</Text>
                    <Text style={styles.reportDate}> {report.date}</Text>
                    {report.location && (
                      <Text style={styles.reportLocation}> {report.location.name || 'Location'}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Report Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Training Type</Text>
                  <Text style={styles.detailValue}>{selectedReport.trainingType}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}> {selectedReport.date}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Participants</Text>
                  <Text style={styles.detailValue}> {selectedReport.participants}</Text>
                </View>

                {selectedReport.duration && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}> {selectedReport.duration}</Text>
                  </View>
                )}

                {selectedReport.effectiveness && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Effectiveness</Text>
                    <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '600' }]}>
                       {selectedReport.effectiveness}
                    </Text>
                  </View>
                )}

                {selectedReport.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedReport.description}</Text>
                  </View>
                )}

                {selectedReport.location && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                       {selectedReport.location.name || 'Training Location'}
                    </Text>
                    <Text style={styles.detailCoords}>
                      {selectedReport.location.latitude.toFixed(4)}, {selectedReport.location.longitude.toFixed(4)}
                    </Text>
                  </View>
                )}

                {selectedReport.photos && selectedReport.photos.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Images ({selectedReport.photos.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesGallery}>
                      {selectedReport.photos.map((img, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          onPress={() => openImageViewer(selectedReport.photos, idx)}
                        >
                          <Image source={{ uri: img }} style={styles.galleryImage} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedReport.documents && selectedReport.documents.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Attached Files ({selectedReport.documents.length})</Text>
                    {selectedReport.documents.map((file, idx) => (
                      <View key={idx} style={styles.fileItem}>
                        <View style={styles.fileIcon}>
                          <Ionicons 
                            name={file.type && file.type.includes('pdf') ? 'document' : 'document-text'} 
                            size={24} 
                            color="#10B981" 
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fileName}>{file.name}</Text>
                          {file.size && <Text style={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</Text>}
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
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => editReport(selectedReport)}
                  >
                    <Ionicons name="create" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Edit Report</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => deleteReport(selectedReport._id)}
                  >
                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                    onPress={() => { setShowSendModal(true); setSelectedOrg(selectedReport.sentToOrganization || 'NDMA'); }}
                  >
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Send to Authority</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
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
            <Ionicons name="close-circle" size={40} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageViewerScroll}
            contentOffset={{ x: selectedImageIndex * 400, y: 0 }}
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
              <Text style={styles.imageActionText}>Download</Text>
            </TouchableOpacity>

            <Text style={styles.imageCounter}>
              {selectedImageIndex + 1} / {currentImages.length}
            </Text>

            <TouchableOpacity 
              style={styles.imageActionButton}
              onPress={() => {
                Sharing.shareAsync(currentImages[selectedImageIndex]);
              }}
            >
              <Ionicons name="share-social" size={24} color="#FFFFFF" />
              <Text style={styles.imageActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Send to Authority Modal */}
      <Modal visible={showSendModal} transparent animationType="slide" onRequestClose={() => setShowSendModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Report to Organization</Text>
              <TouchableOpacity onPress={() => setShowSendModal(false)}>
                <Ionicons name="close-circle" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12 }}>
              <OrganizationPicker value={selectedOrg} onChange={(v) => setSelectedOrg(v)} />
            </View>

            <View style={{ marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                onPress={async () => {
                  try {
                    // Check for accessToken (new auth system)
                    const accessToken = await AsyncStorage.getItem('accessToken');
                    if (!accessToken) {
                      Alert.alert('Not logged in', 'Please login to send reports');
                      return;
                    }

                    const res = await ReportsService.sendReport(selectedReport._id, selectedOrg);
                    if (res.success) {
                      Alert.alert('Sent', `Report sent to ${selectedOrg}`);
                      // update local list
                      const updated = reports.map(r => r._id === res.report._id ? res.report : r);
                      setReports(updated);
                      setShowSendModal(false);
                      setShowDetailModal(false);
                    } else {
                      Alert.alert('Error', res.error || 'Failed to send');
                    }
                  } catch (error) {
                    console.error('Send modal error:', error);
                    Alert.alert('Error', 'Failed to send report');
                  }
                }}
              >
                <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Send</Text>
              </TouchableOpacity>
            </View>
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
    borderBottomColor: '#E5E7EB' 
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  reportsList: { padding: 16 },
  reportCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  reportDate: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  reportLocation: { fontSize: 12, color: '#9CA3AF' },
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
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Image Viewer Styles
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
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageViewerPage: {
    width: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: 380,
    height: 500,
  },
  imageViewerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  imageActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportsScreen;
