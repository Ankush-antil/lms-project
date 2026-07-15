import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Share
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../../theme/colors';
import { AppHeader } from '../../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../../../config/api';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import { ShareModal } from '../../../components/common/ShareModal';

const FileUploadPage = ({ route, navigation }) => {
    const { date: dateParam } = route.params || {};
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    // States
    const [localFiles, setLocalFiles] = useState([]);
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [activeTab, setActiveTab] = useState('local'); // 'local' | 'cloud'
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Google Drive state
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', uri: '' });

    // Share states
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareData, setShareData] = useState({});

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/practice-files');
            const toolFiles = (res.data.files || []).filter(f => f.toolType === 'file-uploader');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes || 0,
                limit: res.data.limitBytes || 300 * 1024 * 1024
            });
        } catch (err) {
            console.error("Failed to fetch cloud files on File Uploader page:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load local files
    const loadLocalFiles = async () => {
        try {
            const saved = await AsyncStorage.getItem('practice_file_uploads');
            if (saved) {
                setLocalFiles(JSON.parse(saved));
            } else {
                setLocalFiles([]);
            }
        } catch (err) {
            console.error("Failed to load local file uploads:", err);
        }
    };

    useEffect(() => {
        fetchCloudFiles();
        loadLocalFiles();
    }, []);

    // Filtered lists
    const filteredLocalFiles = useMemo(() => {
        return localFiles.filter(f => parseDateToDdMmYyyy(f.timestamp) === dateParam);
    }, [localFiles, dateParam]);

    const filteredCloudFiles = useMemo(() => {
        return cloudFiles.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
    }, [cloudFiles, dateParam]);

    // Choose and save file
    const handlePickFile = async () => {
        if (isReadOnly) {
            Alert.alert("Read-Only", "Cannot upload files in a past date log.");
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const asset = result.assets[0];

            const newLog = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                uri: asset.uri,
                filename: asset.name,
                mimeType: asset.mimeType || 'application/octet-stream',
                size: asset.size || 0,
                synced: false
            };

            const updatedList = [newLog, ...localFiles];
            setLocalFiles(updatedList);
            await AsyncStorage.setItem('practice_file_uploads', JSON.stringify(updatedList));

            Toast.show({
                type: 'success',
                text1: 'File Logged',
                text2: 'File successfully logged in local workspace!'
            });
        } catch (err) {
            console.error('Failed to pick file', err);
            Alert.alert("Error", "Could not load selected file.");
        }
    };

    // Sync local unsynced files
    const syncLocalFiles = async () => {
        if (isReadOnly) return;
        const unsynced = filteredLocalFiles.filter(f => !f.synced);
        if (unsynced.length === 0) {
            Alert.alert("Synced", "All local files on this date are synced.");
            return;
        }

        setUploading(true);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: item.uri,
                    name: item.filename || `file_${item.id}`,
                    type: item.mimeType || 'application/octet-stream'
                });
                formData.append('toolType', 'file-uploader');

                await axios.post('/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Failed to sync file:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    Alert.alert("Storage Limit Exceeded", errMsg);
                    break;
                }
            }
        }

        await AsyncStorage.setItem('practice_file_uploads', JSON.stringify(localFiles));
        await fetchCloudFiles();
        setUploading(false);

        if (successCount > 0) {
            Toast.show({
                type: 'success',
                text1: 'Sync Complete',
                text2: `Synced ${successCount} file(s) to cloud!`
            });
        }
    };

    // Delete file
    const deleteFile = async (id, isCloud) => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this file from ${isCloud ? 'cloud' : 'local'}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (isCloud) {
                            try {
                                await axios.delete(`/practice-files/${id}`);
                                setCloudFiles(prev => prev.filter(f => f._id !== id));
                                Toast.show({
                                    type: 'success',
                                    text1: 'Deleted',
                                    text2: 'File deleted from cloud storage!'
                                });
                            } catch (err) {
                                Alert.alert("Error", "Failed to delete from cloud.");
                            }
                        } else {
                            const updated = localFiles.filter(f => f.id !== id);
                            setLocalFiles(updated);
                            await AsyncStorage.setItem('practice_file_uploads', JSON.stringify(updated));
                            Toast.show({
                                type: 'success',
                                text1: 'Deleted',
                                text2: 'File deleted from local workspace!'
                            });
                        }
                    }
                }
            ]
        );
    };

    const shareFile = (uri, filename) => {
        setShareData({
            type: 'file',
            fileUrl: uri,
            fileName: filename || 'file.bin',
            fileType: 'file',
            message: `Check out my file: ${uri}`
        });
        setShareModalVisible(true);
    };

    const getFileIcon = (filename = '') => {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image-outline';
        if (['mp3', 'wav', 'm4a', 'aac'].includes(ext)) return 'musical-notes-outline';
        if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'videocam-outline';
        if (['pdf'].includes(ext)) return 'document-text-outline';
        if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return 'archive-outline';
        return 'document-outline';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="File Uploader"
                showBack={true}
                backAction={() => navigation.goBack()}
                rightIcon="logo-google"
                rightAction={() => {
                    setDriveFileMeta({ name: '', uri: '' });
                    setDriveModalOpen(true);
                }}
            />

            {/* Top Workspace Date indicator */}
            <View style={styles.workspaceHeader}>
                <Ionicons name="calendar" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.workspaceText}>Workspace Date: {dateParam}</Text>
            </View>

            {/* Upload Interface (Only active for today's workspace) */}
            {!isReadOnly && (
                <View style={styles.pickerContainer}>
                    <View style={styles.guideBox}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text style={guideStyles.guideText}>
                            Select any document, PDF, archive or media file from your device local storage to log.
                        </Text>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickFile}
                        style={styles.pickerButton}
                    >
                        <Ionicons name="cloud-upload-outline" size={24} color={colors.white} style={{ marginRight: 8 }} />
                        <Text style={styles.pickerButtonText}>Choose File from Device</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    onPress={() => setActiveTab('local')}
                    style={[styles.tabButton, activeTab === 'local' && styles.tabButtonActive]}
                >
                    <Ionicons name="folder-open-outline" size={18} color={activeTab === 'local' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'local' && styles.tabTextActive]}>
                        Local Log ({filteredLocalFiles.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('cloud')}
                    style={[styles.tabButton, activeTab === 'cloud' && styles.tabButtonActive]}
                >
                    <Ionicons name="cloud-done-outline" size={18} color={activeTab === 'cloud' ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'cloud' && styles.tabTextActive]}>
                        Cloud Storage ({filteredCloudFiles.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Cloud Space Details */}
            {activeTab === 'cloud' && (
                <View style={styles.spaceUsageContainer}>
                    <View style={styles.spaceRow}>
                        <Text style={styles.spaceText}>Cloud Storage Space</Text>
                        <Text style={styles.spaceValue}>
                            {(cloudSpace.used / (1024 * 1024)).toFixed(1)}MB / {(cloudSpace.limit / (1024 * 1024)).toFixed(0)}MB
                        </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }]} />
                    </View>
                </View>
            )}

            {/* Sync bar for local files */}
            {activeTab === 'local' && !isReadOnly && filteredLocalFiles.some(f => !f.synced) && (
                <TouchableOpacity
                    disabled={uploading}
                    onPress={syncLocalFiles}
                    style={styles.syncBanner}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sync" size={18} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.syncText}>
                        {uploading ? 'Syncing files with Cloud...' : 'Sync unsynced files to Cloud'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* File List */}
            {loading ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={activeTab === 'local' ? filteredLocalFiles : filteredCloudFiles}
                    keyExtractor={item => item._id || item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No files found on this date.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isCloud = activeTab === 'cloud';
                        const fileId = isCloud ? item._id : item.id;
                        const fileUrl = isCloud ? `${BASE_URL}${item.fileUrl}` : item.uri;
                        const isSynced = isCloud ? true : item.synced;
                        const iconName = getFileIcon(item.filename);

                        return (
                            <View style={styles.fileItemCard}>
                                <View style={styles.fileIconContainer}>
                                    <Ionicons name={iconName} size={28} color={colors.accent} />
                                </View>

                                <View style={styles.fileMetaContainer}>
                                    <Text style={styles.fileNameText} numberOfLines={1}>
                                        {item.filename || 'Unnamed File'}
                                    </Text>
                                    <View style={styles.fileMetaSubRow}>
                                        <Text style={styles.fileMetaSubText}>{formatSize(item.size)}</Text>
                                        <Text style={styles.fileMetaDot}>•</Text>
                                        <Text style={styles.fileMetaSubText}>
                                            {new Date(item.timestamp || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.fileActionsRow}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setDriveFileMeta({
                                                name: item.filename || `file_${fileId}`,
                                                uri: fileUrl
                                            });
                                            setDriveModalOpen(true);
                                        }}
                                        style={[styles.actionIconButton, { backgroundColor: '#eff6ff' }]}
                                    >
                                        <Ionicons name="logo-google" size={16} color={colors.accent} />
                                    </TouchableOpacity>
                                    {isCloud && (
                                        <TouchableOpacity
                                            onPress={() => shareFile(fileUrl, item.filename)}
                                            style={styles.actionIconButton}
                                        >
                                            <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                    {!isReadOnly && (
                                        <TouchableOpacity
                                            onPress={() => deleteFile(fileId, isCloud)}
                                            style={[styles.actionIconButton, { backgroundColor: '#fef2f2' }]}
                                        >
                                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                    {!isCloud && (
                                        <View style={[
                                            styles.syncBadge,
                                            { backgroundColor: isSynced ? '#ecfdf5' : '#fffbeb' }
                                        ]}>
                                            <Text style={[
                                                styles.syncBadgeText,
                                                { color: isSynced ? colors.success : colors.warning }
                                            ]}>
                                                {isSynced ? 'Synced' : 'Local'}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            <GoogleDriveModal
                isOpen={driveModalOpen}
                onClose={() => setDriveModalOpen(false)}
                fileName={driveFileMeta.name}
                fileUri={driveFileMeta.uri}
                toolType="file-uploader"
                onSaveSuccess={() => {
                    fetchCloudFiles();
                }}
            />

            <ShareModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                shareData={shareData}
            />
        </View>
    );
};

const guideStyles = StyleSheet.create({
    guideText: {
        flex: 1,
        fontSize: fontSizes.xs,
        color: colors.textSecondary,
        fontWeight: '600',
        lineHeight: 16
    }
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg
    },
    workspaceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        backgroundColor: '#eef2ff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    workspaceText: {
        fontSize: fontSizes.xs + 1,
        fontWeight: '800',
        color: colors.accent
    },
    pickerContainer: {
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    guideBox: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 10,
        borderRadius: borderRadius.md,
        marginBottom: 12
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        paddingVertical: 12,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
        width: '100%',
        elevation: 2
    },
    pickerButtonText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '700'
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    tabButtonActive: {
        borderBottomColor: colors.accent
    },
    tabText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary
    },
    tabTextActive: {
        color: colors.accent
    },
    spaceUsageContainer: {
        backgroundColor: colors.bgCard,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight
    },
    spaceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    spaceText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted
    },
    spaceValue: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary
    },
    progressBarBg: {
        height: 6,
        backgroundColor: colors.bgSecondary,
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 3
    },
    syncBanner: {
        flexDirection: 'row',
        backgroundColor: colors.warning,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    syncText: {
        color: colors.white,
        fontSize: fontSizes.xs,
        fontWeight: '700'
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 32
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        gap: 8
    },
    emptyText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textMuted,
        textAlign: 'center'
    },
    fileItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1
    },
    fileIconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    fileMetaContainer: {
        flex: 1,
        marginRight: 8
    },
    fileNameText: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: colors.text
    },
    fileMetaSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2
    },
    fileMetaSubText: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '600'
    },
    fileMetaDot: {
        fontSize: 8,
        color: colors.textMuted,
        marginHorizontal: 4
    },
    fileActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    actionIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border
    },
    syncBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    syncBadgeText: {
        fontSize: 9,
        fontWeight: '800'
    }
});

export default FileUploadPage;
