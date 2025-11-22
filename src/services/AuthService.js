// Real API service for authentication with backend
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  constructor() {
    // Use centralized config for API base URL
    try {
      const { API_BASE_URL } = require('./config');
      this.baseURL = API_BASE_URL;
    } catch (e) {
      this.baseURL = 'http://192.168.1.8:5000'; // fallback
    }
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Process queue of failed requests after token refresh
  processQueue(error, token = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  // Get stored access token
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem('accessToken');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Get stored refresh token
  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // Save tokens to AsyncStorage
  async saveTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      console.log('✅ Tokens saved to AsyncStorage');
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 Refreshing access token...');

      const response = await fetch(`${this.baseURL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await AsyncStorage.setItem('accessToken', data.accessToken);
        console.log('✅ Access token refreshed successfully');
        return data.accessToken;
      } else {
        throw new Error(data.error || 'Token refresh failed');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      // Clear tokens and force re-login
      await this.clearTokens();
      throw error;
    }
  }

  // Make authenticated API call with automatic token refresh
  async authenticatedFetch(url, options = {}) {
    let accessToken = await this.getAccessToken();

    if (!accessToken) {
      throw new Error('No access token available. Please login.');
    }

    // Add authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    };

    let response = await fetch(url, { ...options, headers });

    // If unauthorized, try to refresh token
    if (response.status === 401) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          accessToken = await this.refreshAccessToken();
          this.isRefreshing = false;
          this.processQueue(null, accessToken);
        } catch (error) {
          this.isRefreshing = false;
          this.processQueue(error, null);
          throw error;
        }
      }

      // Retry the request with new token
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(token => {
        headers['Authorization'] = `Bearer ${token}`;
        return fetch(url, { ...options, headers });
      });
    }

    return response;
  }

  // Clear all stored tokens
  async clearTokens() {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('token'); // Old token key
      console.log('✅ Tokens cleared');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  // Real authentication with backend API
  async authenticateUser(email, password) {
    try {
      console.log('🔐 Authenticating user with backend:', email);

      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Authentication successful for:', email);
        
        // Save both tokens
        await this.saveTokens(data.accessToken, data.refreshToken);
        
        // Save user data
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        return {
          success: true,
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        };
      } else {
        console.log('❌ Authentication failed:', data.error);
        return {
          success: false,
          error: data.error || 'Authentication failed'
        };
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Real registration with backend API
  async registerUser(userData, userType) {
    try {
      console.log('📝 Registering user with backend:', userData.email, 'Type:', userType);

      const registerData = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userType === 'central_authority' ? 'authority' : 'trainer'
      };

      const response = await fetch(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Registration successful for:', userData.email);
        
        // Save both tokens
        await this.saveTokens(data.accessToken, data.refreshToken);
        
        // Save user data
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        return {
          success: true,
          user: data.user,
          message: 'Registration successful! You can now login.'
        };
      } else {
        console.log('❌ Registration failed:', data.error);
        return {
          success: false,
          error: data.error || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get user profile
  async getUserProfile(userId, token) {
    try {
      // Simulate API call
      await this.delay(1000);
      
      // Mock user profile data
      return {
        success: true,
        user: {
          id: userId,
          name: 'Demo User',
          email: 'demo@ndma.gov.in',
          type: 'general',
          verified: true,
          lastLogin: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData, token) {
    try {
      await this.delay(1500);
      
      console.log('Updating user profile:', userId, updateData);
      
      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await this.delay(2000);
      
      console.log('Password reset requested for:', email);
      
      return {
        success: true,
        message: 'Password reset instructions sent to your email'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Logout
  async logout() {
    try {
      await this.clearTokens();
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('@ndma_session_user');
      console.log('✅ User logged out and storage cleared');
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get current user from AsyncStorage
  async getCurrentUser() {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        console.log('✅ Retrieved current user:', userData.email || userData.phone);
        return userData;
      }
      console.log('❌ No user data found in storage');
      return null;
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(updateData) {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        const updatedUser = { ...userData, ...updateData };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        console.log('✅ Profile updated successfully');
        return updatedUser;
      }
      throw new Error('No user data found');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  }

  // Upload profile picture (mock implementation)
  async uploadProfilePicture(imageUri) {
    try {
      // In real implementation, this would upload to a server
      console.log('📸 Uploading profile picture:', imageUri);
      await this.delay(1500);
      
      // Return the image URI as the "uploaded" URL
      return imageUri;
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      throw error;
    }
  }

  // Delay helper for simulating async operations
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper methods

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  validatePassword(password) {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
  }

  // Get test credentials
  getTestCredentials() {
    return {
      email: 'test@example.com',
      password: 'password123',
      description: 'Test account for development'
    };
  }
}

// Export singleton instance
const authService = new AuthService();

// Export as both default and named export for compatibility
export default authService;
export { authService };