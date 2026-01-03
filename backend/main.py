from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import io
from solver import get_latex_solution, evaluate_student_solution, extract_score
from db import (
    upload_bytes_to_supabase, save_record, get_records, 
    save_student_submission, get_student_submissions,
    delete_paper_record, delete_student_record 
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.post("/solve")
async def solve_paper(file: UploadFile = File(...), name: str = Form(...)):
    print(f"Solving Paper: {name}")
    job_id = str(uuid.uuid4())
    file_bytes = await file.read()
    
    try:
        original_url = upload_bytes_to_supabase(
            file_bytes, "papers", f"originals/{job_id}_{file.filename}", file.content_type
        )
    except Exception:
        original_url = ""

    solution_text = get_latex_solution(io.BytesIO(file_bytes))
    
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