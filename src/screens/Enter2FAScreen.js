import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NewAuthService from '../services/NewAuthService';

const Enter2FAScreen = ({ navigation, route }) => {
  const { tempToken, email } = route.params || {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code from Google Authenticator');
      return;
    }

    setLoading(true);
    try {
      const result = await NewAuthService.verify2FA(code, tempToken);
      
      if (result.success) {
        const user = result.user;
        
        // Check if trainer needs verification approval
        if (user.role === 'trainer' && user.verificationStatus === 'pending') {
          Alert.alert(
            'Account Under Verification',
            'Your trainer account is pending admin approval. You will be notified once approved.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.replace('TrainerVerificationPending', {
                    verificationStatus: 'pending'
                  });
                }
              }
            ]
          );
        } else {
          // User is approved or trainee - navigate to main app
          Alert.alert(
            'Login Successful',
            `Welcome back, ${user.name || 'User'}!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs', params: { user } }],
                  });
                }
              }
            ]
          );
        }
      } else {
        const errorMsg = result.error || 'Invalid 2FA code. Please try again.';
        const attemptsMsg = result.remainingAttempts 
          ? `\n\nRemaining attempts: ${result.remainingAttempts}`
          : '';
        Alert.alert('Verification Failed', errorMsg + attemptsMsg);
        setCode('');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
      console.error('2FA verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient colors={['#1a237e', '#0d47a1', '#01579b']} style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="shield-check" size={80} color="#4CAF50" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from Google Authenticator
        </Text>
        {email && (
          <Text style={styles.email}>{email}</Text>
        )}

        {/* Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#9E9E9E"
            autoFocus
          />
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="login" size={20} color="#fff" />
              <Text style={styles.verifyButtonText}>Verify & Login</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <MaterialCommunityIcons name="information" size={18} color="#e3f2fd" />
          <Text style={styles.helpText}>
            Open Google Authenticator app and enter the 6-digit code shown for this account
          </Text>
        </View>

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#e3f2fd',
    textAlign: 'center',
    marginBottom: 10,
  },
  email: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 25,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 15,
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    backgroundColor: '#81C784',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  helpContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  helpText: {
    flex: 1,
    color: '#e3f2fd',
    fontSize: 14,
    marginLeft: 10,
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default Enter2FAScreen;
