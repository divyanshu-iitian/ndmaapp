import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Multiple Gemini API keys for rotation
const GEMINI_API_KEYS = [
  'AIzaSyAojPmzpIxRaTgfAkcD1pEtfYAPX5m9ZWQ', // Key 1
  'AIzaSyD5UIPswp0gRomlIm8d8Yl0SIarqojlG50', // Key 2
];

// Using gemini-2.0-flash-preview-image-generation
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent';

const COLORS = {
  primary: '#1A365D',
  primaryLight: '#2C5282',
  secondary: '#2D3748',
  success: '#38A169',
  warning: '#DD6B20',
  background: '#F7FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1A202C',
  textLight: '#718096',
  textMuted: '#A0AEC0',
  accent: '#4299E1',
};

export default function ChatScreen() {
  const [csvData, setCsvData] = useState(null);
  const [csvPreview, setCsvPreview] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0); // Track which API key to use
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const pickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('DocumentPicker result:', result);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('File selection canceled or no file selected');
        return;
      }

      const file = result.assets[0];
      
      console.log('Selected file:', file);
      
      // Check if file name ends with .csv or .txt
      const fileName = file.name || file.uri.split('/').pop();
      console.log('File name:', fileName);
      
      // Read file content
      const response = await fetch(file.uri);
      const text = await response.text();
      
      if (!text || text.trim().length === 0) {
        Alert.alert('Empty File', 'The selected file is empty. Please choose a valid CSV file.');
        return;
      }
      
      // Parse CSV
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        Alert.alert('Invalid CSV', 'Could not parse the CSV file. Please check the file format.');
        return;
      }
      
      const headers = lines[0];
      const preview = lines.slice(0, 21).join('\n'); // First 20 rows + header
      
      setCsvData(text);
      setCsvPreview(preview);
      setCsvFileName(fileName);
      setMessages([{
        role: 'system',
        content: `CSV file loaded successfully!\n\nFile: ${fileName}\nRows: ${lines.length - 1}\nColumns: ${headers.split(',').length}\n\nYou can now ask questions about your data.`
      }]);
      
      Alert.alert('Success', `CSV file loaded: ${lines.length - 1} rows`);
      
    } catch (error) {
      console.error('Error picking CSV:', error);
      Alert.alert(
        'Error', 
        'Failed to read CSV file. Please make sure you selected a valid CSV/text file.\n\nError: ' + (error.message || 'Unknown error')
      );
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setMessages([{
          role: 'system',
          content: `Image uploaded successfully!\n\nYou can now ask questions or request analysis about this image.`,
          imageUri: result.assets[0].uri,
        }]);
        Alert.alert('Success', 'Image uploaded! Ask questions about it.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to load image: ' + (error.message || 'Unknown error'));
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Check if either CSV or image is uploaded
    if (!csvData && !imageUri) {
      Alert.alert('No Data', 'Please upload a CSV file or image first');
      return;
    }

    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      let aiResponse = '';
      let generatedImageUri = null;

      // If image is present, use Gemini API with image input
      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            resolve(base64data);
          };
          reader.readAsDataURL(blob);
        });

        // Use current API key with automatic rotation on 429 error
        let currentKey = GEMINI_API_KEYS[currentKeyIndex];
        let geminiResponse = await fetch(`${GEMINI_API_URL}?key=${currentKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: userMessage },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64
                  }
                }
              ]
            }],
            generationConfig: {
              response_modalities: ['IMAGE', 'TEXT'], // Support both image and text responses
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          }),
        });

        // If rate limited, try the other key
        if (geminiResponse.status === 429) {
          console.log(`API Key ${currentKeyIndex + 1} rate limited, switching to next key...`);
          const nextKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
          currentKey = GEMINI_API_KEYS[nextKeyIndex];
          
          geminiResponse = await fetch(`${GEMINI_API_URL}?key=${currentKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { text: userMessage },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64
                    }
                  }
                ]
              }],
              generationConfig: {
                response_modalities: ['IMAGE', 'TEXT'],
                temperature: 0.7,
                maxOutputTokens: 2048,
              }
            }),
          });
          
          // Update the key index for next time if successful
          if (geminiResponse.ok) {
            setCurrentKeyIndex(nextKeyIndex);
            console.log(`Successfully switched to API Key ${nextKeyIndex + 1}`);
          }
        }

        // Check HTTP response status
        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error('Gemini HTTP Error:', geminiResponse.status, errorText);
          throw new Error(`Request failed: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        
        // Log the full response for debugging
        console.log('Gemini API Response:', JSON.stringify(geminiData, null, 2));
        
        // Check for API errors
        if (geminiData.error) {
          console.error('Gemini API Error:', geminiData.error);
          throw new Error(geminiData.error.message || 'Gemini API returned an error');
        }
        
        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts) {
          const parts = geminiData.candidates[0].content.parts;
          
          console.log('Parts found:', parts.length);
          parts.forEach((part, index) => {
            console.log(`Part ${index}:`, {
              hasText: !!part.text,
              hasInlineData: !!part.inline_data,
              keys: Object.keys(part)
            });
          });
          
          // Extract text responses
          aiResponse = parts
            .filter(part => part.text)
            .map(part => part.text)
            .join('');
          
          console.log('AI Response Text:', aiResponse ? aiResponse.substring(0, 100) : 'No text');
          
          // Extract generated images (inline_data)
          const imagePart = parts.find(part => part.inline_data);
          if (imagePart && imagePart.inline_data) {
            const mimeType = imagePart.inline_data.mime_type || 'image/png';
            generatedImageUri = `data:${mimeType};base64,${imagePart.inline_data.data}`;
            console.log('Generated Image Found! MIME:', mimeType, 'Data length:', imagePart.inline_data.data?.length);
          } else {
            console.log('No inline_data found in any part');
          }
          
          // If no text or image found
          if (!aiResponse && !generatedImageUri) {
            aiResponse = 'Response received but no content available.';
          }
        } else {
          console.error('Invalid Gemini response structure:', geminiData);
          throw new Error('Invalid response from Gemini API. Please check the console for details.');
        }
      } 
      // If CSV is present, use Groq API
      else if (csvData) {
        const prompt = `You are a CSV analysis assistant.
Here is a preview of the CSV (first 20 rows):
${csvPreview}

Answer this question based on the data:
${userMessage}

If possible, reason clearly and provide the most accurate answer.`;

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 1024,
          }),
        });

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'API Error');
        }

        aiResponse = data.choices[0]?.message?.content || 'No response';
      }
      
      // Add AI response to messages with optional generated image
      console.log('Adding message:', {
        hasText: !!aiResponse,
        hasGeneratedImage: !!generatedImageUri,
        textLength: aiResponse?.length,
        imageUriLength: generatedImageUri?.length
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: aiResponse || 'Generated image',
        generatedImageUri: generatedImageUri 
      }]);
      
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to get response');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!csvData && !imageUri ? (
        <View style={styles.uploadSection}>
          <View style={styles.uploadIconWrapper}>
            <Ionicons name="analytics-outline" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.uploadTitle}>Upload Data for Analysis</Text>
          <Text style={styles.uploadDesc}>Select a CSV file or image to analyze with AI assistance</Text>
          
          <TouchableOpacity 
            style={styles.uploadButton} 
            onPress={pickCSV}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.uploadButtonText}>Select CSV File</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={[styles.uploadButton, styles.imageButton]} 
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.uploadButtonText}>Select Image</Text>
          </TouchableOpacity>

          <View style={styles.supportedFormatsContainer}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.supportedFormats}>  CSV, TXT, JPG, PNG supported</Text>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.csvInfoBar}>
            <View style={styles.csvInfoContent}>
              <Ionicons 
                name={csvData ? "document-text" : "image"} 
                size={20} 
                color={COLORS.success} 
              />
              <View style={styles.csvInfoTextContainer}>
                <Text style={styles.csvInfoTitle}>
                  {csvData ? (csvFileName || 'CSV File') : 'Image'}
                </Text>
                <Text style={styles.csvInfoSubtitle}>Data loaded successfully</Text>
              </View>
            </View>
            <View style={styles.infoBarButtons}>
              {csvData && (
                <TouchableOpacity 
                  onPress={pickCSV}
                  activeOpacity={0.7}
                  style={styles.changeFileButton}
                >
                  <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={pickImage}
                activeOpacity={0.7}
                style={styles.changeFileButton}
              >
                <Ionicons name="image-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
          >
            {messages.map((msg, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble
                ]}
              >
                {/* User's uploaded image */}
                {msg.imageUri && (
                  <View style={styles.imageContainer}>
                    <Text style={styles.imageLabel}>Uploaded Image:</Text>
                    <Image 
                      source={{ uri: msg.imageUri }} 
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
                
                {/* AI's generated image */}
                {msg.generatedImageUri && (
                  <View style={styles.imageContainer}>
                    <Text style={[styles.imageLabel, styles.generatedLabel]}>Generated Image:</Text>
                    <Image 
                      source={{ uri: msg.generatedImageUri }} 
                      style={styles.generatedImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.error('Image loading error:', error.nativeEvent.error);
                        console.log('Failed URI:', msg.generatedImageUri?.substring(0, 100));
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully!');
                      }}
                    />
                  </View>
                )}
                
                {msg.content && (
                  <Text style={[
                    styles.messageText,
                    msg.role === 'user' ? styles.userText : styles.aiText
                  ]}>
                    {msg.content}
                  </Text>
                )}
              </View>
            ))}
            {loading && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Analyzing data...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question about your data..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!loading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
  },
  uploadSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  uploadIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(26, 54, 93, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: COLORS.text, 
    marginBottom: 12,
    textAlign: 'center',
  },
  uploadDesc: { 
    fontSize: 15, 
    color: COLORS.textLight, 
    textAlign: 'center', 
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
  },
  imageButton: {
    backgroundColor: '#805AD5',
    shadowColor: '#805AD5',
  },
  textButton: {
    backgroundColor: '#38A169',
    shadowColor: '#38A169',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  uploadButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '600', 
    letterSpacing: 0.3,
  },
  supportedFormatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  supportedFormats: { 
    fontSize: 13, 
    color: COLORS.textMuted, 
    fontWeight: '400',
  },
  csvInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  csvInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  csvInfoTextContainer: {
    flex: 1,
  },
  csvInfoTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: COLORS.text,
    marginBottom: 2,
  },
  csvInfoSubtitle: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '400',
  },
  infoBarButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  changeFileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26, 54, 93, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background,
  },
  chatContent: { 
    padding: 20, 
    paddingBottom: 100,
  },
  messageBubble: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    maxWidth: '85%',
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageContainer: {
    marginBottom: 8,
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  generatedLabel: {
    color: '#805AD5',
  },
  generatedImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#805AD5',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  messageText: { 
    fontSize: 15, 
    lineHeight: 22,
    fontWeight: '400',
  },
  userText: { 
    color: '#FFFFFF' 
  },
  aiText: { 
    color: COLORS.text 
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    marginBottom: 16,
  },
  loadingText: { 
    fontSize: 14, 
    color: COLORS.textLight,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: { 
    opacity: 0.4,
    backgroundColor: COLORS.textMuted,
  },
});
