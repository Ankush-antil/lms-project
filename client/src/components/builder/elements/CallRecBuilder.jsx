import { Phone, PhoneOff } from "lucide-react";

const CallRecBuilder = ({
    teacherName = "Math Teacher",
    teacherStatus = false,
    onCall
}) => {
    return (
        <div className="p-4 border rounded-xl bg-white">

            <div className="flex items-center justify-between">

                <div>
                    <h3 className="font-semibold">
                        {teacherName}
                    </h3>

                    <p
                        className={`text-sm ${teacherStatus
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                    >
                        {teacherStatus ? "Online" : "Offline"}
                    </p>
                </div>

                <button
                    disabled={!teacherStatus}
                    onClick={onCall}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${teacherStatus
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                >
                    {teacherStatus ? (
                        <>
                            <Phone size={18} />
                            Call
                        </>
                    ) : (
                        <>
                            <PhoneOff size={18} />
                            Offline
                        </>
                    )}
                </button>

            </div>

        </div>
    );
};

export default CallRecBuilder;