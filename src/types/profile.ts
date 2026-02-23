export interface Profile {
  id: string;
  name: string;
  designation: string;
  qualification: string;
  role_type: 'staff' | 'student';
  photo_url: string | null;
  face_descriptor: number[] | null;
  created_at: string;
}
