import os
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Load OpenCV's pre-trained Haar cascades for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Create LBPH Face Recognizer for purely OpenCV-based recognition
recognizer = cv2.face.LBPHFaceRecognizer_create()

label_dict = {}  # int -> str (name)
name_to_id = {}  # str (name) -> int

# Look for the dataset folder on the user's desktop/welcome-guard
DATASET_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset"))

def train_model():
    print(f"Dataset path: {DATASET_PATH}")
    print("Training Face Recognition model on dataset (this may take a moment)...")
    faces = []
    labels = []
    current_id = 0

    if not os.path.exists(DATASET_PATH):
        print(f"Dataset path {DATASET_PATH} not found.")
        return

    # Walk through the dataset directory
    for root_dir, dirs, files in os.walk(DATASET_PATH):
        for file in files:
            if file.lower().endswith(('png', 'jpg', 'jpeg', 'webp')):
                path = os.path.join(root_dir, file)
                
                # The name is the parent folder containing the image
                name = os.path.basename(os.path.dirname(path))
                
                # If we haven't seen this name before, assign a new integer ID
                if name not in name_to_id:
                    name_to_id[name] = current_id
                    label_dict[current_id] = name
                    current_id += 1
                
                id_ = name_to_id[name]

                # Load image (using fromfile to handle special characters/spaces in Windows path)
                img_array = np.fromfile(path, np.uint8)
                img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                
                if img is None:
                    continue
                
                # Convert to grayscale for Haar extraction
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

                # Detect faces in the training image
                detected = face_cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
                )

                # For training, assume the prominent face corresponds to the label
                for (x, y, w, h) in detected:
                    roi_gray = gray[y:y+h, x:x+w]
                    faces.append(roi_gray)
                    labels.append(id_)
                    break # Take the first detected face

    if len(faces) > 0:
        recognizer.train(faces, np.array(labels))
        print(f"Model trained successfully on {len(faces)} faces across {len(label_dict)} actual profiles.")
    else:
        print("No faces found to train.")

# FastAPI lifecycle event for running the training on boot
@asynccontextmanager
async def lifespan(app: FastAPI):
    train_model()
    yield
    print("Shutting down Face Recognition API")

app = FastAPI(title="Face Recognition API", lifespan=lifespan)

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "OpenCV Face Recognition Backend is Running", 
        "profiles_loaded": len(label_dict)
    }

@app.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    """
    Accepts an image file, detects faces, and uses the trained LBPH Recognizer
    to predict the name of the person from the dataset.
    """
    contents = await file.read()
    
    # Convert uploaded file data to an OpenCV image
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return {"faces": [], "error": "Invalid image"}

    # Convert to grayscale for detection and prediction
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Detect faces
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
    )

    detected_faces = []
    
    for (x, y, w, h) in faces:
        roi_gray = gray[y:y+h, x:x+w]
        
        name = "unknown"
        confidence_score = 0.0
        
        # Predict using the trained model
        if len(label_dict) > 0:
            id_, conf = recognizer.predict(roi_gray)
            
            # LBPH confidence is a physical distance metric.
            # 0 is a perfect match. usually < 80 means it's a very solid match.
            threshold = 95
            if conf < threshold:
                name = label_dict.get(id_, "unknown")
            else:
                name = "unknown"
                
            confidence_score = conf

        # Add to results
        detected_faces.append({
            "box": {
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h)
            },
            "label": name,
            # Pass the distance back, but label the frontend if it's below threshold
            "distance": float(confidence_score) 
        })

    return {"faces": detected_faces}

if __name__ == "__main__":
    import uvicorn
    # Make sure to run inside backend dir
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
