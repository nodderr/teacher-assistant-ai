import os
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import io

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

generation_config = {
    "temperature": 0.2,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

# UPDATED PROMPT FOR KATEX
SYSTEM_PROMPT = r"""
You are a precise academic assistant.
Input: An image of a math question paper.
Task: Solve the questions.
Output Format: Markdown with LaTeX math.

CRITICAL INSTRUCTIONS:
1. Do NOT provide lengthy explanations or conversational filler.
2. For each question, provide ONLY the **Key Steps** required to reach the solution.
3. Box the final answer using \boxed{}.
4. Structure:
   **Q1:** [Question Summary if needed]
   * Step 1: ...
   * Step 2: ...
   * Final Answer: $$ \boxed{...} $$

5. Keep it concise. No "Here is the solution" or "Let's analyze this". Just the math.
"""

def get_latex_solution(image_file):
    # Reset file cursor if needed
    image_file.seek(0)
    image_bytes = image_file.read()
    image = Image.open(io.BytesIO(image_bytes))

    model = genai.GenerativeModel(
        model_name="gemini-3-flash-preview",
        system_instruction=SYSTEM_PROMPT,
        generation_config=generation_config,
    )

    response = model.generate_content([
        "Solve this question paper completely.", 
        image
    ])
    
    return response.text