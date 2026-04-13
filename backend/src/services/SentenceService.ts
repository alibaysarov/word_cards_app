import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "../database/prisma";
import NotFoundError from "../exceptions/NotFoundError";
import ValidationError from "../exceptions/ValidationError";
import ServerError from "../exceptions/ServerError";



const { OPENAI_API_KEY } = process.env
if (!OPENAI_API_KEY) {
  throw new ServerError("OPENAI KEY NOT DEFINED")
}
interface Word {
  id: string
  frontText: string,
  RearText: string
}

interface SentenceDTO {
  id: string
  text: string
  highLighted: string
  translate: string
}

type SentenceWithWord = {
  id: string
  text: string
  wordCard: Pick<Word, "id" | "frontText" | "RearText"> | null
}


const model = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0.9,
  maxTokens: 1000,
  apiKey: OPENAI_API_KEY
});

class SentenceService {

  async getSentencesByCollection(collectionId: string): Promise<SentenceDTO[]> {
    const sentences: SentenceWithWord[] = await prisma.sentence.findMany({
      where: {
        collectionId
      },
      select: {
        id: true,
        text: true,
        wordCard: {
          select: {
            id: true,
            frontText: true,
            RearText: true,
          },
        },
      }
    });
    return this.prepareList(sentences);
  }

  async createSentences(userId: string, collectionId: string, limit: number = 5): Promise<SentenceDTO[]> {

    if (limit < 1) {
      throw new ValidationError("Слов не может быть меньше 1!")
    }

    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId
      }
    });

    if (collection == null) {
      throw new NotFoundError("Collection not found")
    }

    const words: Word[] = await prisma.wordCard.findMany({
      where: {
        collectionId
      },
      select: {
        id: true,
        frontText: true,
        RearText: true
      },
      take: limit
    });

    const result = await this.generateSentencesPrompt(words);
    await prisma.sentence.createMany({
      data: result.sentences.map((s) => ({
        wordCardId: s.wordCardId,
        text: s.sentence,
        userId,
        collectionId,
      })),
    });

    const persisted: SentenceWithWord[] = await prisma.sentence.findMany({
      where: { collectionId },
      select: {
        id: true,
        text: true,
        wordCard: {
          select: {
            id: true,
            frontText: true,
            RearText: true,
          },
        },
      },
    });

    return this.prepareList(persisted);

  }

  private prepareList(sentences: SentenceWithWord[]): SentenceDTO[] {
    return sentences
      .filter((sentence): sentence is SentenceWithWord & { wordCard: NonNullable<SentenceWithWord["wordCard"]> } => {
        return sentence.wordCard !== null;
      })
      .map(({ id, text, wordCard }) => {
        const { frontText, RearText: rearText } = wordCard;
        const hasFrontText = text.toLowerCase().includes(frontText.toLowerCase());

        return {
          id,
          text,
          highLighted: hasFrontText ? frontText : rearText,
          translate: hasFrontText ? rearText : frontText,
        };
      });
  }

  private async generateSentencesPrompt(words: Word[]) {

    const responseSchema = z.object({
      sentences: z.array(
        z.object({
          wordCardId: z.string().describe("Id карточки слова, для которого составлено предложение"),
          sentence: z.string().describe("Предложение с использованием этого слова"),
        })
      ).describe("Список предложений для каждого слова"),
    });

    const structuredModel = model.withStructuredOutput(responseSchema, {
      name: "generate_sentences",
    })


    const messages = [
      new SystemMessage("You are a helpful assistant that generates example sentences for vocabulary words."),
      new HumanMessage(`
        Generate one example sentence for each of the following words.
        Each sentence must contain the word at least once.
        Words: ${JSON.stringify(words)}
      `),
    ];

    const result = await structuredModel.invoke(messages);
    return result;

  }
}


export default new SentenceService()