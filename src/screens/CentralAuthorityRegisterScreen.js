import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MongoDBService from '../services/MongoDBService';

const CentralAuthorityRegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    department: '',
    officialEmail: '',
    phone: '',
    employeeId: '',
    officeAddress: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const departments = [
    'NDMA',
    'SDMA',
    'DDMA',
    'Ministry of Home Affairs',
    'State Government',
    'District Administration',
    'Other'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegister = async () => {
    const { fullName, designation, department, officialEmail, phone, employeeId, password, confirmPassword } = formData;
    
    if (!fullName || !designation || !department || !officialEmail || !phone || !employeeId || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Authority Registration attempt:', officialEmail);
      
      // Use MongoDBService for registration
      const result = await MongoDBService.registerUser({
        name: fullName.trim(),
        email: officialEmail.trim().toLowerCase(),
        password: password,
        role: 'authority',
        organization: department.trim(),
        phone: phone.trim(),
      });
      
      if (result.success) {
        console.log('✅ Registration successful:', result.user.email);
        
        // Save user data to AsyncStorage
        await AsyncStorage.setItem('userToken', result.user.id);
        await AsyncStorage.setItem('userId', result.user.id);
        await AsyncStorage.setItem('userName', result.user.name);
        await AsyncStorage.setItem('userEmail', result.user.email);
        await AsyncStorage.setItem('userRole', result.user.role || 'authority');
        
        Alert.alert(
          'Success', 
          `Welcome, ${result.user.name}! Your authority account has been created.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Navigate to authority dashboard
              navigation.reset({
                index: 0,
                routes: [{ name: 'CentralAuthorityDashboard' }],
              });
            }
          }]
        );
      } else {
        console.log('❌ Registration failed:', result.error);
        Alert.alert('Registration Failed', result.error || 'Unable to create account');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FF9800', '#F57C00', '#E65100']}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>🏛️</Text>
                <Text style={styles.subtitle}>Central Authority Registration</Text>
                <Text style={styles.description}>
                  Request access to the monitoring system
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#A5A5A5"
                    value={formData.fullName}
                    onChangeText={(value) => handleInputChange('fullName', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Designation *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your designation"
                    placeholderTextColor="#A5A5A5"
                    value={formData.designation}
                    onChangeText={(value) => handleInputChange('designation', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Department *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.department}
                      onValueChange={(value) => handleInputChange('department', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Department" value="" />
                      {departments.map((dept, index) => (
                        <Picker.Item key={index} label={dept} value={dept} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Official Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter official email address"
                    placeholderTextColor="#A5A5A5"
                    value={formData.officialEmail}
                    onChangeText={(value) => handleInputChange('officialEmail', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor="#A5A5A5"
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Employee ID *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter employee ID"
                    placeholderTextColor="#A5A5A5"
                    value={formData.employeeId}
                    onChangeText={(value) => handleInputChange('employeeId', value)}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Office Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter office address"
                    placeholderTextColor="#A5A5A5"
                    value={formData.officeAddress}
                    onChangeText={(value) => handleInputChange('officeAddress', value)}
                    multiline
                    numberOfLines={3}
                    autoCapitalize="sentences"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password (min 8 characters)"
                    placeholderTextColor="#A5A5A5"
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#A5A5A5"
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.registerButton, loading && styles.disabledButton]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.registerButtonText}>
                    {loading ? 'Submitting Request...' : 'Request Access'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.noteContainer}>
                  <Text style={styles.noteText}>
                    Note: Your registration request will be reviewed by the system administrator. 
                    You will receive a confirmation email once approved.
                  </Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have access?</Text>
                <TouchableOpacity
                  onPress={handleLogin}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLink}>Login Here</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 50,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#FFF3E0',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  picker: {
    height: 50,
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#FF9800',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noteContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  noteText: {
    color: '#FFF3E0',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#FFF3E0',
    fontSize: 16,
    marginBottom: 5,
  },
  loginLink: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default CentralAuthorityRegisterScreen;