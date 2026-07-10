import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, fontSizes } from '../../theme/colors';

export const TimePickerModal = ({ visible, onClose, value, onChange }) => {
    let initialHr = '09';
    let initialMin = '00';
    let initialPeriod = 'AM';
    
    if (value) {
        const [h24, m] = value.split(':');
        const hNum = parseInt(h24, 10);
        initialMin = m || '00';
        if (hNum >= 12) {
            initialPeriod = 'PM';
            initialHr = hNum === 12 ? '12' : String(hNum - 12).padStart(2, '0');
        } else {
            initialPeriod = 'AM';
            initialHr = hNum === 0 ? '12' : String(hNum).padStart(2, '0');
        }
    }

    const [hr, setHr] = useState(initialHr);
    const [min, setMin] = useState(initialMin);
    const [period, setPeriod] = useState(initialPeriod);

    useEffect(() => {
        if (visible && value) {
            const [h24, m] = value.split(':');
            const hNum = parseInt(h24, 10);
            setMin(m || '00');
            if (hNum >= 12) {
                setPeriod('PM');
                setHr(hNum === 12 ? '12' : String(hNum - 12).padStart(2, '0'));
            } else {
                setPeriod('AM');
                setHr(hNum === 0 ? '12' : String(hNum).padStart(2, '0'));
            }
        }
    }, [visible, value]);

    const handleOk = () => {
        let hNum = parseInt(hr, 10);
        if (period === 'PM' && hNum < 12) hNum += 12;
        if (period === 'AM' && hNum === 12) hNum = 0;
        const formattedTime = `${String(hNum).padStart(2, '0')}:${min}`;
        onChange(formattedTime);
        onClose();
    };

    const handleClear = () => {
        onChange('');
        onClose();
    };

    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.modalBg} 
                activeOpacity={1} 
                onPress={onClose}
            >
                <TouchableOpacity 
                    style={styles.modalContent} 
                    activeOpacity={1}
                >
                    <View style={styles.topIndicator} />
                    <Text style={styles.title}>Set Time</Text>
                    
                    <View style={styles.pickerContainer}>
                        {/* Hour scroll */}
                        <View style={styles.col}>
                            <Text style={styles.colHeader}>Hour</Text>
                            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                                {hours.map(h => (
                                    <TouchableOpacity 
                                        key={h} 
                                        style={[styles.item, hr === h && styles.itemSelected]}
                                        onPress={() => setHr(h)}
                                    >
                                        <Text style={[styles.itemText, hr === h && styles.itemTextSelected]}>{h}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <Text style={styles.separator}>:</Text>

                        {/* Minute scroll */}
                        <View style={styles.col}>
                            <Text style={styles.colHeader}>Min</Text>
                            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                                {minutes.map(m => (
                                    <TouchableOpacity 
                                        key={m} 
                                        style={[styles.item, min === m && styles.itemSelected]}
                                        onPress={() => setMin(m)}
                                    >
                                        <Text style={[styles.itemText, min === m && styles.itemTextSelected]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* AM/PM scroll */}
                        <View style={styles.col}>
                            <Text style={styles.colHeader}>AM/PM</Text>
                            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                                {['AM', 'PM'].map(p => (
                                    <TouchableOpacity 
                                        key={p} 
                                        style={[styles.item, period === p && styles.itemSelected]}
                                        onPress={() => setPeriod(p)}
                                    >
                                        <Text style={[styles.itemText, period === p && styles.itemTextSelected]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actions}>
                        <View style={styles.row}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.okBtn} onPress={handleOk}>
                                <Text style={styles.okBtnText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={styles.clearBtnText}>Not Confirmed</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: 300,
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    topIndicator: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: fontSizes.lg,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 180,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        padding: 10,
        backgroundColor: colors.bgSecondary,
    },
    col: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
    },
    colHeader: {
        fontSize: fontSizes.xs,
        fontWeight: 'bold',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    scroll: {
        flex: 1,
        width: '100%',
    },
    separator: {
        fontSize: fontSizes.xxl,
        fontWeight: 'bold',
        color: colors.textLight,
        marginHorizontal: 8,
        paddingBottom: 20,
    },
    item: {
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: borderRadius.sm,
        marginVertical: 1,
    },
    itemSelected: {
        backgroundColor: '#e0e7ff',
    },
    itemText: {
        fontSize: fontSizes.md,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    itemTextSelected: {
        color: colors.accent,
        fontWeight: 'bold',
    },
    actions: {
        width: '100%',
        gap: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
    },
    cancelBtnText: {
        color: colors.textSecondary,
        fontWeight: 'bold',
        fontSize: fontSizes.md,
    },
    okBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        backgroundColor: colors.accent,
        alignItems: 'center',
    },
    okBtnText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: fontSizes.md,
    },
    clearBtn: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fee2e2',
        alignItems: 'center',
        marginTop: 4,
    },
    clearBtnText: {
        color: colors.danger,
        fontWeight: 'bold',
        fontSize: fontSizes.md,
    },
});
