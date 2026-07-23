const Institute = require('../../models/Institute');

// @desc    Get shutdown status
// @route   GET /api/setup/shutdown/status
// @access  Admin, Institute
const getShutdownStatus = async (req, res) => {
    try {
        const role = req.user.role;

        if (role === 'Admin') {
            const institutes = await Institute.find({ isDeleted: { $ne: true } })
                .select('name portalShutdown portalShutdownMessage shutdownRoles');
            return res.json({ institutes });
        }

        if (role === 'Institute') {
            const institute = await Institute.findById(req.user.institute)
                .select('name portalShutdown portalShutdownMessage shutdownRoles');
            if (!institute) return res.status(404).json({ message: 'Institute not found' });
            return res.json({ institutes: [institute] });
        }

        return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle portal shutdown / role-level shutdown for an institute
// @route   PUT /api/setup/shutdown/:instituteId
// @access  Admin (any), Institute (own only)
const toggleShutdown = async (req, res) => {
    try {
        const { instituteId } = req.params;
        const { portalShutdown, portalShutdownMessage, shutdownRoles } = req.body;
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

        // Full institute shutdown toggle
        if (typeof portalShutdown === 'boolean') {
            updateFields.portalShutdown = portalShutdown;
        }

        // Role-level shutdown update
        if (Array.isArray(shutdownRoles)) {
            updateFields.shutdownRoles = shutdownRoles;
        }

        const institute = await Institute.findByIdAndUpdate(
            instituteId,
            updateFields,
            { new: true }
        ).select('name portalShutdown portalShutdownMessage shutdownRoles');

        if (!institute) return res.status(404).json({ message: 'Institute not found' });

        res.json({
            message: `Shutdown settings updated for "${institute.name}".`,
            institute
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getShutdownStatus, toggleShutdown };
