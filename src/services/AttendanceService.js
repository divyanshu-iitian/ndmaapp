import axios from 'axios';
import { API_BASE_URL } from './config';

// Helper function to get auth token from AsyncStorage
const getAuthToken = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // Use accessToken (new auth system with refresh tokens)
    const accessToken = await AsyncStorage.getItem('accessToken');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    return null;
  }
};

const AttendanceService = {
  /**
   * Create a new attendance session (Trainer)
   */
  createSession: async (trainingId, mode = 'gps', radiusM = 30, hotspotSSID = '', trainerDevice = '', trainerIP = '', location = null) => {
    try {
      console.log('🚀 Creating attendance session...');
      console.log('📊 Session data:', { trainingId, mode, radiusM, location });

      const token = await getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        return { success: false, error: 'User not authenticated' };
      }

      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = `${API_BASE_URL}/attendance/sessions`;
      console.log('📡 Endpoint:', endpoint);

      const response = await axios.post(endpoint, {
        training_id: trainingId,
        mode,
        radius_m: radiusM,
        hotspot_ssid: hotspotSSID,
        trainer_device: trainerDevice,
        trainer_ip: trainerIP,
        location
      }, { headers });

      if (response.data.success) {
        console.log('✅ Attendance session created:', response.data.session);
        return { success: true, session: response.data.session };
      } else {
        console.error('❌ Failed to create session:', response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ AttendanceService.createSession error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  /**
   * Get session details by token
   */
  getSession: async (sessionToken) => {
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_BASE_URL}/attendance/sessions/${sessionToken}/status`, { headers });

      if (response.data.success) {
        return { success: true, session: response.data.session };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ AttendanceService.getSession error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Mark attendance (Trainee)
   */
  markAttendance: async (sessionToken, method, deviceMeta = {}, location = null) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Get user info from AsyncStorage
      const userStr = await AsyncStorage.getItem('user');
      let user_name = 'Trainee';
      let user_phone = '';

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          user_name = user.name || 'Trainee';
          user_phone = user.phone || '';
        } catch (e) {
          console.log('⚠️ Could not parse user data');
        }
      }

      console.log('📝 Marking attendance for:', user_name, user_phone);

      const response = await axios.post(`${API_BASE_URL}/attendance/sessions/${sessionToken}/mark`, {
        user_name,
        user_phone,
        method,
        device_meta: deviceMeta,
        location
      }, { headers });

      if (response.data.success) {
        console.log('✅ Attendance marked:', response.data.record);
        return { success: true, record: response.data.record };
      } else {
        console.error('❌ Failed to mark attendance:', response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ AttendanceService.markAttendance error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  /**
   * Get all attendance records for a session
   */
  getSessionAttendance: async (sessionToken) => {
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_BASE_URL}/attendance/sessions/${sessionToken}/status`, { headers });

      if (response.data.success) {
        return { success: true, records: response.data.attendees || [] };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ AttendanceService.getSessionAttendance error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * End an attendance session
   */
  endSession: async (sessionToken) => {
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.put(`${API_BASE_URL}/attendance/sessions/${sessionToken}/end`, {}, { headers });

      if (response.data.success) {
        console.log('✅ Attendance session ended:', sessionToken);
        return { success: true, session: response.data.session };
      } else {
        console.error('❌ Failed to end session:', response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ AttendanceService.endSession error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get trainer's active sessions
   */
  getActiveSessions: async (trainerId) => {
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_BASE_URL}/attendance/trainer/${trainerId}/active`, { headers });

      if (response.data.success) {
        return { success: true, sessions: response.data.sessions };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ AttendanceService.getActiveSessions error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all sessions for a training
   */
  getTrainingSessions: async (trainingId) => {
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_BASE_URL}/attendance/training/${trainingId}/sessions`, { headers });

      if (response.data.success) {
        return { success: true, sessions: response.data.sessions };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ AttendanceService.getTrainingSessions error:', error.message);
      return { success: false, error: error.message };
    }
  }
};

export default AttendanceService;
