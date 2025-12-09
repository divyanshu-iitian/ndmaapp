# Backend API Documentation (SIH_BACKEND-main)

**Base URL**: `https://jpglj93t-3000.inc1.devtunnels.ms/api`

## 🔐 Authentication Flow

### 1. Trainee Flow
```
Signup → Login → Setup 2FA → Verify 2FA → Home
```

### 2. Trainer Flow
```
Signup (select org) → Login → Setup 2FA → Verify 2FA → Wait for org approval → Home
```

### 3. Organization Flow
```
Signup → Upload docs → Login → Setup 2FA → Verify 2FA → Wait for admin approval → Home
```

---

## 📝 Endpoints

### Trainee Signup
**POST** `/signup/trainee`

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "traineeCategory": "student"  // Options: community_volunteer, govt_officer, responder, student, other
}
```

**Response (201):**
```json
{
  "message": "Trainee account created successfully. You can now login."
}
```

---

### Trainer Signup
**POST** `/signup/trainer`

**Request Body:**
```json
{
  "username": "jane_trainer",
  "email": "jane@example.com",
  "password": "securepassword123",
  "organization": "67890abcdef1234567890123",  // Organization _id
  "workDesignation": "Senior Trainer",
  "govtIdCard": "https://cloudinary.com/govt-id.jpg"  // Optional
}
```

**Response (201):**
```json
{
  "message": "Trainer account created successfully. Waiting for organization verification."
}
```

---

### Organization Signup
**POST** `/signup/organization`

**Request Body:**
```json
{
  "username": "ndma_org",
  "email": "contact@ndma.gov.in",
  "password": "securepassword123",
  "organizationType": "NDMA"  // Options: NDMA, SDMA, ATI, NGO, OTHER
}
```

**Response (201):**
```json
{
  "message": "Organization registered successfully. Waiting for admin verification."
}
```

---

### Login
**POST** `/login`

**Request Body (First Time - No 2FA):**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200) - First Login:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requires2FASetup": true,  // User needs to set up 2FA
  "requiresDocumentUpload": false,  // For trainers/orgs
  "user": {
    "_id": "67890abcdef1234567890123",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "trainee",
    "profilePhoto": "https://www.gravatar.com/avatar/?d=mp",
    "traineeCategory": "student",
    "organizationVerificationStatus": null,
    "verificationStatus": null,
    "documentsUploaded": false,
    "rejectionReason": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "lastActive": "2025-01-01T00:00:00.000Z",
    "isActive": true
  }
}
```

**Request Body (With 2FA Enabled):**
```json
{
  "email": "john@example.com",
  "password": "securepassword123",
  "otp": "123456"  // Google Authenticator code
}
```

**Response (403) - 2FA Required:**
```json
{
  "message": "2FA is enabled. Please provide OTP.",
  "code": "2fa_required"
}
```

---

### Setup 2FA (After Login)
**POST** `/auth/2fa/setup`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",  // Secret key for manual entry
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS..."  // QR code image
}
```

---

### Verify 2FA
**POST** `/auth/2fa/verify`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "token": "123456"  // 6-digit code from Google Authenticator
}
```

**Response (200):**
```json
{
  "message": "2FA enabled successfully."
}
```

**Error Response (400):**
```json
{
  "message": "Invalid OTP."
}
```

---

### Get Current User
**GET** `/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "67890abcdef1234567890123",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "trainee",
  "profilePhoto": "https://www.gravatar.com/avatar/?d=mp",
  "lastActive": "2025-01-01T00:00:00.000Z",
  "isActive": true,
  "isTwoFactorEnabled": true,
  "traineeCategory": "student",
  "location": {
    "type": "Point",
    "coordinates": [75.8577, 22.7196]  // [longitude, latitude]
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

### Get All Organizations
**GET** `/organizations`

**Response (200):**
```json
{
  "count": 3,
  "organizations": [
    {
      "_id": "67890abcdef1234567890123",
      "username": "ndma_org",
      "email": "contact@ndma.gov.in",
      "organizationType": "NDMA"
    },
    {
      "_id": "67890abcdef1234567890124",
      "username": "sdma_delhi",
      "email": "contact@sdmadelhi.gov.in",
      "organizationType": "SDMA"
    }
  ]
}
```

---

### Upload Documents (For Organizations & Trainers)
**POST** `/documents/upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- **For Trainers:**
  - `govtIdCard`: File (Government ID Card image/PDF)

- **For Organizations:**
  - `registrationCertificate`: File
  - `gstCertificate`: File
  - `authorizationLetter`: File
  - `additionalDocs[]`: Multiple files

**Response (200):**
```json
{
  "message": "Documents uploaded successfully.",
  "documents": {
    "registrationCertificate": "https://cloudinary.com/...",
    "gstCertificate": "https://cloudinary.com/...",
    "authorizationLetter": "https://cloudinary.com/...",
    "additionalDocs": [
      "https://cloudinary.com/...",
      "https://cloudinary.com/..."
    ]
  },
  "govtIdCard": "https://cloudinary.com/..."  // For trainers
}
```

---

### Get Pending Trainers (For Organization)
**GET** `/pending-trainers`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "count": 2,
  "trainers": [
    {
      "_id": "67890abcdef1234567890125",
      "username": "jane_trainer",
      "email": "jane@example.com",
      "workDesignation": "Senior Trainer",
      "govtIdCard": "https://cloudinary.com/...",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Verify Trainer (For Organization)
**PUT** `/verify-trainer`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "trainerId": "67890abcdef1234567890125",
  "status": "verified",  // Options: verified, rejected
  "rejectionReason": "Incomplete documentation"  // Required if status is "rejected"
}
```

**Response (200):**
```json
{
  "message": "Trainer verified successfully.",
  "trainer": {
    "_id": "67890abcdef1234567890125",
    "username": "jane_trainer",
    "email": "jane@example.com",
    "organizationVerificationStatus": "verified"
  }
}
```

---

### Password Reset Request
**POST** `/request-password-reset`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "Password reset link sent to your email."
}
```

---

### Reset Password
**POST** `/reset-password/:token`

**Request Body:**
```json
{
  "password": "newsecurepassword123"
}
```

**Response (200):**
```json
{
  "message": "Password reset successful."
}
```

---

## 🔑 User Roles

### Trainee
- **Verification**: None required
- **Features**: Can attend trainings, view maps, participate in attendance sessions

### Trainer
- **Verification**: Organization approval required (`organizationVerificationStatus`)
- **Statuses**: `pending`, `verified`, `rejected`
- **Features**: Create trainings, manage attendance, submit reports

### Organization
- **Verification**: Admin approval required (`verificationStatus`)
- **Statuses**: `pending`, `approved`, `rejected`
- **Features**: Verify trainers, view organization analytics

### Admin
- **Features**: Verify organizations, view all users, system management

---

## 📊 Verification Status Fields

### Trainer
```typescript
organizationVerificationStatus: "pending" | "verified" | "rejected"
rejectionReason?: string  // Present if rejected
documentsUploaded: boolean
```

### Organization
```typescript
verificationStatus: "pending" | "approved" | "rejected"
rejectionReason?: string  // Present if rejected
documentsUploaded: boolean
verifiedBy?: ObjectId  // Admin who verified
```

---

## 🔒 Authentication

1. **JWT Tokens** stored in `Authorization: Bearer <token>` header
2. **Session Management** via Redis (7 days expiry)
3. **2FA Mandatory** for all users after first login
4. **Cookie Support** with `withCredentials: true`

---

## ⚠️ Important Notes

1. **2FA Flow**: Users must complete 2FA setup after first login, before accessing other features
2. **Organization Selection**: Trainers must select an existing **approved** organization during signup
3. **Document Upload**: Required for organizations and trainers before full access
4. **Verification**: Trainers wait for organization approval, organizations wait for admin approval
5. **Google OAuth**: Alternative login method that auto-creates accounts
