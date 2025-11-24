import { GoogleGenAI } from "@google/genai";
import { blobToBase64 } from "./storage";

// Helper to get AI instance safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API_KEY found. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCapsuleHint = async (mediaBlob: Blob, mediaType: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "A mysterious memory from the past...";

  try {
    const base64Data = await blobToBase64(mediaBlob);
    
    // Determine mime type broadly
    let mimeType = 'image/jpeg';
    if (mediaType === 'image') mimeType = mediaBlob.type || 'image/jpeg';
    
    // Note: 2.5 flash supports video tokens, but for simplicity in this frontend demo, we'll focus on Image analysis.
    // If video, we will prompt based on text description or return a default if no image frames.

    if (mediaType === 'image') {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        text: "Analyze this image and write a short, mysterious, one-sentence cryptic hint about what is inside this time capsule. Do not reveal exactly what it is, just give a poetic clue. Example: 'A frozen moment of laughter under the sun.'"
                    }
                ]
            }
        });
        return response.text || "A locked visual memory.";
    } 
    
    // Fallback for text/video/audio without heavy upload
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Write a short, mysterious, one-sentence cryptic hint about a time capsule containing a secret video, audio recording, or message. It should be poetic and evoke curiosity.",
    });
    return response.text || "A voice echoing from yesterday.";

  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "A securely sealed memory.";
  }
};

export const generateFutureReflection = async (userNote: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "";

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `The user is creating a time capsule with the following note: "${userNote}". 
        Write a short, inspiring question or reflection for the user to read when they open this in the future. 
        It should make them think about how they've changed since they wrote the note.`
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Reflection Error:", error);
    return "";
  }
};

export const refineUserNote = async (currentNote: string): Promise<string> => {
    const ai = getAI();
    if (!ai) return currentNote;
  
    try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Rewrite the following time capsule note to be more emotional, timeless, and impactful for a future self, but keep the core meaning: "${currentNote}"`
      });
      return response.text || currentNote;
    } catch (error) {
      return currentNote;
    }
  };