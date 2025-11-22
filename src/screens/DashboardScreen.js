import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DashboardScreen = ({ navigation, route }) => {
  const user = route?.params?.user || { name: 'User', email: 'user@example.com' };

  // Animation values
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const logoutButtonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      // Header animation
      Animated.parallel([
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Cards animation with stagger
      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Logout button
      Animated.timing(logoutButtonAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = () => {
    const rootNavigator = navigation.getParent()?.getParent();

    if (rootNavigator) {
      rootNavigator.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } else {
      navigation.navigate('Auth');
    }
  };

  const AnimatedCard = ({ children, index }) => {
    const cardTranslateY = cardsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [30 * (index + 1), 0],
    });

    const cardScale = cardsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    });

    return (
      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardsAnim,
            transform: [
              { translateY: cardTranslateY },
              { scale: cardScale },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerFadeAnim,
              transform: [{ translateY: headerSlideAnim }],
            },
          ]}
        >
          <Text style={styles.logoEmoji}>🏛️</Text>
          <Text style={styles.title}>Training Dashboard</Text>
          <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
          <Text style={styles.emailText}>{user.email}</Text>
        </Animated.View>

        <View style={styles.content}>
          <AnimatedCard index={0}>
            <Text style={styles.cardEmoji}>📚</Text>
            <Text style={styles.cardTitle}>Training Modules</Text>
            <Text style={styles.cardDescription}>
              Access disaster management training courses and materials
            </Text>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <Text style={styles.cardEmoji}>📊</Text>
            <Text style={styles.cardTitle}>Progress Tracking</Text>
            <Text style={styles.cardDescription}>
              Monitor your training progress and achievements
            </Text>
          </AnimatedCard>

          <AnimatedCard index={2}>
            <Text style={styles.cardEmoji}>🗺️</Text>
            <Text style={styles.cardTitle}>Resource Center</Text>
            <Text style={styles.cardDescription}>
              Access emergency response resources and guidelines
            </Text>
          </AnimatedCard>

          <AnimatedCard index={3}>
            <Text style={styles.cardEmoji}>👥</Text>
            <Text style={styles.cardTitle}>Community</Text>
            <Text style={styles.cardDescription}>
              Connect with other trainees and share experiences
            </Text>
          </AnimatedCard>
        </View>

        <Animated.View
          style={{
            opacity: logoutButtonAnim,
            transform: [
              {
                scale: logoutButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  logoEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#DC3545',
    borderRadius: 12,
    paddingVertical: 16,
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
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;