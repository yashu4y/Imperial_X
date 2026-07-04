import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface ChatResponse {
  text: string;
  sources?: { title: string; uri: string }[];
}

export async function chatWithGemini(message: string): Promise<ChatResponse> {
  if (!ai) {
    throw new Error("API Key Missing: Please add your GEMINI_API_KEY to the Secrets panel in the AI Studio settings to enable the AI brain.");
  }

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are a highly intelligent AI assistant with a 'digital brain'. You have access to real-time information via Google Search. When answering, be precise, insightful, and cite your sources if you use search results.",
        tools: [{ googleSearch: {} }],
      },
    });

    const response = await chat.sendMessage({ message });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web)
      .filter((web): web is { title: string; uri: string } => !!web?.uri);

    return {
      text: response.text || "I'm sorry, I couldn't process that request.",
      sources: sources && sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
}

export async function generateImage(prompt: string) {
  if (!ai) {
    throw new Error("API Key Missing: Please add your GEMINI_API_KEY to the Secrets panel in the AI Studio settings to enable image generation.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image was generated. Try a different prompt.");
  } catch (error) {
    console.error("Image Error:", error);
    throw error;
  }
}
