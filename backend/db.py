import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def upload_to_supabase(file_path, bucket_name, destination_path):
    """Uploads a file from local disk to Supabase Storage"""
    with open(file_path, 'rb') as f:
        response = supabase.storage.from_(bucket_name).upload(
            file=f,
            path=destination_path,
            file_options={"content-type": "application/pdf"}
        )
    # Get the public URL
    project_url = os.getenv("SUPABASE_URL")
    return f"{project_url}/storage/v1/object/public/{bucket_name}/{destination_path}"

def upload_bytes_to_supabase(file_bytes, bucket_name, destination_path, content_type):
    """Uploads in-memory bytes (like the image user just uploaded)"""
    supabase.storage.from_(bucket_name).upload(
        file=file_bytes,
        path=destination_path,
        file_options={"content-type": content_type}
    )
    project_url = os.getenv("SUPABASE_URL")
    return f"{project_url}/storage/v1/object/public/{bucket_name}/{destination_path}"

def save_record(name, original_url, solution_url):
    """Saves the links to the database"""
    data, count = supabase.table('solutions').insert({
        "name": name,
        "original_url": original_url,
        "solution_url": solution_url
    }).execute()
    return data