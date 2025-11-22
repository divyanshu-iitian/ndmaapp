import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const UserTypeSelectionScreen = ({ navigation }) => {
  const handleTrainerPress = () => {
    navigation.navigate('TrainerLogin');
  };

  const handleCentralAuthorityPress = () => {
    navigation.navigate('CentralAuthorityLogin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2E86AB', '#A23B72', '#F18F01']}
        style={styles.background}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Disaster Management Training Portal</Text>
            <Text style={styles.subtitle}>
              National Disaster Management Authority
            </Text>
            <Text style={styles.description}>
              Comprehensive training management and monitoring system for disaster preparedness
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleTrainerPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.buttonGradient}
              >
                <Text style={styles.optionIcon}>👨‍🏫</Text>
                <Text style={styles.optionTitle}>Training Institute</Text>
                <Text style={styles.optionDescription}>
                  For training institutes and organizations conducting disaster management training
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleCentralAuthorityPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.buttonGradient}
              >
                <Text style={styles.optionIcon}>🏛️</Text>
                <Text style={styles.optionTitle}>Central Authority</Text>
                <Text style={styles.optionDescription}>
                  For central monitoring authorities (NDMA, SDMA, etc.)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Choose your role to access the appropriate dashboard
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4F8',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#E8F4F8',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  optionButton: {
    width: width * 0.85,
    marginVertical: 15,
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  buttonGradient: {
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#F0F8FF',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#E8F4F8',
    textAlign: 'center',
  },
});

export default UserTypeSelectionScreen;