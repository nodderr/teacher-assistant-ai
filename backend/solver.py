import os
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import io
import re
import time

load_dotenv()

Solver_Model="gemini-3-flash-preview"
Evaluation_Model="gemini-2.5-flash-preview"

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# 1. DISABLE SAFETY FILTERS 
# (Academic content often gets falsely flagged as "Dangerous" or "Harassment", blocking the output)
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

generation_config = {
    "temperature": 0.2,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192, # This limit applies PER PAGE now, which is plenty
    "response_mime_type": "text/plain",
}

SOLVER_SYSTEM_PROMPT = r"""
You are a precise academic assistant.
Task: Solve the questions visible in the image and extract the marks.
Output Format: Markdown with LaTeX math.

CRITICAL INSTRUCTIONS:
1. Solve **EVERY** question visible on this page. Do not skip any.
2. Provide ONLY the **Key Steps** and the final answer.
3. Box the final answer using \boxed{}.
4. Format:
   **Q1 ([Marks] Marks):** * Step 1: ...
   * Final Answer: $$ \boxed{...} $$
"""

EVALUATOR_SYSTEM_PROMPT = r"""
You are an expert grader.
Inputs:
1. A "Reference Solution" (text).
2. A "Student Submission" (image).

Task:
1. Map the student's answers to the Reference Solution.
2. Grade based on correctness.

Output Format (Markdown):
## Student Evaluation Report
| Question | Status | Marks Awarded | Max Marks | Feedback |
| :--- | :--- | :--- | :--- | :--- |
| Q1 | Correct/Partial/Incorrect | X | Y | ... |

**Total Score:** X / Y
"""

def get_latex_solution(image_inputs):
    """
    Solves the paper PAGE BY PAGE to avoid cutting off the output.
    """
    full_solution_text = ""
    
    model = genai.GenerativeModel(
        model_name=Evaluation_Model, # 'flash' is faster and has a large context window
        system_instruction=SOLVER_SYSTEM_PROMPT,
        generation_config=generation_config,
        safety_settings=safety_settings
    )

    print(f"Processing {len(image_inputs)} pages...")

    for i, item in enumerate(image_inputs):
        try:
            # Prepare the single image for this iteration
            img = None
            if isinstance(item, io.BytesIO):
                item.seek(0)
                img = Image.open(item)
            else:
                img = item # It's already a PIL Image (from PDF conversion)

            print(f"Solving Page {i+1}...")
            
            # Request solution for JUST this page
            response = model.generate_content([
                f"Solve all questions present on Page {i+1} of this exam paper.", 
                img
            ])
            
            # Append to the master document
            page_content = response.text if response.text else "*[No text generated for this page]*"
            
            full_solution_text += f"\n\n## --- Page {i+1} Solution ---\n\n"
            full_solution_text += page_content
            
            # Small buffer to be nice to the API
            time.sleep(1)

        except Exception as e:
            print(f"Error on Page {i+1}: {e}")
            full_solution_text += f"\n\n## --- Page {i+1} Error ---\n"
            full_solution_text += f"Could not solve this page. Error: {str(e)}\n"

    return full_solution_text

def evaluate_student_solution(student_image_file, reference_solution_text):
    student_image_file.seek(0)
    image_bytes = student_image_file.read()
    image = Image.open(io.BytesIO(image_bytes))

    model = genai.GenerativeModel(
        model_name=Solver_Model,
        system_instruction=EVALUATOR_SYSTEM_PROMPT,
        generation_config=generation_config,
        safety_settings=safety_settings
    )

    try:
        response = model.generate_content([
            f"Reference Solution:\n{reference_solution_text}\n\nEvaluate the student submission.", 
            image
        ])
        return response.text
    except Exception as e:
        print(f"Evaluation Error: {e}")
        return "Error: Could not generate evaluation report."

def extract_score(text):
    """Robust extraction of score X/Y"""
    # 1. Look for 'Total Score: X/Y'
    match = re.search(r"(?:Total\s*)?Score\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match: return match.group(1).replace(" ", "")
    
    # 2. Look for 'Marks: X/Y'
    match = re.search(r"Marks\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match: return match.group(1).replace(" ", "")

    # 3. Fallback: Find the last occurrence of 'number/number'
    matches = re.findall(r"\b(\d+\s*\/\s*\d+)\b", text)
    if matches: return matches[-1].replace(" ", "")

    return "N/A"