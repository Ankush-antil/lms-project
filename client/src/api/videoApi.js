import axios from "axios";

export const uploadVideo = async (formData) => {
    const response = await axios.post(
        "/api/tests/upload/video",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
};