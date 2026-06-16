const User = require("../../models/User");
const MissedCall = require("../../models/MissedCall");

exports.getTeachersBySubject = async (req, res) => {
    try {

        const teachers = await User.find({
            role: "Teacher",
            "teacherProfile.subjects": req.params.subject,
            isActive: true
        }).select("_id name online");

        res.json(teachers);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};