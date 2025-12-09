# New Auth Backend Integration - 2FA + Verification Flow

## Backend URL
```
Base URL: https://jpglj93t-3000.inc1.devtunnels.ms/api
Health Check: https://jpglj93t-3000.inc1.devtunnels.ms/api/health
```

## Authentication Flow

### 1. Registration Flow

#### Trainee Registration
**Endpoint:** `POST /users/signup/trainee`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "919876543210",
  "password": "SecurePass123!",
  "organizationId": "ORG123" // Optional
}
```

**Expected Response:**
```json
{
  "success": true,
  "tempToken": "temp_xyz123...",
  "requiresSetup2FA": true,
  "message": "Registration successful"
}
```

**Next Step:** Navigate to Setup 2FA screen

---

#### Trainer Registration
**Endpoint:** `POST /users/signup/trainer`

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "919876543211",
  "password": "SecurePass123!",
  "organizationId": "ORG456", // Optional
  "qualification": "Disaster Management Certified"
}
```

**Expected Response:**
```json
{
  "success": true,
  "tempToken": "temp_abc456...",
  "requiresSetup2FA": true,
  "message": "Registration successful"
}
```

**Next Step:** Navigate to Setup 2FA screen

---

### 2. Two-Factor Authentication (2FA) Setup

#### Get QR Code & Secret
**Endpoint:** `POST /auth/2fa/setup`

**Headers:**
```
Authorization: Bearer <tempToken>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
    "secret": "JBSWY3DPEHPK3PXP"
  }
}
```

**Implementation:**
- Display QR code image
- Show secret key with copy button
- User scans QR with Google Authenticator app
- User enters 6-digit code from app

---

#### Verify 2FA Code (During Setup)
**Endpoint:** `POST /auth/2fa/verify`

**Request:**
```json
{
  "code": "123456",
  "tempToken": "temp_xyz123..."
}
```

**Expected Response (Trainee - Immediate Access):**
```json
{
  "success": true,
  "token": "jwt_token_here...",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "trainee",
    "verificationStatus": "approved"
  }
}
```

**Expected Response (Trainer - Needs Approval):**
```json
{
  "success": true,
  "token": "jwt_token_here...",
  "user": {
    "id": "user456",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "trainer",
    "verificationStatus": "pending"
  }
}
```

**Next Steps:**
- **Trainee:** Navigate to main app (immediate access)
- **Trainer:** Navigate to Verification Pending screen

---

### 3. Login Flow

#### Login (Step 1 - Email & Password)
**Endpoint:** `POST /users/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "requires2FA": true,
  "tempToken": "temp_login_789...",
  "message": "Please enter 2FA code"
}
```

**Next Step:** Navigate to Enter 2FA screen

---

#### Login (Step 2 - Verify 2FA Code)
**Endpoint:** `POST /auth/2fa/verify`

**Request:**
```json
{
  "code": "654321",
  "tempToken": "temp_login_789..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "jwt_final_token...",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "trainee",
    "verificationStatus": "approved"
  }
}
```

**Error Response (Invalid Code):**
```json
{
  "success": false,
  "message": "Invalid 2FA code",
  "remainingAttempts": 2
}
```

**Next Steps:**
- **Approved User:** Navigate to main app
- **Pending Trainer:** Navigate to Verification Pending screen

---

### 4. Trainer Verification Status

#### Get Verification Status
**Endpoint:** `GET /users/verification-status`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Expected Response:**
```json
{
  "success": true,
  "verificationStatus": "pending",
  "notes": ""
}
```

**Possible Status Values:**
- `pending` - Waiting for admin approval
- `approved` - Admin has approved the account
- `rejected` - Admin has rejected the account

**Implementation:**
- Poll this endpoint every 10-20 seconds on Verification Pending screen
- Auto-redirect to login when status changes to "approved"

---

### 5. User Info

#### Get Current User
**Endpoint:** `GET /users/me`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "919876543210",
    "role": "trainee",
    "verificationStatus": "approved",
    "organizationId": "ORG123"
  }
}
```

---

### 6. Forgot Password

#### Request Password Reset
**Endpoint:** `POST /users/forgot-password`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

## Frontend Implementation

### Service Layer
- `NewAuthService.js` - All API calls to new backend
- Uses axios with `withCredentials: true` for cookie support
- Stores tokens in AsyncStorage

### Screens Created

1. **NewAuthLoginScreen** - Email/password login
2. **NewAuthRegisterScreen** - Trainee/Trainer registration
3. **Setup2FAScreen** - QR code setup after registration
4. **Enter2FAScreen** - Enter 2FA code during login
5. **TrainerVerificationPendingScreen** - Trainer waiting for approval

### Navigation Flow

```
Registration:
NewAuthRegister → Setup2FA → (Trainee: MainTabs) OR (Trainer: TrainerVerificationPending)

Login:
NewAuthLogin → Enter2FA → (Approved: MainTabs) OR (Pending Trainer: TrainerVerificationPending)
```

---

## Testing Checklist

### Trainee Flow
- [ ] Register as trainee
- [ ] See QR code and secret
- [ ] Scan QR with Google Authenticator
- [ ] Enter 6-digit code
- [ ] Immediate access to app granted
- [ ] Login works with 2FA

### Trainer Flow
- [ ] Register as trainer
- [ ] See QR code and secret
- [ ] Scan QR with Google Authenticator
- [ ] Enter 6-digit code
- [ ] Redirected to "Under Verification" screen
- [ ] Verification status polls every 15 seconds
- [ ] After admin approval, auto-redirect to login
- [ ] Login works with 2FA after approval

### Error Handling
- [ ] Invalid email format shows error
- [ ] Wrong password shows error
- [ ] Invalid 2FA code shows error with remaining attempts
- [ ] Network errors handled gracefully
- [ ] Expired temp token handled

---

## Security Notes

- JWT tokens stored in AsyncStorage (consider secure storage for production)
- Temp tokens cleared after 2FA verification
- httpOnly cookies supported if backend sends them
- 2FA required for all logins
- Trainers must be admin-approved before full access

---

## Configuration

**File:** `src/services/config.js`

```javascript
export const NEW_AUTH_BASE_URL = 'https://jpglj93t-3000.inc1.devtunnels.ms/api';
```

Old backend URL remains unchanged for backward compatibility.

---

## Support

For backend API issues:
- Check health endpoint: `/api/health`
- Verify routes in backend router files
- Contact backend team with request/response logs
