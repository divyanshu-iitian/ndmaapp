# CSV Chat Feature - Complete Guide

## Overview
The NDMA Training App now includes an AI-powered CSV Chat feature that allows trainers to upload CSV files and ask questions about their data using the Groq API.

## How to Use

### 1. Access CSV Chat
- **From Home Screen**: Tap the "CSV Chat" quick action card (💬 icon)
- **Navigation**: The chat screen will open with a modern NDMA-styled interface

### 2. Upload CSV File
- Tap the "📎 Upload CSV File" button at the top
- Select any CSV file from your device
- The app will automatically parse and preview the first 20 rows
- Supported format: Standard CSV with comma-separated values

### 3. Ask Questions
- Type your question in the text input at the bottom
- Example questions:
  - "What are the key insights from this data?"
  - "How many total records are there?"
  - "Show me trends in the training completion rates"
  - "Summarize the data by region"
  - "What's the average training score?"

### 4. View AI Responses
- The Groq AI (llama3-8b-8192 model) will analyze your CSV data
- Responses appear in blue chat bubbles
- Your questions appear in gray bubbles
- Loading indicator shows while AI is processing

## Technical Details

### API Configuration
- **Provider**: Groq AI
- **Model**: llama3-8b-8192
- **API Key**: Configured and ready to use
- **Endpoint**: https://api.groq.com/openai/v1/chat/completions

### Features
✅ CSV file upload with DocumentPicker
✅ Automatic parsing of first 20 rows for preview
✅ Real-time AI chat interface
✅ Loading states and error handling
✅ Message history (user questions + AI responses)
✅ NDMA-themed UI design
✅ Smooth animations and transitions
✅ Safe area handling for all devices

### Data Privacy
- CSV data is sent to Groq API for analysis
- Only first 20 rows are included in the AI context
- No data is stored permanently
- Messages clear when you leave the screen

## Navigation Structure

```
App.js
├── Auth Screen (Login)
└── MainTabs
    ├── Home
    │   └── CSV Chat Button → Chat Screen (Stack)
    ├── Add Training
    ├── Map
    ├── Reports
    ├── Explore
    └── Profile
```

## Files Modified/Created

### New Files
- `src/screens/ChatScreen.js` - Complete AI chat interface

### Modified Files
- `App.js` - Added ChatScreen to Stack Navigator
- `src/screens/HomeScreen.js` - Added CSV Chat quick action button

### Dependencies Added
- `expo-document-picker` - For CSV file selection

## Testing the Feature

1. **Login** to the app (credentials: divyanshu@ndma.gov.in / trainer123)
2. **Navigate** to Home screen
3. **Tap** on "CSV Chat" quick action card
4. **Upload** a test CSV file
5. **Ask** questions about your data
6. **View** AI-generated insights

## Example CSV Data Structure

```csv
Training ID,Trainer,Location,Date,Participants,Completion Rate
T001,Divyanshu,Delhi,2025-01-15,45,92%
T002,Priya Sharma,Mumbai,2025-01-16,38,88%
T003,Rajesh Kumar,Bangalore,2025-01-17,52,95%
```

## Error Handling

The app handles various error scenarios:
- **No file selected**: Silent cancel, no error shown
- **Invalid CSV format**: Error message displayed
- **API errors**: User-friendly error messages
- **Network issues**: Connection error alerts
- **Empty questions**: Validation prevents empty submissions

## Future Enhancements (Planned)

- 🔄 Support for larger CSV files (pagination)
- 💾 Save chat history to AsyncStorage
- 📊 Generate charts/graphs from data
- 📤 Export AI responses as reports
- 🔍 Advanced filtering and data queries
- 📁 Multiple file support

## Support

For any issues with the CSV Chat feature:
1. Check your internet connection
2. Verify CSV file format is valid
3. Ensure file size is reasonable (< 5MB recommended)
4. Try re-uploading the file
5. Check if Groq API is accessible

---

**Note**: This feature requires an active internet connection to communicate with the Groq API.
