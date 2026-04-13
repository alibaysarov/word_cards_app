import httpClient from "./httpClient"

export const uploadVoiceMessage = async (form: FormData) => {
    const response = await httpClient.post(`/audio/test_message`, form, {
        headers: {
            "Content-Type": "multipart/formdata"
        }
    });
    return response.data;
}