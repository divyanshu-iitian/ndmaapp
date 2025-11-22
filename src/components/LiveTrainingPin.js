import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Text } from 'react-native';

const LiveTrainingPin = ({ images = [], size = 150, autoPlay = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const imageFadeAnim = useRef(new Animated.Value(1)).current;

  // Derived sizes
  const pointerHeight = Math.max(18, Math.round(size * 0.28));
  const triangleBase = Math.max(12, Math.round(pointerHeight * 0.7));
  const ringSize = Math.round(size * 1.2);

  // Default fallback images if none provided
  const defaultImages = [
    'https://via.placeholder.com/300/10B981/FFFFFF?text=Training',
    'https://via.placeholder.com/300/3B82F6/FFFFFF?text=Live',
  ];

  const displayImages = images.length > 0 ? images : defaultImages;

  // Pin drop animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulsing animation
    startPulse();
  }, []);

  // Pulsing animation for live indicator
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Image rotation logic
  useEffect(() => {
    if (!autoPlay || displayImages.length === 0) return;

    const interval = setInterval(() => {
      // Fade out current image
      Animated.timing(imageFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Change image
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % displayImages.length;
          
          // If we've shown all images, hide popup for 1 second
          if (nextIndex === 0 && displayImages.length > 1) {
            setShowPopup(false);
            setTimeout(() => {
              setShowPopup(true);
            }, 1000);
          }
          
          return nextIndex;
        });
        
        // Fade in new image
        Animated.timing(imageFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [autoPlay, displayImages.length]);

  // Fade animation when showing/hiding popup
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: showPopup ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showPopup]);

  console.log('🎨 LiveTrainingPin rendering:', {
    imagesCount: images.length,
    currentIndex,
    showPopup,
    displayImages: displayImages.length
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size + pointerHeight,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Pulsing outer ring centered behind the image */}
      <View style={styles.ringOverlay} pointerEvents="none">
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      </View>

      {/* Image popup */}
      {showPopup && (
        <Animated.View
          style={[
            styles.imagePopup,
            { opacity: fadeAnim, width: size, aspectRatio: 1 },
          ]}
        >
          <Animated.Image
            source={{ uri: displayImages[currentIndex] }}
            style={[styles.image, { opacity: imageFadeAnim }]}
            resizeMode="contain"
          />
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </Animated.View>
      )}

      {/* Pin pointer */}
      <View
        style={[
          styles.pinPointer,
          {
            borderLeftWidth: triangleBase,
            borderRightWidth: triangleBase,
            borderTopWidth: pointerHeight,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 4,
    borderColor: 'rgba(16, 185, 129, 0.6)',
    zIndex: 0,
  },
  ringOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePopup: {
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderWidth: 4,
    borderColor: '#10B981',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7FAFC',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  pinPointer: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#10B981',
    alignSelf: 'center',
    marginTop: 2,
  },
});

export default LiveTrainingPin;
