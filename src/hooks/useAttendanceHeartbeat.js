// Local Attendance Backend (Separate from Main Backend)
// We are using the Laptop's Main Network IP (10.1.15.123).
// Ensure your phone is connected to the same Wi-Fi network as this laptop.
// If using Mobile Hotspot from Laptop, change this to 'http://192.168.137.1:5001'
export const ATTENDANCE_BACKEND_URL = 'http://10.1.15.123:5001';

import { useState, useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

export const useAttendanceHeartbeat = (isTrainee = false) => {
    const [status, setStatus] = useState('idle');
    const heartbeatInterval = useRef(null);

    const sendHeartbeat = async () => {
        try {
            setStatus('sending');
            const ip = await Network.getIpAddressAsync();

            // Get user info directly from storage since this is a separate micro-backend
            const userStr = await AsyncStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            const userId = user.id || user._id; // Handle different id formats

            const payload = {
                userId,
                name: user.name || user.username || 'Trainee',
                role: user.role || 'trainee',
                ipAddress: ip,
                // ssid: 'Unknown' // React Native needs Location permission for SSID, skipping for now
            };

            const response = await fetch(`${ATTENDANCE_BACKEND_URL}/api/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setStatus('success');
                console.log('💓 Heartbeat sent to Local Backend');
            } else {
                console.warn('⚠️ Heartbeat rejected by backend');
                setStatus('error');
            }

        } catch (error) {
            console.error('❌ Heartbeat failed (Local Backend):', error);
            setStatus('error');
        }
    };

    useEffect(() => {
        if (!isTrainee) return;

        // Check network and start heartbeat loop
        const checkNetworkAndStart = async () => {
            const networkState = await Network.getNetworkStateAsync();

            // Send heartbeat if connected to WiFi
            if (networkState.type === Network.NetworkStateType.WIFI) {
                // Send immediately
                sendHeartbeat();

                // Then every 60 seconds
                heartbeatInterval.current = setInterval(sendHeartbeat, 60000);
            }
        };

        checkNetworkAndStart();

        // Clean up
        return () => {
            if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        };
    }, [isTrainee]);

    return { status };
};
