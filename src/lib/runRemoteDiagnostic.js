import { base44 } from "@/api/base44Client";

export async function runRemoteDiagnostic(pin, connectionLogs) {
  try {
    // We use the exact same InvokeLLM method you used for RAYMA Insights
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are RAYMA's automated backend diagnostic system. The user provided support PIN: ${pin}. 
      Analyze the following connection logs and identify the primary sync error. 
      
      CONNECTION LOGS:
      ${JSON.stringify(connectionLogs, null, 2)}
      
      Return a JSON object identifying the issue. 
      - userMessage must be a 1-2 sentence, non-technical explanation of the problem, ending with a question asking if they want to fix it.
      - actionCode must be a strict uppercase string that our UI can use to trigger a fix.`,
      
      response_json_schema: {
        type: "object",
        properties: {
          issueFound: { type: "boolean" },
          userMessage: { type: "string" },
          actionCode: { type: "string" }
        },
        required: ["issueFound", "userMessage", "actionCode"]
      }
    });

    return result; // This will return the exact JSON object we requested
    
  } catch (error) {
    console.error("Diagnostic scan failed:", error);
    // Safe fallback if the AI fails or the network drops
    return {
      issueFound: true,
      userMessage: "I had trouble completing the diagnostic scan. Would you like me to connect you with a human support technician instead?",
      actionCode: "ESCALATE_TO_HUMAN"
    };
  }
}
