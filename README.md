# NDMA Training Portal - React Native App

A comprehensive mobile application for managing disaster management training programs under the National Disaster Management Authority (NDMA).

## 🎯 Purpose

This app addresses the need for:
- Real-time tracking of disaster management training sessions
- Centralized monitoring of training institutes and their activities
- Efficiency measurement and data visualization on maps
- Seamless communication between training institutes and central authorities

## 🏗️ Architecture

The app provides two main user interfaces:

### 1. Training Institute Portal 👨‍🏫
- **Registration & Login**: Training institutes can register and manage their accounts
- **Training Management**: Create, manage, and report training sessions
- **Participant Tracking**: Record and track participant attendance and progress
- **Location Services**: Pin training locations on interactive maps
- **Data Reporting**: Send comprehensive training data to central authorities

### 2. Central Authority Dashboard 🏛️
- **Registration & Access Control**: NDMA officials request access with approval workflow
- **Monitoring Dashboard**: Real-time view of all training activities nationwide
- **Interactive Maps**: Visual representation of training locations with detailed information
- **Analytics**: Training efficiency metrics and comprehensive reporting
- **Institute Management**: Approve and manage training institutes

## 🛠️ Technology Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation 6
- **Database**: MongoDB Atlas
- **Styling**: React Native StyleSheet with LinearGradient
- **State Management**: React Hooks (useState, useEffect)
- **Maps**: Future integration with React Native Maps
- **Authentication**: Custom authentication with MongoDB

## 📱 Screens Implemented

### Common Screens
- **User Type Selection**: Choose between Trainer and Central Authority
- **Welcome Screen**: App introduction with role selection

### Training Institute Screens
- **Trainer Login**: Secure login for training institutes
- **Trainer Registration**: Complete registration form with institute details
- **Dashboard**: (Future) Training management interface
- **Training Session Creation**: (Future) Create and manage training sessions
- **Participant Management**: (Future) Track participants and attendance

### Central Authority Screens
- **Central Authority Login**: Secure login for officials
- **Central Authority Registration**: Access request form with approval workflow
- **Monitoring Dashboard**: (Future) Real-time training overview
- **Interactive Map**: (Future) Geographic visualization of trainings
- **Analytics**: (Future) Training metrics and reports

## 🗄️ Database Schema

### Collections

#### Trainers Collection
```javascript
{
  _id: ObjectId,
  instituteName: String,
  contactPerson: String,
  email: String,
  phone: String,
  address: String,
  password: String, // Will be hashed in production
  createdAt: Date,
  updatedAt: Date,
  isActive: Boolean,
  verificationStatus: String, // 'pending', 'verified', 'rejected'
  lastLogin: Date
}
```

#### Central Authorities Collection
```javascript
{
  _id: ObjectId,
  fullName: String,
  designation: String,
  department: String,
  officialEmail: String,
  phone: String,
  employeeId: String,
  officeAddress: String,
  password: String, // Will be hashed in production
  createdAt: Date,
  updatedAt: Date,
  isActive: Boolean,
  approvalStatus: String, // 'pending', 'approved', 'rejected'
  verificationStatus: String,
  lastLogin: Date
}
```

#### Training Sessions Collection (Future)
```javascript
{
  _id: ObjectId,
  trainerId: ObjectId,
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  location: {
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  maxParticipants: Number,
  registeredParticipants: Number,
  status: String, // 'upcoming', 'ongoing', 'completed', 'cancelled'
  trainingType: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Expo CLI
- MongoDB Atlas account
- Android/iOS development environment (optional, for building native apps)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NDMATrainingApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - The app is already configured with MongoDB Atlas
   - Connection string is included in `src/config/database.js`
   - Test the connection by running:
   ```bash
   node src/config/testConnection.js
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

5. **Run on device/emulator**
   - Scan QR code with Expo Go app (Android/iOS)
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator
   - Press 'w' for web browser

## 📁 Project Structure

```
NDMATrainingApp/
├── App.js                          # Main app component with navigation
├── app.json                        # Expo configuration
├── package.json                    # Dependencies and scripts
├── src/
│   ├── config/
│   │   ├── database.js            # MongoDB connection and operations
│   │   └── testConnection.js      # Database connection test
│   ├── navigation/
│   │   └── (Future navigation components)
│   ├── screens/
│   │   ├── UserTypeSelectionScreen.js      # Home screen with role selection
│   │   ├── TrainerLoginScreen.js           # Trainer login interface
│   │   ├── TrainerRegisterScreen.js        # Trainer registration form
│   │   ├── CentralAuthorityLoginScreen.js  # Authority login interface
│   │   └── CentralAuthorityRegisterScreen.js # Authority registration form
│   └── styles/
│       └── commonStyles.js         # Shared styles and theme
└── assets/                         # Images, fonts, and other assets
```

## 🔐 Authentication Flow

### Training Institutes
1. **Registration**: Complete institute details, contact person, and credentials
2. **Verification**: Account created with 'pending' status (auto-approval for now)
3. **Login**: Email and password authentication
4. **Dashboard Access**: Access to training management features

### Central Authorities
1. **Access Request**: Submit official details and credentials
2. **Approval Workflow**: Request marked as 'pending' for admin approval
3. **Admin Review**: System administrators review and approve/reject requests
4. **Login**: Only approved accounts can access the monitoring dashboard

## 🔧 Configuration

### MongoDB Connection
The app uses MongoDB Atlas with the following configuration:
- **Connection String**: Already configured in `src/config/database.js`
- **Database Name**: `ndma_training`
- **Collections**: `trainers`, `central_authorities`, `training_sessions`, `participants`

### Environment Variables (Future Enhancement)
Consider moving sensitive data to environment variables:
```javascript
// .env file
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
API_BASE_URL=your_api_base_url
```

## 🎨 UI/UX Features

### Design Principles
- **Role-based Color Schemes**: Different gradient themes for trainers (green) and authorities (orange)
- **Intuitive Navigation**: Clear role selection and easy navigation between screens
- **Professional Design**: Government-appropriate styling with official feel
- **Responsive Layout**: Optimized for various screen sizes
- **Accessibility**: Proper contrast ratios and readable fonts

### Visual Elements
- **Linear Gradients**: Modern gradient backgrounds for each user type
- **Icons**: Emoji-based icons for better visual recognition
- **Cards**: Clean card-based layouts for forms and information
- **Buttons**: Consistent button styling with proper touch feedback

## 🚧 Future Enhancements

### Phase 1 - Core Features (Current)
- ✅ User type selection
- ✅ Authentication screens
- ✅ MongoDB integration
- ✅ Basic UI/UX

### Phase 2 - Training Management
- 📋 Training session creation and management
- 👥 Participant registration and tracking
- 📊 Basic reporting and analytics
- 📱 Push notifications

### Phase 3 - Advanced Features
- 🗺️ Interactive maps with training locations
- 📈 Advanced analytics and dashboards
- 🔄 Real-time data synchronization
- 📤 Export and sharing capabilities

### Phase 4 - Enterprise Features
- 🔐 Advanced security and encryption
- 🌐 Offline mode support
- 🔗 API integrations with government systems
- 📱 Native app optimization

## 🧪 Testing

### Manual Testing
1. **User Registration**: Test both trainer and authority registration flows
2. **Authentication**: Verify login functionality for both user types
3. **Navigation**: Ensure smooth navigation between screens
4. **Form Validation**: Test input validation and error handling
5. **Database Operations**: Verify data storage and retrieval

### Future Testing
- Unit tests for database operations
- Integration tests for authentication flows
- UI/UX testing for various screen sizes
- Performance testing for large datasets

## 🤝 Contributing

### Development Guidelines
1. Follow React Native best practices
2. Maintain consistent code formatting
3. Write clear, descriptive commit messages
4. Test thoroughly before submitting changes
5. Update documentation for new features

### Code Style
- Use functional components with hooks
- Implement proper error handling
- Follow the established folder structure
- Use the common styles and theme system

## 📄 License

This project is developed for educational and demonstration purposes. Please ensure compliance with relevant government policies and data protection regulations when deploying for actual use.

## 📞 Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

---

**Note**: This is a foundational implementation. The app currently provides the basic authentication and user management system. Future iterations will include the complete training management and monitoring features as outlined in the roadmap.