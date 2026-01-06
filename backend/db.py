import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def upload_bytes_to_supabase(file_bytes, bucket_name, destination_path, content_type):
    """Uploads in-memory bytes"""
    supabase.storage.from_(bucket_name).upload(
        file=file_bytes,
        path=destination_path,
        file_options={"content-type": content_type, "upsert": "true"}
    )
    project_url = os.getenv("SUPABASE_URL")
    return f"{project_url}/storage/v1/object/public/{bucket_name}/{destination_path}"

# --- SOLVED PAPERS (HISTORY) ---
def save_record(name, original_url, solution_url):
    response = supabase.table('solutions').insert({
        "name": name,
        "original_url": original_url,
        "solution_url": solution_url,
        "created_at": datetime.now().isoformat()
    }).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]['id']
    return None

def update_paper_solution(paper_id, new_solution_text):
    data = supabase.table('solutions').select("solution_url").eq('id', paper_id).execute()
    if not data.data: return False
    
    url = data.data[0]['solution_url']
    if url and "solutions/" in url:
        path = "solutions/" + url.split("solutions/")[-1]
        supabase.storage.from_("papers").upload(
            file=new_solution_text.encode('utf-8'),
            path=path,
            file_options={"content-type": "text/markdown", "upsert": "true"}
        )
        return True
    return False

def get_records():
    response = supabase.table('solutions').select("*").order("created_at", desc=True).execute()
    return response.data

# --- GENERATED PAPERS (UPDATED) ---
def save_generated_paper(name, class_level, subject, board, file_url):
    """Saves a record to the generated_papers table including the board"""
    response = supabase.table('generated_papers').insert({
        "name": name,
        "class_level": class_level,
        "subject": subject,
        "board": board,
        "file_url": file_url,
        "created_at": datetime.now().isoformat()
    }).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]['id']
    return None

def get_generated_papers():
    response = supabase.table('generated_papers').select("*").order("created_at", desc=True).execute()
    return response.data

def delete_generated_paper(paper_id):
    # 1. Get file URL to delete from storage
    data = supabase.table('generated_papers').select("file_url").eq('id', paper_id).execute()
    if data.data:
        delete_from_storage(data.data[0]['file_url'])
    
    # 2. Delete record
    supabase.table('generated_papers').delete().eq('id', paper_id).execute()

# --- STUDENT SUBMISSIONS ---
def save_student_submission(paper_id, student_name, score, submission_url, report_url):
    response = supabase.table('student_submissions').insert({
        "paper_id": paper_id,
        "student_name": student_name,
        "score": score,
        "submission_url": submission_url,
        "report_url": report_url,
        "created_at": datetime.now().isoformat()
    }).execute()
    return response.data

def update_student_submission(student_id, new_score, new_report_text):
    supabase.table('student_submissions').update({"score": new_score}).eq('id', student_id).execute()
    
    data = supabase.table('student_submissions').select("report_url").eq('id', student_id).execute()
    if data.data and data.data[0]['report_url']:
        url = data.data[0]['report_url']
        if "evaluations/" in url:
            path = "evaluations/" + url.split("evaluations/")[-1]
            supabase.storage.from_("papers").upload(
                file=new_report_text.encode('utf-8'),
                path=path,
                file_options={"content-type": "text/markdown", "upsert": "true"}
            )
    return True

def get_student_submissions(paper_id):
    response = supabase.table('student_submissions')\
        .select("*")\
        .eq('paper_id', paper_id)\
        .order('created_at', desc=True)\
        .execute()
    return response.data

# --- UTILS ---
def delete_from_storage(file_url):
    if not file_url: return
    try:
        bucket_name = "papers"
        if f"/{bucket_name}/" in file_url:
            path = file_url.split(f"/{bucket_name}/")[-1]
            supabase.storage.from_(bucket_name).remove([path])
    except Exception as e:
        print(f"Error deleting file {file_url}: {e}")

def delete_paper_record(paper_id):
    data = supabase.table('solutions').select("*").eq('id', paper_id).execute()
    if not data.data: return

    paper = data.data[0]
    
    students = supabase.table('student_submissions').select("*").eq('paper_id', paper_id).execute()
    for student in students.data:
        delete_from_storage(student.get('submission_url'))
        delete_from_storage(student.get('report_url'))
    
    supabase.table('student_submissions').delete().eq('paper_id', paper_id).execute()

    delete_from_storage(paper.get('original_url'))
    delete_from_storage(paper.get('solution_url'))

    supabase.table('solutions').delete().eq('id', paper_id).execute()

def delete_student_record(student_id):
    data = supabase.table('student_submissions').select("*").eq('id', student_id).execute()
    if not data.data: return
    
    student = data.data[0]
    delete_from_storage(student.get('submission_url'))
    delete_from_storage(student.get('report_url'))
    
    supabase.table('student_submissions').delete().eq('id', student_id).execute()