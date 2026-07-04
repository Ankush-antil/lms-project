import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Image, Alert, Platform, StatusBar, Linking
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const ScanAttendanceScreen = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Workflow states: 'scan' | 'selfie' | 'preview' | 'success'
    const [step, setStep] = useState('scan'); 
    
    const [session, setSession] = useState(null);
    const [qrToken, setQrToken] = useState('');
    const [checkStatus, setCheckStatus] = useState('');
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [facing, setFacing] = useState('back');
    const [isCameraReady, setIsCameraReady] = useState(false);

    const cameraRef = useRef(null);

    // Helper to open system Wi-Fi Connectivity Panel
    const openWifiSettings = async () => {
        try {
            if (Platform.OS === 'android') {
                try {
                    await Linking.sendIntent('android.settings.panel.action.WIFI');
                } catch (e) {
                    await Linking.sendIntent('android.settings.WIFI_SETTINGS');
                }
            } else {
                await Linking.openURL('App-Prefs:root=WIFI').catch(() => {
                    Linking.openSettings();
                });
            }
        } catch (error) {
            console.error("Error opening Wi-Fi settings:", error);
            Alert.alert("Error", "Could not open Wi-Fi settings automatically.");
        }
    };

    // Reset camera-ready status on step/camera change
    useEffect(() => {
        setIsCameraReady(false);
    }, [step, facing]);

    // Request permissions if not loaded or not granted
    if (!permission) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionSubtitle}>
                    We need access to your camera to scan the QR code and take a verification selfie.
                </Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
                    <Text style={styles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnTextOnly} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnTextOnlyText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Helper to get Wi-Fi SSID
    const getWifiSSID = async () => {
        try {
            // First request location permission (needed for SSID)
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Location permission denied for reading Wi-Fi SSID');
                return null;
            }

            // Check if location services are enabled
            let enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                console.warn('Location services disabled');
                return null;
            }

            const state = await NetInfo.fetch();
            if (state.type === 'wifi') {
                return state.details.ssid || null;
            }
            return null;
        } catch (e) {
            console.error("Error reading Wi-Fi info:", e);
            return null;
        }
    };

    // Helper to get student's current location coordinates
    const getStudentLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Location permission denied for verification');
                return null;
            }
            let enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                console.warn('Location services disabled');
                return null;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            return pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude } : null;
        } catch (e) {
            console.error("Error reading geolocation:", e);
            return null;
        }
    };

    // QR Code Scanned Handler
    const handleBarcodeScanned = async ({ data }) => {
        if (scanned || loading) return;
        setScanned(true);
        setLoading(true);
        
        try {
            // Fetch student's current Wi-Fi SSID and Geolocation
            const studentWifiSSID = await getWifiSSID();
            const location = await getStudentLocation();

            // Fetch session status by QR token
            const res = await axios.get(`/attendance/session/qr/${data}`, {
                params: { 
                    wifiSSID: studentWifiSSID,
                    latitude: location?.latitude || null,
                    longitude: location?.longitude || null
                }
            });
            setSession(res.data.session);
            setCheckStatus(res.data.checkStatus);
            setQrToken(data);
            
            if (res.data.session?.type === 'in') {
                if (res.data.checkStatus === 'checked-in' || res.data.checkStatus === 'completed') {
                    Alert.alert(
                        "Already Checked-In",
                        "You have already recorded your check-in for this session.",
                        [{ text: "OK", onPress: () => resetScanner() }]
                    );
                } else {
                    setStep('selfie');
                    setFacing('front');
                }
            } else if (res.data.session?.type === 'out') {
                if (res.data.checkStatus === 'completed') {
                    Alert.alert(
                        "Already Checked-Out",
                        "You have already recorded your check-out for this session.",
                        [{ text: "OK", onPress: () => resetScanner() }]
                    );
                } else if (res.data.checkStatus === 'not-started') {
                    Alert.alert(
                        "Check-In Required",
                        "You must check-in first before checking out.",
                        [{ text: "OK", onPress: () => resetScanner() }]
                    );
                } else {
                    setStep('selfie');
                    setFacing('front');
                }
            } else {
                if (res.data.checkStatus === 'completed') {
                    Alert.alert(
                        "Attendance Completed",
                        "You have already checked in and checked out for this class session.",
                        [{ text: "OK", onPress: () => resetScanner() }]
                    );
                } else {
                    setStep('selfie');
                    setFacing('front');
                }
            }
        } catch (error) {
            console.error("Scan error:", error);
            const errMsg = error.response?.data?.message || "Invalid or expired QR code.";
            if (errMsg.toLowerCase().includes('wi-fi') || errMsg.toLowerCase().includes('wifi')) {
                Alert.alert(
                    "Wi-Fi Connection Required",
                    errMsg,
                    [
                        { text: "Open Wi-Fi Settings", onPress: () => openWifiSettings() },
                        { text: "Try Again", onPress: () => resetScanner() }
                    ]
                );
            } else {
                Alert.alert("Scan Failed", errMsg, [{ text: "Try Again", onPress: () => resetScanner() }]);
            }
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setScanned(false);
        setSession(null);
        setQrToken('');
        setCheckStatus('');
        setCapturedPhoto(null);
        setStep('scan');
        setFacing('back');
    };

    // Selfie Capture Handler
    const handleCaptureSelfie = async () => {
        if (!cameraRef.current || !isCameraReady || loading) return;
        
        setLoading(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.35,
                base64: true
            });
            setCapturedPhoto(photo);
            setStep('preview');
        } catch (error) {
            console.error("Capture error:", error);
            Alert.alert("Error", "Failed to capture photo. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Submit Attendance
    const handleSubmitAttendance = async () => {
        if (!capturedPhoto || loading) return;
        
        setLoading(true);
        try {
            const studentWifiSSID = await getWifiSSID();
            const location = await getStudentLocation();
            const attendanceType = session?.type || (checkStatus === 'checked-in' ? 'out' : 'in');
            const base64Data = `data:image/jpeg;base64,${capturedPhoto.base64}`;
            
            await axios.post('/attendance/mark', {
                qrToken,
                photo: base64Data,
                type: attendanceType,
                wifiSSID: studentWifiSSID,
                latitude: location?.latitude || null,
                longitude: location?.longitude || null
            });
            
            setStep('success');
        } catch (error) {
            console.error("Submit error:", error);
            const errMsg = error.response?.data?.message || "Failed to mark attendance. Please try again.";
            Alert.alert("Submission Failed", errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Class Attendance</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* SCAN QR CODE STEP */}
            {step === 'scan' && (
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing={facing}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    />
                    {/* Scanner Overlay Frame */}
                    <View style={styles.overlayContainer}>
                        <View style={styles.scannerGuideBox}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                        </View>
                        <Text style={styles.overlayText}>Scan Teacher's Class QR Code</Text>
                    </View>
                </View>
            )}

            {/* CAPTURE SELFIE STEP */}
            {step === 'selfie' && (
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing={facing}
                        ref={cameraRef}
                        onCameraReady={() => setIsCameraReady(true)}
                    />
                    
                    {/* Selfie Guide Overlay */}
                    <View style={styles.selfieOverlay}>
                        <View style={styles.sessionBrief}>
                            <Text style={styles.briefSubject}>{session?.subject}</Text>
                            <Text style={styles.briefType}>
                                {(session?.type === 'out' || checkStatus === 'checked-in') ? 'CHECK-OUT ATTENDANCE' : 'CHECK-IN ATTENDANCE'}
                            </Text>
                        </View>
                        
                        <View style={styles.selfieGuideCircle} />
                        
                        <Text style={styles.selfieGuideText}>Position your face inside the circle</Text>
                        
                        {/* Capture Button */}
                        <TouchableOpacity 
                            style={[styles.captureBtn, (!isCameraReady || loading) && { opacity: 0.4 }]} 
                            onPress={handleCaptureSelfie}
                            disabled={!isCameraReady || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} size="small" />
                            ) : (
                                <View style={styles.captureBtnInner} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* PREVIEW PHOTO STEP */}
            {step === 'preview' && (
                <View style={styles.previewContainer}>
                    <View style={styles.previewHeader}>
                        <Text style={styles.previewSubject}>{session?.subject}</Text>
                        <Text style={styles.previewType}>Verify your captured photo</Text>
                    </View>

                    <Image 
                        source={{ uri: capturedPhoto?.uri }} 
                        style={styles.previewImage}
                    />

                    <View style={styles.btnRow}>
                        <TouchableOpacity 
                            style={[styles.btnAction, styles.btnRetake]} 
                            onPress={() => setStep('selfie')}
                            disabled={loading}
                        >
                            <Ionicons name="refresh" size={18} color={colors.text} />
                            <Text style={styles.btnActionText}>Retake</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.btnAction, styles.btnConfirm]} 
                            onPress={handleSubmitAttendance}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                                    <Text style={[styles.btnActionText, { color: colors.white }]}>Confirm & Submit</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* SUCCESS STEP */}
            {step === 'success' && (
                <View style={styles.successContainer}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconBg}>
                            <Ionicons name="checkmark-done-circle" size={80} color="#10b981" />
                        </View>
                        <Text style={styles.successTitle}>Attendance Marked!</Text>
                        <Text style={styles.successMessage}>
                            Your {(session?.type === 'out' || checkStatus === 'checked-in') ? 'check-out' : 'check-in'} attendance for {session?.subject} has been successfully recorded.
                        </Text>
                        <TouchableOpacity 
                            style={styles.successDoneBtn} 
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.successDoneText}>Back to Dashboard</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
        height: Platform.OS === 'android' ? 60 + StatusBar.currentHeight : 88,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.white },
    
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.bg },
    permissionTitle: { fontSize: fontSizes.lg, fontWeight: '750', color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
    permissionSubtitle: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
    
    btnPrimary: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.xs
    },
    btnText: { color: colors.white, fontWeight: '750', fontSize: fontSizes.md },
    btnTextOnly: { paddingVertical: spacing.md },
    btnTextOnlyText: { color: colors.textMuted, fontWeight: '600', fontSize: fontSizes.sm },

    cameraContainer: { flex: 1, position: 'relative' },
    
    // Scanner Overlay styles
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scannerGuideBox: {
        width: 250,
        height: 250,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: colors.white,
        borderWidth: 4,
    },
    topLeft: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
    topRight: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
    bottomLeft: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
    bottomRight: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
    overlayText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '700',
        marginTop: spacing.xl,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3
    },

    // Selfie Guide Overlay styles
    selfieOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: spacing.xl,
    },
    sessionBrief: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    briefSubject: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    briefType: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary, marginTop: 2, letterSpacing: 0.5 },
    selfieGuideCircle: {
        width: 260,
        height: 260,
        borderRadius: 130,
        borderWidth: 4,
        borderColor: colors.white,
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
    },
    selfieGuideText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '700',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3
    },
    captureBtn: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.white,
    },

    // Preview Photo styles
    previewContainer: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
    previewHeader: { alignItems: 'center', paddingVertical: spacing.sm },
    previewSubject: { fontSize: fontSizes.lg, fontWeight: '850', color: colors.text },
    previewType: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    previewImage: {
        flex: 1,
        borderRadius: borderRadius.xl,
        marginVertical: spacing.md,
        backgroundColor: '#000',
        transform: [{ scaleX: -1 }] // Flips preview mirror-like since it was front selfie
    },
    btnRow: { flexDirection: 'row', gap: spacing.md },
    btnAction: {
        flex: 1,
        height: 52,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    btnRetake: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
    btnConfirm: { backgroundColor: colors.primary },
    btnActionText: { fontSize: fontSizes.md, fontWeight: '750', color: colors.text },

    // Success Screen styles
    successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: '#f0fdf4' },
    successCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        width: '100%',
    },
    successIconBg: { marginBottom: spacing.md },
    successTitle: { fontSize: fontSizes.xl, fontWeight: '900', color: '#065f46', marginBottom: spacing.xs },
    successMessage: { fontSize: fontSizes.sm, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
    successDoneBtn: {
        backgroundColor: '#10b981',
        paddingVertical: spacing.md,
        width: '100%',
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    successDoneText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md }
});

export default ScanAttendanceScreen;
