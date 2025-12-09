import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import MongoDBService from '../services/MongoDBService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OrganizationPicker from '../components/OrganizationPicker';

const { width, height } = Dimensions.get('window');

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('trainer'); // trainer | trainee | authority
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('trainer');
  const [organization, setOrganization] = useState('NDMA');
  
  // Trainee-specific fields
  const [phone, setPhone] = useState('');
  const [ageBracket, setAgeBracket] = useState('18-25');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [consentLocation, setConsentLocation] = useState(false);
  const [consentAttendance, setConsentAttendance] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);

  // Ensure we always pass a safe user object to navigation/MainTabs
  const sanitizeUser = (u = {}) => {
    if (!u) {
      if (__DEV__) console.warn('sanitizeUser: received null/undefined user');
      u = {};
    }
    
    const id = u?.id || u?._id || u?.userId || u?.email || `user_${Date.now()}`;
    const roleVal = u?.role || activeTab || role || 'trainer';
    const orgVal = u?.organization || organization || 'NDMA';
    
    const sanitized = {
      ...u,
      id,
      role: roleVal,
      organization: orgVal,
    };
    
    if (__DEV__) {
      console.log('sanitizeUser INPUT:', JSON.stringify(u, null, 2));
      console.log('sanitizeUser OUTPUT:', JSON.stringify(sanitized, null, 2));
    }
    
    return sanitized;
  };
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

    return () => {
      entrance.stop();
      pulseLoop.stop();
    };
  }, [fadeAnim, slideAnim, pulseAnim]);

  // Force login mode when authority tab is selected
  useEffect(() => {
    if (activeTab === 'authority') {
      setIsLogin(true);
    }
  }, [activeTab]);

  const handleAuth = async () => {
    // Trainee flow (phone-based)
    if (activeTab === 'trainee') {
      if (isLogin) {
        // Trainee login with phone
        if (!phone || !password) {
          Alert.alert('Error', 'Please enter phone number and password');
          return;
        }

        setLoading(true);
        try {
          // For trainee login, we use phone as email (backend accepts phone as password initially)
          const result = await MongoDBService.loginUser(phone, password);
          if (result.success) {
            // Check if account requires verification
            if (result.requiresVerification) {
              Alert.alert(
                'Account Verification Required',
                'Your account is pending verification. Please wait for approval.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.navigate('VerificationPending', {
                        verificationStatus: result.verificationStatus || 'pending',
                        notes: result.notes || ''
                      });
                    }
                  }
                ]
              );
              return;
            }

            if (__DEV__) console.log('Trainee login successful, user data:', result.user);
            
            // Save both access and refresh tokens
            if (result.accessToken && result.refreshToken) {
              await AsyncStorage.setItem('accessToken', result.accessToken);
              await AsyncStorage.setItem('refreshToken', result.refreshToken);
            } else if (result.token) {
              // Fallback for old token format
              await AsyncStorage.setItem('accessToken', result.token);
            }
            
            const sessionPayload = { ...result.user, token: result.accessToken || result.token || null };
            await AsyncStorage.setItem('@ndma_session_user', JSON.stringify(sessionPayload));
            // Store userData for ProfileScreen compatibility
            await AsyncStorage.setItem('userData', JSON.stringify(result.user));

            const userName = result.user?.name || 'Trainee';
            Alert.alert('Success', `Welcome, ${userName}!`, [
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    const safeUser = sanitizeUser(result.user || {});
                    const token = result.accessToken || result.token || (await AsyncStorage.getItem('accessToken'));
                    await AsyncStorage.setItem('@ndma_session_user', JSON.stringify({ ...safeUser, token: token || null }));
                    await AsyncStorage.setItem('userData', JSON.stringify(safeUser));
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'MainTabs', params: { user: safeUser } }],
                    });
                  } catch (navError) {
                    Alert.alert('Navigation Error', 'Failed to navigate. Please restart the app.');
                    if (__DEV__) console.error('Navigation error:', navError);
                  }
                },
              },
            ]);
          } else {
            Alert.alert('Login Failed', result.error || 'Invalid phone or password');
          }
        } catch (error) {
          Alert.alert('Error', 'Login failed. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        // Trainee registration
        if (!name || !phone || !email || !password) {
          Alert.alert('Error', 'Please enter name, phone number, email, and password');
          return;
        }

        if (phone.length !== 10) {
          Alert.alert('Error', 'Phone number must be exactly 10 digits');
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Alert.alert('Error', 'Please enter a valid email address');
          return;
        }

        if (!consentLocation || !consentAttendance) {
          Alert.alert('Consent Required', 'Please accept both consent agreements to register');
          return;
        }

        setLoading(true);
        try {
          const traineeData = {
            name,
            phone,
            email, // Use the email entered by user
            password, // Add password for trainee registration
            role: 'trainee',
            age_bracket: ageBracket,
            district,
            state,
            consent_location: consentLocation,
            consent_attendance: consentAttendance,
          };

          const result = await MongoDBService.registerUser(traineeData);
          if (result.success) {
            if (__DEV__) console.log('Trainee registration successful, user data:', result.user);
            
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
              return;
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
                        email: email
                      });
                    }
                  }
                ]
              );
              return;
            }
            
            // Legacy flow - auto-approved trainees
            // Save both access and refresh tokens
            if (result.accessToken && result.refreshToken) {
              await AsyncStorage.setItem('accessToken', result.accessToken);
              await AsyncStorage.setItem('refreshToken', result.refreshToken);
            } else if (result.token) {
              // Fallback for old token format
              await AsyncStorage.setItem('accessToken', result.token);
            }
            
            const sessionPayload = { ...result.user, token: result.accessToken || result.token || null };
            await AsyncStorage.setItem('@ndma_session_user', JSON.stringify(sessionPayload));
            // Store userData for ProfileScreen compatibility
            await AsyncStorage.setItem('userData', JSON.stringify(result.user));

            const userName = result.user?.name || 'Trainee';
            Alert.alert(
              'Success',
              `Welcome, ${userName}! Your trainee account is ready.`,
              [
                {
                  text: 'OK',
                  onPress: async () => {
                    try {
                      const safeUser = sanitizeUser(result.user || {});
                      const token = result.accessToken || result.token || (await AsyncStorage.getItem('accessToken'));
                      await AsyncStorage.setItem('@ndma_session_user', JSON.stringify({ ...safeUser, token: token || null }));
                      await AsyncStorage.setItem('userData', JSON.stringify(safeUser));
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'MainTabs', params: { user: safeUser } }],
                      });
                    } catch (navError) {
                      Alert.alert('Navigation Error', 'Failed to navigate. Please restart the app.');
                      if (__DEV__) console.error('Navigation error:', navError);
                    }
                  },
                },
              ]
            );
          } else {
            Alert.alert('Registration Failed', result.error || 'Registration failed');
          }
        } catch (error) {
          Alert.alert('Error', 'Registration failed. Please try again.');
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    // Trainer/Authority flow (email-based)
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && (!name || !confirmPassword)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await MongoDBService.loginUser(email, password);
        if (result.success) {
          // Check if account requires verification
          if (result.requiresVerification) {
            Alert.alert(
              'Account Verification Required',
              'Your account is pending verification. Please wait for approval.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.navigate('VerificationPending', {
                      verificationStatus: result.verificationStatus || 'pending',
                      notes: result.notes || ''
                    });
                  }
                }
              ]
            );
            return;
          }

          if (__DEV__) console.log('Login successful, user data:', result.user);
          
          // Save both access and refresh tokens
          if (result.accessToken && result.refreshToken) {
            await AsyncStorage.setItem('accessToken', result.accessToken);
            await AsyncStorage.setItem('refreshToken', result.refreshToken);
          } else if (result.token) {
            // Fallback for old token format
            await AsyncStorage.setItem('accessToken', result.token);
          }
          
          const sessionPayload = { ...result.user, token: result.accessToken || result.token || null };
          await AsyncStorage.setItem('@ndma_session_user', JSON.stringify(sessionPayload));
          // Store userData for ProfileScreen compatibility
          await AsyncStorage.setItem('userData', JSON.stringify(result.user));

          const tokenValue = result.accessToken || result.token || (await AsyncStorage.getItem('accessToken'));
          if (!tokenValue) {
            Alert.alert('Cloud Login Required', 'Unable to obtain secure session token. Please check your internet connection and try logging in again.');
            return;
          }
          
          const userName = result.user?.name || 'User';
          Alert.alert('Success', `Welcome back, ${userName}!`, [
            {
              text: 'OK',
              onPress: async () => {
                try {
                  const safeUser = sanitizeUser(result.user || {});
                  const token = result.accessToken || result.token || (await AsyncStorage.getItem('accessToken'));
                  await AsyncStorage.setItem('@ndma_session_user', JSON.stringify({ ...safeUser, token: token || null }));
                  await AsyncStorage.setItem('userData', JSON.stringify(safeUser));
                  navigation.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'MainTabs',
                        params: { user: safeUser },
                      },
                    ],
                  });
                } catch (navError) {
                  Alert.alert('Navigation Error', 'Failed to navigate. Please restart the app.');
                  if (__DEV__) console.error('Navigation error:', navError);
                }
              },
            },
          ]);
        } else {
          Alert.alert('Login Failed', result.error || 'Invalid credentials');
        }
      } else {
  const result = await MongoDBService.registerUser({ 
    name, 
    email, 
    password, 
    role: activeTab, // 'trainer' or 'authority'
    organization 
  });
        if (result.success) {
          if (__DEV__) console.log('Trainer/Authority registration successful, user data:', result.user);
          
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
            return;
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
                      email: email
                    });
                  }
                }
              ]
            );
            return;
          }
          
          // Legacy flow - auto-approved users
          // Save both access and refresh tokens
          if (result.accessToken && result.refreshToken) {
            await AsyncStorage.setItem('accessToken', result.accessToken);
            await AsyncStorage.setItem('refreshToken', result.refreshToken);
          } else if (result.token) {
            // Fallback for old token format
            await AsyncStorage.setItem('accessToken', result.token);
          }
          
          const sessionPayload = { ...result.user, token: result.accessToken || result.token || null };
          await AsyncStorage.setItem('@ndma_session_user', JSON.stringify(sessionPayload));
          // Store userData for ProfileScreen compatibility
          await AsyncStorage.setItem('userData', JSON.stringify(result.user));

          const tokenValue = result.accessToken || result.token || (await AsyncStorage.getItem('accessToken'));
          if (!tokenValue) {
            Alert.alert('Cloud Login Required', 'Unable to obtain secure session token. Please check your internet connection and try registering again.');
            return;
          }
          
          const userName = result.user?.name || 'User';
          Alert.alert('Success', `Welcome, ${userName}! Your account has been created.`, [
                {
                  text: 'OK',
                  onPress: async () => {
                    try {
                      const safeUser = sanitizeUser(result.user || {});
                      const token = result.accessToken || result.token || (await AsyncStorage.getItem('accessToken'));
                      await AsyncStorage.setItem('@ndma_session_user', JSON.stringify({ ...safeUser, token: token || null }));
                      await AsyncStorage.setItem('userData', JSON.stringify(safeUser));
                      navigation.reset({
                        index: 0,
                        routes: [
                          {
                            name: 'MainTabs',
                            params: { user: safeUser },
                          },
                        ],
                      });
                    } catch (navError) {
                      Alert.alert('Navigation Error', 'Failed to navigate. Please restart the app.');
                      if (__DEV__) console.error('Navigation error:', navError);
                    }
                  },
                }
          ]);
        } else {
          Alert.alert('Registration Failed', result.error || 'Registration failed');
        }
      }
    } catch (error) {
      Alert.alert('Error', isLogin ? 'Login failed. Please try again.' : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showDemoCredentials = () => {
    const message = 
      `🎓 TRAINER DEMO ACCOUNTS:\n\n` +
      `NDMA Trainer:\n` +
      `📧 divyanshu@ndma.gov.in\n` +
      `🔒 123456\n\n` +
      
      `LBSNAA Trainer:\n` +
      `📧 trainer@lbsnaa.gov.in\n` +
      `🔒 123456\n\n` +
      
      `ATI Trainer:\n` +
      `📧 trainer@ati.gov.in\n` +
      `🔒 123456\n\n` +
      
      `SDMA Trainer:\n` +
      `📧 trainer@sdma.gov.in\n` +
      `🔒 123456\n\n` +
      
      `📱 TRAINEE DEMO ACCOUNT:\n\n` +
      `Phone: 9999999999\n` +
      `🔒 trainee123\n\n` +
      
      `👤 AUTHORITY LOGIN:\n` +
      `Use Authority tab (login only)\n` +
      `📧 authority@training.gov.in\n` +
      `🔒 authority123`;
    
    Alert.alert('Demo Credentials', message, [{ text: 'OK' }]);
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18],
  });

  const emojiScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrapper}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulse,
                {
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
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
                  <MaterialIcons name="security" size={48} color="#2C5282" />
                </View>
                <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Register account'}</Text>
                <Text style={styles.subtitle}>
                  Access your training workspace.
                </Text>
              </View>

              {/* User Type Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'trainer' && styles.tabActive]}
                  onPress={() => setActiveTab('trainer')}
                  activeOpacity={0.85}
                >
                  <FontAwesome5 
                    name="chalkboard-teacher" 
                    size={16} 
                    color={activeTab === 'trainer' ? '#FFFFFF' : '#4A5568'} 
                  />
                  <Text style={[styles.tabText, activeTab === 'trainer' && styles.tabTextActive]}>Trainer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'trainee' && styles.tabActive]}
                  onPress={() => setActiveTab('trainee')}
                  activeOpacity={0.85}
                >
                  <Ionicons 
                    name="person" 
                    size={18} 
                    color={activeTab === 'trainee' ? '#FFFFFF' : '#4A5568'} 
                  />
                  <Text style={[styles.tabText, activeTab === 'trainee' && styles.tabTextActive]}>Trainee</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'authority' && styles.tabActive]}
                  onPress={() => setActiveTab('authority')}
                  activeOpacity={0.85}
                >
                  <MaterialIcons 
                    name="verified-user" 
                    size={18} 
                    color={activeTab === 'authority' ? '#FFFFFF' : '#4A5568'} 
                  />
                  <Text style={[styles.tabText, activeTab === 'authority' && styles.tabTextActive]}>Authority</Text>
                </TouchableOpacity>
              </View>

              {/* Login/Register Toggle - Hide for Authority */}
              {activeTab !== 'authority' && (
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
                    onPress={() => setIsLogin(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
                    onPress={() => setIsLogin(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Register</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Authority Login Only Message */}
              {activeTab === 'authority' && (
                <View style={styles.authorityLoginNotice}>
                  <MaterialIcons name="info" size={20} color="#2C5282" />
                  <Text style={styles.authorityLoginText}>
                    Authority login only. No registration required.
                  </Text>
                </View>
              )}

              {/* Trainee Form */}
              {activeTab === 'trainee' && !isLogin && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="eg. Rajesh Kumar"
                      placeholderTextColor="#A0AEC0"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#A0AEC0"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

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
                    <Text style={styles.inputLabel}>Age bracket</Text>
                    <Picker
                      selectedValue={ageBracket}
                      onValueChange={setAgeBracket}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select age bracket" value="" />
                      <Picker.Item label="18-25" value="18-25" />
                      <Picker.Item label="26-35" value="26-35" />
                      <Picker.Item label="36-45" value="36-45" />
                      <Picker.Item label="46-60" value="46-60" />
                      <Picker.Item label="60+" value="60+" />
                    </Picker>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>District</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="eg. Mumbai"
                      placeholderTextColor="#A0AEC0"
                      value={district}
                      onChangeText={setDistrict}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="eg. Maharashtra"
                      placeholderTextColor="#A0AEC0"
                      value={state}
                      onChangeText={setState}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Create a password"
                      placeholderTextColor="#A0AEC0"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.consentContainer}>
                    <TouchableOpacity
                      style={styles.consentRow}
                      onPress={() => setConsentLocation(!consentLocation)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.checkbox, consentLocation && styles.checkboxChecked]}>
                        {consentLocation && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.consentText}>
                        I consent to share my location during attendance
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.consentRow}
                      onPress={() => setConsentAttendance(!consentAttendance)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.checkbox, consentAttendance && styles.checkboxChecked]}>
                        {consentAttendance && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.consentText}>
                        I consent to attendance tracking and record keeping
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Trainee Login Form */}
              {activeTab === 'trainee' && isLogin && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#A0AEC0"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#A0AEC0"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </>
              )}

              {/* Trainer/Authority Form - Only show registration for Trainer */}
              {activeTab === 'trainer' && !isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="eg. Divyanshu Mishra"
                    placeholderTextColor="#A0AEC0"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {activeTab !== 'trainee' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@organization.gov.in"
                    placeholderTextColor="#A0AEC0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {activeTab !== 'trainee' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#A0AEC0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {activeTab !== 'trainee' && !isLogin && activeTab === 'trainer' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat your password"
                    placeholderTextColor="#A0AEC0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {activeTab === 'trainer' && !isLogin && (
                <View style={styles.inputGroup}>
                  <OrganizationPicker value={organization} onChange={setOrganization} />
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabled]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>
                  {loading 
                    ? (isLogin ? 'Signing you in…' : 'Creating account…') 
                    : activeTab === 'authority' 
                      ? 'Authority Login' 
                      : (isLogin ? 'Sign in' : 'Create account')
                  }
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={showDemoCredentials}
                activeOpacity={0.7}
                style={styles.helperButton}
              >
                <Text style={styles.helperText}>Use demo credentials instead</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#1A365D',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  toggleTextActive: {
    color: '#FFFFFF',
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
  helperButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  helperText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C5282',
    textDecorationLine: 'underline',
  },
  authorityLoginNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EBF8FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90CDF4',
    marginBottom: 16,
  },
  authorityLoginText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5282',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  roleChipActive: {
    borderColor: '#1A365D',
    backgroundColor: '#1A365D',
  },
  roleChipText: {
    fontWeight: '700',
    color: '#2D3748',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 20,
    padding: 4,
    marginBottom: 18,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1A365D',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  picker: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFBFF',
  },
  consentContainer: {
    marginVertical: 12,
    gap: 12,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    backgroundColor: '#FAFBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#2C5282',
    borderColor: '#2C5282',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    lineHeight: 20,
  },
});

export default AuthScreen;
