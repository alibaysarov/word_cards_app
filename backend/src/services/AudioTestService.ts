import fs from "fs/promises"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { HumanMessage } from "langchain";
import ServerError from "../exceptions/ServerError"
import { ChatOpenAI } from "@langchain/openai";

const { OPENAI_API_KEY } = process.env
if (!OPENAI_API_KEY) {
    throw new ServerError("OPENAI KEY NOT DEFINED")
}


const model = new ChatOpenAI({
    model: "gpt-4o-audio-preview",
    modalities: ["text"],
    openAIApiKey: OPENAI_API_KEY
});

class AudioTestService {

    async getTextFromSpeech(filePath: string): Promise<string> {
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const supportedFormats = ["wav", "mp3"] as const;

        let audioPath = filePath;
        if (!supportedFormats.includes(ext as typeof supportedFormats[number])) {
            audioPath = await this.convertToMp3(filePath);
        }

        const audioFile = await fs.readFile(audioPath);
        const base64Audio = audioFile.toString('base64');
        const format = path.extname(audioPath).slice(1).toLowerCase() as "wav" | "mp3";

        const response = await model.invoke([
            new HumanMessage({
                content: [
                    {
                        type: "input_audio",
                        input_audio: {
                            data: base64Audio,
                            format,
                        },
                    },
                    {
                        type: "text",
                        text: "Please transcribe this audio accurately. Return only the transcribed text, nothing else.",
                    },
                ],
            }),
        ]);

        if (audioPath !== filePath) {
            await fs.unlink(audioPath).catch(() => {});
        }

        return typeof response.content === "string"
            ? response.content
            : response.content.map(c => "text" in c ? c.text : "").join("");
    }

    private convertToMp3(inputPath: string): Promise<string> {
        const outputPath = inputPath.replace(/\.[^.]+$/, ".mp3");
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat("mp3")
                .on("end", () => resolve(outputPath))
                .on("error", (err: Error) => reject(err))
                .save(outputPath);
        });
    }
}

export default new AudioTestService()