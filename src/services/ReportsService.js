import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { authService } from './AuthService';

class ReportsService {
  constructor() {
    this.useBackend = true; // Use cloud storage
  }

  // ======== AUTHENTICATED FETCH WITH AUTO REFRESH ========
  async authenticatedFetch(url, options = {}) {
    try {
      return await authService.authenticatedFetch(url, options);
    } catch (error) {
      console.error('❌ Authenticated fetch failed:', error);
      throw error;
    }
  }

  // ======== WAKE UP BACKEND (for Render cold start) ========
  async wakeUpBackend() {
    try {
      console.log('🔄 Waking up backend (cold start check)...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout

      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('✅ Backend is awake:', response.status);
      return true;
    } catch (error) {
      console.log('⚠️ Backend wake up failed:', error.message);
      return false;
    }
  }

  // ======== CREATE TRAINING REPORT ========
  async createReport(reportData) {
    try {
      console.log('🚀 ReportsService: Starting createReport...');
      console.log('📊 Report data:', JSON.stringify(reportData, null, 2));

      const token = await authService.getAccessToken();
      console.log('🔑 Access Token retrieved:', token ? 'YES (length: ' + token.length + ')' : 'NO');

      if (!token) {
        console.log('❌ No token found - user not authenticated');
        return { success: false, error: 'User not authenticated. Please login again.' };
      }

      if (this.useBackend) {
        try {
          // Wake up backend first (helps with Render cold start)
          await this.wakeUpBackend();

          console.log('📡 Sending POST request to:', `${API_BASE_URL}/reports/create`);
          console.log('📋 Request body:', JSON.stringify(reportData, null, 2));

          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

          // Use authenticated fetch with auto token refresh
          const response = await authService.authenticatedFetch(`${API_BASE_URL}/reports/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(reportData),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          console.log('📥 Response status:', response.status, response.statusText);

          const data = await response.json();
          console.log('📦 Response data:', JSON.stringify(data, null, 2));

          if (data.success) {
            console.log('✅ Report saved to cloud:', data.report._id);
            return {
              success: true,
              report: data.report
            };
          } else {
            console.log('❌ Backend save failed:', data.error);
            return { success: false, error: data.error || 'Failed to save' };
          }
        } catch (error) {
          console.error('❌ Backend error:', error);
          console.error('❌ Error details:', error.message, error.stack);

          // Better error messages
          if (error.name === 'AbortError') {
            return { success: false, error: 'Request timeout. Backend might be starting up (Cold start). Please wait 30 seconds and try again.' };
          }
          if (error.message === 'Network request failed') {
            return { success: false, error: 'Network error. Check your internet connection or backend might be down.' };
          }
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }

          return { success: false, error: error.message };
        }
      }

      // If backend disabled
      console.log('❌ Backend disabled');
      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('❌ Create report error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ======== GET USER REPORTS ========
  async getUserReports() {
    console.log(`--- ReportsService: Getting reports for current user (token) ---`);
    try {
      const token = await authService.getAccessToken();
      console.log('🔑 Access Token for getUserReports:', token ? 'YES (length: ' + token.length + ')' : 'NO');

      if (!token) {
        console.log('❌ ReportsService: No token.');
        return { success: false, error: 'User not logged in. Please login again.' };
      }

      if (this.useBackend) {
        try {
          const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/user`, {
            method: 'GET',
          });

          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            // Silently handle HTML responses (likely 404 or server errors)
            // console.warn('ReportsService: Received non-JSON response (likely HTML error page), ignoring.');
            return { success: false, error: 'Server Invalid Response' };
          }

          console.log('📥 Response status:', response.status, response.statusText);
          // console.log('📦 Response data:', JSON.stringify(data, null, 2));

          if (response.ok && data.success) {
            console.log(`✅ ReportsService: Fetched ${data.reports.length} reports from cloud.`);
            return { success: true, reports: data.reports };
          } else {
            console.error('❌ ReportsService: Backend error on fetch.', data.error);
            return { success: false, error: data.error || 'Failed to fetch from backend' };
          }
        } catch (error) {
          console.error('❌ ReportsService: Network or fetch error.', error);
          if (error.message && error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }
      // Fallback should not be the default path
      // console.log('⚠️ ReportsService: Backend is disabled, using local fallback.');
      return { success: false, error: 'Backend disabled', reports: [] };
    } catch (error) {
      console.error('❌ ReportsService: Critical error in getUserReports.', error);
      return { success: false, error: error.message, reports: [] };
    }
  }

  // ======== GET ALL REPORTS (for authorities) ========
  async getAllReports() {
    try {
      const token = await authService.getAccessToken();
      if (!token) return { success: false, error: 'User not authenticated. Please login again.', reports: [] };
      if (this.useBackend) {
        try {
          const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/all`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          if (response.ok && data.success) {
            console.log(`✅ Loaded ${data.count} total reports from cloud`);
            return { success: true, reports: data.reports };
          } else {
            return { success: false, error: data.error || 'Failed to load reports', reports: [] };
          }
        } catch (error) {
          console.error('❌ Backend error:', error);
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.', reports: [] };
          }
          return { success: false, error: error.message, reports: [] };
        }
      }
      return await this.getAllReportsLocally();
    } catch (error) {
      console.error('Get all reports error:', error);
      return { success: false, error: error.message, reports: [] };
    }
  }

  // ======== LOCAL STORAGE FALLBACK ========
  async saveReportLocally(reportData, userId, userEmail, userName) {
    try {
      const REPORTS_KEY = '@ndma_training_reports_v1';

      // Get existing reports
      const reportsJson = await AsyncStorage.getItem(REPORTS_KEY);
      const reports = reportsJson ? JSON.parse(reportsJson) : [];

      // Create new report with metadata
      const newReport = {
        _id: `local_${Date.now()}`,
        userId,
        userEmail,
        userName,
        ...reportData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      reports.push(newReport);

      await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
      console.log('💾 Report saved locally');

      return {
        success: true,
        report: newReport
      };
    } catch (error) {
      console.error('Local save error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ======== AUTHORITY ACTIONS ========
  async approveReport(reportId) {
    try {
      const token = await authService.getAccessToken();
      if (!token) return { success: false, error: 'User not authenticated. Please login again.' };
      const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/approve/${reportId}`, {
        method: 'PUT',
      });
      const data = await response.json();
      if (response.ok && data.success) return { success: true, report: data.report };
      return { success: false, error: data.error || 'Approve failed' };
    } catch (e) {
      if (e.message.includes('No access token')) {
        return { success: false, error: 'Session expired. Please login again.' };
      }
      return { success: false, error: e.message };
    }
  }

  async rejectReport(reportId, reason = '') {
    try {
      const token = await authService.getAccessToken();
      if (!token) return { success: false, error: 'User not authenticated. Please login again.' };
      const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/reject/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (response.ok && data.success) return { success: true, report: data.report };
      return { success: false, error: data.error || 'Reject failed' };
    } catch (e) {
      if (e.message.includes('No access token')) {
        return { success: false, error: 'Session expired. Please login again.' };
      }
      return { success: false, error: e.message };
    }
  }

  async getReportsLocally(userId) {
    try {
      const REPORTS_KEY = '@ndma_training_reports_v1';
      const reportsJson = await AsyncStorage.getItem(REPORTS_KEY);
      const allReports = reportsJson ? JSON.parse(reportsJson) : [];

      // Filter by userId
      const userReports = allReports.filter(report => report.userId === userId);

      console.log(`💾 Loaded ${userReports.length} reports from local storage`);

      return {
        success: true,
        reports: userReports
      };
    } catch (error) {
      console.error('Local get error:', error);
      return {
        success: false,
        error: error.message,
        reports: []
      };
    }
  }

  async getAllReportsLocally() {
    try {
      const REPORTS_KEY = '@ndma_training_reports_v1';
      const reportsJson = await AsyncStorage.getItem(REPORTS_KEY);
      const reports = reportsJson ? JSON.parse(reportsJson) : [];

      console.log(`💾 Loaded ${reports.length} total reports from local storage`);

      return {
        success: true,
        reports: reports
      };
    } catch (error) {
      console.error('Local get all error:', error);
      return {
        success: false,
        error: error.message,
        reports: []
      };
    }
  }

  // ======== DELETE TRAINING REPORT ========
  async deleteReport(reportId) {
    try {
      console.log('🗑️ ReportsService: Attempting to delete report:', reportId);

      const token = await authService.getAccessToken();
      if (!token) {
        console.error('❌ No token found');
        return { success: false, error: 'User not authenticated. Please login again.' };
      }

      console.log('🔑 Token found, making DELETE request to:', `${API_BASE_URL}/reports/delete/${reportId}`);

      if (this.useBackend) {
        try {
          const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/delete/${reportId}`, {
            method: 'DELETE',
          });

          console.log('📡 Response status:', response.status);

          const data = await response.json();
          console.log('📦 Response data:', JSON.stringify(data, null, 2));

          if (data.success) {
            console.log('✅ Report deleted from cloud:', reportId);
            return { success: true };
          } else {
            console.error('❌ Backend delete failed:', data.error);
            console.error('❌ Details:', data.details || 'No details');
            return { success: false, error: data.error || 'Failed to delete' };
          }
        } catch (error) {
          console.error('❌ Backend delete error:', error);
          console.error('❌ Error message:', error.message);
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }

      console.error('❌ Backend disabled');
      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('❌ Delete report error:', error);
      return { success: false, error: error.message };
    }
  }

  // ======== UPDATE TRAINING REPORT ========
  async updateReport(reportId, updateData) {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        return { success: false, error: 'User not authenticated. Please login again.' };
      }

      if (this.useBackend) {
        try {
          const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/update/${reportId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });

          const data = await response.json();

          if (data.success) {
            console.log('✅ Report updated in cloud:', reportId);
            return { success: true, report: data.report };
          } else {
            console.error('❌ Backend update failed:', data.error);
            return { success: false, error: data.error || 'Failed to update' };
          }
        } catch (error) {
          console.error('❌ Backend update error:', error);
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }

      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('Update report error:', error);
      return { success: false, error: error.message };
    }
  }

  // ======== SEND REPORT TO ORGANIZATION ========
  async sendReport(reportId, organization) {
    try {
      const token = await authService.getAccessToken();
      if (!token) return { success: false, error: 'User not authenticated. Please login again.' };

      if (this.useBackend) {
        try {
          const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/send/${reportId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ organization }),
          });

          const data = await response.json();
          if (response.ok && data.success) {
            console.log('✅ Report sent to organization:', organization, reportId);
            return { success: true, report: data.report };
          } else {
            console.error('❌ Send report failed:', data.error);
            return { success: false, error: data.error || 'Failed to send report' };
          }
        } catch (error) {
          console.error('❌ Send report error:', error);
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }

      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('Send report critical error:', error);
      return { success: false, error: error.message };
    }
  }

  // ======== GET ANALYTICS (for Authority Dashboard) ========
  async getAnalytics() {
    try {
      console.log('📊 ReportsService: Getting analytics data...');
      const token = await authService.getAccessToken();

      if (!token) {
        console.error('❌ No token found');
        return { success: false, error: 'User not authenticated. Please login again.' };
      }

      if (this.useBackend) {
        try {
          console.log('📡 Fetching from:', `${API_BASE_URL}/reports/analytics`);

          const response = await this.authenticatedFetch(`${API_BASE_URL}/reports/analytics`, {
            method: 'GET',
          });

          console.log('📥 Analytics response status:', response.status);

          const data = await response.json();
          console.log('📦 Analytics data received:', JSON.stringify(data, null, 2));

          if (response.ok && data.success) {
            console.log('✅ Analytics loaded successfully');
            return { success: true, analytics: data.analytics };
          } else {
            console.error('❌ Analytics fetch failed:', data.error);
            return { success: false, error: data.error || 'Failed to load analytics' };
          }
        } catch (error) {
          console.error('❌ Analytics fetch error:', error);
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }

      console.error('❌ Backend disabled');
      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('❌ Get analytics critical error:', error);
      return { success: false, error: error.message };
    }
  }

  // ======== GET LIVE MAP DATA (for Authority) ========
  async getLiveMapData(organization = null, date = null) {
    try {
      console.log('🗺️ ReportsService: Getting live map data...', { organization, date });
      const token = await authService.getAccessToken();

      if (!token) {
        console.error('❌ No token found');
        return { success: false, error: 'User not authenticated. Please login again.' };
      }

      if (this.useBackend) {
        try {
          // Build query params
          let url = `${API_BASE_URL}/reports/live-map`;
          const params = new URLSearchParams();
          if (organization) params.append('organization', organization);
          if (date) params.append('date', date);

          if (params.toString()) {
            url += `?${params.toString()}`;
          }

          console.log('📡 Fetching from:', url);

          const response = await this.authenticatedFetch(url, {
            method: 'GET',
          });

          console.log('📥 Live map response status:', response.status);

          const data = await response.json();

          if (response.ok && data.success) {
            console.log('✅ Live map data loaded:', data.reports.length, 'reports');
            return { success: true, reports: data.reports, stats: data.stats, filters: data.filters };
          } else {
            console.error('❌ Live map fetch failed:', data.error);
            return { success: false, error: data.error || 'Failed to load live map data' };
          }
        } catch (error) {
          console.error('❌ Live map fetch error:', error);
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }

      console.error('❌ Backend disabled');
      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('❌ Get live map data critical error:', error);
      return { success: false, error: error.message };
    }
  }

  // ======== GET ANALYTICS BY ORGANIZATION (for Authority Dashboard) ========
  async getAnalyticsByOrganization(organization = 'all') {
    try {
      console.log('📊 ReportsService: Getting org analytics...', { organization });
      const token = await authService.getAccessToken();

      if (!token) {
        console.error('❌ No token found');
        return { success: false, error: 'User not authenticated. Please login again.' };
      }

      if (this.useBackend) {
        try {
          let url = `${API_BASE_URL}/reports/analytics-by-organization`;
          if (organization && organization !== 'all') {
            url += `?organization=${organization}`;
          }

          console.log('📡 Fetching from:', url);

          const response = await this.authenticatedFetch(url, {
            method: 'GET',
          });

          console.log('📥 Org analytics response status:', response.status);

          const data = await response.json();

          if (response.ok && data.success) {
            console.log('✅ Org analytics loaded successfully');
            return {
              success: true,
              organization: data.organization,
              summary: data.summary,
              breakdowns: data.breakdowns,
              trends: data.trends,
              demographics: data.demographics
            };
          } else {
            console.error('❌ Org analytics fetch failed:', data.error);
            return { success: false, error: data.error || 'Failed to load org analytics' };
          }
        } catch (error) {
          console.error('❌ Org analytics fetch error:', error);
          if (error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }

      console.error('❌ Backend disabled');
      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('❌ Get org analytics critical error:', error);
      return { success: false, error: error.message };
    }
  }

  // ======== GET TRAINER EVENTS (My Events) ========
  async getMyEvents(status = 'published') {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        return { success: false, error: 'User not authenticated. Please login again.' };
      }

      if (this.useBackend) {
        try {
          console.log(`📡 Fetching my events from: ${API_BASE_URL}/events/my-events?status=${status}`);

          const response = await this.authenticatedFetch(`${API_BASE_URL}/events/my-events?status=${status}`, {
            method: 'GET',
          });

          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (jsonError) {
            console.error('❌ Failed to parse JSON:', text.substring(0, 200));
            return { success: false, error: 'Server returned invalid response (possibly HTML error)' };
          }

          if (response.ok) { // Backend returns events directly in data.events
            console.log(`✅ Fetched ${data.events ? data.events.length : 0} events from cloud.`);
            return { success: true, events: data.events || [] };
          } else {
            console.error('❌ Fetch my events failed:', data.message);
            return { success: false, error: data.message || 'Failed to fetch events' };
          }

        } catch (error) {
          console.error('❌ Fetch my events error:', error);
          if (error.message && error.message.includes('No access token')) {
            return { success: false, error: 'Session expired. Please login again.' };
          }
          return { success: false, error: error.message };
        }
      }
      return { success: false, error: 'Backend disabled' };
    } catch (error) {
      console.error('❌ getMyEvents global error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ReportsService();
