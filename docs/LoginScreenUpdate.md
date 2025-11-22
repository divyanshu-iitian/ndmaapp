# LoginScreen Update - Trainee Registration Support

## Overview
Updated `LoginScreen.js` to support 3-tab authentication system (Trainer/Trainee/Authority) with phone-based trainee registration.

## Features Implemented

### 1. **Tab Selector (User Type)**
- 3 tabs at the top: 👨‍🏫 Trainer | 👤 Trainee | 🏛️ Authority
- Active tab highlighted with dark blue background
- Sets `activeTab` state ('trainer'|'trainee'|'authority')
- Smooth animations with elevation/shadow effects

### 2. **Trainee Registration Form**
When `activeTab === 'trainee'` and `!isLogin`:
- **Full Name** (text input)
- **Phone Number** (10-digit, phone-pad keyboard)
- **Age Bracket** (picker: 18-25, 26-35, 36-45, 46-60, 60+)
- **District** (text input)
- **State** (text input)
- **Consent Checkboxes** (2 required):
  - Location sharing during attendance
  - Attendance tracking and record keeping

### 3. **Trainee Login Form**
When `activeTab === 'trainee'` and `isLogin`:
- **Phone Number** (10-digit)
- **Password** (secure entry)

### 4. **Trainer/Authority Forms**
When `activeTab !== 'trainee'`:
- **Registration**: Name, Email, Password, Confirm Password, Organization Picker
- **Login**: Email, Password

### 5. **State Management**
New state variables added:
```javascript
const [activeTab, setActiveTab] = useState('trainer');
const [phone, setPhone] = useState('');
const [ageBracket, setAgeBracket] = useState('');
const [district, setDistrict] = useState('');
const [state, setState] = useState('');
const [consentLocation, setConsentLocation] = useState(false);
const [consentAttendance, setConsentAttendance] = useState(false);
```

### 6. **Authentication Logic**
Updated `handleAuth` function:

#### Trainee Login:
```javascript
if (activeTab === 'trainee' && isLogin) {
  // Validate phone (10 digits)
  MongoDBService.loginUser(phone, password)
  // Store token + session
}
```

#### Trainee Registration:
```javascript
if (activeTab === 'trainee' && !isLogin) {
  // Validate: name, phone (10 digits), age_bracket, district, state
  // Check both consents are true
  MongoDBService.registerUser({
    role: 'trainee',
    name,
    phone,
    age_bracket: ageBracket,
    district,
    state,
    consent_location: consentLocation,
    consent_attendance: consentAttendance,
  })
  // Store token + session
}
```

#### Trainer/Authority:
```javascript
if (activeTab !== 'trainee') {
  // Email + password flow (existing logic)
  // Role determined by activeTab ('trainer' or 'authority')
}
```

### 7. **Validation Rules**
- **Trainee Registration**:
  - Name required and non-empty
  - Phone exactly 10 digits
  - Age bracket selected
  - District and state non-empty
  - Both consents must be checked
  
- **Trainee Login**:
  - Phone exactly 10 digits
  - Password required

- **Trainer/Authority**:
  - Same as before (email, password, etc.)

### 8. **UI Styling**
New styles added:
- `.tabContainer` - Tab row container (gray background)
- `.tab` - Individual tab button
- `.tabActive` - Active tab (dark blue + shadow)
- `.tabText` / `.tabTextActive` - Tab text colors
- `.picker` - Age bracket picker styling
- `.consentContainer` - Consent checkboxes container
- `.consentRow` - Single consent row (checkbox + text)
- `.checkbox` / `.checkboxChecked` - Checkbox states
- `.checkmark` - Checkmark icon (✓)
- `.consentText` - Consent label text

## Backend Integration

### API Endpoints Used

#### 1. **POST /api/auth/register** (Updated)
Trainee registration payload:
```json
{
  "role": "trainee",
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "age_bracket": "26-35",
  "district": "Mumbai",
  "state": "Maharashtra",
  "consent_location": true,
  "consent_attendance": true
}
```

Response:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "Rajesh Kumar",
    "phone": "9876543210",
    "role": "trainee",
    "age_bracket": "26-35",
    "district": "Mumbai",
    "state": "Maharashtra"
  }
}
```

#### 2. **POST /api/auth/login** (Existing)
Trainee login payload:
```json
{
  "email": "9876543210",  // Phone used as email for trainee
  "password": "user_password"
}
```

## User Flow

### Trainee Registration
1. User opens app → LoginScreen
2. Taps **👤 Trainee** tab
3. Taps **Register** toggle
4. Fills form: Name, Phone, Age, District, State
5. Checks both consent boxes (mandatory)
6. Taps **Create account**
7. Backend validates + creates user (phone as initial password for MVP)
8. Returns JWT token
9. Navigates to MainTabs with trainee role

### Trainee Login
1. User opens app → LoginScreen
2. Taps **👤 Trainee** tab
3. Taps **Login** toggle
4. Enters Phone + Password
5. Taps **Sign in**
6. Backend validates credentials
7. Returns JWT token
8. Navigates to MainTabs

## Security Notes

### Temporary MVP Approach
- **Initial Password**: Backend sets phone number as temporary password for trainee accounts
- **Consent Required**: Both location and attendance consents must be checked to register
- **No OTP**: Simple phone-based registration (OTP can be added later with Firebase Auth/Twilio)

### Production Recommendations
1. Add phone verification (SMS OTP) using Firebase Auth or Twilio
2. Force password change on first login
3. Add "Forgot Password" flow (SMS-based)
4. Add phone number masking in UI (e.g., 98****3210)
5. Rate limiting on registration endpoint

## Next Steps

### 1. Trainer Attendance Session UI
Create `AttendanceSessionScreen.js`:
- Start Attendance button in AddTrainingScreen
- Mode selector: GPS / Manual (hotspot/BLE future)
- GPS radius slider (10-100m, default 30m)
- Real-time attendees list (polls every 5s)
- End Session button

### 2. Trainee Attendance Confirmation
Create `TraineeAttendanceModal.js`:
- Auto-detect GPS proximity to active session
- Show modal with training details
- Confirm Attendance button → marks attendance
- Offline queue support (AsyncStorage)

### 3. GPS Proximity Logic
- Request location permission (expo-location)
- Get trainee location
- Calculate distance from training location (Haversine)
- Check if within session radius
- Auto-trigger modal if within range

### 4. Offline Sync
- AsyncStorage queue for attendance records
- Monitor connectivity (NetInfo)
- Batch upload when online
- Sync status indicators (pending/syncing/synced)

## Testing Checklist

- [ ] Trainer registration (email-based)
- [ ] Trainer login (email-based)
- [ ] Authority registration (email-based)
- [ ] Authority login (email-based)
- [ ] Trainee registration (phone-based, all fields)
- [ ] Trainee registration validation (missing fields)
- [ ] Trainee registration validation (consents unchecked)
- [ ] Trainee login (phone + password)
- [ ] Tab switching (all 3 tabs)
- [ ] Toggle switching (Login/Register)
- [ ] Form field conditional rendering
- [ ] AsyncStorage token storage
- [ ] Navigation after successful auth
- [ ] Error handling (invalid credentials)
- [ ] Error handling (network issues)

## Files Modified

1. **src/screens/LoginScreen.js**
   - Added state variables (activeTab, phone, ageBracket, district, state, consents)
   - Updated `handleAuth` function (trainee login/registration logic)
   - Updated UI (tab selector, conditional forms, consent checkboxes)
   - Added styles (tabs, picker, consent UI)

## Dependencies

- `@react-native-picker/picker` - Age bracket selector
- `react-native` - TextInput, TouchableOpacity, View, Text
- `@react-native-async-storage/async-storage` - Token storage
- `../services/MongoDBService` - API calls (registerUser, loginUser)
- `../components/OrganizationPicker` - Organization selector (trainer/authority)

## Screenshots (Expected)

### Trainer Tab (Registration)
- Name, Email, Password, Confirm Password, Organization

### Trainee Tab (Registration)
- Name, Phone, Age Bracket, District, State, 2 Consent Checkboxes

### Authority Tab (Login)
- Email, Password

---

**Status**: ✅ Complete  
**Last Updated**: 2024  
**Next Phase**: Trainer Attendance Session UI + GPS Proximity Logic
