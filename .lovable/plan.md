

# AI Face Recognition Dashboard — IT Department

## Overview
A real-time face recognition dashboard that uses the browser webcam and client-side AI (face-api.js) to detect, identify, and welcome people entering the IT department.

---

## Page 1: Dashboard (Main Screen)

### Split-Screen Layout
- **Left Panel (60%)** — Live Camera Feed
  - Full webcam stream with a dark border frame
  - Green bounding box drawn around detected faces in real-time
  - Animated green "WELCOME [NAME]" label above the detected face
  - Label fades in smoothly and auto-hides after ~5 seconds

- **Right Panel (40%)** — Profile Card
  - Clean white card with soft shadow and rounded corners
  - Displays the recognized person's dataset photo (large, centered)
  - Below photo: Name (bold, large), Designation, Qualification (gray)
  - Different layouts for IT Staff vs Students
  - Smooth fade transition when switching between profiles
  - Empty state with subtle "Awaiting detection..." message

### Top Banner
- A green gradient banner slides down briefly showing: **"WELCOME TO IT DEPARTMENT — [NAME]"**
- Auto-hides after ~5 seconds

### Voice Feedback
- Browser built-in Text-to-Speech says "Welcome to IT Department, [Name]"
- Triggers once per new detection, queued to avoid overlapping

---

## Page 2: Admin Panel (Profile Management)

### Profile List
- Table/grid view of all registered profiles (10+ sample profiles pre-loaded)
- Search and filter by role (Staff / Student)

### Add/Edit Profile
- Form to add new person: Name, Designation, Qualification, Role type
- Upload reference face photo (stored in Supabase Storage)
- The system extracts face descriptor from the uploaded photo for future matching

### Sample Data (Pre-loaded)
- 10+ profiles with varied roles: HOD, Professors, Lab Assistants, Students (Pre-Final Year, Final Year)
- Placeholder profile images

---

## Backend (Supabase)

### Database Tables
- **profiles** — id, name, designation, qualification, role_type (staff/student), photo_url, face_descriptor (JSON), created_at

### Storage
- **profile-photos** bucket for reference face images

---

## Technical Approach
- **face-api.js** runs entirely in the browser for face detection + recognition
- Face descriptors are computed from uploaded profile photos and stored in the database
- Live webcam descriptors are compared against stored descriptors to identify people
- No external AI API needed — everything runs client-side

---

## Design Style
- Color palette: Green (#22c55e), white, soft gray (#f3f4f6), black accents
- Rounded cards with soft shadows
- Clean professional typography
- Smooth CSS transitions and fade animations
- Dashboard-style header with department branding

