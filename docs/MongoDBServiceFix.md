# MongoDBService Fix: Trainee Registration Parameters

## Problem
Trainee registration kept failing with error:
> "Trainee registration requires name and phone number"

Even though frontend was sending all fields including `name`, `phone`, `password`, `age_bracket`, `district`, `state`, and consents.

## Root Cause

### MongoDBService.registerUser() Function Signature

**Old (Broken)**:
```javascript
async registerUser({ name, email, password, role = 'authority', organization = 'NDMA' }) {
  // Only accepts: name, email, password, role, organization
  // Missing: phone, age_bracket, district, state, consent_location, consent_attendance
  
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, organization }),
    //                     ❌ Trainee fields were being IGNORED
  });
}
```

**Issue**: MongoDBService only accepted email-based registration parameters. When frontend passed trainee data with `phone` and other fields, they were **silently ignored** because they weren't in the function signature.

**Request sent to backend**:
```json
{
  "name": "Rajesh Kumar",
  "email": undefined,        // ❌ Trainee doesn't have email
  "password": "test123",
  "role": "trainee",
  "organization": "NDMA"     // ❌ Trainee doesn't need this
}
```

Backend received `name` but NO `phone`, so it responded with error.

## Solution Implemented

### Updated MongoDBService.registerUser() Function

**File**: `src/services/MongoDBService.js`  
**Lines**: 128-172

**New Function Signature**:
```javascript
async registerUser({ 
  name, 
  email, 
  password, 
  role = 'authority', 
  organization = 'NDMA',
  // ✅ NEW: Trainee-specific fields
  phone,
  age_bracket,
  district,
  state,
  consent_location,
  consent_attendance
}) {
```

**Conditional Request Body**:
```javascript
// Prepare request body based on role
const requestBody = role === 'trainee' 
  ? { 
      // Trainee registration payload
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
      // Trainer/Authority registration payload
      name, 
      email, 
      password, 
      role, 
      organization 
    };

const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody), // ✅ Correct payload for each role
});
```

**Updated userData Storage**:
```javascript
const userData = { 
  userId: data.user.id, 
  name: data.user.name, 
  email: data.user.email || '',   // Empty for trainee
  phone: data.user.phone || '',   // Phone for trainee
  role: data.user.role 
};
await AsyncStorage.setItem('userData', JSON.stringify(userData));
```

## How It Works Now

### Trainee Registration Flow

**Frontend (LoginScreen.js)**:
```javascript
const traineeData = {
  name: 'Rajesh Kumar',
  phone: '9876543210',
  password: 'test123',
  role: 'trainee',
  age_bracket: '26-35',
  district: 'Mumbai',
  state: 'Maharashtra',
  consent_location: true,
  consent_attendance: true,
};

const result = await MongoDBService.registerUser(traineeData);
```

**MongoDBService.registerUser()**:
```javascript
// Detects role === 'trainee'
const requestBody = {
  name: 'Rajesh Kumar',
  phone: '9876543210',        // ✅ Included
  password: 'test123',         // ✅ Included
  role: 'trainee',
  age_bracket: '26-35',        // ✅ Included
  district: 'Mumbai',          // ✅ Included
  state: 'Maharashtra',        // ✅ Included
  consent_location: true,      // ✅ Included
  consent_attendance: true     // ✅ Included
};

// Sends correct payload to backend
fetch('http://192.168.1.9:5000/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(requestBody)
});
```

**Backend (auth-server.js)**:
```javascript
// Receives all required fields
const { name, phone, password, role, age_bracket, district, state, consent_location, consent_attendance } = req.body;

// Validates
if (!name || !phone) {
  return res.status(400).json({ error: "Trainee registration requires name and phone number" });
}
// ✅ Now passes validation!

// Creates trainee user
const newTrainee = new User({
  name: 'Rajesh Kumar',
  phone: '9876543210',
  password: hashedPassword,
  role: 'trainee',
  age_bracket: '26-35',
  district: 'Mumbai',
  state: 'Maharashtra',
  consent_location: true,
  consent_attendance: true,
});

await newTrainee.save();

// Returns success + token
return res.status(201).json({ 
  success: true, 
  user: traineeResponse,
  token: 'jwt_token_here',
  message: "Trainee registered successfully" 
});
```

**Frontend Auto-login**:
```javascript
if (result.success) {
  await AsyncStorage.setItem('token', result.token);           // ✅ Token saved
  const sessionPayload = { ...result.user, token: result.token };
  await AsyncStorage.setItem('@ndma_session_user', JSON.stringify(sessionPayload)); // ✅ Session saved
  
  navigation.reset({
    index: 0,
    routes: [{ name: 'MainTabs', params: { user: result.user } }]
  }); // ✅ Navigate to MainTabs
}
```

### Trainer/Authority Registration Flow (Unchanged)

**Frontend**:
```javascript
const trainerData = {
  name: 'Divyanshu Mishra',
  email: 'divyanshu@ndma.gov.in',
  password: 'trainer123',
  role: 'trainer',
  organization: 'NDMA'
};

const result = await MongoDBService.registerUser(trainerData);
```

**MongoDBService**:
```javascript
// Detects role !== 'trainee'
const requestBody = {
  name: 'Divyanshu Mishra',
  email: 'divyanshu@ndma.gov.in',  // ✅ Email-based
  password: 'trainer123',
  role: 'trainer',
  organization: 'NDMA'
};

// Sends to backend
fetch('http://192.168.1.9:5000/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(requestBody)
});
```

## Changes Summary

### File: `src/services/MongoDBService.js`

**Function**: `registerUser()`  
**Lines**: 128-172

**Changes**:
1. Added trainee-specific parameters to function signature:
   - `phone`
   - `age_bracket`
   - `district`
   - `state`
   - `consent_location`
   - `consent_attendance`

2. Added conditional request body logic:
   - If `role === 'trainee'`: send trainee payload (phone, no email)
   - If `role !== 'trainee'`: send trainer/authority payload (email, organization)

3. Updated userData storage to include both email and phone:
   - `email: data.user.email || ''` (empty for trainee)
   - `phone: data.user.phone || ''` (populated for trainee)

## Testing

### Test Case 1: Trainee Registration
**Frontend Input**:
```javascript
{
  name: 'Rajesh Kumar',
  phone: '9876543210',
  password: 'test123',
  role: 'trainee',
  age_bracket: '26-35',
  district: 'Mumbai',
  state: 'Maharashtra',
  consent_location: true,
  consent_attendance: true
}
```

**Backend Receives**:
```json
{
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "password": "test123",
  "role": "trainee",
  "age_bracket": "26-35",
  "district": "Mumbai",
  "state": "Maharashtra",
  "consent_location": true,
  "consent_attendance": true
}
```

**Expected Result**: ✅ Registration successful + JWT token + auto-login

### Test Case 2: Trainer Registration
**Frontend Input**:
```javascript
{
  name: 'Divyanshu Mishra',
  email: 'divyanshu@ndma.gov.in',
  password: 'trainer123',
  role: 'trainer',
  organization: 'NDMA'
}
```

**Backend Receives**:
```json
{
  "name": "Divyanshu Mishra",
  "email": "divyanshu@ndma.gov.in",
  "password": "trainer123",
  "role": "trainer",
  "organization": "NDMA"
}
```

**Expected Result**: ✅ Registration successful + JWT token + auto-login

## Before vs After

### Before (Broken):
1. Frontend sends trainee data with `phone`
2. MongoDBService **ignores** `phone` (not in function signature)
3. MongoDBService sends `{ name, email: undefined, password, role }`
4. Backend receives request WITHOUT `phone`
5. Backend validation fails: "Trainee registration requires name and phone number"
6. Registration fails ❌

### After (Fixed):
1. Frontend sends trainee data with `phone`
2. MongoDBService **accepts** all trainee fields
3. MongoDBService detects `role === 'trainee'`
4. MongoDBService sends `{ name, phone, password, role, age_bracket, district, state, consents }`
5. Backend receives ALL required fields
6. Backend validation passes ✅
7. Backend creates user + returns token
8. Frontend auto-login succeeds ✅

## Files Modified

1. **src/services/MongoDBService.js**
   - Lines 128-172: Updated `registerUser()` function
   - Added 6 new parameters (phone, age_bracket, district, state, consent_location, consent_attendance)
   - Added conditional request body logic (trainee vs trainer/authority)
   - Updated userData storage to include phone

## Complete Registration Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LoginScreen (Frontend)                                        │
│    User fills trainee form + taps "Create account"              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ traineeData = { name, phone, password, role, ... }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. MongoDBService.registerUser(traineeData)                     │
│    ✅ Accepts all trainee fields                                │
│    ✅ Creates trainee-specific request body                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ POST /api/auth/register
                 │ Body: { name, phone, password, role, ... }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Backend (auth-server.js)                                     │
│    ✅ Receives all required fields                              │
│    ✅ Validates name + phone                                    │
│    ✅ Hashes password                                           │
│    ✅ Saves trainee user                                        │
│    ✅ Returns token                                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Response: { success: true, user: {...}, token: "..." }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. MongoDBService (returns result)                              │
│    ✅ Saves token to AsyncStorage                               │
│    ✅ Saves userData to AsyncStorage                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ return { success: true, user, token }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. LoginScreen (handles response)                               │
│    ✅ Auto-login (no need to login again)                       │
│    ✅ Navigate to MainTabs                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Backend updated (accepts password, returns token)
2. ✅ MongoDBService updated (sends trainee fields correctly)
3. ✅ Frontend LoginScreen ready (sends all trainee data)
4. **READY TO TEST**: Try trainee registration now!

---

**Status**: ✅ Fixed  
**Files Modified**: 1 (MongoDBService.js)  
**Last Updated**: October 19, 2025  
**Ready for Testing**: YES - Ab try karo!
