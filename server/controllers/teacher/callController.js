const User = require('../../models/User');
const CallLog = require('../../models/CallLog');

exports.getAllTeachers = async (req, res) => {
    try {

        const teachers = await User.find({
            role: 'Teacher',
            isActive: true
        }).select(
            '_id name email callEnabled'
        );

        res.json(teachers);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

exports.toggleTeacherCall = async (req, res) => {
    try {

        const { teacherId } = req.params;

        const teacher = await User.findById(
            teacherId
        );

        if (!teacher) {
            return res.status(404).json({
                message: 'Teacher not found'
            });
        }

        teacher.callEnabled =
            !teacher.callEnabled;

        await teacher.save();

        res.json({
            success: true,
            callEnabled:
                teacher.callEnabled
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

exports.getMissedCalls = async (req, res) => {
    try {
        const missedCalls = await CallLog.find({
            receiver: req.user._id,
            status: 'missed',
            isRead: false
        })
        .populate('caller', '_id name email role')
        .sort({ createdAt: -1 });

        res.json(missedCalls);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

exports.clearMissedCalls = async (req, res) => {
    try {
        await CallLog.updateMany(
            { receiver: req.user._id, status: 'missed', isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

exports.markCallAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const call = await CallLog.findOneAndUpdate(
            { _id: id, receiver: req.user._id },
            { $set: { isRead: true } },
            { new: true }
        );
        if (!call) {
            return res.status(404).json({
                message: 'Call log not found'
            });
        }
        res.json({ success: true, call });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
