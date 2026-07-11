import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl, Modal, ActivityIndicator, Alert, ScrollView, Dimensions
} from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { AppHeader, EmptyState } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../config/api';

const DriveScreen = ({ navigation }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    
    // Directory navigation stack
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderStack, setFolderStack] = useState([]);

    // Modals
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchData = async () => {
        try {
            const parentParam = currentFolder ? `?parentId=${currentFolder._id}` : '?parentId=null';
            const { data } = await axios.get(`/drive${parentParam}`);
            setItems(data?.items || []);
        } catch (e) {
            console.error('[DRIVE FETCH ERROR]', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentFolder]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            Alert.alert('Validation Error', 'Please enter a folder name.');
            return;
        }
        setCreating(true);
        try {
            await axios.post('/drive/folder', {
                name: newFolderName.trim(),
                parentId: currentFolder ? currentFolder._id : null
            });
            setFolderModalVisible(false);
            setNewFolderName('');
            fetchData();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create folder.');
        } finally {
            setCreating(false);
        }
    };

    const handleUploadFile = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (res.canceled || !res.assets || res.assets.length === 0) return;

            const asset = res.assets[0];
            setUploading(true);

            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType || 'application/octet-stream',
            });
            formData.append('type', 'file');
            if (currentFolder) {
                formData.append('parentId', currentFolder._id);
            }

            await axios.post('/drive/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Alert.alert('Success', 'File uploaded successfully!');
            fetchData();
        } catch (err) {
            Alert.alert('Upload Failed', err.response?.data?.message || 'Failed to upload selected file.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteItem = (itemId, itemName) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete "${itemName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`/drive/${itemId}`);
                            fetchData();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete item.');
                        }
                    }
                }
            ]
        );
    };

    const handleEnterFolder = (folder) => {
        setFolderStack(prev => [...prev, currentFolder]);
        setCurrentFolder(folder);
        setLoading(true);
    };

    const handleGoBackFolder = () => {
        if (folderStack.length === 0) return;
        const previous = folderStack[folderStack.length - 1];
        setFolderStack(prev => prev.slice(0, -1));
        setCurrentFolder(previous);
        setLoading(true);
    };

    const filtered = items.filter(item =>
        item.name?.toLowerCase().includes(search.toLowerCase())
    );

    const folders = filtered.filter(i => i.type === 'folder');
    const files = filtered.filter(i => i.type === 'file');

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <View style={styles.container}>
            <AppHeader 
                title={currentFolder ? currentFolder.name : "Cloud Drive"} 
                showBack={!!currentFolder}
                backAction={handleGoBackFolder}
            />

            {/* Breadcrumb Path Bar */}
            {folderStack.length > 0 && (
                <View style={styles.breadcrumbBar}>
                    <TouchableOpacity onPress={() => { setCurrentFolder(null); setFolderStack([]); setLoading(true); }}>
                        <Text style={styles.breadcrumbLink}>Root</Text>
                    </TouchableOpacity>
                    {folderStack.map((f, idx) => f && (
                        <View key={f._id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
                            <TouchableOpacity onPress={() => {
                                const newStack = folderStack.slice(0, idx + 1);
                                setFolderStack(newStack);
                                setCurrentFolder(f);
                                setLoading(true);
                            }}>
                                <Text style={styles.breadcrumbLink} numberOfLines={1}>{f.name}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {currentFolder && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
                            <Text style={styles.breadcrumbActive} numberOfLines={1}>{currentFolder.name}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Search and Action Buttons */}
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search drive..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => setFolderModalVisible(true)}>
                    <Ionicons name="folder-open-outline" size={20} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconBtn} onPress={handleUploadFile} disabled={uploading}>
                    {uploading ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                        <Ionicons name="cloud-upload-outline" size={20} color={colors.success} />
                    )}
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Folders</Text>
                            <View style={styles.foldersGrid}>
                                {folders.map(folder => (
                                    <TouchableOpacity
                                        key={folder._id}
                                        style={styles.folderCard}
                                        onPress={() => handleEnterFolder(folder)}
                                        onLongPress={() => handleDeleteItem(folder._id, folder.name)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="folder" size={40} color="#f59e0b" />
                                        <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Files Section */}
                    <View style={styles.section}>
                        {files.length > 0 && <Text style={styles.sectionTitle}>Files</Text>}
                        {files.map(file => (
                            <View key={file._id} style={styles.fileRow}>
                                <Ionicons name="document-text" size={32} color={colors.accent} />
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                                    <Text style={styles.fileSize}>{formatBytes(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => handleDeleteItem(file._id, file.name)}
                                    style={styles.deleteBtn}
                                >
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {folders.length === 0 && files.length === 0 && (
                        <EmptyState 
                            title="Empty Folder" 
                            subtitle="Tap folder or upload buttons to organize files." 
                        />
                    )}
                </ScrollView>
            )}

            {/* Create Folder Modal */}
            <Modal
                visible={folderModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setFolderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Create New Folder</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Folder Name"
                            placeholderTextColor={colors.textMuted}
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setFolderModalVisible(false)}
                                disabled={creating}
                            >
                                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSubmit]}
                                onPress={handleCreateFolder}
                                disabled={creating}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text style={styles.modalBtnTextSubmit}>Create</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    breadcrumbBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    breadcrumbLink: {
        fontSize: fontSizes.xs,
        color: colors.accent,
        fontWeight: '600',
    },
    breadcrumbActive: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        fontWeight: '500',
        maxWidth: 120,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        gap: 8,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgCard,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    actionIconBtn: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: { padding: spacing.md, paddingBottom: 80 },
    section: { marginBottom: spacing.md },
    sectionTitle: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
    },
    foldersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    folderCard: {
        width: (Dimensions.get('window').width - spacing.md * 2 - 24) / 3,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 1,
    },
    folderName: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: colors.text,
        marginTop: 6,
        textAlign: 'center',
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    fileInfo: { flex: 1 },
    fileName: {
        fontSize: fontSizes.md,
        fontWeight: '600',
        color: colors.text,
    },
    fileSize: {
        fontSize: fontSizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    deleteBtn: {
        padding: 6,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalCard: {
        width: '100%',
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        elevation: 10,
    },
    modalTitle: {
        fontSize: fontSizes.lg,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.md,
    },
    input: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 44,
        color: colors.text,
        fontSize: fontSizes.md,
        marginBottom: spacing.md,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalBtn: {
        flex: 1,
        height: 48,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnCancel: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalBtnSubmit: {
        backgroundColor: colors.accent,
    },
    modalBtnTextCancel: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    modalBtnTextSubmit: {
        color: colors.white,
        fontWeight: '750',
    },
});

export default DriveScreen;
