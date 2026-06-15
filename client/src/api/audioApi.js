import axios from "axios";

export const uploadAudio = async (formData) => {
    const { data } = await axios.post("/api/tests/upload/audio",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return data;
};

export const getAudioUrl = (audioUrl) => {
    return `http://localhost:5000${audioUrl}`;
};