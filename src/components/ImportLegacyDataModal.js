import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import ReportsService from '../services/ReportsService';

const ImportLegacyDataModal = ({ visible, onClose, onImportSuccess }) => {
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState('manual'); // 'manual' | 'csv'
  
  // Manual entry fields
  const [trainingDate, setTrainingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState({
    name: '',
    latitude: '',
    longitude: '',
  });
  const [trainingType, setTrainingType] = useState('');
  const [participants, setParticipants] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  
  // CSV import
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTrainingDate(selectedDate);
    }
  };

  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        Alert.alert('Success', `File selected: ${result.assets[0].name}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick CSV file');
    }
  };

  const validateManualEntry = () => {
    if (!location.name || !location.latitude || !location.longitude) {
      Alert.alert('Error', 'Location details are required');
      return false;
    }
    if (!trainingType) {
      Alert.alert('Error', 'Training type is required');
      return false;
    }
    if (isNaN(location.latitude) || isNaN(location.longitude)) {
      Alert.alert('Error', 'Invalid latitude/longitude');
      return false;
    }
    return true;
  };

  const handleManualImport = async () => {
    if (!validateManualEntry()) return;

    setImporting(true);
    try {
      const reportData = {
        userName: 'NDMA Legacy Data',
        userEmail: 'legacy@ndma.gov.in',
        trainingType,
        location: {
          name: location.name,
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
        },
        date: trainingDate.toISOString().split('T')[0],
        participants: participants ? Number(participants) : 0,
        duration: duration || '',
        description: description || 'Imported from legacy data',
        effectiveness: '',
        photos: [],
        documents: [],
      };

      const result = await ReportsService.createReport(reportData);

      if (result.success) {
        Alert.alert('Success', 'Legacy data imported successfully!');
        resetForm();
        onImportSuccess && onImportSuccess();
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to import data');
      }
    } catch (error) {
      Alert.alert('Error', `Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleCSVImport = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a CSV file first');
      return;
    }

    setImporting(true);
    try {
      // TODO: Parse CSV and create multiple reports
      // For now, show alert
      Alert.alert(
        'CSV Import',
        'CSV parsing feature coming soon! Please use manual entry for now.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `CSV import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setTrainingDate(new Date());
    setLocation({ name: '', latitude: '', longitude: '' });
    setTrainingType('');
    setParticipants('');
    setDuration('');
    setDescription('');
    setSelectedFile(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Import Legacy Data</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, importType === 'manual' && styles.tabActive]}
              onPress={() => setImportType('manual')}
            >
              <Ionicons
                name="create"
                size={20}
                color={importType === 'manual' ? '#007AFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  importType === 'manual' && styles.tabTextActive,
                ]}
              >
                Manual Entry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, importType === 'csv' && styles.tabActive]}
              onPress={() => setImportType('csv')}
            >
              <Ionicons
                name="document-text"
                size={20}
                color={importType === 'csv' ? '#007AFF' : '#6B7280'}
              />
              <Text
                style={[styles.tabText, importType === 'csv' && styles.tabTextActive]}
              >
                CSV Import
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {importType === 'manual' ? (
              <>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {trainingDate.toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={trainingDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}

                <Text style={styles.label}>Location Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Delhi Training Center"
                  value={location.name}
                  onChangeText={(text) =>
                    setLocation({ ...location, name: text })
                  }
                />

                <Text style={styles.label}>Latitude *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 28.6139"
                  keyboardType="decimal-pad"
                  value={location.latitude}
                  onChangeText={(text) =>
                    setLocation({ ...location, latitude: text })
                  }
                />

                <Text style={styles.label}>Longitude *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 77.2090"
                  keyboardType="decimal-pad"
                  value={location.longitude}
                  onChangeText={(text) =>
                    setLocation({ ...location, longitude: text })
                  }
                />

                <Text style={styles.label}>Training Type *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Earthquake Response"
                  value={trainingType}
                  onChangeText={setTrainingType}
                />

                <Text style={styles.label}>Participants</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 50"
                  keyboardType="numeric"
                  value={participants}
                  onChangeText={setParticipants}
                />

                <Text style={styles.label}>Duration (hours)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 8"
                  value={duration}
                  onChangeText={setDuration}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional details..."
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />

                <TouchableOpacity
                  style={[styles.submitButton, importing && styles.submitButtonDisabled]}
                  onPress={handleManualImport}
                  disabled={importing}
                >
                  <Text style={styles.submitButtonText}>
                    {importing ? 'Importing...' : 'Import Data'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.csvInstructions}>
                  <Ionicons name="information-circle" size={24} color="#3B82F6" />
                  <Text style={styles.csvInstructionsText}>
                    CSV should have columns: date, location_name, latitude, longitude,
                    training_type, participants, duration, description
                  </Text>
                </View>

                <TouchableOpacity style={styles.pickFileButton} onPress={pickCSVFile}>
                  <Ionicons name="cloud-upload" size={24} color="#10B981" />
                  <Text style={styles.pickFileText}>
                    {selectedFile ? selectedFile.name : 'Select CSV File'}
                  </Text>
                </TouchableOpacity>

                {selectedFile && (
                  <TouchableOpacity
                    style={[styles.submitButton, importing && styles.submitButtonDisabled]}
                    onPress={handleCSVImport}
                    disabled={importing}
                  >
                    <Text style={styles.submitButtonText}>
                      {importing ? 'Importing...' : 'Import CSV Data'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  csvInstructions: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 12,
  },
  csvInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  pickFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 12,
  },
  pickFileText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
});

export default ImportLegacyDataModal;
