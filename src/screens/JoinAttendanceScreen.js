import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AttendanceService from '../services/AttendanceService';
import eventService from '../services/EventService';

export default function JoinAttendanceScreen({ route, navigation }) {
  const user = route?.params?.user || { name: 'Trainee', _id: 'temp_id' };

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const processCode = async (code) => {
    if (!code || code.trim() === '') {
      Alert.alert('Error', 'Invalid code');
      setScanned(false);
      setScannerActive(true);
      return;
    }

    setLoading(true);
    const cleanCode = code.trim();

    try {
      // 1. Try to join as an Event
      console.log('Trying to join event with code:', cleanCode);
      const eventResult = await eventService.joinEventByCode(cleanCode);

      if (eventResult.success) {
        setLoading(false);
        Alert.alert('Success', 'Joined Event Successfully!', [
          { text: 'View Details', onPress: () => navigation.replace('TraineeEventDetail', { event: eventResult.event }) }
        ]);
        return;
      } else if (eventResult.message === 'Already joined this event') {
        setLoading(false);
        Alert.alert('Info', 'You have already joined this event.');
        return;
      }

      // 2. If Event Join failed, try Legacy Attendance
      console.log('Event join failed, trying legacy attendance...');
      markLegacyAttendance(cleanCode);

    } catch (error) {
      console.log('Error processing code:', error);
      markLegacyAttendance(cleanCode);
    }
  };

  const markLegacyAttendance = async (sessionToken) => {
    let locationData = {
      type: 'Point',
      coordinates: [82.1391, 22.0797], // Default
      accuracy: 10
    };

    const deviceMeta = {
      device_id: Constants.deviceId || 'unknown',
      device_name: Device.deviceName || 'Unknown Device',
      os: Platform.OS,
      app_version: Constants.manifest?.version || '1.0.0'
    };

    const res = await AttendanceService.markAttendance(
      sessionToken,
      'gps',
      deviceMeta,
      locationData
    );

    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Attendance Marked ✅',
        `Legacy/Wi-Fi Attendance marked successfully!\n\nTime: ${new Date().toLocaleTimeString()}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert(
        'Failed',
        res.error || 'Could not join event or mark attendance.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setScannerActive(true);
              setManualCode('');
            }
          },
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScannerActive(false);
    processCode(data);
  };

  const handleManualSubmit = () => {
    processCode(manualCode);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047BA" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join Event</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="camera-off" size={80} color="#EF4444" />
          <Text style={styles.errorTitle}>Camera Access Denied</Text>
          <Text style={styles.errorText}>
            Please enable camera permission in your device settings to scan QR codes.
          </Text>
          <TouchableOpacity style={styles.manualEntryBtn} onPress={() => setScannerActive(false)}>
            <Text style={styles.manualEntryBtnText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Event</Text>
        <TouchableOpacity onPress={() => setScannerActive(!scannerActive)}>
          <Ionicons
            name={scannerActive ? "keypad" : "qr-code"}
            size={24}
            color="#0047BA"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047BA" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      ) : scannerActive ? (
        <>
          {/* QR Scanner */}
          <View style={styles.scannerContainer}>
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
            </View>
          </View>

          <View style={styles.instructionsContainer}>
            <Ionicons name="qr-code-outline" size={48} color="#0047BA" />
            <Text style={styles.instructionTitle}>Scan QR Code</Text>
            <Text style={styles.instructionText}>
              Scan event code or attendance session QR
            </Text>
            {scanned && (
              <TouchableOpacity
                style={styles.rescanBtn}
                onPress={() => {
                  setScanned(false);
                  setScannerActive(true);
                }}
              >
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.rescanBtnText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <>
          {/* Manual Entry */}
          <View style={styles.manualContainer}>
            <Ionicons name="key" size={64} color="#0047BA" />
            <Text style={styles.manualTitle}>Enter Code</Text>
            <Text style={styles.manualSubtitle}>
              Enter Event Code (e.g. NDMA-TRNG-1234) or Session ID
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="Enter Code"
                placeholderTextColor="#9CA3AF"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleManualSubmit}
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchToScanBtn}
              onPress={() => {
                setScannerActive(true);
                setScanned(false);
              }}
            >
              <Ionicons name="qr-code-outline" size={20} color="#0047BA" />
              <Text style={styles.switchToScanText}>Scan QR Code Instead</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#0047BA',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  instructionsContainer: {
    backgroundColor: '#FFF',
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  instructionText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0047BA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  rescanBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  manualContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  manualSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginTop: 32,
  },
  codeInput: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    width: '100%',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  switchToScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  switchToScanText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0047BA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
  },
  errorText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  manualEntryBtn: {
    backgroundColor: '#0047BA',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 24,
  },
  manualEntryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
