import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NewAuthService from '../services/NewAuthService';

const Setup2FAScreen = ({ navigation, route }) => {
  const { userRole, tempToken } = route.params || {};
  const [qrImage, setQrImage] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadQRCode();
  }, []);

  const loadQRCode = async () => {
    setLoading(true);
    try {
      const result = await NewAuthService.setup2FA(tempToken);

      if (result.success) {
        setQrImage(result.qrCode);
        setSecret(result.secret);
      } else {
        Alert.alert('Error', result.error || 'Failed to generate QR code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to setup 2FA. Please try again.');
      console.error('Setup 2FA error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    Clipboard.setString(secret);
    Alert.alert('Copied!', 'Secret key copied to clipboard');
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const result = await NewAuthService.verify2FA(code, tempToken);

      if (result.success) {
        const user = result.user;

        // Check if trainer and needs verification
        if (userRole === 'trainer' && user.verificationStatus === 'pending') {
          Alert.alert(
            'Account Under Verification',
            'Your account has been created successfully. An administrator will review and approve your account.',
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
        } else if (userRole === 'trainee') {
          // Trainee gets immediate access
          Alert.alert(
            'Success!',
            'Your account is now active. You can start using the app.',
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
        } else {
          // Trainer approved or other scenarios
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { user } }],
          });
        }
      } else {
        const errorMsg = result.error || 'Invalid code. Please try again.';
        const attemptsMsg = result.remainingAttempts
          ? `\n\nRemaining attempts: ${result.remainingAttempts}`
          : '';
        Alert.alert('Verification Failed', errorMsg + attemptsMsg);
        setCode(''); // Clear code on error
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
      console.error('Verify 2FA error:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendQR = () => {
    Alert.alert(
      'Regenerate QR Code',
      'Do you want to generate a new QR code? Your previous setup will be invalidated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: loadQRCode
        }
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1a237e', '#0d47a1', '#01579b']} style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Setting up 2FA...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a237e', '#0d47a1', '#01579b']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="shield-lock" size={60} color="#4CAF50" />
            <Text style={styles.title}>Setup Google Authenticator</Text>
            <Text style={styles.subtitle}>
              Scan the QR code below with Google Authenticator app
            </Text>
          </View>

          {/* QR Code */}
          {qrImage && (
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: qrImage }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Secret Key */}
          <View style={styles.secretContainer}>
            <Text style={styles.secretLabel}>Manual Entry Key:</Text>
            <View style={styles.secretBox}>
              <Text style={styles.secretText} selectable>
                {secret}
              </Text>
              <TouchableOpacity onPress={handleCopySecret} style={styles.copyButton}>
                <MaterialCommunityIcons name="content-copy" size={20} color="#4CAF50" />
              </TouchableOpacity>
            </View>
            <Text style={styles.secretHint}>
              Copy this key if you can't scan the QR code
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to setup:</Text>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1.</Text>
              <Text style={styles.instructionText}>
                Open Google Authenticator app on your phone
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2.</Text>
              <Text style={styles.instructionText}>
                Tap "+" and scan the QR code above
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3.</Text>
              <Text style={styles.instructionText}>
                Enter the 6-digit code shown in the app below
              </Text>
            </View>
          </View>

          {/* Code Input */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Enter 6-digit code:</Text>
            <TextInput
              style={styles.codeInput}
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
            style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
            onPress={handleVerifyCode}
            disabled={verifying || code.length !== 6}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>Verify & Continue</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Resend QR */}
          <TouchableOpacity style={styles.resendButton} onPress={handleResendQR}>
            <MaterialCommunityIcons name="refresh" size={18} color="#4CAF50" />
            <Text style={styles.resendText}>Regenerate QR Code</Text>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('NewAuthLogin')}
          >
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    paddingVertical: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#e3f2fd',
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  secretContainer: {
    marginBottom: 25,
  },
  secretLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  secretBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secretText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
  },
  secretHint: {
    color: '#e3f2fd',
    fontSize: 12,
    marginTop: 5,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  instructionNumber: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
    width: 20,
  },
  instructionText: {
    flex: 1,
    color: '#e3f2fd',
    fontSize: 14,
    lineHeight: 20,
  },
  codeContainer: {
    marginBottom: 20,
  },
  codeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 10,
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  verifyButtonDisabled: {
    backgroundColor: '#81C784',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 10,
  },
  resendText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
  },
  backText: {
    color: '#e3f2fd',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default Setup2FAScreen;
