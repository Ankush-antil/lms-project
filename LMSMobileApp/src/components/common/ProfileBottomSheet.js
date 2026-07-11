import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

const ProfileBottomSheet = ({ visible, onClose }) => {
    const { user, savedAccounts, switchAccount, setUser } = useAuth();

    const getRoleColor = (role) => {
        if (role === 'Student') return colors.student;
        if (role === 'Teacher') return colors.teacher;
        if (role === 'Admin') return colors.admin;
        if (role === 'Institute') return colors.warning;
        if (role === 'Accountant') return '#78350f';
        if (role === 'Editor') return colors.accent;
        return colors.accent;
    };

    const handleAddAccount = () => {
        // Clear active user session but keep the saved accounts list intact in SecureStore
        setUser(null);
        onClose();
    };

    const handleSwitch = async (acc) => {
        await switchAccount(acc.token, acc.user);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={onClose}
            >
                <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
                    {/* Drag Handle Indicator */}
                    <View style={styles.dragHandle} />

                    <Text style={styles.sheetTitle}>Switch Account</Text>

                    <ScrollView style={styles.accountsList} showsVerticalScrollIndicator={false}>
                        {savedAccounts && savedAccounts.map((acc, index) => {
                            const isActive = acc.user?.email === user?.email;
                            const roleColor = getRoleColor(acc.user?.role);

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.accountItem, isActive && styles.accountItemActive]}
                                    onPress={() => handleSwitch(acc)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.leftSection}>
                                        <View style={[styles.avatarCircle, { backgroundColor: roleColor }]}>
                                            <Text style={styles.avatarText}>{acc.user?.name?.[0]?.toUpperCase()}</Text>
                                        </View>
                                        <View style={styles.textDetails}>
                                            <Text style={styles.accountName}>{acc.user?.name}</Text>
                                            <Text style={styles.accountSub}>{acc.user?.role} • {acc.user?.email}</Text>
                                        </View>
                                    </View>
                                    
                                    {isActive ? (
                                        <Ionicons name="checkmark-circle" size={24} color="#0095f6" />
                                    ) : (
                                        <View style={styles.radioCircle} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        {/* Add Account Option */}
                        <TouchableOpacity 
                            style={styles.addAccountBtn} 
                            onPress={handleAddAccount}
                            activeOpacity={0.7}
                        >
                            <View style={styles.addIconCircle}>
                                <Ionicons name="add" size={20} color={colors.white} />
                            </View>
                            <Text style={styles.addAccountText}>Add Account</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>LMS Suite • Meta Switcher</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: '#1c1c1e', // Elegant dark theme bottom sheet like Instagram's dark mode
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '60%',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#48484a',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: fontSizes.md,
        fontWeight: '850',
        color: colors.white,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    accountsList: {
        paddingHorizontal: spacing.md,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    accountItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    avatarCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    avatarText: {
        color: colors.white,
        fontSize: fontSizes.md,
        fontWeight: '900',
    },
    textDetails: {
        justifyContent: 'center',
    },
    accountName: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.white,
    },
    accountSub: {
        fontSize: 10,
        color: '#8e8e93',
        fontWeight: '600',
        marginTop: 2,
    },
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#48484a',
    },
    addAccountBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        marginTop: spacing.xs,
    },
    addIconCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#2c2c2e',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addAccountText: {
        fontSize: fontSizes.sm,
        fontWeight: '800',
        color: colors.white,
    },
    footerContainer: {
        marginTop: spacing.md,
        alignItems: 'center',
        borderTopWidth: 0.5,
        borderTopColor: '#2c2c2e',
        paddingTop: spacing.md,
    },
    footerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#48484a',
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});

export default ProfileBottomSheet;
