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

# --- BOARD SPECIFIC PROMPTS ---

# FIXED: Doubled curly braces {{ }} for LaTeX examples so .format() ignores them
LATEX_RULES = r"""
CRITICAL LATEX RULES:
1. **SQUARE ROOTS:** NEVER enclose the entire equation inside `\sqrt{{}}`. 
   - **WRONG:** `\sqrt{{x^2 + 5 = 9}}` (Root extends over equals sign)
   - **CORRECT:** `\sqrt{{x^2 + 5}} = 9` (Root only over the term)
2. **FRACTIONS:** Ensure fractions are closed properly. `\frac{{a}}{{b}}`.
"""

PROMPT_CBSE = r"""
You are a CBSE Examination Paper Setter.
FORMATTING RULES (Markdown + HTML):

1. **HEADER (Use Markdown headers inside center tags):**
   <center>
   <h1>Neeti Tution Classes</h1>
   <h3>PRE-BOARD EXAMINATION (2025-2026)</h3>
   <b>CLASS: {class_level}</b> | <b>SUBJECT: {subject}</b> | <b>BOARD: CBSE</b>
   </center>
   <br>
   <div style="display: flex; justify-content: space-between;">
   <b>Time Allowed: 3 Hours</b>
   <b>Maximum Marks: 80</b>
   </div>
   <hr>

2. **GENERAL INSTRUCTIONS:**
   **General Instructions:**
   1. This Question Paper contains 38 questions.
   2. This Question Paper is divided into 5 Sections A, B, C, D and E.
   3. **Section A:** MCQs (1 mark each).
   4. **Section B:** VSA (2 marks each).
   5. **Section C:** SA (3 marks each).
   6. **Section D:** LA (5 marks each).
   7. **Section E:** Case Study (4 marks each).
   8. Use $\pi=22/7$ wherever required.

3. **SECTION HEADERS (Use HTML centering):**
   <br><br><br>
   <center><h2>SECTION A</h2></center>
   <center>*(Section A consists of 20 questions of 1 mark each)*</center>
   <br>

4. **QUESTION FORMATTING:** - **Numbering:** Use bold numbers like **1.**, **2.** (Continuous 1 to 38).
   - **Spacing:** Leave TWO blank lines between questions.
""" + LATEX_RULES

PROMPT_ICSE = r"""
You are an ICSE Examination Paper Setter.
FORMATTING RULES (Markdown + HTML):

1. **HEADER (Use Markdown headers inside center tags):**
   <center>
   <h1>Neeti Tution Classes</h1>
   <h3>ICSE MOCK EXAMINATION (2025-2026)</h3>
   <b>CLASS: {class_level}</b> | <b>SUBJECT: {subject}</b> | <b>BOARD: ICSE</b>
   </center>
   <br>
   <div style="display: flex; justify-content: space-between;">
   <b>Time Allowed: 2 Hours</b>
   <b>Maximum Marks: 80</b>
   </div>
   <hr>

2. **GENERAL INSTRUCTIONS:**
   **General Instructions:**
   1. Answers to this Paper must be written on the paper provided separately.
   2. You will not be allowed to write during the first 15 minutes.
   3. This paper consists of two sections: Section A and Section B.
   4. **Section A** (Compulsory) consists of short answer questions.
   5. **Section B** consists of long answer questions. Answer any FOUR questions.

3. **SECTION HEADERS (Use HTML centering):**
   <br><br><br>
   <center><h2>SECTION A (40 Marks)</h2></center>
   <center>*(Attempt all questions from this Section)*</center>
   <br>

4. **QUESTION FORMATTING:**
   - **Numbering:** Use **Q1.**, **Q2.** style headers. 
   - **Sub-parts:** Use (i), (ii), (iii).
""" + LATEX_RULES

PROMPT_IB = r"""
You are an IB DP (International Baccalaureate) Paper Setter.
FORMATTING RULES (Markdown + HTML):

1. **HEADER (Use Markdown headers inside center tags):**
   <center>
   <h1>Neeti Tution Classes</h1>
   <h3>IB DIPLOMA PROGRAMME MOCK</h3>
   <b>CLASS: {class_level}</b> | <b>SUBJECT: {subject}</b> | <b>LEVEL: HL/SL</b>
   </center>
   <br>
   <div style="display: flex; justify-content: space-between;">
   <b>Time Allowed: 2 Hours</b>
   <b>Maximum Marks: 80</b>
   </div>
   <hr>

2. **GENERAL INSTRUCTIONS:**
   **Instructions to Candidates:**
   1. Do not open this examination paper until instructed to do so.
   2. Answer all questions.
   3. Unless otherwise stated in the question, all numerical answers should be given exactly or to three significant figures.

3. **SECTION HEADERS:**
   <br><br><br>
   <center><h2>SECTION A</h2></center>
   <br>

4. **QUESTION FORMATTING:**
   - Number questions 1, 2, 3... 
   - Marks should be indicated in brackets at the end of the line, e.g. **[4 marks]**.
""" + LATEX_RULES

def get_latex_solution(image_inputs):
    """Solves the paper PAGE BY PAGE."""
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
            img = None
            if isinstance(item, io.BytesIO):
                item.seek(0)
                img = Image.open(item)
            else:
                img = item 
            print(f"Solving Page {i+1}...")
            response = model.generate_content([
                f"Solve all questions present on Page {i+1} of this exam paper.", 
                img
            ])
            page_content = response.text if response.text else "*[No text generated for this page]*"
            full_solution_text += f"\n\n## --- Page {i+1} Solution ---\n\n{page_content}"
            time.sleep(1)
        except Exception as e:
            print(f"Error on Page {i+1}: {e}")
            full_solution_text += f"\n\n## --- Page {i+1} Error ---\nCould not solve this page. Error: {str(e)}\n"
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
    match = re.search(r"(?:Total\s*)?Score\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match: return match.group(1).replace(" ", "")
    match = re.search(r"Marks\s*[:\-]?\s*(\d+\s*[\/\\]\s*\d+)", text, re.IGNORECASE)
    if match: return match.group(1).replace(" ", "")
    matches = re.findall(r"\b(\d+\s*\/\s*\d+)\b", text)
    if matches: return matches[-1].replace(" ", "")
    return "N/A"

def generate_paper(class_level, subject, chapters, difficulty, board):
    """Generates a text-based question paper with Board-Specific Formatting."""
    
    chapter_list_str = ", ".join(chapters) if chapters else "Full Syllabus"
    
    # Select the correct prompt based on the board
    if board == "ICSE":
        base_prompt = PROMPT_ICSE
    elif board == "IB":
        base_prompt = PROMPT_IB
    else:
        base_prompt = PROMPT_CBSE  # Default to CBSE
    
    # Format the system prompt
    # Now safe to format because LaTeX braces are escaped as {{ }}
    sys_prompt = base_prompt.format(
        class_level=class_level, 
        subject=subject
    )
    
    user_prompt = f"""
    Create a {board} Question Paper for {subject}.
    Included Chapters: {chapter_list_str}
    Difficulty Level: {difficulty}/100.
    
    STRICTLY follow the {board} formatting rules defined in the system instructions.
    Ensure questions are relevant to the selected chapters.
    """
    
    model = genai.GenerativeModel(
        model_name=Generator_Model,
        system_instruction=sys_prompt,
        generation_config=generation_config,
        safety_settings=safety_settings
    )
    
    try:
        response = model.generate_content(user_prompt)
        return response.text
    except Exception as e:
        print(f"Generation Error: {e}")
        return f"Error generating paper: {str(e)}"