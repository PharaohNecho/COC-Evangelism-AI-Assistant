
import { GoogleGenAI, Type } from "@google/genai";
import { HungerLevel, AIReview, UserRole } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePreachingNotes = async (notes: string): Promise<AIReview> => {
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze the following preaching/evangelism notes and provide a structured review including spiritual hunger level, a relevant Bible verse, and suggested follow-up action. Notes: ${notes}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hungerLevel: { type: Type.STRING, description: "Spiritual hunger level: Low, Medium, or High" },
          suggestedVerse: { type: Type.STRING, description: "A relevant Bible verse for the next visit." },
          suggestedNextAction: { type: Type.STRING, description: "Practical next step for follow-up." },
          summary: { type: Type.STRING, description: "A 2-sentence executive summary of the encounter." }
        },
        required: ["hungerLevel", "suggestedVerse", "suggestedNextAction", "summary"]
      },
    },
  });

  try {
    const result = JSON.parse(response.text || '{}');
    return {
      hungerLevel: (result.hungerLevel as HungerLevel) || HungerLevel.MEDIUM,
      suggestedVerse: result.suggestedVerse || "John 3:16",
      suggestedNextAction: result.suggestedNextAction || "Follow up next week with a gospel tract.",
      summary: result.summary || "Conversation completed."
    };
  } catch (error) {
    console.error("Failed to parse AI response", error);
    return {
      hungerLevel: HungerLevel.MEDIUM,
      suggestedVerse: "Psalm 23:1",
      suggestedNextAction: "Visit again and build relationship.",
      summary: "Notes were captured successfully."
    };
  }
};

export const generateInviteDraft = async (inviterName: string, role: UserRole, customNotes?: string): Promise<{ subject: string, body: string }> => {
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `Write a professional and encouraging church invitation email. 
      Inviter: ${inviterName}
      Invited as Role: ${role}
      Additional Context: ${customNotes || 'Joining our evangelism and soul-winning team.'}
      The email should explain that we use HarvestHub to track outreach and spiritual hunger.
      Return a JSON object with 'subject' and 'body' fields.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING }
        },
        required: ["subject", "body"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return {
      subject: `Invitation to join the Evangelism Team`,
      body: `Hello,\n\n${inviterName} has invited you to join our church outreach team as a ${role}. Please use the link provided in the platform to register.`
    };
  }
};
