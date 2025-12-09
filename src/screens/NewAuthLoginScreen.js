import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NewAuthService from '../services/NewAuthService';

const { width, height } = Dimensions.get('window');

export default function NewAuthLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2FAInput, setShow2FAInput] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
  }, []);

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert('Required', 'Please enter email and password');
      return;
    }

    if (show2FAInput && !otp) {
      Alert.alert('Required', 'Please enter the 6-digit OTP from your authenticator app');
      return;
    }

    try {
      setLoading(true);

      const result = await NewAuthService.login(email, password, show2FAInput ? otp : null);

      if (!result.success) {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
        return;
      }

      // Check if 2FA is required
      if (result.requires2FA && !show2FAInput) {
        setShow2FAInput(true);
        Alert.alert('2FA Required', 'Please enter the 6-digit code from your authenticator app');
        return;
      }

      // Login successful - check next steps
      if (result.requires2FASetup) {
        navigation.replace('Setup2FA');
        return;
      }

      if (result.requiresDocumentUpload) {
        navigation.replace('DocumentUpload');
        return;
      }

      // Check verification status
      const statusResult = await NewAuthService.getVerificationStatus();
      
      if (statusResult.success) {
        const { role, verificationStatus, rejectionReason } = statusResult;

        if (role === 'trainer' && verificationStatus === 'pending') {
          navigation.replace('TrainerVerificationPending');
          return;
        }

        if (role === 'organization' && verificationStatus === 'pending') {
          navigation.replace('OrganizationVerificationPending');
          return;
        }

        if (verificationStatus === 'rejected') {
          Alert.alert(
            'Account Rejected',
            `Your account was rejected.\n\nReason: ${rejectionReason || 'No reason provided'}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Navigate to main app
      navigation.replace('MainTabs', { user: result.user });
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first');
      return;
    }

    try {
      const result = await NewAuthService.requestPasswordReset(email);
      if (result.success) {
        Alert.alert('Success', 'Password reset link sent to your email');
      } else {
        Alert.alert('Error', result.message || 'Failed to send reset link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request password reset');
    }
  };

  const handleBackFrom2FA = () => {
    setShow2FAInput(false);
    setOtp('');
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrapper}>
            <Animated.View
              style={[
                styles.pulse,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="shield-account" size={40} color="#2C5282" />
                </View>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>
              </View>

              {show2FAInput && (
                <TouchableOpacity onPress={handleBackFrom2FA} style={styles.backButton}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color="#2C5282" />
                  <Text style={styles.backButtonText}>Back to email/password</Text>
                </TouchableOpacity>
              )}

              {!show2FAInput ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your.email@example.com"
                      placeholderTextColor="#A0AEC0"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#A0AEC0"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.inputGroup}>
                  <View style={styles.otpHeader}>
                    <MaterialCommunityIcons name="shield-key" size={24} color="#2C5282" />
                    <Text style={styles.inputLabel}>Enter 2FA Code</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit code"
                    placeholderTextColor="#A0AEC0"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.helperText}>
                    Open your authenticator app and enter the 6-digit code
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Signing you in…' : show2FAInput ? 'Verify & Login' : 'Sign in'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('NewAuthRegister')}
                activeOpacity={0.7}
                style={styles.helperButton}
              >
                <Text style={styles.helperTextRegister}>
                  Don't have an account? <Text style={styles.helperTextBold}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 24,
    minHeight: height,
    justifyContent: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    top: -width * 0.35,
    borderRadius: width,
    backgroundColor: '#2E86AB',
  },
  card: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 28,
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
    gap: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5282',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 6,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFBFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A202C',
  },
  helperText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 6,
    fontStyle: 'italic',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C5282',
  },
  primaryButton: {
    backgroundColor: '#2C5282',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2C5282',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  helperButton: {
    alignItems: 'center',
  },
  helperTextRegister: {
    fontSize: 14,
    color: '#4A5568',
  },
  helperTextBold: {
    fontWeight: '700',
    color: '#2C5282',
    textDecorationLine: 'underline',
  },
});
