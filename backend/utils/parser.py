import pdfplumber
from docx import Document
import io

def parse_file(filename: str, file_bytes: bytes) -> str:
    """
    Extracts text from a given file byte stream.
    Supports .pdf and .docx extensions.
    """
    text = ""
    file_ext = filename.split(".")[-1].lower() if "." in filename else ""

    try:
        if file_ext == "pdf":
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                        
        elif file_ext in ["docx", "doc"]:
            doc = Document(io.BytesIO(file_bytes))
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            raise ValueError("Unsupported file type. Only PDF and DOCX are allowed.")
            
        if not text.strip():
            raise ValueError("The parsed file contains no readable text.")
    except Exception as e:
        print(f"Error parsing file {filename}: {str(e)}")
        raise ValueError(f"Failed to extract text from document: {str(e)}")

    return text.strip()
