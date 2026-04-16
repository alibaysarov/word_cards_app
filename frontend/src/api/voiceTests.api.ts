import httpClient from "./httpClient"

export const uploadVoiceMessage = async (form: FormData) => {
    const response = await httpClient.post(`/audio/test_message`, form, {
        headers: {
            "Content-Type": "multipart/formdata"
        }
    });
    return response.data;
}

export interface TranscribeResponse {
    text: string
}

export async function transcribeAudio(form: FormData): Promise<TranscribeResponse> {
    const response = await httpClient.post<TranscribeResponse>("/audio/transcribe", form, {
        headers: {
            "Content-Type": "multipart/formdata"
        }
    })
    return response.data
}