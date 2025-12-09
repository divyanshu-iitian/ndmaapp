// API Configuration
// Centralized API base URL for all services

// PRODUCTION BACKEND (Main backend for existing features)
// export const API_BASE_URL = 'https://ndma-auth-backend-v3.onrender.com'; // OLD RENDER BACKEND
export const API_BASE_URL = 'https://jpglj93t-3000.inc1.devtunnels.ms/api'; // NEW UNIFIED BACKEND

// NEW AUTH SERVER (Dec 9, 2024) - Separate auth backend with 2FA and verification
export const NEW_AUTH_BASE_URL = 'https://jpglj93t-3000.inc1.devtunnels.ms/api';

// OTHER BACKENDS (kept for reference)
// export const API_BASE_URL = 'http://192.168.1.8:5000'; // Local backend with production database
// export const API_BASE_URL = 'https://ndma-auth-backend-yxcd.onrender.com'; // OLD URL (deprecated)
// export const API_BASE_URL = 'http://localhost:5000'; // LOCAL DEVELOPMENT

// API endpoints
export const API_ENDPOINTS = {
  // Auth (OLD backend - keep as is)
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

// NEW AUTH ENDPOINTS (2FA + Verification flow)
export const NEW_AUTH_ENDPOINTS = {
  // Registration
  SIGNUP_TRAINEE: '/users/signup/trainee',
  SIGNUP_TRAINER: '/users/signup/trainer',

  // Login
  LOGIN: '/users/login',

  // 2FA / Google Authenticator
  SETUP_2FA: '/auth/2fa/setup',
  VERIFY_2FA: '/auth/2fa/verify',

  // Verification Status (for trainers)
  VERIFICATION_STATUS: '/users/verification-status',

  // User Info
  GET_ME: '/users/me',

  // Utility
  HEALTH: '/health',
  FORGOT_PASSWORD: '/users/forgot-password',
};

export default {
  API_BASE_URL,
  NEW_AUTH_BASE_URL,
  API_ENDPOINTS,
  NEW_AUTH_ENDPOINTS,
};
