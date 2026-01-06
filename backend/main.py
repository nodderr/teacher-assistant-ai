from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import uuid
import io
from typing import List, Optional
import pypdfium2 as pdfium 
from solver import (
    get_latex_solution, evaluate_student_solution, extract_score, 
    generate_cbse_paper # Imported new function
)
from db import (
    upload_bytes_to_supabase, save_record, get_records, 
    save_student_submission, get_student_submissions,
    delete_paper_record, delete_student_record,
    update_paper_solution, update_student_submission,
    save_generated_paper_record # Imported new function
)
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- Pydantic Models ---
class SolutionUpdate(BaseModel):
    text: str

class GradeUpdate(BaseModel):
    score: str
    report: str

class GenerateRequest(BaseModel):
    class_level: str
    subject: str
    paper_type: str # 'complete' or 'chapterwise'
    chapters: List[str]
    difficulty: int

@app.post("/solve")
async def solve_paper(files: List[UploadFile] = File(...), name: str = Form(...)):
    print(f"Solving Paper: {name} with {len(files)} file(s)")
    job_id = str(uuid.uuid4())
    
    processed_images = []
    original_url = "" 
    
    for i, file in enumerate(files):
        try:
            file_bytes = await file.read()
            
            # Upload original file to Supabase
            url = upload_bytes_to_supabase(
                file_bytes, "papers", f"originals/{job_id}_{i}_{file.filename}", file.content_type
            )
            if i == 0: original_url = url

            if file.content_type == "application/pdf":
                try:
                    pdf = pdfium.PdfDocument(file_bytes)
                    for page in pdf:
                        bitmap = page.render(scale=2) 
                        pil_image = bitmap.to_pil()
                        processed_images.append(pil_image)
                except Exception as e:
                    print(f"Error converting PDF {file.filename}: {e}")
            else:
                processed_images.append(io.BytesIO(file_bytes))
                
        except Exception as e:
            print(f"Error processing file {file.filename}: {e}")

    if not processed_images:
        raise HTTPException(status_code=400, detail="No valid images or PDFs processed.")

    solution_text = get_latex_solution(processed_images)
    
    try:
        solution_url = upload_bytes_to_supabase(
            solution_text.encode('utf-8'), "papers", f"solutions/{job_id}.md", "text/markdown"
        )
    except Exception:
        solution_url = ""

    paper_id = save_record(name, original_url, solution_url)

    return {
        "status": "success",
        "paper_id": paper_id,
        "original_url": original_url,
        "solution_url": solution_url,
        "solution_text": solution_text 
    }

@app.post("/generate-paper")
async def generate_paper_route(req: GenerateRequest):
    print(f"Generating {req.subject} paper for {req.class_level}")
    
    try:
        # Generate content
        paper_text = generate_cbse_paper(
            req.class_level, req.subject, req.chapters, req.difficulty
        )
        
        # Save to DB
        paper_name = f"{req.subject} {req.paper_type.capitalize()} Paper ({req.class_level})"
        paper_id, file_url = save_generated_paper_record(paper_name, paper_text)
        
        return {
            "status": "success",
            "paper_id": paper_id,
            "text": paper_text,
            "url": file_url
        }
    except Exception as e:
        print(f"Generation Route Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/paper/{paper_id}/solution")
async def update_solution_route(paper_id: str, update: SolutionUpdate):
    try:
        success = update_paper_solution(paper_id, update.text)
        if not success:
             raise HTTPException(status_code=404, detail="Paper not found")
        return {"status": "success"}
    except Exception as e:
        print(f"Update Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update solution")

@app.get("/history")
async def get_history_route():
    return get_records()

@app.delete("/history/{paper_id}")
async def delete_paper_route(paper_id: str):
    try:
        delete_paper_record(paper_id)
        return {"status": "success"}
    except Exception as e:
        print(f"Delete Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete paper")

@app.post("/evaluate")
async def evaluate_paper(
    paper_id: str = Form(...), 
    student_file: UploadFile = File(...),
    student_name: str = Form(...),
    reference_solution: str = Form(...)
):
    print(f"Evaluating {student_name}")
    job_id = str(uuid.uuid4())
    
    file_bytes = await student_file.read()
    try:
        submission_url = upload_bytes_to_supabase(
            file_bytes, "papers", f"students/{job_id}_{student_file.filename}", student_file.content_type
        )
    except Exception:
        submission_url = ""

    report_text = evaluate_student_solution(io.BytesIO(file_bytes), reference_solution)
    score = extract_score(report_text)

    try:
        report_url = upload_bytes_to_supabase(
            report_text.encode('utf-8'), "papers", f"evaluations/{job_id}.md", "text/markdown"
        )
    except Exception:
        report_url = ""

    save_student_submission(paper_id, student_name, score, submission_url, report_url)
    
    return {
        "student_name": student_name,
        "score": score,
        "evaluation_report": report_text
    }

@app.put("/student/{student_id}")
async def update_student_grade_route(student_id: str, update: GradeUpdate):
    try:
        update_student_submission(student_id, update.score, update.report)
        return {"status": "success"}
    except Exception as e:
        print(f"Grade Update Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update grade")

@app.get("/paper/{paper_id}/students")
async def get_paper_students(paper_id: str):
    return get_student_submissions(paper_id)

@app.delete("/student/{student_id}")
async def delete_student_route(student_id: str):
    try:
        delete_student_record(student_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete student submission")