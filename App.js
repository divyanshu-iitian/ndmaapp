import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              AsyncStorage.clear();
            }}
          >
            <Text style={styles.errorButtonText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import AddTrainingScreen from './src/screens/AddTrainingScreen';
import MapScreen from './src/screens/MapScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AuthorityReportsScreen from './src/screens/AuthorityReportsScreen';
import AuthorityHomeScreen from './src/screens/AuthorityHomeScreen';
import AuthorityAnalyticsScreen from './src/screens/AuthorityAnalyticsScreen';
import AuthorityMapScreen from './src/screens/AuthorityMapScreen';
import AuthorityLiveMapScreen from './src/screens/AuthorityLiveMapScreen';
import TraineeHomeScreen from './src/screens/TraineeHomeScreen';
import TraineeMapScreen from './src/screens/TraineeMapScreen';
import AttendanceSessionScreen from './src/screens/AttendanceSessionScreen';
import JoinAttendanceScreen from './src/screens/JoinAttendanceScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = ({ route, navigation }) => {
  const user = route?.params?.user;

  // Safety check for user data
  React.useEffect(() => {
    if (!user || !user.id || !user.role) {
      if (__DEV__) console.error('MainTabs: Invalid user data', user);
      Alert.alert(
        'Session Error',
        'User session is invalid. Please login again.',
        [
          {
            text: 'Login',
            onPress: () => {
              AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [user]);

  // Show loading state while checking
  if (!user || !user.id || !user.role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' }}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#1A202C', fontWeight: '600' }}>
          Loading session...
        </Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0056D2',
        tabBarInactiveTintColor: '#718096',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 72,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'ellipse-outline';
          const iconSize = focused ? 24 : 22;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'AddTraining':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Reports':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Explore':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              break;
          }

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      {user?.role === 'authority' ? (
        <>
          <Tab.Screen name="Home" component={AuthorityHomeScreen} initialParams={{ user }} />
          <Tab.Screen name="Map" component={AuthorityMapScreen} initialParams={{ user }} options={{ title: 'GIS Explorer' }} />
          <Tab.Screen name="Reports" component={AuthorityReportsScreen} initialParams={{ user }} options={{ title: 'Approvals' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ user }} />
        </>
      ) : user?.role === 'trainee' ? (
        <>
          <Tab.Screen name="Home" component={TraineeHomeScreen} initialParams={{ user }} />
          <Tab.Screen name="Map" component={TraineeMapScreen} initialParams={{ user }} />
          <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ user }} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={HomeScreen} initialParams={{ user }} />
          <Tab.Screen name="AddTraining" component={AddTrainingScreen} initialParams={{ user }} options={{ title: 'Add' }} />
          <Tab.Screen name="Map" component={MapScreen} initialParams={{ user }} />
          <Tab.Screen name="Reports" component={ReportsScreen} initialParams={{ user }} />
          <Tab.Screen name="Explore" component={ExploreScreen} initialParams={{ user }} />
          <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ user }} />
        </>
      )}
    </Tab.Navigator>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');
  const [initialParams, setInitialParams] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [debugMessage, setDebugMessage] = useState('1. App component mounted.');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setDebugMessage('2. checkSession started. Checking AsyncStorage...');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedUser) {
        setDebugMessage('3. User found in AsyncStorage. Parsing...');
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setDebugMessage('4. User state set. Ready to navigate to MainTabs.');
      } else {
        setDebugMessage('3. No user in AsyncStorage. Ready to navigate to Auth.');
        setUser(null);
      }
    } catch (error) {
      setDebugMessage(`Error in checkSession: ${error.message}`);
      console.error('Failed to load user from session:', error);
      setUser(null);
    } finally {
      setDebugMessage('5. checkSession finished. Setting isReady to true.');
      setIsReady(true);
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 15, fontSize: 16, textAlign: 'center' }}>Loading App...</Text>
        <Text style={{ marginTop: 20, fontSize: 12, color: 'grey', textAlign: 'center' }}>{debugMessage}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{ 
            headerShown: false,
            gestureEnabled: true,
            cardStyleInterpolator: ({ current }) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabs}
            initialParams={initialParams}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen} 
            options={{ 
              headerShown: true,
              headerTitle: 'Data Analytics',
              headerStyle: { 
                backgroundColor: '#1A365D',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: '#2C5282',
              },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { 
                fontWeight: '600',
                fontSize: 18,
                letterSpacing: 0.3,
              },
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen 
            name="Analytics" 
            component={AnalyticsScreen} 
            options={{ 
              headerShown: true,
              headerTitle: 'Training Analytics',
              headerStyle: { 
                backgroundColor: '#1A365D',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: '#2C5282',
              },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { 
                fontWeight: '600',
                fontSize: 18,
                letterSpacing: 0.3,
              },
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen 
            name="AttendanceSession" 
            component={AttendanceSessionScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="JoinAttendance" 
            component={JoinAttendanceScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AuthorityAnalytics" 
            component={AuthorityAnalyticsScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AuthorityLiveMap" 
            component={AuthorityLiveMapScreen} 
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  errorButton: {
    backgroundColor: '#0056D2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
