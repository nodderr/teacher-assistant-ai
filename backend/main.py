from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uuid
import io
from solver import get_latex_solution
from db import upload_bytes_to_supabase, save_record

app = FastAPI()

# --- CORS MIDDLEWARE (MUST BE HERE) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------

@app.post("/solve")
async def solve_paper(file: UploadFile = File(...)):
    print(f"1. Received file: {file.filename}")
    job_id = str(uuid.uuid4())
    
    # Read file bytes
    file_bytes = await file.read()
    
    # Upload Original Image
    print("2. Uploading original image...")
    # (Optional: handle upload errors gracefully if needed)
    try:
        original_path = f"originals/{job_id}_{file.filename}"
        original_url = upload_bytes_to_supabase(
            file_bytes, "papers", original_path, file.content_type
        )
    except Exception as e:
        print(f"Upload failed: {e}")
        original_url = ""

    # Solve
    print("3. AI is thinking...")
    image_stream = io.BytesIO(file_bytes)
    solution_text = get_latex_solution(image_stream)
    
    print("4. Sending response...")
    return {
        "status": "success",
        "original_url": original_url,
        "solution_text": solution_text 
    }