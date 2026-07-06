const cron = require('node-cron');
const crypto = require('crypto');
const User = require('../models/User');
const AttendanceSession = require('../models/AttendanceSession');

const initAttendanceCron = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            // Format current time as HH:MM local time
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${hours}:${minutes}`;
            
            // Adjust current date string based on local timezone
            const tzOffset = now.getTimezoneOffset() * 60000; 
            const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
            const currentDateStr = localISOTime.split('T')[0];

            // Find teachers with autoQRConfig enabled
            const teachers = await User.find({
                role: 'Teacher',
                isActive: true,
                'teacherProfile.autoQRConfig.enabled': true
            });

            for (const teacher of teachers) {
                const config = teacher.teacherProfile.autoQRConfig;
                if (!config) continue;
                
                // Check Schedule Time
                if (config.scheduleTime === currentTime) {
                    await createSessionIfNotExist(teacher, config, 'class', currentDateStr);
                }
            }
        } catch (error) {
            console.error('Error in attendance cron:', error);
        }
    });
};

const createSessionIfNotExist = async (teacher, config, type, dateStr) => {
    try {
        // Check if an active session already exists for this teacher, type, subject, and section
        const existing = await AttendanceSession.findOne({
            teacher: teacher._id,
            type: type,
            isActive: true,
            date: dateStr,
            subject: config.subject,
            section: config.section || 'ALL'
        });

        if (existing) {
            console.log(`[Cron] Skipped: Active ${type} session already exists for ${teacher.email}`);
            return; // Already generated and active
        }

        const finalDuration = config.duration || 525600; // default 1 year (no expiry)
        const qrToken = crypto.randomUUID();
        const startTime = new Date();
        const endTime = new Date(Date.now() + finalDuration * 60000);

        await AttendanceSession.create({
            teacher: teacher._id,
            course: config.course,
            subject: config.subject || 'Daily Attendance',
            section: config.section || 'ALL',
            date: dateStr,
            startTime,
            endTime,
            duration: finalDuration,
            qrToken,
            isActive: true,
            wifiSSID: config.wifiSSID || null,
            wifiIP: null,
            type: type,
            locationRequired: !!config.locationRequired,
            latitude: null, // Auto sessions don't enforce location strict coordinates initially
            longitude: null
        });
        console.log(`[Cron] Auto-generated ${type} QR session for teacher ${teacher.email} at ${dateStr}`);
    } catch (err) {
        console.error('[Cron] Error auto-creating session:', err);
    }
};

module.exports = initAttendanceCron;
