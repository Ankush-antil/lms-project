const Institute = require('../../models/Institute');
const User = require('../../models/User');

// @desc    Get shutdown status for institutes
// @route   GET /api/setup/shutdown/status
// @access  Admin, Institute
const getShutdownStatus = async (req, res) => {
    try {
        const role = req.user.role;
        const select = 'name portalShutdown portalShutdownMessage shutdownRoles shutdownSelectedUsers';

        if (role === 'Admin') {
            const institutes = await Institute.find({ isDeleted: { $ne: true } }).select(select);
            return res.json({ institutes });
        }

        if (role === 'Institute') {
            const institute = await Institute.findById(req.user.institute).select(select);
            if (!institute) return res.status(404).json({ message: 'Institute not found' });
            return res.json({ institutes: [institute] });
        }

        return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get users by institute and role (for user picker)
// @route   GET /api/setup/shutdown/users/:instituteId?role=Teacher
// @access  Admin, Institute
const getInstituteUsersByRole = async (req, res) => {
    try {
        const { instituteId } = req.params;
        const { role } = req.query;
        const requester = req.user;

        // Institute can only query their own users
        if (requester.role === 'Institute' && requester.institute?.toString() !== instituteId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const query = { institute: instituteId, isDeleted: { $ne: true } };
        if (role) query.role = role;

        const users = await User.find(query)
            .select('name email avatar role isActive')
            .sort('name')
            .lean();

        return res.json({ users });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update shutdown settings for an institute
// @route   PUT /api/setup/shutdown/:instituteId
// @access  Admin (any), Institute (own only)
const toggleShutdown = async (req, res) => {
    try {
        const { instituteId } = req.params;
        const { portalShutdown, portalShutdownMessage, shutdownRoles, shutdownSelectedUsers } = req.body;
        const role = req.user.role;

        if (role === 'Institute' && req.user.institute?.toString() !== instituteId) {
            return res.status(403).json({ message: 'You can only manage your own institute.' });
        }

        if (role !== 'Admin' && role !== 'Institute') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updateFields = {
            portalShutdownMessage: portalShutdownMessage || ''
        };

        if (typeof portalShutdown === 'boolean') updateFields.portalShutdown = portalShutdown;
        if (Array.isArray(shutdownRoles)) updateFields.shutdownRoles = shutdownRoles;
        if (Array.isArray(shutdownSelectedUsers)) updateFields.shutdownSelectedUsers = shutdownSelectedUsers;

        const institute = await Institute.findByIdAndUpdate(instituteId, updateFields, { new: true })
            .select('name portalShutdown portalShutdownMessage shutdownRoles shutdownSelectedUsers');

        if (!institute) return res.status(404).json({ message: 'Institute not found' });

        res.json({ message: `Shutdown settings updated for "${institute.name}".`, institute });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getShutdownStatus, getInstituteUsersByRole, toggleShutdown };
