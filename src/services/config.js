// API Configuration
// Centralized API base URL for all services

// export const API_BASE_URL = 'http://192.168.1.8:5000'; // Local backend with production database
export const API_BASE_URL = 'https://ndma-auth-backend-v3.onrender.com'; // PRODUCTION - Deployed on Render (NEW URL - Nov 2, 2024)
// export const API_BASE_URL = 'https://ndma-auth-backend-yxcd.onrender.com'; // OLD URL (deprecated)
// export const API_BASE_URL = 'http://localhost:5000'; // LOCAL DEVELOPMENT

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  USER: '/api/auth/user',
  
  // Reports
  REPORTS_CREATE: '/api/reports/create',
  REPORTS_USER: '/api/reports/user',
  REPORTS_ALL: '/api/reports/all',
  REPORTS_APPROVE: '/api/reports/approve',
  REPORTS_REJECT: '/api/reports/reject',
  REPORTS_DELETE: '/api/reports/delete',
  REPORTS_UPDATE: '/api/reports/update',
  REPORTS_SEND: '/api/reports/send',
  
  // Attendance
  SESSIONS_CREATE: '/sessions',
  SESSIONS_STATUS: '/sessions/:token/status',
  ATTENDANCE_MARK: '/attendance/mark',
  SESSIONS_END: '/sessions/:token/end',
  ATTENDANCE_TRAINER_ACTIVE: '/attendance/trainer/:trainerId/active',
  ATTENDANCE_TRAINING_SESSIONS: '/attendance/training/:trainingId/sessions',
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
