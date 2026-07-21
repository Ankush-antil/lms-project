import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    RefreshControl, Alert, Modal, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, EmptyState, SectionCard, Badge } from '../../components/common/UIComponents';
import { colors, spacing, fontSizes, borderRadius } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const SOURCES = ['Google Ads', 'Facebook Ads', 'Organic Search', 'Referral', 'Instagram Direct', 'Webinar'];
const STAGES = ['New', 'Contacted', 'Demo Scheduled', 'Negotiating', 'Enrolled', 'Lost'];

const DEMO_LEADS = [
    {
        _id: 'demo_1',
        guestName: 'Aarav Sharma',
        guestPhone: '9876543210',
        guestEmail: 'aarav.sharma@gmail.com',
        course: 'Full Stack Web Development',
        source: 'Google Ads',
        stage: 'Demo Scheduled',
        statement: 'Interested in upcoming cohort. Needs weekend batch.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        _id: 'demo_2',
        guestName: 'Ananya Iyer',
        guestPhone: '8765432109',
        guestEmail: 'ananya.iyer@outlook.com',
        course: 'Data Science & Machine Learning',
        source: 'Facebook Ads',
        stage: 'New',
        statement: 'Syllabus download request.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        _id: 'demo_3',
        guestName: 'Vikram Malhotra',
        guestPhone: '7654321098',
        guestEmail: 'vikram.m@yahoo.com',
        course: 'UI/UX Design Masterclass',
        source: 'Referral',
        stage: 'Enrolled',
        statement: 'Referred by Rohan. First installment paid.',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
];

const LeadMgtScreen = ({ navigation }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    
    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLeadDetail, setSelectedLeadDetail] = useState(null);

    // New Lead Form State (matching Web Application)
    const [form, setForm] = useState({
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        course: '',
        source: 'Google Ads',
        stage: 'New',
        statement: ''
    });

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const stored = await AsyncStorage.getItem('@lms_leads');
            let localLeads = stored ? JSON.parse(stored) : [];

            let apiLeads = [];
            try {
                const { data } = await axios.get('/api/setup/institute-applications');
                if (data && Array.isArray(data)) {
                    apiLeads = data.map(lead => ({
                        _id: lead._id,
                        guestName: lead.guestName || 'Inquirer',
                        guestPhone: lead.guestPhone || '-',
                        guestEmail: lead.guestEmail || '-',
                        course: typeof lead.course === 'object' ? (lead.course?.name || 'General Inquiry') : (lead.course || 'General Inquiry'),
                        source: lead.source || SOURCES[Math.floor(Math.random() * SOURCES.length)],
                        stage: lead.status === 'Registered' ? 'Enrolled' : 
                               lead.status === 'Accepted' ? 'Demo Scheduled' : 
                               lead.status === 'Rejected' ? 'Lost' : 
                               lead.status === 'Under Review' ? 'Contacted' : 'New',
                        statement: lead.statement || '',
                        createdAt: lead.createdAt || new Date().toISOString()
                    }));
                }
            } catch (err) {
                console.log('[API Leads Fetch Warning - Fallback to local/demo]', err?.message);
            }

            // Merge local, API, and demo leads
            const combined = [
                ...localLeads,
                ...apiLeads.filter(a => !localLeads.some(l => l.guestPhone === a.guestPhone)),
                ...DEMO_LEADS.filter(d => !localLeads.some(l => l.guestPhone === d.guestPhone) && !apiLeads.some(a => a.guestPhone === d.guestPhone))
            ];

            setLeads(combined);
            await AsyncStorage.setItem('@lms_leads', JSON.stringify(combined));
        } catch (e) {
            console.error('[Load Leads Error]', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const saveLeads = async (updatedList) => {
        try {
            setLeads(updatedList);
            await AsyncStorage.setItem('@lms_leads', JSON.stringify(updatedList));
        } catch (e) {
            console.error('[Save Leads Error]', e);
        }
    };

    const handleCreateLead = () => {
        if (!form.guestName.trim()) {
            Alert.alert('Required', 'Please enter full name');
            return;
        }
        if (!form.guestPhone.trim()) {
            Alert.alert('Required', 'Please enter mobile number');
            return;
        }

        const newLead = {
            _id: 'manual_' + Date.now(),
            guestName: form.guestName.trim(),
            guestPhone: form.guestPhone.trim(),
            guestEmail: form.guestEmail.trim() || 'N/A',
            course: form.course.trim() || 'General Consultation',
            source: form.source,
            stage: form.stage,
            statement: form.statement.trim() || '',
            createdAt: new Date().toISOString()
        };

        const updated = [newLead, ...leads];
        saveLeads(updated);
        setIsAddModalOpen(false);
        Alert.alert('Success', 'Lead registered successfully');
    };

    const handleUpdateStage = (id, newStage) => {
        const updated = leads.map(l => l._id === id ? { ...l, stage: newStage } : l);
        saveLeads(updated);
        if (selectedLeadDetail && selectedLeadDetail._id === id) {
            setSelectedLeadDetail({ ...selectedLeadDetail, stage: newStage });
        }
    };

    const handleDeleteLead = (id) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this lead?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = leads.filter(l => l._id !== id);
                        saveLeads(updated);
                        setSelectedLeadDetail(null);
                    }
                }
            ]
        );
    };

    // Filter calculations
    const filteredLeads = leads.filter(l => {
        const matchesSearch = 
            l.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.guestPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.guestEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.course.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStage = stageFilter === 'All' || l.stage === stageFilter;
        const matchesSource = sourceFilter === 'All' || l.source === sourceFilter;

        return matchesSearch && matchesStage && matchesSource;
    });

    // KPI Metrics
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.stage === 'Enrolled').length;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
    const activeDeals = leads.filter(l => ['New', 'Contacted', 'Demo Scheduled', 'Negotiating'].includes(l.stage)).length;

    const getStageColor = (stage) => {
        switch (stage) {
            case 'New': return '#3b82f6';
            case 'Contacted': return '#8b5cf6';
            case 'Demo Scheduled': return '#f59e0b';
            case 'Negotiating': return '#ec4899';
            case 'Enrolled': return '#10b981';
            case 'Lost': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Leads Management" showBack rightIcon="funnel-outline" />

            {loading ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.loadingText}>Loading leads pipeline...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeads(); }} tintColor={colors.accent} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Banner & Add Manual Lead Button */}
                    <View style={styles.banner}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bannerTitle}>Leads Pipeline Management</Text>
                            <Text style={styles.bannerSub}>Capture, organize, and convert leads through visual pipeline</Text>
                        </View>
                        <TouchableOpacity style={styles.addNavBtn} onPress={() => setIsAddModalOpen(true)} activeOpacity={0.85}>
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={styles.addNavBtnText}>Add Lead</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 4 KPI Metrics Cards */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiCard}>
                            <Ionicons name="inbox-outline" size={20} color="#6366f1" />
                            <Text style={styles.kpiVal}>{totalLeads}</Text>
                            <Text style={styles.kpiLabel}>Total Leads</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Ionicons name="person-add-outline" size={20} color="#10b981" />
                            <Text style={styles.kpiVal}>{convertedLeads}</Text>
                            <Text style={styles.kpiLabel}>Converted</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Ionicons name="trending-up-outline" size={20} color="#3b82f6" />
                            <Text style={styles.kpiVal}>{conversionRate}%</Text>
                            <Text style={styles.kpiLabel}>Conv Rate</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Ionicons name="time-outline" size={20} color="#f59e0b" />
                            <Text style={styles.kpiVal}>{activeDeals}</Text>
                            <Text style={styles.kpiLabel}>Active Deals</Text>
                        </View>
                    </View>

                    {/* Stage Filter Chips */}
                    <Text style={styles.filterGroupHeader}>STAGE FILTER</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilterScroll}>
                        <TouchableOpacity
                            style={[styles.catPill, stageFilter === 'All' && styles.catPillActive]}
                            onPress={() => setStageFilter('All')}
                        >
                            <Text style={[styles.catPillText, stageFilter === 'All' && styles.catPillTextActive]}>All Stages</Text>
                        </TouchableOpacity>
                        {STAGES.map((stg, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.catPill, stageFilter === stg && styles.catPillActive]}
                                onPress={() => setStageFilter(stg)}
                            >
                                <Text style={[styles.catPillText, stageFilter === stg && styles.catPillTextActive]}>{stg}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Search Box */}
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search leads by name, email, phone..."
                            placeholderTextColor={colors.textMuted}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        {searchTerm !== '' && (
                            <TouchableOpacity onPress={() => setSearchTerm('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Leads Directory List */}
                    <SectionCard style={{ marginTop: spacing.xs }}>
                        <Text style={styles.sectionTitle}>Leads Funnel ({filteredLeads.length})</Text>

                        {filteredLeads.length === 0 ? (
                            <EmptyState icon="funnel-outline" title="No leads found" />
                        ) : (
                            filteredLeads.map(item => (
                                <TouchableOpacity 
                                    key={item._id} 
                                    style={styles.leadCard}
                                    activeOpacity={0.8}
                                    onPress={() => setSelectedLeadDetail(item)}
                                >
                                    <View style={styles.leadHeader}>
                                        <View style={styles.leadIconBox}>
                                            <Ionicons name="person" size={18} color={colors.accent} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.leadName}>{item.guestName}</Text>
                                            <Text style={styles.leadSubText}>📞 {item.guestPhone} • ✉️ {item.guestEmail}</Text>
                                        </View>
                                        <Badge
                                            label={item.stage}
                                            color={getStageColor(item.stage)}
                                        />
                                    </View>

                                    <View style={styles.courseRow}>
                                        <Text style={styles.courseText} numberOfLines={1}>📘 {item.course}</Text>
                                        <View style={styles.sourceTag}>
                                            <Text style={styles.sourceTagText}>{item.source}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.leadFooter}>
                                        <Text style={styles.dateText}>Created: {formatDate(item.createdAt)}</Text>
                                        
                                        {/* Inline Quick Stage Switcher */}
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 170 }}>
                                            {STAGES.map((s, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[styles.stageSwitchChip, item.stage === s && { backgroundColor: getStageColor(s) }]}
                                                    onPress={() => handleUpdateStage(item._id, s)}
                                                >
                                                    <Text style={[styles.stageSwitchText, item.stage === s && { color: '#fff' }]}>{s}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </SectionCard>
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* Add Manual Lead Modal (Matching Web Application) */}
            <Modal
                visible={isAddModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsAddModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>+ Add Manual Lead</Text>
                            <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                                <Ionicons name="close" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                            {/* FULL NAME */}
                            <Text style={styles.label}>FULL NAME *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter full name"
                                placeholderTextColor={colors.textMuted}
                                value={form.guestName}
                                onChangeText={(val) => setForm({ ...form, guestName: val })}
                            />

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {/* MOBILE NUMBER */}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>MOBILE NUMBER *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. +91 9876543210"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="phone-pad"
                                        value={form.guestPhone}
                                        onChangeText={(val) => setForm({ ...form, guestPhone: val })}
                                    />
                                </View>

                                {/* EMAIL ADDRESS */}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>EMAIL ADDRESS</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. email@example.com"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="email-address"
                                        value={form.guestEmail}
                                        onChangeText={(val) => setForm({ ...form, guestEmail: val })}
                                    />
                                </View>
                            </View>

                            {/* COURSE PREFERRED */}
                            <Text style={styles.label}>COURSE PREFERRED</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Full Stack Web Development"
                                placeholderTextColor={colors.textMuted}
                                value={form.course}
                                onChangeText={(val) => setForm({ ...form, course: val })}
                            />

                            {/* SOURCE */}
                            <Text style={styles.label}>SOURCE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {SOURCES.map((src, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.selectChip, form.source === src && styles.selectChipActive]}
                                        onPress={() => setForm({ ...form, source: src })}
                                    >
                                        <Text style={[styles.selectChipText, form.source === src && styles.selectChipTextActive]}>{src}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* CURRENT STAGE */}
                            <Text style={styles.label}>CURRENT STAGE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {STAGES.map((stg, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.selectChip, form.stage === stg && styles.selectChipActive]}
                                        onPress={() => setForm({ ...form, stage: stg })}
                                    >
                                        <Text style={[styles.selectChipText, form.stage === stg && styles.selectChipTextActive]}>{stg}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* NOTES / DESCRIPTION */}
                            <Text style={styles.label}>NOTES / DESCRIPTION</Text>
                            <TextInput
                                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                                placeholder="Enter initial lead notes or call logs..."
                                placeholderTextColor={colors.textMuted}
                                multiline={true}
                                value={form.statement}
                                onChangeText={(val) => setForm({ ...form, statement: val })}
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity 
                                    style={styles.cancelBtn} 
                                    onPress={() => setIsAddModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.submitBtn} 
                                    onPress={handleCreateLead}
                                >
                                    <Text style={styles.submitBtnText}>Create Lead</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Lead Detail Bottom Sheet Modal */}
            {selectedLeadDetail && (
                <Modal
                    visible={!!selectedLeadDetail}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setSelectedLeadDetail(null)}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay} 
                        activeOpacity={1} 
                        onPress={() => setSelectedLeadDetail(null)}
                    >
                        <View style={styles.detailContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedLeadDetail.guestName}</Text>
                                <TouchableOpacity onPress={() => setSelectedLeadDetail(null)}>
                                    <Ionicons name="close" size={22} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Mobile Phone:</Text>
                                <Text style={styles.detailValue}>{selectedLeadDetail.guestPhone}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Email Address:</Text>
                                <Text style={styles.detailValue}>{selectedLeadDetail.guestEmail || 'N/A'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Course Preferred:</Text>
                                <Text style={[styles.detailValue, { color: colors.accent }]}>{selectedLeadDetail.course}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Lead Source:</Text>
                                <Text style={styles.detailValue}>{selectedLeadDetail.source}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Pipeline Stage:</Text>
                                <Badge label={selectedLeadDetail.stage} color={getStageColor(selectedLeadDetail.stage)} />
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Created On:</Text>
                                <Text style={styles.detailValue}>{formatDate(selectedLeadDetail.createdAt)}</Text>
                            </View>

                            {selectedLeadDetail.statement ? (
                                <View style={styles.notesBox}>
                                    <Text style={styles.detailLabel}>Notes / Call Logs:</Text>
                                    <Text style={styles.notesText}>{selectedLeadDetail.statement}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity 
                                style={styles.deleteBtn}
                                onPress={() => handleDeleteLead(selectedLeadDetail._id)}
                            >
                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                <Text style={styles.deleteBtnText}>Delete Lead</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: '600' },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md },
    banner: {
        backgroundColor: colors.accent,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bannerTitle: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '800' },
    bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.xs, marginTop: 2 },
    addNavBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.md,
        gap: 4,
    },
    addNavBtnText: { color: '#fff', fontWeight: '800', fontSize: fontSizes.xs },
    kpiGrid: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
    kpiCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: borderRadius.md,
        padding: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 1,
    },
    kpiVal: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginTop: 2 },
    kpiLabel: { fontSize: 8, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
    filterGroupHeader: { fontSize: 9, fontWeight: '900', color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 },
    catFilterScroll: { marginBottom: spacing.sm },
    catPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    catPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    catPillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    catPillTextActive: { color: '#fff' },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        gap: 6,
    },
    searchInput: { flex: 1, height: 40, color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' },
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
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leadName: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
    leadSubText: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    courseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    courseText: { fontSize: 11, fontWeight: '700', color: '#475569', flex: 1 },
    sourceTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    sourceTagText: { fontSize: 9, fontWeight: '800', color: '#64748b' },
    leadFooter: {
        flexDirection: 'row',
        justify: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    dateText: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
    stageSwitchChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f1f5f9', marginRight: 4 },
    stageSwitchText: { fontSize: 8, fontWeight: '800', color: '#64748b' },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justify: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.xl,
        width: '100%',
        maxHeight: '85%',
        padding: spacing.md,
    },
    detailContainer: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.xl,
        width: '100%',
        padding: spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justify: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 10,
        marginBottom: 12,
    },
    modalTitle: { fontSize: fontSizes.md, fontWeight: '900', color: '#1e293b' },
    modalFormScroll: { flexGrow: 0 },
    label: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        color: '#1e293b',
        fontSize: fontSizes.sm,
        fontWeight: '600',
        marginBottom: 12,
    },
    selectChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    selectChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    selectChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
    selectChipTextActive: { color: '#fff' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: borderRadius.md, backgroundColor: '#f1f5f9' },
    cancelBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
    submitBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: borderRadius.md, backgroundColor: '#0f172a' },
    submitBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
    detailLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    detailValue: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
    notesBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginTop: 10 },
    notesText: { fontSize: 11, color: '#475569', marginTop: 4 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 14, backgroundColor: '#fef2f2', borderRadius: 8 },
    deleteBtnText: { fontSize: 12, fontWeight: '800', color: '#ef4444' }
});

export default LeadMgtScreen;
