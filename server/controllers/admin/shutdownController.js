const Institute = require('../../models/Institute');

// @desc    Get shutdown status
// @route   GET /api/setup/shutdown/status
// @access  Admin, Institute
const getShutdownStatus = async (req, res) => {
    try {
        const role = req.user.role;

        if (role === 'Admin') {
            const institutes = await Institute.find({ isDeleted: { $ne: true } })
                .select('name portalShutdown portalShutdownMessage');
            return res.json({ institutes });
        }

        if (role === 'Institute') {
            const institute = await Institute.findById(req.user.institute)
                .select('name portalShutdown portalShutdownMessage');
            if (!institute) return res.status(404).json({ message: 'Institute not found' });
            return res.json({ institutes: [institute] });
        }

        return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle portal shutdown for an institute
// @route   PUT /api/setup/shutdown/:instituteId
// @access  Admin (any), Institute (own only)
const toggleShutdown = async (req, res) => {
    try {
        const { instituteId } = req.params;
        const { portalShutdown, portalShutdownMessage } = req.body;
        const role = req.user.role;

        if (role === 'Institute' && req.user.institute?.toString() !== instituteId) {
            return res.status(403).json({ message: 'You can only manage your own institute.' });
        }

        if (role !== 'Admin' && role !== 'Institute') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const institute = await Institute.findByIdAndUpdate(
            instituteId,
            {
                portalShutdown: Boolean(portalShutdown),
                portalShutdownMessage: portalShutdownMessage || ''
            },
            { new: true }
        ).select('name portalShutdown portalShutdownMessage');

        if (!institute) return res.status(404).json({ message: 'Institute not found' });

        res.json({
            message: portalShutdown
                ? `Portal for "${institute.name}" has been shut down.`
                : `Portal for "${institute.name}" is now active.`,
            institute
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getShutdownStatus, toggleShutdown };
