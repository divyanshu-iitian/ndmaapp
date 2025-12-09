import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NewAuthService from '../services/NewAuthService';

export default function OrganizationVerificationPendingScreen({ navigation }) {
  const [checking, setChecking] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    // Initial check
    checkVerificationStatus();

    // Poll every 15 seconds
    const interval = setInterval(() => {
      checkVerificationStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const checkVerificationStatus = async () => {
    try {
      setChecking(true);
      const result = await NewAuthService.getCurrentUser();

      if (result.success && result.user) {
        const status = result.user.verificationStatus;
        setVerificationStatus(status);

        if (status === 'approved') {
          Alert.alert(
            'Verification Approved! 🎉',
            'Your organization has been verified by the administrator. You can now access all features.',
            [
              {
                text: 'Continue',
                onPress: () => navigation.replace('MainTabs', { user: result.user }),
              },
            ]
          );
        } else if (status === 'rejected') {
          setRejectionReason(result.user.rejectionReason || 'No reason provided');
          Alert.alert(
            'Verification Rejected',
            `Your organization verification was rejected.\n\nReason: ${result.user.rejectionReason || 'No reason provided'}\n\nPlease contact support for assistance.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Verification check error:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to login again to check your verification status.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await NewAuthService.logout();
            navigation.replace('NewAuthLogin');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={verificationStatus === 'rejected' ? 'close-circle' : 'clock-outline'}
              size={64}
              color={verificationStatus === 'rejected' ? '#EF4444' : '#FFA500'}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {verificationStatus === 'rejected'
              ? 'Verification Rejected'
              : 'Verification Pending'}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {verificationStatus === 'rejected'
              ? `Your organization verification was rejected by the administrator.${
                  rejectionReason ? `\n\nReason: ${rejectionReason}` : ''
                }\n\nPlease contact support for assistance.`
              : 'Your organization registration is currently under review by the NDMA administrator.\n\nThis process typically takes 24-48 hours. You will be notified once your organization is verified.'}
          </Text>

          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="account-check" size={24} color="#718096" />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusLabel}>Organization Status</Text>
                <Text
                  style={[
                    styles.statusValue,
                    verificationStatus === 'rejected' && styles.statusRejected,
                  ]}
                >
                  {verificationStatus === 'rejected'
                    ? 'Rejected'
                    : 'Pending Administrator Approval'}
                </Text>
              </View>
            </View>
          </View>

          {/* Checking Indicator */}
          {checking && (
            <View style={styles.checkingContainer}>
              <ActivityIndicator size="small" color="#2C5282" />
              <Text style={styles.checkingText}>Checking status...</Text>
            </View>
          )}

          {/* Info Box */}
          {verificationStatus !== 'rejected' && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={20} color="#2C5282" />
              <Text style={styles.infoText}>
                We check your status automatically every 15 seconds. You don't need to refresh.
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.refreshButton} onPress={checkVerificationStatus}>
              <MaterialCommunityIcons name="refresh" size={24} color="#2C5282" />
              <Text style={styles.refreshButtonText}>Check Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  statusCard: {
    backgroundColor: '#EBF4FF',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#90CDF4',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    color: '#FFA500',
    fontWeight: '700',
  },
  statusRejected: {
    color: '#EF4444',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkingText: {
    fontSize: 13,
    color: '#2C5282',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C5282',
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C5282',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 8,
  },
});
