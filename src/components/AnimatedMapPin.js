import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const AnimatedMapPin = ({ training }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const scaleAnim = useRef(new Animated.Value(0)).current; // For popup appear/disappear
  const opacityAnim = useRef(new Animated.Value(0)).current; // For image fade in/out

  const hasImages = training.photos && training.photos.length > 0;

  useEffect(() => {
    if (!hasImages) return;

    const mainLoop = () => {
      // 1. Appear
      setShowPopup(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start(() => {
        // 2. Start image slideshow
        runSlideshow();
      });
    };

    const runSlideshow = () => {
      // Fade in the first image
      fadeImage(true, () => {
        // After fade-in, wait, then start cycling
        setTimeout(() => cycleImages(1), 2000);
      });
    };

    const cycleImages = (nextIndex) => {
      // Fade out current image
      fadeImage(false, () => {
        if (nextIndex >= training.photos.length) {
          // Slideshow finished, hide the popup
          hidePopup();
        } else {
          // Show next image
          setCurrentImageIndex(nextIndex);
          fadeImage(true, () => {
            // Wait, then cycle to the next one
            setTimeout(() => cycleImages(nextIndex + 1), 2000);
          });
        }
      });
    };

    const fadeImage = (fadeIn, onComplete) => {
      Animated.timing(opacityAnim, {
        toValue: fadeIn ? 1 : 0,
        duration: 800, // Smooth fade duration
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(onComplete);
    };

    const hidePopup = () => {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowPopup(false);
        setCurrentImageIndex(0); // Reset for next loop
        // 3. Disappear for 1 second, then restart loop
        setTimeout(mainLoop, 1000);
      });
    };

    // Start the main loop
    mainLoop();

  }, [training, hasImages]);

  if (!training.location) return null;

  return (
    <Marker
      coordinate={{
        latitude: training.location.latitude,
        longitude: training.location.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.markerContainer}>
        {showPopup && hasImages && (
          <Animated.View style={[styles.popup, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.Image
              source={{ uri: training.photos[currentImageIndex] }}
              style={[styles.popupImage, { opacity: opacityAnim }]}
              resizeMode="cover"
            />
          </Animated.View>
        )}
        <View style={styles.pin}>
          <Ionicons name="location" size={40} color="#FF5A5F" />
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    // The pin itself
  },
  popup: {
    position: 'absolute',
    bottom: 35, // Position above the pin
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  popupImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
});

export default AnimatedMapPin;
