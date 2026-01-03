import os
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import io
import re

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

generation_config = {
    "temperature": 0.2,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

SOLVER_SYSTEM_PROMPT = r"""
You are a precise academic assistant.
Input: An image of a math question paper.
Task: Solve the questions and extract the marks allocated to each.
Output Format: Markdown with LaTeX math.

CRITICAL INSTRUCTIONS:
1. Do NOT provide lengthy explanations or conversational filler.
2. For each question, provide ONLY the **Key Steps** required to reach the solution.
3. Box the final answer using \boxed{}.
4. Structure:
   **Q1 ([Marks] Marks):** * Step 1: ...
   * Final Answer: $$ \boxed{...} $$
"""

EVALUATOR_SYSTEM_PROMPT = r"""
You are an expert grader.
Inputs:
1. A "Reference Solution" (text) which contains the correct answers.
2. A "Student Submission" (image).

Task:
1. Map the student's answers to the questions in the Reference Solution.
2. Grade each answer based on correctness.
3. Calculate the Total Score.

Output Format (Markdown):
## Student Evaluation Report

| Question | Status | Marks Awarded | Max Marks | Feedback |
| :--- | :--- | :--- | :--- | :--- |
| Q1 | Correct/Partial/Incorrect | X | Y | ... |

**Total Score:** X / Y
**Overall Grade:** (Grade)
**Examiner Note:** Summary...
"""

def get_latex_solution(image_file):
    image_file.seek(0)
    image_bytes = image_file.read()
    image = Image.open(io.BytesIO(image_bytes))

    model = genai.GenerativeModel(
        model_name="gemini-3-flash-preview",
        system_instruction=SOLVER_SYSTEM_PROMPT,
        generation_config=generation_config,
    )

    response = model.generate_content([
        "Solve this question paper completely.", 
        image
    ])
    
    return response.text

def evaluate_student_solution(student_image_file, reference_solution_text):
    student_image_file.seek(0)
    image_bytes = student_image_file.read()
    image = Image.open(io.BytesIO(image_bytes))

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash-preview-09-2025",
        system_instruction=EVALUATOR_SYSTEM_PROMPT,
        generation_config=generation_config,
    )

    response = model.generate_content([
        f"Reference Solution:\n{reference_solution_text}\n\nEvaluate the student submission.", 
        image
    ])
    return response.text

def extract_score(text):
    """Robust extraction of score X/Y"""
    # 1. Try finding "Total Score: 15 / 20" or "Score: 15/20"
    match = re.search(r"(?:Total\s*)?Score\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match:
        return match.group(1).replace(" ", "")
    
    # 2. Try finding "Marks: 15/20"
    match = re.search(r"Marks\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match:
        return match.group(1).replace(" ", "")

    # 3. Fallback: Find any pattern looking like "15/20" near the end of text
    # This looks for digits, slash, digits at the start of a line or after space
    matches = re.findall(r"\b(\d+\s*\/\s*\d+)\b", text)
    if matches:
        # Usually the last mention of a score format is the total
        return matches[-1].replace(" ", "")

    return "N/A"