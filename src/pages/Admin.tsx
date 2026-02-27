import { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useProfiles, useCreateProfile, useDeleteProfile, useUpdateProfile } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { User, Trash2, Plus, Search, Upload, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import * as faceapi from 'face-api.js';
import type { Profile } from '@/types/profile';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

export default function Admin() {
  const { data: profiles = [], isLoading } = useProfiles();
  const createProfile = useCreateProfile();
  const deleteProfile = useDeleteProfile();
  const updateProfile = useUpdateProfile();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  // Edit state
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editRoleType, setEditRoleType] = useState<string>('staff');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [roleType, setRoleType] = useState<string>('staff');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = profiles.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || p.role_type === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      let photoUrl: string | null = null;
      let descriptor: number[] | null = null;

      // Upload photo
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;

        // Extract face descriptor
        try {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]);

          const img = await faceapi.fetchImage(photoUrl);
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptor = Array.from(detection.descriptor);
          } else {
            toast.warning('No face detected in the photo. Profile will be created without face data.');
          }
        } catch (err) {
          console.error('Face descriptor extraction failed:', err);
          toast.warning('Could not extract face data from photo.');
        }
      }

      await createProfile.mutateAsync({
        name: name.trim(),
        designation: designation.trim(),
        qualification: qualification.trim(),
        role_type: roleType,
        photo_url: photoUrl,
        face_descriptor: descriptor,
      });

      toast.success(`Profile "${name}" created successfully!`);
      setName('');
      setDesignation('');
      setQualification('');
      setRoleType('staff');
      setPhotoFile(null);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create profile:', err);
      toast.error('Failed to create profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (p: Profile) => {
    setEditingProfile(p);
    setEditName(p.name);
    setEditDesignation(p.designation);
    setEditQualification(p.qualification);
    setEditRoleType(p.role_type);
    setEditPhotoFile(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editName.trim()) return;

    setIsEditing(true);
    try {
      let photoUrl = editingProfile.photo_url;
      let descriptor = editingProfile.face_descriptor;

      if (editPhotoFile) {
        const ext = editPhotoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, editPhotoFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;

        try {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]);
          const img = await faceapi.fetchImage(photoUrl);
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptor = detection ? Array.from(detection.descriptor) : null;
          if (!detection) toast.warning('No face detected in new photo.');
        } catch {
          toast.warning('Could not extract face data from new photo.');
        }
      }

      await updateProfile.mutateAsync({
        id: editingProfile.id,
        name: editName.trim(),
        designation: editDesignation.trim(),
        qualification: editQualification.trim(),
        role_type: editRoleType as 'staff' | 'student',
        photo_url: photoUrl,
        face_descriptor: descriptor,
      });

      toast.success(`Profile "${editName}" updated!`);
      setEditingProfile(null);
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to update profile.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string, profileName: string) => {
    if (!confirm(`Delete profile "${profileName}"?`)) return;
    try {
      await deleteProfile.mutateAsync(id);
      toast.success(`Profile "${profileName}" deleted.`);
    } catch {
      toast.error('Failed to delete profile.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Profile Management</h2>
              <p className="text-sm text-muted-foreground">
                Manage registered profiles for face recognition
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Profile
            </Button>
          </div>

          {/* Add form */}
          {showForm && (
            <Card className="animate-fade-in border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">New Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Professor, Pre Final Year" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input id="qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. M.Tech, Ph.D" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role Type</Label>
                    <Select value={roleType} onValueChange={setRoleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="photo">Face Photo</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                        className="flex-1"
                      />
                      {photoFile && (
                        <span className="text-xs text-muted-foreground">
                          <Upload className="mr-1 inline h-3 w-3" />
                          {photoFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Profile'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-20">Face</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No profiles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.designation}</TableCell>
                      <TableCell className="text-muted-foreground">{p.qualification}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.role_type === 'staff'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-accent/10 text-accent-foreground'
                        }`}>
                          {p.role_type === 'staff' ? 'Staff' : 'Student'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.face_descriptor ? (
                          <span className="text-xs text-primary">✓ Ready</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(p)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-designation">Designation</Label>
              <Input id="edit-designation" value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-qualification">Qualification</Label>
              <Input id="edit-qualification" value={editQualification} onChange={(e) => setEditQualification(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role Type</Label>
              <Select value={editRoleType} onValueChange={setEditRoleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-photo">Replace Photo</Label>
              <Input
                id="edit-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setEditPhotoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingProfile(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
