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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import NewAuthService from '../services/NewAuthService';

const { width, height } = Dimensions.get('window');

export default function NewAuthRegisterScreen({ navigation }) {
  const [userType, setUserType] = useState('trainee'); // trainee | trainer | organization
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Trainee fields
  const [traineeCategory, setTraineeCategory] = useState('other');

  // Trainer fields
  const [organizationId, setOrganizationId] = useState('');
  const [workDesignation, setWorkDesignation] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Organization fields
  const [organizationType, setOrganizationType] = useState('NDMA');

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

  // Fetch organizations when trainer tab is selected
  useEffect(() => {
    if (userType === 'trainer') {
      fetchOrganizations();
    }
  }, [userType]);

  const fetchOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      const result = await NewAuthService.getAllOrganizations();
      if (result.success) {
        let orgs = result.organizations;

        // Handle various potential response structures to ensure we get an array
        if (!Array.isArray(orgs)) {
          if (orgs && typeof orgs === 'object') {
            if (Array.isArray(orgs.organizations)) orgs = orgs.organizations;
            else if (Array.isArray(orgs.data)) orgs = orgs.data;
            else orgs = [];
          } else {
            orgs = [];
          }
        }

        setOrganizations(orgs);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]); // Reset on error
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    // Trainer-specific validation
    if (userType === 'trainer') {
      if (!organizationId) {
        Alert.alert('Required', 'Please select an organization');
        return;
      }
      if (!workDesignation) {
        Alert.alert('Required', 'Please enter your work designation');
        return;
      }
    }

    try {
      setLoading(true);

      let result;
      if (userType === 'trainee') {
        result = await NewAuthService.signupTrainee(username, email, password, traineeCategory);
      } else if (userType === 'trainer') {
        result = await NewAuthService.signupTrainer(
          username,
          email,
          password,
          organizationId,
          workDesignation
        );
      } else if (userType === 'organization') {
        result = await NewAuthService.signupOrganization(username, email, password, organizationType);
      }

      if (result.success) {
        const roleMessages = {
          trainee: 'Trainee account created successfully!',
          trainer: 'Trainer account created! Please login to complete 2FA setup.',
          organization: 'Organization registered! Please login to complete setup.',
        };

        if (userType === 'trainee') {
          // Auto-login for Trainee
          setLoading(true); // Keep loading state
          try {
            // Attempt login immediately
            const loginRes = await NewAuthService.login(email, password);
            if (loginRes.success && loginRes.user) {
              // If login success, go to dashboard
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { user: loginRes.user } }],
              });
              return;
            }
          } catch (loginErr) {
            console.warn('Auto-login failed, redirecting to login page', loginErr);
          }
          // If auto-login fails, fall back to manual login
          Alert.alert('Success', 'Account created! Please login.', [
            { text: 'OK', onPress: () => navigation.navigate('NewAuthLogin') }
          ]);
        } else {
          // Trainer / Org (Keep existing flow)
          Alert.alert('Success', roleMessages[userType], [
            {
              text: 'OK',
              onPress: () => navigation.navigate('NewAuthLogin'),
            },
          ]);
        }
      } else {
        Alert.alert('Registration Failed', result.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
                  <MaterialCommunityIcons name="account-plus" size={40} color="#2C5282" />
                </View>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Choose your account type and register</Text>
              </View>

              {/* User Type Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, userType === 'trainee' && styles.tabActive]}
                  onPress={() => setUserType('trainee')}
                >
                  <Ionicons
                    name="person"
                    size={18}
                    color={userType === 'trainee' ? '#FFFFFF' : '#4A5568'}
                  />
                  <Text style={[styles.tabText, userType === 'trainee' && styles.tabTextActive]}>
                    Trainee
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, userType === 'trainer' && styles.tabActive]}
                  onPress={() => setUserType('trainer')}
                >
                  <Ionicons
                    name="school"
                    size={18}
                    color={userType === 'trainer' ? '#FFFFFF' : '#4A5568'}
                  />
                  <Text style={[styles.tabText, userType === 'trainer' && styles.tabTextActive]}>
                    Trainer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, userType === 'organization' && styles.tabActive]}
                  onPress={() => setUserType('organization')}
                >
                  <Ionicons
                    name="business"
                    size={18}
                    color={userType === 'organization' ? '#FFFFFF' : '#4A5568'}
                  />
                  <Text
                    style={[styles.tabText, userType === 'organization' && styles.tabTextActive]}
                  >
                    Organization
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Common Fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your username"
                  placeholderTextColor="#A0AEC0"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
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

              {/* User Type Specific Fields */}
              {userType === 'trainee' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={traineeCategory}
                      onValueChange={setTraineeCategory}
                      style={styles.picker}
                    >
                      <Picker.Item label="Community Volunteer" value="community_volunteer" />
                      <Picker.Item label="Government Officer" value="govt_officer" />
                      <Picker.Item label="First Responder" value="responder" />
                      <Picker.Item label="Student" value="student" />
                      <Picker.Item label="Other" value="other" />
                    </Picker>
                  </View>
                </View>
              )}

              {userType === 'trainer' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Organization</Text>
                    {loadingOrgs ? (
                      <ActivityIndicator size="small" color="#2C5282" />
                    ) : (
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={organizationId}
                          onValueChange={setOrganizationId}
                          style={styles.picker}
                        >
                          <Picker.Item label="Select Organization" value="" />
                          {Array.isArray(organizations) && organizations.map((org) => (
                            <Picker.Item
                              key={org._id}
                              label={`${org.username} (${org.organizationType})`}
                              value={org._id}
                            />
                          ))}
                        </Picker>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Work Designation</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Disaster Management Officer"
                      placeholderTextColor="#A0AEC0"
                      value={workDesignation}
                      onChangeText={setWorkDesignation}
                      autoCapitalize="words"
                    />
                  </View>
                </>
              )}

              {userType === 'organization' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Organization Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={organizationType}
                      onValueChange={setOrganizationType}
                      style={styles.picker}
                    >
                      <Picker.Item label="NDMA (National Disaster Management Authority)" value="NDMA" />
                      <Picker.Item label="SDMA (State Disaster Management Authority)" value="SDMA" />
                      <Picker.Item label="ATI (Administrative Training Institute)" value="ATI" />
                      <Picker.Item label="NGO (Non-Governmental Organization)" value="NGO" />
                      <Picker.Item label="Other" value="OTHER" />
                    </Picker>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
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

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('NewAuthLogin')}
                activeOpacity={0.7}
                style={styles.helperButton}
              >
                <Text style={styles.helperTextRegister}>
                  Already have an account? <Text style={styles.helperTextBold}>Sign in</Text>
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
  pickerContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFBFF',
    overflow: 'hidden',
  },
  picker: {
    height: 52,
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
