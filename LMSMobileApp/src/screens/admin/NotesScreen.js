import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, Alert, ScrollView,
    StatusBar, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, EmptyState } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const NotesScreen = () => {
    const [notes, setNotes] = useState([]);
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    
    // Note edit states
    const [activeNote, setActiveNote] = useState(null); // null means creating
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const loadNotes = async () => {
        try {
            const raw = await AsyncStorage.getItem('lmsLocalNotes');
            if (raw) {
                setNotes(JSON.parse(raw));
            }
        } catch (e) {
            console.error('Failed to load notes:', e);
        }
    };

    const saveNotes = async (updatedNotes) => {
        try {
            await AsyncStorage.setItem('lmsLocalNotes', JSON.stringify(updatedNotes));
            setNotes(updatedNotes);
        } catch (e) {
            console.error('Failed to save notes:', e);
        }
    };

    useEffect(() => {
        loadNotes();
    }, []);

    const handleSaveNote = () => {
        if (!title.trim() && !content.trim()) {
            Alert.alert('Validation Error', 'Note cannot be completely empty.');
            return;
        }

        let updated = [];
        if (activeNote) {
            // Edit existing note
            updated = notes.map(n => n.id === activeNote.id ? {
                ...n,
                title: title.trim(),
                content: content.trim(),
                updatedAt: new Date().toISOString()
            } : n);
        } else {
            // Create new note
            const newNote = {
                id: Date.now().toString(),
                title: title.trim() || 'Untitled Note',
                content: content.trim(),
                updatedAt: new Date().toISOString()
            };
            updated = [newNote, ...notes];
        }

        saveNotes(updated);
        setModalVisible(false);
        setTitle('');
        setContent('');
        setActiveNote(null);
    };

    const handleDeleteNote = (noteId) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updated = notes.filter(n => n.id !== noteId);
                        saveNotes(updated);
                        setModalVisible(false);
                        setTitle('');
                        setContent('');
                        setActiveNote(null);
                    }
                }
            ]
        );
    };

    const handleOpenEdit = (note) => {
        setActiveNote(note);
        setTitle(note.title);
        setContent(note.content);
        setModalVisible(true);
    };

    const filtered = notes.filter(n =>
        n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.content?.toLowerCase().includes(search.toLowerCase())
    );

    const noteColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#ffe4e6'];

    const renderNoteCard = ({ item, index }) => {
        const bg = noteColors[index % noteColors.length];
        return (
            <TouchableOpacity
                style={[styles.noteCard, { backgroundColor: bg }]}
                onPress={() => handleOpenEdit(item)}
                activeOpacity={0.8}
            >
                <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.noteContent} numberOfLines={5}>{item.content}</Text>
                <Text style={styles.noteDate}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader 
                title="My Notes" 
                showBack
                rightIcon="add-outline"
                rightAction={() => {
                    setActiveNote(null);
                    setTitle('');
                    setContent('');
                    setModalVisible(true);
                }}
            />

            {/* Search */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search notes..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                renderItem={renderNoteCard}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <EmptyState 
                        title="No Notes Created" 
                        subtitle="Tap the '+' button in the top-right to create your first note." 
                    />
                }
            />

            {/* Note Editor Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitleText}>
                            {activeNote ? 'Edit Note' : 'New Note'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            {activeNote && (
                                <TouchableOpacity onPress={() => handleDeleteNote(activeNote.id)}>
                                    <Ionicons name="trash-outline" size={24} color={colors.danger} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleSaveNote}>
                                <Ionicons name="checkmark" size={24} color={colors.success} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.editorBody} contentContainerStyle={styles.editorContent}>
                        <TextInput
                            style={styles.noteTitleInput}
                            placeholder="Title"
                            placeholderTextColor={colors.textMuted}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={80}
                        />
                        <TextInput
                            style={styles.noteContentInput}
                            placeholder="Start writing..."
                            placeholderTextColor={colors.textMuted}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            textAlignVertical="top"
                        />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgCard,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    list: { padding: spacing.md, paddingBottom: 80 },
    row: { justifyContent: 'space-between', gap: 12 },
    noteCard: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        minHeight: 140,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
        justifyContent: 'space-between',
    },
    noteTitle: {
        fontSize: fontSizes.md,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 6,
    },
    noteContent: {
        fontSize: fontSizes.xs,
        color: '#4b5563',
        flex: 1,
    },
    noteDate: {
        fontSize: 9,
        color: '#9ca3af',
        alignSelf: 'flex-end',
        marginTop: 8,
        fontWeight: '500',
    },
    
    // Modal
    modalContainer: { flex: 1, backgroundColor: colors.bg },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 54,
        paddingBottom: 16,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalTitleText: {
        fontSize: fontSizes.md + 2,
        fontWeight: '800',
        color: colors.text,
    },
    editorBody: { flex: 1, padding: spacing.md },
    editorContent: { paddingBottom: 40 },
    noteTitleInput: {
        fontSize: fontSizes.xl,
        fontWeight: 'bold',
        color: colors.text,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingBottom: 10,
        marginBottom: 12,
    },
    noteContentInput: {
        fontSize: fontSizes.md,
        color: colors.textSecondary,
        minHeight: 300,
    },
});

export default NotesScreen;
