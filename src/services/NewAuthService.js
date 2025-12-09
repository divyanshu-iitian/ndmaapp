/**
 * New Auth Service - Aligned with SIH_BACKEND-main
 * Backend: https://jpglj93t-3000.inc1.devtunnels.ms/api
 * 
 * Flow:
 * 1. Trainee: Signup → Login → Setup 2FA → Verify 2FA → Home
 * 2. Trainer: Signup (select org) → Login → Setup 2FA → Verify 2FA → Wait for org approval → Home
 * 3. Organization: Signup → Upload docs → Login → Setup 2FA → Verify 2FA → Wait for admin approval → Home
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NEW_AUTH_BASE_URL } from './config';

// Configure axios instance
const authAPI = axios.create({
  baseURL: NEW_AUTH_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
authAPI.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

class NewAuthService {
  // ==================== TRAINEE SIGNUP ====================
  async signupTrainee(username, email, password, traineeCategory = 'other') {
    try {
      const response = await authAPI.post('/users/signup/trainee', {
        username,
        email,
        password,
        traineeCategory,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Trainee signup failed',
      };
    }
  }

  // ==================== TRAINER SIGNUP ====================
  async signupTrainer(username, email, password, organizationId, workDesignation, govtIdCard = null) {
    try {
      const response = await authAPI.post('/users/signup/trainer', {
        username,
        email,
        password,
        organization: organizationId,
        workDesignation,
        govtIdCard,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Trainer signup failed',
      };
    }
  }

  // ==================== ORGANIZATION SIGNUP ====================
  async signupOrganization(username, email, password, organizationType) {
    try {
      const response = await authAPI.post('/users/signup/organization', {
        username,
        email,
        password,
        organizationType,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Organization signup failed',
      };
    }
  }

  // ==================== LOGIN ====================
  async login(email, password, otp = null) {
    try {
      const payload = { email, password };
      if (otp) {
        payload.otp = otp;
      }

      const response = await authAPI.post('/users/login', payload);

      // Store token
      const { token, user, requires2FASetup, requiresDocumentUpload } = response.data;

      // Clear legacy token to avoid conflicts
      await AsyncStorage.removeItem('accessToken');

      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return {
        success: true,
        token,
        user,
        requires2FASetup,
        requiresDocumentUpload,
      };
    } catch (error) {
      // Handle 403 2FA Required
      if (error.response && error.response.status === 403 && error.response.data.code === '2fa_required') {
        return {
          success: true, // Treat as success to proceed to 2FA input
          requires2FA: true,
          message: error.response.data.message
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  }

  // ==================== GOOGLE OAUTH ====================
  async loginWithGoogle(code, role = 'trainee') {
    try {
      const response = await authAPI.get(`/users/auth/google?code=${code}&state=${role}`);

      const { token, user, requires2FASetup, requiresDocumentUpload } = response.data;

      // Clear legacy token
      await AsyncStorage.removeItem('accessToken');

      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return {
        success: true,
        token,
        user,
        requires2FASetup,
        requiresDocumentUpload,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Google OAuth failed',
      };
    }
  }

  // ==================== 2FA SETUP ====================
  async setup2FA() {
    try {
      const response = await authAPI.post('/users/auth/2fa/setup');
      return {
        success: true,
        secret: response.data.secret,
        qrCode: response.data.qrCode || response.data.qr,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '2FA setup failed',
      };
    }
  }

  // ==================== 2FA VERIFY ====================
  async verify2FA(token) {
    try {
      const response = await authAPI.post('/users/auth/2fa/verify', { token });
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid OTP',
      };
    }
  }

  // ==================== GET CURRENT USER ====================
  async getCurrentUser() {
    try {
      const response = await authAPI.get('/users/me');
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      return {
        success: true,
        user: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch user',
      };
    }
  }

  // ==================== GET ALL ORGANIZATIONS ====================
  async getAllOrganizations() {
    try {
      const response = await authAPI.get('/users/organizations');
      return {
        success: true,
        organizations: response.data.organizations,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch organizations',
      };
    }
  }

  // ==================== UPLOAD ORGANIZATION DOCUMENTS ====================
  async uploadOrganizationDocuments(formData) {
    try {
      const response = await authAPI.post('/users/upload-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Document upload failed',
      };
    }
  }

  // ==================== GET PENDING TRAINERS (FOR ORGANIZATION) ====================
  async getPendingTrainers() {
    try {
      const response = await authAPI.get('/users/pending-trainers');
      return {
        success: true,
        trainers: response.data.trainers,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch pending trainers',
      };
    }
  }

  // ==================== VERIFY TRAINER (FOR ORGANIZATION) ====================
  async verifyTrainer(trainerId, status, rejectionReason = null) {
    try {
      const response = await authAPI.put('/users/verify-trainer', {
        trainerId,
        status,
        rejectionReason,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Trainer verification failed',
      };
    }
  }

  // ==================== PASSWORD RESET ====================
  async requestPasswordReset(email) {
    try {
      const response = await authAPI.post('/users/request-password-reset', { email });
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Password reset request failed',
      };
    }
  }

  async resetPassword(token, password) {
    try {
      const response = await authAPI.post(`/users/reset-password/${token}`, { password });
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Password reset failed',
      };
    }
  }

  // ==================== LOGOUT ====================
  async logout() {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Logout failed' };
    }
  }

  // ==================== HELPER - CHECK VERIFICATION STATUS ====================
  async getVerificationStatus() {
    try {
      const user = await this.getCurrentUser();
      if (!user.success) return { verified: false };

      const userData = user.user;

      // Trainee - no verification needed
      if (userData.role === 'trainee') {
        return {
          verified: true,
          needs2FA: !userData.isTwoFactorEnabled
        };
      }

      // Trainer - needs organization approval
      if (userData.role === 'trainer') {
        return {
          verified: userData.organizationVerificationStatus === 'verified',
          status: userData.organizationVerificationStatus,
          needs2FA: !userData.isTwoFactorEnabled,
          needsDocuments: !userData.documentsUploaded,
        };
      }

      // Organization - needs admin approval
      if (userData.role === 'organization') {
        return {
          verified: userData.verificationStatus === 'approved',
          status: userData.verificationStatus,
          needs2FA: !userData.isTwoFactorEnabled,
          needsDocuments: !userData.documentsUploaded,
        };
      }

      return { verified: false };
    } catch (error) {
      return { verified: false, error: error.message };
    }
  }
}

export default new NewAuthService();
