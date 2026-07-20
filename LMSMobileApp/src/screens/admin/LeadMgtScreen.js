import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { AppHeader, EmptyState, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const LeadMgtScreen = ({ navigation }) => {
    const [leads, setLeads] = useState([
        { id: '1', name: 'Rohan Sharma', phone: '+91 98765 43210', course: 'Full Stack Web Dev', status: 'Hot', notes: 'Very interested, requested callback tomorrow.' },
        { id: '2', name: 'Priya Patel', phone: '+91 87654 32109', course: 'Data Science Bootcamp', status: 'Warm', notes: 'Asked about fee installment options.' },
        { id: '3', name: 'Amit Verma', phone: '+91 76543 21098', course: 'UI/UX Design Course', status: 'Cold', notes: 'Sent brochure over WhatsApp.' },
    ]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newLeadName, setNewLeadName] = useState('');
    const [newLeadPhone, setNewLeadPhone] = useState('');
    const [newLeadCourse, setNewLeadCourse] = useState('');

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    const handleAddLead = () => {
        if (!newLeadName.trim() || !newLeadPhone.trim()) {
            Alert.alert('Required', 'Please enter lead name and phone number');
            return;
        }
        const item = {
            id: Date.now().toString(),
            name: newLeadName.trim(),
            phone: newLeadPhone.trim(),
            course: newLeadCourse.trim() || 'General Inquiry',
            status: 'Hot',
            notes: 'Newly added lead via administration desk'
        };
        setLeads([item, ...leads]);
        setNewLeadName('');
        setNewLeadPhone('');
        setNewLeadCourse('');
        Alert.alert('Success', 'Lead registered successfully');
    };

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Lead Management" showBack rightIcon="funnel-outline" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Overview Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTitle}>Admissions & Leads</Text>
                        <Text style={styles.bannerSub}>Track potential student inquiries and conversion funnel.</Text>
                    </View>
                </View>

                {/* Quick Add Lead Section */}
                <SectionCard>
                    <Text style={styles.sectionTitle}>Add New Lead</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Lead Name"
                        placeholderTextColor={colors.textMuted}
                        value={newLeadName}
                        onChangeText={setNewLeadName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number"
                        placeholderTextColor={colors.textMuted}
                        value={newLeadPhone}
                        keyboardType="phone-pad"
                        onChangeText={setNewLeadPhone}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Interested Course (e.g., Python AI)"
                        placeholderTextColor={colors.textMuted}
                        value={newLeadCourse}
                        onChangeText={setNewLeadCourse}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddLead} activeOpacity={0.8}>
                        <Text style={styles.addBtnText}>Save Lead</Text>
                    </TouchableOpacity>
                </SectionCard>

                {/* Search & List */}
                <SectionCard style={{ marginTop: spacing.md }}>
                    <Text style={styles.sectionTitle}>Leads Funnel ({filteredLeads.length})</Text>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or course..."
                            placeholderTextColor={colors.textMuted}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>

                    {filteredLeads.length === 0 ? (
                        <EmptyState icon="people-outline" title="No leads found" />
                    ) : (
                        filteredLeads.map(item => (
                            <View key={item.id} style={styles.leadCard}>
                                <View style={styles.leadHeader}>
                                    <View style={styles.leadIconBox}>
                                        <Ionicons name="person" size={20} color="#f59e0b" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.leadName}>{item.name}</Text>
                                        <Text style={styles.leadMeta}>{item.course} • {item.phone}</Text>
                                    </View>
                                    <Badge
                                        label={item.status}
                                        color={item.status === 'Hot' ? '#ef4444' : item.status === 'Warm' ? '#f59e0b' : '#3b82f6'}
                                    />
                                </View>
                                <View style={styles.leadFooter}>
                                    <Text style={styles.notesText}>{item.notes}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </SectionCard>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md },
    banner: {
        backgroundColor: '#f59e0b',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    bannerTitle: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
    bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.xs, marginTop: 4 },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    input: {
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        color: colors.text,
        fontSize: fontSizes.sm,
        marginBottom: spacing.sm,
    },
    addBtn: {
        backgroundColor: '#f59e0b',
        paddingVertical: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    addBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.md,
        gap: 6,
    },
    searchInput: { flex: 1, height: 40, color: colors.text, fontSize: fontSizes.sm },
    leadCard: {
        backgroundColor: colors.bgCard,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    leadHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    leadIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leadName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    leadMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    leadFooter: {
        marginTop: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    notesText: { fontSize: fontSizes.xs, color: colors.textSecondary },
});

export default LeadMgtScreen;
