
import { GoogleGenAI, Type } from "@google/genai";
import { HungerLevel, AIReview, UserRole, Prospect } from "../types";

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

export const getSoulWinningStrategy = async (stats: { total: number, baptism: number, highHunger: number }): Promise<string> => {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Based on the current church evangelism stats, provide a short, 3-point tactical "Harvest Strategy" for the week.
    Stats: ${stats.total} total prospects, ${stats.baptism} people signified for baptism, ${stats.highHunger} people with high spiritual hunger.
    Include a relevant scripture for the team's encouragement. Keep it under 150 words. Focus on how to transition people from interest to membership.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text || "Continue in faithful prayer and visitation. The Lord of the harvest will provide the increase.";
};

export const generateFollowUpMessage = async (prospect: Prospect, preacherName: string): Promise<string> => {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Write a gentle, personalized follow-up text message or short email for a church prospect.
    Prospect Name: ${prospect.name}
    Spiritual Hunger: ${prospect.aiReview?.hungerLevel || 'Unknown'}
    Original Notes: ${prospect.preachingNotes}
    Preacher Name: ${preacherName}
    Include the suggested Bible verse: ${prospect.aiReview?.suggestedVerse || 'John 3:16'}
    The tone should be encouraging, non-pressuring, and warm. 
    If the hunger is 'High', make it more inviting for a personal Bible study.
    Keep it concise (max 100 words).`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text || "Hello! It was great speaking with you recently. I've been thinking about our conversation and wanted to share a verse with you: John 3:16. God bless!";
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
