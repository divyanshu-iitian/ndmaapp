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

const CentralAuthorityLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Authority Login attempt:', email);
      
      // Use MongoDBService for authentication
      const result = await MongoDBService.loginUser(email.trim().toLowerCase(), password);
      
      if (result.success) {
        console.log('✅ Login successful:', result.user.email);
        
        // Save user data to AsyncStorage
        await AsyncStorage.setItem('userToken', result.user.id);
        await AsyncStorage.setItem('userId', result.user.id);
        await AsyncStorage.setItem('userName', result.user.name);
        await AsyncStorage.setItem('userEmail', result.user.email);
        await AsyncStorage.setItem('userRole', result.user.role || 'authority');
        
        Alert.alert('Success', `Welcome back, ${result.user.name}!`, [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to authority dashboard
              navigation.reset({
                index: 0,
                routes: [{ name: 'CentralAuthorityDashboard' }],
              });
            }
          }
        ]);
      } else {
        console.log('❌ Login failed:', result.error);
        Alert.alert('Login Failed', result.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Error', 'Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate('CentralAuthorityRegister');
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
                <Text style={styles.subtitle}>Central Authority Login</Text>
                <Text style={styles.description}>
                  Access the centralized monitoring dashboard
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Official Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your official email"
                    placeholderTextColor="#A5A5A5"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#A5A5A5"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? 'Logging in...' : 'Login'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Need access to the system?</Text>
                <TouchableOpacity
                  onPress={handleRegister}
                  activeOpacity={0.7}
                >
                  <Text style={styles.registerLink}>Request Access</Text>
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
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 60,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#FFF3E0',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
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
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
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
  loginButtonText: {
    color: '#FF9800',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    color: '#FFF3E0',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#FFF3E0',
    fontSize: 16,
    marginBottom: 5,
  },
  registerLink: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default CentralAuthorityLoginScreen;