import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered image animations
    const imageAnimations = imageAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 300 + index * 100, // Stagger by 100ms
        useNativeDriver: true,
      })
    );

    Animated.stagger(100, imageAnimations).start();

    // Auto finish after 4 seconds
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 4000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, slideAnim, onFinish]);

  const teamMembers = [
    {
      name: 'Divyanshu Mishra',
      image: 'https://res.cloudinary.com/dkzeey5iq/image/upload/v1758644633/WhatsApp_Image_2025-09-23_at_21.04.38_m3ihhc.jpg',
    },
    {
      name: 'Team Member',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRc_1DWkgTmp4sj6VMhaPYgQ4XkXk7kUv7qwNrHhCmoOjpj01jlBfDMRMsi0uA6jrAJdgk&usqp=CAU',
    },
    {
      name: 'Team Member',
      image: 'https://res.cloudinary.com/dkzeey5iq/image/upload/v1758644633/WhatsApp_Image_2025-09-23_at_21.40.52_sfvxvo.jpg',
    },
    {
      name: 'Team Member',
      image: 'https://res.cloudinary.com/dkzeey5iq/image/upload/v1758644633/WhatsApp_Image_2025-09-23_at_21.34.36_ltaqz1.jpg',
    },
    {
      name: 'Team Member',
      image: 'https://res.cloudinary.com/dkzeey5iq/image/upload/v1758644633/WhatsApp_Image_2025-09-23_at_21.19.27_pn4taz.jpg',
    },
    {
      name: 'Team Member',
      image: 'https://res.cloudinary.com/dkzeey5iq/image/upload/v1758644633/WhatsApp_Image_2025-09-23_at_21.52.37_bmf62k.jpg',
    },
  ];

  return (
    <LinearGradient
      colors={['#1A365D', '#2C5282', '#2E86AB']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Prashikshak</Text>
          <Text style={styles.subtitle}>Disaster Management Training Platform</Text>
        </View>

        {/* Team Section */}
        <Animated.View
          style={[
            styles.teamSection,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.presentedBy}>Presented by</Text>
          <Text style={styles.teamName}>Team Jarvis</Text>

          <View style={styles.teamGrid}>
            {teamMembers.map((member, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.memberCard,
                  {
                    opacity: imageAnims[index],
                    transform: [
                      {
                        scale: imageAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                      },
                      {
                        rotate: imageAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['180deg', '0deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: member.image }}
                  style={styles.memberImage}
                  resizeMode="cover"
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.footerText}>Team of GGU</Text>
          <Text style={styles.footerSubtext}>Building Resilience Together</Text>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#E2E8F0',
    textAlign: 'center',
    fontWeight: '400',
  },
  teamSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  presentedBy: {
    fontSize: 18,
    color: '#CBD5E0',
    marginBottom: 8,
    fontWeight: '500',
  },
  teamName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
    letterSpacing: 2,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: width * 0.85,
    gap: 15,
  },
  memberCard: {
    alignItems: 'center',
    margin: 5,
  },
  memberImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    fontWeight: '400',
  },
});

export default SplashScreen;
