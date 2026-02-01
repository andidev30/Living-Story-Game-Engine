
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const getGeminiClient = () => {
  if (!API_KEY) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey: API_KEY });
};

export const generateStoryContent = async (prompt: string, history: any[]) => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      systemInstruction: `You are a Living Story Game Engine.
Your task is to run an interactive narrative game where:
- The world evolves based on player choices
- Characters remember how the player treated them
- The story is not pre-scripted and has no fixed ending
- Consistency across long play sessions is critical

Maintain an internal STORY STATE of: World setting/timeline, Player reputation, Character profiles (traits, emotion, memory), Unresolved plot threads, Long-term consequences.

OUTPUT FORMAT (STRICT):
[SCENE]
- Vivid description

[CHARACTER ACTIONS]
- Actions based on memory/emotion

[CHOICES]
- 3-5 numbered options`,
    },
  });
  return response.text;
};

export const generateSceneImage = async (sceneDescription: string) => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: `A cinematic, atmospheric concept art illustration of this scene: ${sceneDescription}. High detail, artistic style, moody lighting.` }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateVideoMemory = async (prompt: string) => {
    // Check key selection for Veo
    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
        }
    }

    const ai = getGeminiClient();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic movie scene of: ${prompt}`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${API_KEY}`);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
    return null;
};

export const generateNarration = async (text: string) => {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Narrate this scene dramatically: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
