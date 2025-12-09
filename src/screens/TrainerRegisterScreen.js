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

const TrainerRegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    instituteName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegister = async () => {
    const { instituteName, contactPerson, email, phone, password, confirmPassword } = formData;
    
    if (!instituteName || !contactPerson || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Trainer Registration attempt:', email);
      
      // Use MongoDBService for registration
      const result = await MongoDBService.registerUser({
        name: contactPerson.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: 'trainer',
        organization: instituteName.trim(),
        phone: phone.trim(),
      });
      
      if (result.success) {
        console.log('✅ Registration successful:', result.user.email);
        
        // Check if verification is required
        if (result.next === 'pending') {
          // Account needs admin approval
          Alert.alert(
            'Account Under Review',
            'Your account has been created and is pending verification. You will be notified once approved.',
            [
              { 
                text: 'OK', 
                onPress: () => {
                  navigation.navigate('VerificationPending', {
                    verificationStatus: 'pending',
                    notes: ''
                  });
                }
              }
            ]
          );
        } else if (result.next === 'verify') {
          // Email OTP verification required
          Alert.alert(
            'Verify Your Email',
            'A verification code has been sent to your email.',
            [
              { 
                text: 'OK', 
                onPress: () => {
                  navigation.navigate('OTPVerification', {
                    email: email.trim().toLowerCase()
                  });
                }
              }
            ]
          );
        } else {
          // Legacy flow - direct login (for backward compatibility)
          const userData = { userId: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role || 'trainer' };
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          await AsyncStorage.setItem('userId', result.user.id);
          await AsyncStorage.setItem('userName', result.user.name);
          await AsyncStorage.setItem('userEmail', result.user.email);
          await AsyncStorage.setItem('userRole', result.user.role || 'trainer');
          
          Alert.alert('Success', `Welcome, ${result.user.name}! Your account has been created.`, [
            { 
              text: 'OK', 
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TrainerDashboard' }],
                });
              }
            }
          ]);
        }
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
        colors={['#4CAF50', '#45a049', '#2E7D32']}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>👨‍🏫</Text>
                <Text style={styles.subtitle}>Training Institute Registration</Text>
                <Text style={styles.description}>
                  Join the disaster management training network
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Institute Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter institute name"
                    placeholderTextColor="#A5A5A5"
                    value={formData.instituteName}
                    onChangeText={(value) => handleInputChange('instituteName', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Contact Person *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter contact person name"
                    placeholderTextColor="#A5A5A5"
                    value={formData.contactPerson}
                    onChangeText={(value) => handleInputChange('contactPerson', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    placeholderTextColor="#A5A5A5"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
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
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter institute address"
                    placeholderTextColor="#A5A5A5"
                    value={formData.address}
                    onChangeText={(value) => handleInputChange('address', value)}
                    multiline
                    numberOfLines={3}
                    autoCapitalize="sentences"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password (min 6 characters)"
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
                    {loading ? 'Registering...' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
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
    color: '#E8F5E8',
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
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#E8F5E8',
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

export default TrainerRegisterScreen;