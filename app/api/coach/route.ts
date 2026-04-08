import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are an HOA hearing coach. The homeowner is currently in an HOA hearing. Based on what was just said in the hearing and the homeowner's dispute context, tell them exactly what to say next. Be specific, calm, and legally sound. Keep responses under 3 sentences. Start with "Say:" followed by the suggested response.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript, context } = body as {
      transcript: string;
      context: string;
    };

    if (!transcript || transcript.trim().length === 0) {
      return Response.json({ error: "Transcript is required" }, { status: 400 });
    }

    const userMessage = `HOMEOWNER'S DISPUTE CONTEXT:\n${context || "No additional context provided."}\n\nWHAT WAS JUST SAID IN THE HEARING:\n${transcript}\n\nWhat should the homeowner say next?`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContentStream(userMessage);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            controller.enqueue(encoder.encode(chunk.text()));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Coach API error:", error);
    return Response.json({ error: "Failed to get coaching suggestion" }, { status: 500 });
  }
}
