# Frontend Updates Required - Backend Alignment

## 📋 Current Status

**Backend Analyzed**: `SIH_BACKEND-main` (TypeScript)
- ✅ Router structure documented
- ✅ Controller logic understood
- ✅ User model fields identified
- ✅ API endpoints mapped

**Frontend Status**: Partially implemented (custom design, not aligned with backend)
- ⚠️ NewAuthService created but not matching backend API
- ⚠️ Only 2 user types implemented (trainee, trainer) - missing organization
- ⚠️ 2FA flow incorrect (should be after login, not during signup)
- ⚠️ Organization selection missing for trainers
- ⚠️ Document upload screens missing

---

## 🔧 Required Changes

### 1. NewAuthService.js
**Location**: `src/services/NewAuthService.js`

**Status**: ❌ File exists but needs complete rewrite to match backend

**Current Issues**:
- Using wrong endpoints (NEW_AUTH_ENDPOINTS doesn't match actual backend)
- 2FA flow wrong (integrated in signup, should be separate after login)
- Missing organization parameter for trainer signup
- Wrong response structure handling

**Required Updates**:
- ✅ Already documented in `BACKEND_API_DOCS.md`
- Need to rewrite file to match exact API structure
- Add proper error handling for verification statuses
- Handle `requires2FASetup`, `requiresDocumentUpload` flags from login response

---

### 2. NewAuthRegisterScreen.js
**Location**: `src/screens/NewAuthRegisterScreen.js`

**Current Issues**:
- Only handles trainee/trainer toggle
- Missing organization registration option
- No organization picker for trainers
- Doesn't handle traineeCategory selection
- Navigates directly to Setup2FA (wrong - should go to Login first)

**Required Updates**:
```javascript
// Add third tab: Trainee | Trainer | Organization
const [userType, setUserType] = useState('trainee');

// For Trainee
- Add traineeCategory picker:
  Options: community_volunteer, govt_officer, responder, student, other

// For Trainer
- Add organization picker (fetch from /organizations endpoint)
- Add workDesignation text input
- Optional: govt ID card upload

// For Organization
- Add organizationType picker:
  Options: NDMA, SDMA, ATI, NGO, OTHER

// After successful signup:
- Navigate to NewAuthLogin (NOT Setup2FA)
- Show message: "Account created! Please login to continue"
```

---

### 3. NewAuthLoginScreen.js
**Location**: `src/screens/NewAuthLoginScreen.js`

**Current Issues**:
- Doesn't handle `requires2FASetup` flag
- Doesn't handle `requiresDocumentUpload` flag
- Navigates directly to Enter2FA (should check if 2FA enabled first)

**Required Updates**:
```javascript
const handleLogin = async () => {
  const result = await NewAuthService.login(email, password, twoFactorCode);
  
  if (!result.success) {
    // Show error
    return;
  }

  // Check if 2FA code required (user already has 2FA enabled)
  if (result.requires2FA) {
    // Show OTP input field (don't navigate)
    setShow2FAInput(true);
    return;
  }

  // Login successful
  const { user, requires2FASetup, requiresDocumentUpload } = result;

  // Priority 1: Setup 2FA if not done
  if (requires2FASetup) {
    navigation.navigate('Setup2FA');
    return;
  }

  // Priority 2: Upload documents if required
  if (requiresDocumentUpload) {
    navigation.navigate('DocumentUpload');
    return;
  }

  // Priority 3: Check verification status
  const verificationStatus = await NewAuthService.getVerificationStatus();
  
  // Trainer waiting for org approval
  if (user.role === 'trainer' && verificationStatus.status === 'pending') {
    navigation.navigate('TrainerVerificationPending');
    return;
  }

  // Organization waiting for admin approval
  if (user.role === 'organization' && verificationStatus.status === 'pending') {
    navigation.navigate('OrganizationVerificationPending');
    return;
  }

  // All clear - go to home
  navigation.navigate('MainTabs');
};
```

---

### 4. Setup2FAScreen.js
**Location**: `src/screens/Setup2FAScreen.js`

**Current Issues**:
- Fetches QR from route params (wrong - should call API)
- Checks userRole from params to decide next screen

**Required Updates**:
```javascript
useEffect(() => {
  loadQRCode();
}, []);

const loadQRCode = async () => {
  // Call API to generate QR
  const result = await NewAuthService.setup2FA();
  if (result.success) {
    setQRCode(result.qrCode);
    setSecret(result.secret);
  }
};

const handleVerifyCode = async () => {
  const result = await NewAuthService.verify2FA(verificationCode);
  
  if (!result.success) {
    // Show error
    return;
  }

  // Check if documents needed
  const user = await NewAuthService.getCurrentUser();
  if (user.requiresDocumentUpload) {
    navigation.navigate('DocumentUpload');
    return;
  }

  // Check verification status
  const verificationStatus = await NewAuthService.getVerificationStatus();
  
  if (user.user.role === 'trainer' && verificationStatus.status === 'pending') {
    navigation.navigate('TrainerVerificationPending');
  } else if (user.user.role === 'organization' && verificationStatus.status === 'pending') {
    navigation.navigate('OrganizationVerificationPending');
  } else {
    navigation.navigate('MainTabs');
  }
};
```

---

### 5. Create DocumentUploadScreen.js
**Location**: `src/screens/DocumentUploadScreen.js` (NEW FILE)

**Purpose**: Allow trainers/organizations to upload verification documents

**Structure**:
```javascript
// For Trainers:
- Upload Government ID Card (image/PDF)
- Submit button

// For Organizations:
- Registration Certificate
- GST Certificate
- Authorization Letter
- Additional Documents (multiple files)
- Submit button

const handleUpload = async () => {
  const formData = new FormData();
  // Add files to formData
  
  const result = await NewAuthService.uploadOrganizationDocuments(formData);
  
  if (result.success) {
    // Check verification status and navigate accordingly
    const verificationStatus = await NewAuthService.getVerificationStatus();
    
    if (user.role === 'trainer' && verificationStatus.status === 'pending') {
      navigation.navigate('TrainerVerificationPending');
    } else if (user.role === 'organization' && verificationStatus.status === 'pending') {
      navigation.navigate('OrganizationVerificationPending');
    } else {
      navigation.navigate('MainTabs');
    }
  }
};
```

---

### 6. Create OrganizationVerificationPendingScreen.js
**Location**: `src/screens/OrganizationVerificationPendingScreen.js` (NEW FILE)

**Purpose**: Similar to TrainerVerificationPendingScreen but for organizations

**Structure**:
```javascript
// Same polling logic as TrainerVerificationPendingScreen
// Poll /me endpoint every 15 seconds
// Check if verificationStatus changed from 'pending' to 'approved'
// If approved, navigate to MainTabs
// If rejected, show rejection reason and reapply option
```

---

### 7. Update App.js
**Location**: `App.js`

**Required Updates**:
```javascript
// Add new screens to Stack Navigator
<Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
<Stack.Screen name="OrganizationVerificationPending" component={OrganizationVerificationPendingScreen} />
```

---

### 8. Create OrganizationPicker.js
**Location**: `src/components/OrganizationPicker.js` (ALREADY EXISTS)

**Purpose**: Dropdown to select organization during trainer signup

**Required Updates**:
```javascript
useEffect(() => {
  fetchOrganizations();
}, []);

const fetchOrganizations = async () => {
  const result = await NewAuthService.getAllOrganizations();
  if (result.success) {
    setOrganizations(result.organizations);
  }
};

// Use React Native Picker or custom dropdown
// Show organization name, store _id value
```

---

## 🎯 Implementation Priority

### Phase 1: Core Service (HIGH PRIORITY)
1. ✅ Document backend API → `BACKEND_API_DOCS.md`
2. ❌ Rewrite `NewAuthService.js` to match exact backend API
3. ❌ Test all endpoints with Postman/actual backend

### Phase 2: Registration Flow (HIGH PRIORITY)
1. ❌ Update `NewAuthRegisterScreen.js` - add 3 user types
2. ❌ Add trainee category picker
3. ❌ Add organization picker for trainers (fetch from API)
4. ❌ Add organization type picker for organizations
5. ❌ Fix navigation: Register → Login (NOT Setup2FA)

### Phase 3: Login & 2FA Flow (HIGH PRIORITY)
1. ❌ Update `NewAuthLoginScreen.js` to handle:
   - `requires2FA` flag (show OTP input)
   - `requires2FASetup` flag (navigate to Setup2FA)
   - `requiresDocumentUpload` flag (navigate to DocumentUpload)
2. ❌ Update `Setup2FAScreen.js` to call API (not use params)
3. ❌ Fix navigation logic after 2FA verification

### Phase 4: Document Upload (MEDIUM PRIORITY)
1. ❌ Create `DocumentUploadScreen.js`
2. ❌ Handle file picker for images/PDFs
3. ❌ Create FormData and upload via NewAuthService
4. ❌ Navigate based on verification status

### Phase 5: Verification Pending (MEDIUM PRIORITY)
1. ✅ `TrainerVerificationPendingScreen.js` already exists
2. ❌ Create `OrganizationVerificationPendingScreen.js`
3. ❌ Update both screens to poll `/me` endpoint

### Phase 6: Testing (LOW PRIORITY)
1. ❌ Test trainee flow end-to-end
2. ❌ Test trainer flow with organization selection
3. ❌ Test organization flow with document upload
4. ❌ Test 2FA setup and login with OTP
5. ❌ Test verification pending screens

---

## 🚨 Critical Notes

1. **DO NOT modify old backend files** - Keep `AuthService.js`, old login screens unchanged
2. **Backend URL**: `https://jpglj93t-3000.inc1.devtunnels.ms/api`
3. **2FA is mandatory** - Every user MUST complete 2FA setup after first login
4. **3 User Types**: Trainee, Trainer, Organization (not just 2)
5. **Organization must be approved** - Trainers can only select from approved organizations
6. **Documents are required** - Trainers and Organizations must upload documents before full access
7. **Verification flow**:
   - Trainee: Signup → Login → 2FA → Home ✅
   - Trainer: Signup → Login → 2FA → Docs → Org Approval → Home
   - Organization: Signup → Login → 2FA → Docs → Admin Approval → Home

---

## 📝 Next Steps

1. Stop Metro server if running
2. Delete old `NewAuthService.js` file
3. Create new `NewAuthService.js` matching `BACKEND_API_DOCS.md`
4. Update screens one by one following priority order
5. Test each flow before moving to next

Chahiye to main ab screens update karna start kar doon? Ya pehle NewAuthService fix karu?
