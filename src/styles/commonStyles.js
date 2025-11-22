import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Common colors used throughout the app
export const COLORS = {
  // Primary colors
  PRIMARY_BLUE: '#2E86AB',
  PRIMARY_GREEN: '#4CAF50',
  PRIMARY_ORANGE: '#FF9800',
  
  // Secondary colors
  SECONDARY_BLUE: '#A23B72',
  SECONDARY_GREEN: '#45a049',
  SECONDARY_ORANGE: '#F57C00',
  
  // Accent colors
  ACCENT_BLUE: '#F18F01',
  ACCENT_GREEN: '#2E7D32',
  ACCENT_ORANGE: '#E65100',
  
  // Text colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_LIGHT: '#A5A5A5',
  GRAY_MEDIUM: '#666666',
  GRAY_DARK: '#333333',
  
  // Background colors
  LIGHT_BLUE: '#E8F4F8',
  LIGHT_GREEN: '#E8F5E8',
  LIGHT_ORANGE: '#FFF3E0',
  
  // Status colors
  SUCCESS: '#4CAF50',
  ERROR: '#F44336',
  WARNING: '#FF9800',
  INFO: '#2196F3',
};

// Common dimensions and spacing
export const DIMENSIONS = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  PADDING_HORIZONTAL: 20,
  PADDING_VERTICAL: 15,
  BORDER_RADIUS: 10,
  BUTTON_HEIGHT: 50,
  INPUT_HEIGHT: 50,
};

// Common font sizes
export const FONT_SIZES = {
  EXTRA_LARGE: 28,
  LARGE: 24,
  MEDIUM_LARGE: 22,
  MEDIUM: 18,
  REGULAR: 16,
  SMALL: 14,
  EXTRA_SMALL: 12,
};

// Common styles used across multiple screens
export const commonStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Text styles
  title: {
    fontSize: FONT_SIZES.EXTRA_LARGE,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.MEDIUM_LARGE,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: FONT_SIZES.REGULAR,
    color: COLORS.WHITE,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Input styles
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: FONT_SIZES.REGULAR,
    color: COLORS.WHITE,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.WHITE,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: FONT_SIZES.REGULAR,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: DIMENSIONS.INPUT_HEIGHT,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: COLORS.WHITE,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    height: DIMENSIONS.BUTTON_HEIGHT,
    justifyContent: 'center',
    elevation: 3,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: 'bold',
  },
  
  // Card styles
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: 20,
    marginVertical: 10,
    elevation: 4,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  // Loading and disabled styles
  disabledButton: {
    opacity: 0.7,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Error and success styles
  errorText: {
    color: COLORS.ERROR,
    fontSize: FONT_SIZES.SMALL,
    textAlign: 'center',
    marginTop: 5,
  },
  successText: {
    color: COLORS.SUCCESS,
    fontSize: FONT_SIZES.SMALL,
    textAlign: 'center',
    marginTop: 5,
  },
});

// Gradient configurations for different user types
export const GRADIENTS = {
  USER_SELECTION: ['#2E86AB', '#A23B72', '#F18F01'],
  TRAINER: ['#4CAF50', '#45a049', '#2E7D32'],
  CENTRAL_AUTHORITY: ['#FF9800', '#F57C00', '#E65100'],
  SUCCESS: ['#4CAF50', '#45a049'],
  ERROR: ['#F44336', '#D32F2F'],
};

export default {
  COLORS,
  DIMENSIONS,
  FONT_SIZES,
  commonStyles,
  GRADIENTS,
};