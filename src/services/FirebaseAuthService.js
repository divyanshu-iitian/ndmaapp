import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Config (from your Google Cloud project)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Get from Firebase Console
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "myimagesndma", // Same as your GCS bucket!
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

class FirebaseAuthService {
  constructor() {
    this.auth = auth;
    this.currentUser = null;
    
    // Listen to auth state changes
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  // ======== REGISTER ========
  async registerUser({ name, email, password }) {
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );
      
      const user = userCredential.user;

      // Update user profile with name
      await updateProfile(user, {
        displayName: name,
      });

      // Save additional data to AsyncStorage
      const userData = {
        id: user.uid,
        name: name,
        email: user.email,
        role: 'trainer',
        organization: 'NDMA Training Institute',
        phone: '',
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `@user_${user.uid}`, 
        JSON.stringify(userData)
      );

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // ======== LOGIN ========
  async loginUser(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );
      
      const user = userCredential.user;

      // Get additional user data from AsyncStorage
      const storedData = await AsyncStorage.getItem(`@user_${user.uid}`);
      let userData;

      if (storedData) {
        userData = JSON.parse(storedData);
      } else {
        // Fallback if no stored data
        userData = {
          id: user.uid,
          name: user.displayName || 'User',
          email: user.email,
          role: 'trainer',
          organization: 'NDMA Training Institute',
          phone: '',
        };
      }

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please register first';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // ======== LOGOUT ========
  async logoutUser() {
    try {
      await signOut(this.auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  // ======== GET CURRENT USER ========
  getCurrentUser() {
    return this.currentUser;
  }

  // ======== CHECK AUTH STATE ========
  async checkAuthState() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, async (user) => {
        unsubscribe();
        if (user) {
          const storedData = await AsyncStorage.getItem(`@user_${user.uid}`);
          const userData = storedData ? JSON.parse(storedData) : {
            id: user.uid,
            name: user.displayName || 'User',
            email: user.email,
            role: 'trainer',
          };
          resolve({ authenticated: true, user: userData });
        } else {
          resolve({ authenticated: false, user: null });
        }
      });
    });
  }
}

export default new FirebaseAuthService();
