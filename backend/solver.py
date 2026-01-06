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
Generator_Model="gemini-3-flash-preview"

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# 1. DISABLE SAFETY FILTERS 
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
    "max_output_tokens": 8192,
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

# --- UPDATED GENERATOR PROMPT ---
GENERATOR_SYSTEM_PROMPT = r"""
You are a CBSE Examination Paper Setter.
Task: Create a highly realistic CBSE-style Question Paper based on user specifications.

### CRITICAL FORMATTING RULES (Markdown + HTML):
To ensure the output renders correctly on the screen, you MUST follow these rules:

1. **HEADER STRUCTURE**:
   # Neeti Tution Classes
   ### PRE-BOARD EXAMINATION (2025-2026)
   **CLASS: {class_level}** | **SUBJECT: {subject}**
   
   **Time Allowed: 3 Hours** **Maximum Marks: 80**
   
   ***

2. **GENERAL INSTRUCTIONS**:
   **General Instructions:**
   1. This Question Paper contains 38 questions.
   2. This Question Paper is divided into 5 Sections A, B, C, D and E.
   3. **Section A:** Q. No. 1-18 are MCQs and Q. No. 19-20 are Assertion-Reason based questions of 1 mark each.
   4. **Section B:** Q. No. 21-25 are Very Short Answer (VSA) type questions, carrying 2 marks each.
   5. **Section C:** Q. No. 26-31 are Short Answer (SA) type questions, carrying 3 marks each.
   6. **Section D:** Q. No. 32-35 are Long Answer (LA) type questions, carrying 5 marks each.
   7. **Section E:** Q. No. 36-38 are Case Study based questions carrying 4 marks each.
   8. All Questions are compulsory.
   9. Draw neat figures wherever required. Take $\pi=22/7$ wherever required.
   10. Use of calculators is not allowed.

3. **SECTION HEADERS (CENTERED & BIG)**:
   - You **MUST** use HTML tags to center the section headers.
   - Insert `<br><br><br>` before every section to create large vertical spacing.
   - **EXACT FORMAT TO USE:**
     
     <br><br><br>
     <center><h2>SECTION A</h2></center>
     <center>*(Section A consists of 20 questions of 1 mark each)*</center>
     <br>

4. **QUESTION NUMBERING & SPACING**:
   - **CONTINUOUS NUMBERING:** Questions must be numbered continuously from 1 to 38 across all sections (do NOT restart at 1 for each section).
   - **FORMAT:** Do NOT use Markdown list syntax (like "1. "). Instead, use **Bold Text** for the number (like "**1.**") to prevent auto-indentation issues with HTML tags.
   - **MCQs:** Leave a blank line between the Question text and the Options.
     
     *Example MCQ:*
     **1.** Given that $HCF(306, 657) = 9$, the LCM(306, 657) is:
     
     (A) 22338
     
     (B) 22330
     
     (C) 11228
     
     (D) 33228

   - **Normal Questions:** Leave **TWO** blank lines between questions.

5. **CONTENT RULES**:
   - Ensure questions are strictly from the provided chapters: {chapter_list}.
   - Difficulty Level: {difficulty}/100.
   - Use LaTeX for math equations (e.g., $x^2 + y^2 = r^2$).
   - For **Assertion-Reason**, clearly label "Assertion (A):" and "Reason (R):" on separate lines.
   - For **Case Study (Section E)**, provide a short paragraph/context before the sub-questions.

6. **ADAPTABILITY**:
   If the user selected "Chapterwise" or a specific difficulty, adjust the syllabus coverage accordingly but **KEEP the standard CBSE formatting** (Sections, Options, Spacing) intact.
"""

def get_latex_solution(image_inputs):
    """
    Solves the paper PAGE BY PAGE to avoid cutting off the output.
    """
    full_solution_text = ""
    
    model = genai.GenerativeModel(
        model_name=Evaluation_Model, 
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
                img = item 

            print(f"Solving Page {i+1}...")
            
            # Request solution for JUST this page
            response = model.generate_content([
                f"Solve all questions present on Page {i+1} of this exam paper.", 
                img
            ])
            
            page_content = response.text if response.text else "*[No text generated for this page]*"
            
            full_solution_text += f"\n\n## --- Page {i+1} Solution ---\n\n"
            full_solution_text += page_content
            
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
    match = re.search(r"(?:Total\s*)?Score\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match: return match.group(1).replace(" ", "")
    
    match = re.search(r"Marks\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match: return match.group(1).replace(" ", "")

    matches = re.findall(r"\b(\d+\s*\/\s*\d+)\b", text)
    if matches: return matches[-1].replace(" ", "")

    return "N/A"

def generate_cbse_paper(class_level, subject, chapters, difficulty):
    """Generates a text-based question paper."""
    
    chapter_list_str = ", ".join(chapters) if chapters else "Full Syllabus"
    
    prompt = f"""
    Create a {class_level} Question Paper for the subject: {subject}.
    
    Included Chapters: {chapter_list_str}
    
    Difficulty Level: {difficulty} (where 0 is very easy, 100 is Olympiad level).
    
    Please ensure the distribution of marks totals 80 if possible, or scale it down for a chapter test.
    STRICTLY follow the Sections A, B, C, D, E format defined in the system instruction.
    """
    
    # Format the system prompt with variables
    sys_prompt = GENERATOR_SYSTEM_PROMPT.format(
        class_level=class_level, 
        subject=subject, 
        difficulty=difficulty,
        chapter_list=chapter_list_str
    )
    
    model = genai.GenerativeModel(
        model_name=Generator_Model,
        system_instruction=sys_prompt,
        generation_config=generation_config,
        safety_settings=safety_settings
    )
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Generation Error: {e}")
        return f"Error generating paper: {str(e)}"