import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewAuthService from '../services/NewAuthService';

export default function DocumentUploadScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Trainer documents
  const [govtIdCard, setGovtIdCard] = useState(null);

  // Organization documents
  const [registrationCertificate, setRegistrationCertificate] = useState(null);
  const [gstCertificate, setGstCertificate] = useState(null);
  const [authorizationLetter, setAuthorizationLetter] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserRole(user.role);
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const pickDocument = async (documentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success' || !result.canceled) {
        const file = result.assets ? result.assets[0] : result;
        
        switch (documentType) {
          case 'govtIdCard':
            setGovtIdCard(file);
            break;
          case 'registrationCertificate':
            setRegistrationCertificate(file);
            break;
          case 'gstCertificate':
            setGstCertificate(file);
            break;
          case 'authorizationLetter':
            setAuthorizationLetter(file);
            break;
          case 'additional':
            setAdditionalDocs([...additionalDocs, file]);
            break;
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = (documentType, index = null) => {
    switch (documentType) {
      case 'govtIdCard':
        setGovtIdCard(null);
        break;
      case 'registrationCertificate':
        setRegistrationCertificate(null);
        break;
      case 'gstCertificate':
        setGstCertificate(null);
        break;
      case 'authorizationLetter':
        setAuthorizationLetter(null);
        break;
      case 'additional':
        if (index !== null) {
          setAdditionalDocs(additionalDocs.filter((_, i) => i !== index));
        }
        break;
    }
  };

  const handleUpload = async () => {
    try {
      // Validation
      if (userRole === 'trainer') {
        if (!govtIdCard) {
          Alert.alert('Required', 'Please upload your Government ID Card');
          return;
        }
      } else if (userRole === 'organization') {
        if (!registrationCertificate || !gstCertificate || !authorizationLetter) {
          Alert.alert('Required', 'Please upload all required documents:\n- Registration Certificate\n- GST Certificate\n- Authorization Letter');
          return;
        }
      }

      setUploading(true);

      // Create FormData
      const formData = new FormData();

      if (userRole === 'trainer') {
        formData.append('govtIdCard', {
          uri: Platform.OS === 'ios' ? govtIdCard.uri.replace('file://', '') : govtIdCard.uri,
          name: govtIdCard.name || 'govt_id.jpg',
          type: govtIdCard.mimeType || 'image/jpeg',
        });
      } else if (userRole === 'organization') {
        formData.append('registrationCertificate', {
          uri: Platform.OS === 'ios' ? registrationCertificate.uri.replace('file://', '') : registrationCertificate.uri,
          name: registrationCertificate.name || 'registration.pdf',
          type: registrationCertificate.mimeType || 'application/pdf',
        });

        formData.append('gstCertificate', {
          uri: Platform.OS === 'ios' ? gstCertificate.uri.replace('file://', '') : gstCertificate.uri,
          name: gstCertificate.name || 'gst.pdf',
          type: gstCertificate.mimeType || 'application/pdf',
        });

        formData.append('authorizationLetter', {
          uri: Platform.OS === 'ios' ? authorizationLetter.uri.replace('file://', '') : authorizationLetter.uri,
          name: authorizationLetter.name || 'authorization.pdf',
          type: authorizationLetter.mimeType || 'application/pdf',
        });

        // Add additional documents
        additionalDocs.forEach((doc, index) => {
          formData.append('additionalDocs', {
            uri: Platform.OS === 'ios' ? doc.uri.replace('file://', '') : doc.uri,
            name: doc.name || `additional_${index}.pdf`,
            type: doc.mimeType || 'application/pdf',
          });
        });
      }

      // Upload documents
      const result = await NewAuthService.uploadOrganizationDocuments(formData);

      if (result.success) {
        Alert.alert(
          'Success',
          'Documents uploaded successfully!\n\nYour application is now pending verification.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Check verification status and navigate accordingly
                const status = await NewAuthService.getVerificationStatus();
                
                if (userRole === 'trainer') {
                  navigation.replace('TrainerVerificationPending');
                } else if (userRole === 'organization') {
                  navigation.replace('OrganizationVerificationPending');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const renderDocumentPicker = (label, documentType, file, required = true) => (
    <View style={styles.documentPickerContainer}>
      <View style={styles.documentLabelContainer}>
        <Text style={styles.documentLabel}>{label}</Text>
        {required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      
      {file ? (
        <View style={styles.selectedFileContainer}>
          <View style={styles.fileInfo}>
            <MaterialCommunityIcons name="file-document" size={24} color="#2C5282" />
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name || 'Document selected'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => removeDocument(documentType)}
            style={styles.removeButton}
          >
            <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickDocument(documentType)}
        >
          <MaterialCommunityIcons name="cloud-upload" size={24} color="#2C5282" />
          <Text style={styles.uploadButtonText}>Choose File</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading || !userRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5282" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="file-upload" size={40} color="#2C5282" />
            </View>
            <Text style={styles.headerTitle}>Upload Documents</Text>
            <Text style={styles.headerSubtitle}>
              {userRole === 'trainer'
                ? 'Please upload your Government ID for verification'
                : 'Please upload required organization documents for verification'}
            </Text>
          </View>

          <View style={styles.formSection}>
            {userRole === 'trainer' ? (
              <>
                {renderDocumentPicker('Government ID Card', 'govtIdCard', govtIdCard, true)}
                <Text style={styles.helpText}>
                  Upload a clear photo or scan of your government-issued ID card (Aadhaar, PAN, Driver's License, etc.)
                </Text>
              </>
            ) : (
              <>
                {renderDocumentPicker('Registration Certificate', 'registrationCertificate', registrationCertificate, true)}
                {renderDocumentPicker('GST Certificate', 'gstCertificate', gstCertificate, true)}
                {renderDocumentPicker('Authorization Letter', 'authorizationLetter', authorizationLetter, true)}
                
                <View style={styles.additionalDocsSection}>
                  <Text style={styles.sectionTitle}>Additional Documents (Optional)</Text>
                  {additionalDocs.map((doc, index) => (
                    <View key={index} style={styles.selectedFileContainer}>
                      <View style={styles.fileInfo}>
                        <MaterialCommunityIcons name="file-document" size={24} color="#2C5282" />
                        <Text style={styles.fileName} numberOfLines={1}>
                          {doc.name || `Document ${index + 1}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeDocument('additional', index)}
                        style={styles.removeButton}
                      >
                        <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={() => pickDocument('additional')}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={24} color="#2C5282" />
                    <Text style={styles.addMoreText}>Add More Documents</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.helpText}>
                  Please upload all required documents. Additional supporting documents can help expedite the verification process.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
              activeOpacity={0.88}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Upload Documents</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 28,
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A5568',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  formSection: {
    marginTop: 8,
  },
  documentPickerContainer: {
    marginBottom: 20,
  },
  documentLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  requiredStar: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderStyle: 'dashed',
    backgroundColor: '#FAFBFF',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#2C5282',
    fontWeight: '600',
    marginLeft: 8,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#EBF4FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#90CDF4',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 8,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  additionalDocsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FAFBFF',
    marginTop: 12,
  },
  addMoreText: {
    fontSize: 14,
    color: '#2C5282',
    fontWeight: '600',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C5282',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: '#2C5282',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
