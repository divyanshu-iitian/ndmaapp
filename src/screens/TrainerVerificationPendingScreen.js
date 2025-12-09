import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NewAuthService from '../services/NewAuthService';

const TrainerVerificationPendingScreen = ({ navigation, route }) => {
  const [verificationStatus, setVerificationStatus] = useState(route.params?.verificationStatus || 'pending');
  const [notes, setNotes] = useState('');
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let pollInterval;

    const checkStatus = async () => {
      try {
        const result = await NewAuthService.getVerificationStatus();
        
        if (result.success) {
          setVerificationStatus(result.verificationStatus);
          setNotes(result.notes || '');

          // Auto-redirect if approved
          if (result.verificationStatus === 'approved') {
            setPolling(false);
            Alert.alert(
              'Account Approved! 🎉',
              'Your trainer account has been verified. You can now login.',
              [
                {
                  text: 'Login Now',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'NewAuthLogin' }],
                    });
                  }
                }
              ]
            );
          }
        }
      } catch (error) {
        console.log('Poll error:', error);
      }
    };

    if (polling && verificationStatus === 'pending') {
      checkStatus();
      pollInterval = setInterval(checkStatus, 15000); // Poll every 15 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [polling, verificationStatus, navigation]);

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Please contact your administrator for assistance:\n\nsupport@ndma.gov.in',
      [{ text: 'OK' }]
    );
  };

  const handleBackToLogin = () => {
    setPolling(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'NewAuthLogin' }],
    });
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'pending':
        return { name: 'clock-outline', color: '#FFA500' };
      case 'approved':
        return { name: 'check-circle', color: '#4CAF50' };
      case 'rejected':
        return { name: 'close-circle', color: '#F44336' };
      default:
        return { name: 'help-circle', color: '#9E9E9E' };
    }
  };

  const getStatusText = () => {
    switch (verificationStatus) {
      case 'pending':
        return 'Your trainer account is under verification';
      case 'approved':
        return 'Your account has been approved!';
      case 'rejected':
        return 'Account verification was not approved';
      default:
        return 'Verification status unknown';
    }
  };

  const getStatusDescription = () => {
    switch (verificationStatus) {
      case 'pending':
        return 'Your account is being reviewed by an administrator. This usually takes 24-48 hours. You will be notified once approved.';
      case 'approved':
        return 'You can now access all trainer features. Click the button below to login.';
      case 'rejected':
        return 'Unfortunately, your account verification was not approved. Please contact support for more information.';
      default:
        return 'Please wait while we check your verification status.';
    }
  };

  const statusIcon = getStatusIcon();

  return (
    <LinearGradient colors={['#1a237e', '#0d47a1', '#01579b']} style={styles.container}>
      <View style={styles.content}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={statusIcon.name}
            size={100}
            color={statusIcon.color}
          />
        </View>

        {/* Status Text */}
        <Text style={styles.title}>{getStatusText()}</Text>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusIcon.color }]}>
          <Text style={styles.statusText}>
            {verificationStatus.toUpperCase()}
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{getStatusDescription()}</Text>

        {/* Admin Notes */}
        {notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Admin Notes:</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* Polling Indicator */}
        {polling && verificationStatus === 'pending' && (
          <View style={styles.pollingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.pollingText}>
              Checking for updates...
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {verificationStatus === 'rejected' && (
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleContactSupport}
            >
              <MaterialCommunityIcons name="email" size={20} color="#fff" />
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          )}

          {verificationStatus === 'approved' && (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleBackToLogin}
            >
              <Text style={styles.loginButtonText}>Login Now</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToLogin}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  description: {
    fontSize: 16,
    color: '#e3f2fd',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  notesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  notesLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  notesText: {
    color: '#e3f2fd',
    fontSize: 14,
    lineHeight: 20,
  },
  pollingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  pollingText: {
    color: '#e3f2fd',
    fontSize: 14,
    marginLeft: 10,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  supportButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
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

export default TrainerVerificationPendingScreen;
