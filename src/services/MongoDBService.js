import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@ndma_training_users_v1';
const SYNC_TIMESTAMP_KEY = '@ndma_training_last_sync_v1';

// Backend API URL - Change this to your backend URL
import { API_BASE_URL } from './config'; // Use centralized config
// const API_BASE_URL = 'https://ndma-auth-backend-yxcd.onrender.com'; // PRODUCTION - Deployed on Render
// const API_BASE_URL = 'http://localhost:5000'; // LOCAL DEVELOPMENT

const delay = (ms = 600) =>
  new Promise((resolve) => setTimeout(resolve, ms));

class MongoDBService {
  constructor() {
    // Demo user for fallback (if backend is not available)
    this.demoUser = {
      id: 'trainer_divyanshu',
      name: 'Divyanshu',
      email: 'divyanshu@ndma.gov.in',
      password: 'trainer123',
      role: 'trainer',
      organization: 'NDMA Training Institute',
      phone: '+91-11-1234-5678',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.useBackend = true; // ✅ ENABLED - MongoDB Atlas connected!
  }

  // Check if backend is available
  async checkBackendHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Backend not available, using local storage fallback');
      return false;
    }
  }

  // ======== LOGIN with BACKEND ========
  async loginUser(email, password) {
    try {
      // Try backend first
      if (this.useBackend) {
        const backendAvailable = await this.checkBackendHealth();
        
        if (backendAvailable) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              // Persist auth tokens (both access and refresh) and user data
              if (data.accessToken && data.refreshToken) {
                await AsyncStorage.setItem('accessToken', data.accessToken);
                await AsyncStorage.setItem('refreshToken', data.refreshToken);
              } else if (data.token) {
                // Fallback for old token format
                await AsyncStorage.setItem('accessToken', data.token);
              }
              
              const userData = { userId: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role };
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
              return {
                success: true,
                user: data.user,
                token: data.accessToken || data.token, // For backward compatibility
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
              };
            } else {
              return {
                success: false,
                error: data.error || 'Login failed',
              };
            }
          } catch (fetchError) {
            console.log('Backend login failed, falling back to local storage');
          }
        }
      }

      // Fallback to local storage
      await delay();
      const normalizedEmail = email.trim().toLowerCase();
      const users = await this.getAllUsers();
      const user = users.find((item) => item.email === normalizedEmail);

      if (!user) {
        return {
          success: false,
          error: 'User not found. Please register first.',
        };
      }

      if (user.password !== password) {
        return {
          success: false,
          error: 'Incorrect password. Try again.',
        };
      }

      const { password: _pw, ...safeUser } = user;
      return {
        success: true,
        user: safeUser,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    }
  }

  // ======== REGISTER with BACKEND ========
  async registerUser({ 
    name, 
    email, 
    password, 
    role = 'authority', 
    organization = 'NDMA',
    // Trainee-specific fields
    phone,
    age_bracket,
    district,
    state,
    consent_location,
    consent_attendance
  }) {
    try {
      // Try backend first
      if (this.useBackend) {
        const backendAvailable = await this.checkBackendHealth();
        
        if (backendAvailable) {
          try {
            // Prepare request body based on role
            const requestBody = role === 'trainee' 
              ? { 
                  name, 
                  phone, 
                  password, 
                  role, 
                  age_bracket, 
                  district, 
                  state, 
                  consent_location, 
                  consent_attendance 
                }
              : { 
                  name, 
                  email, 
                  password, 
                  role, 
                  organization 
                };

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              // Persist auth tokens (both access and refresh) and user data
              if (data.accessToken && data.refreshToken) {
                await AsyncStorage.setItem('accessToken', data.accessToken);
                await AsyncStorage.setItem('refreshToken', data.refreshToken);
              } else if (data.token) {
                // Fallback for old token format
                await AsyncStorage.setItem('accessToken', data.token);
              }
              
              const userData = { 
                userId: data.user.id, 
                name: data.user.name, 
                email: data.user.email || '', 
                phone: data.user.phone || '',
                role: data.user.role 
              };
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
              return {
                success: true,
                user: data.user,
                token: data.accessToken || data.token, // For backward compatibility
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
              };
            } else {
              return {
                success: false,
                error: data.error || 'Registration failed',
              };
            }
          } catch (fetchError) {
            console.log('Backend registration failed, falling back to local storage');
          }
        }
      }

      // Fallback to local storage
      await delay();
      const normalizedEmail = email.trim().toLowerCase();
      const sanitizedName = name.trim();

      if (!sanitizedName) {
        return {
          success: false,
          error: 'Please add your full name.',
        };
      }

      const users = await this.getAllUsers();
      const existingUser = users.find((item) => item.email === normalizedEmail);

      if (existingUser) {
        return {
          success: false,
          error: 'This email is already registered.',
        };
      }

      const now = new Date().toISOString();
      const newUser = {
        id: `user_${Date.now()}`,
        name: sanitizedName,
        email: normalizedEmail,
        password,
        role,
        organization,
        phone: '',
        createdAt: now,
        updatedAt: now,
      };

      users.push(newUser);
      await this.saveUsers(users);

      const { password: _pw, ...safeUser } = newUser;
      return {
        success: true,
        user: safeUser,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.',
      };
    }
  }

  // ======== LOCAL STORAGE HELPERS (Fallback) ========
  async ensureSeedData() {
    try {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      if (!stored) {
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify([this.demoUser]));
        await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to seed demo data', error);
    }
  }

  async getAllUsers() {
    await this.ensureSeedData();
    const stored = await AsyncStorage.getItem(USERS_KEY);
    if (!stored) {
      return [this.demoUser];
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored users', error);
      return [this.demoUser];
    }
  }

  async saveUsers(users = []) {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
  }

  // ======== USER PROFILE ========
  async getUserProfile(userId) {
    try {
      if (this.useBackend) {
        const backendAvailable = await this.checkBackendHealth();
        
        if (backendAvailable) {
          const response = await fetch(`${API_BASE_URL}/api/auth/user/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          const data = await response.json();
          if (response.ok && data.success) {
            return { success: true, user: data.user };
          }
        }
      }

      // Fallback to local storage
      const users = await this.getAllUsers();
      const user = users.find(u => u.id === userId);
      
      if (user) {
        const { password: _pw, ...safeUser } = user;
        return { success: true, user: safeUser };
      }

      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: 'Failed to get profile' };
    }
  }
}

export default new MongoDBService();
