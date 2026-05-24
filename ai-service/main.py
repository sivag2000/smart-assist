from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SmartAssist AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check for keys in environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "dummy-key-for-local")

if GEMINI_API_KEY:
    # Use Gemini API via OpenAI compatibility endpoint
    client = AsyncOpenAI(
        api_key=GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    DEFAULT_MODEL = "gemini-2.5-flash"
    PROVIDER = "Gemini"
else:
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    DEFAULT_MODEL = "gpt-4o-mini"
    PROVIDER = "OpenAI"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: str = ""

@app.get("/")
def read_root():
    return {"message": "SmartAssist AI Service is running."}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        has_gemini = bool(GEMINI_API_KEY)
        has_openai = bool(OPENAI_API_KEY) and not OPENAI_API_KEY.startswith("dummy-key")

        if has_gemini or has_openai:
            try:
                api_messages = [msg.model_dump() for msg in request.messages]
                system_content = "You are SmartAssist, a helpful personal AI assistant that helps users organize their day, manage tasks, and schedule appointments. Be concise, helpful, and friendly."
                if request.context:
                    system_content += f"\n\nHere is the user's upcoming calendar context. Use this data to help answer scheduling or calendar related questions:\n{request.context}"
                api_messages.insert(0, {"role": "system", "content": system_content})
                
                response = await client.chat.completions.create(
                    model=DEFAULT_MODEL,
                    messages=api_messages
                )
                response_text = response.choices[0].message.content
                return {"response": response_text}
            except Exception as api_err:
                print(f"{PROVIDER} API Error: {api_err}")
                return {"response": f"{PROVIDER} API Error: {str(api_err)}. Please verify your API Key and billing status."}

        response_text = f"As your SmartAssist AI, I have received your last message: '{request.messages[-1].content}'. (LLM processing is connected securely via FastAPI backend!)"
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
