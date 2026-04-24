from fastapi import FastAPI, File, UploadFile
import easyocr

app = FastAPI()

# Initialize the EasyOCR reader (this runs once on startup and loads the AI into RAM)
# It will automatically detect if you have a GPU and use it, otherwise falls back to CPU.
reader = easyocr.Reader(['en'])

@app.post("/extract")
async def extract(image: UploadFile = File(...)):
    # Read the image buffer from the HTTP request
    content = await image.read()
    
    # Run the Neural Network text synthesis
    # detail=0 returns just the string block instead of bounding block coordinates
    # Note: We purposely do NOT use an allowlist here because the images contain actual words (like 'Police', 'Customer Care').
    # Forcing an allowlist would make the OCR hallucinate numbers from those words and corrupt our short code logic.
    results = reader.readtext(content, detail=0)
    
    # We join all visual blocks with double spaces. 
    # This naturally simulates large column gaps so our Node.js Regex can easily separate them!
    raw_text = "  ".join(results)
    
    # Print the text to the backend terminal to prove the AI model generated it
    print(f"\n--- AI MODEL EXTRACTED TEXT ---\n{raw_text}\n-------------------------------\n")
    
    return {"text": raw_text}
