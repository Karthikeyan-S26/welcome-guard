import { useState, useRef } from 'react';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComputingAll, setIsComputingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleComputeAllDescriptors = async () => {
    setIsComputingAll(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: profilesWithPhoto } = await supabase
        .from('profiles')
        .select('*')
        .not('photo_url', 'is', null);

      if (!profilesWithPhoto || profilesWithPhoto.length === 0) {
        toast.info('No profiles found that need descriptor generation.');
        return;
      }

      toast.info(`Extracting face descriptors for ${profilesWithPhoto.length} profiles...`);

      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      } catch (err: any) {
        toast.error('Failed to load face detection models');
        return;
      }

      for (const profile of profilesWithPhoto) {
        if (profile.face_descriptor && Array.isArray(profile.face_descriptor) && profile.face_descriptor.length === 128) {
          // Skip if already has full 128D descriptor array
          continue;
        }

        try {
          const img = await faceapi.fetchImage(profile.photo_url);
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            const descriptor = Array.from(detection.descriptor);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({ face_descriptor: descriptor })
              .eq('id', profile.id);

            if (!updateError) {
              successCount++;
            } else {
              console.error(`Error saving descriptor for ${profile.name}:`, updateError);
              failCount++;
            }
          } else {
            console.warn(`No face detected for ${profile.name}`);
            failCount++;
          }
        } catch (err) {
          console.error(`Error processing ${profile.name}:`, err);
          failCount++;
        }
      }
      toast.success(`Done! ✅ ${successCount} computed, ❌ ${failCount} failed`);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsComputingAll(false);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSyncing(true);
    toast.info(`Syncing folder images... This might take a bit.`);

    let success = 0;
    let failed = 0;

    try {
      // 1. Load models first
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      const fileExts = ['jpg', 'jpeg', 'png', 'webp'];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Filter by extension
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !fileExts.includes(ext)) continue;

        // Get name from parent folder
        const pathParts = file.webkitRelativePath.split('/');
        // The path is typically e.g. "dataset/Gokul/img.jpg"
        if (pathParts.length < 2) continue;
        const profileName = pathParts[pathParts.length - 2];

        try {
          // Upload to Supabase Storage
          const fileName = `${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('profile-photos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(fileName);

          const photoUrl = urlData.publicUrl;

          let descriptor: number[] | null = null;

          // Generate descriptor instantly to avoid 2-step process
          try {
            // We can use an Object URL to parse the file via HTMLImageElement because bufferToImage is harder
            const objUrl = URL.createObjectURL(file);
            const img = await faceapi.fetchImage(objUrl);
            const detection = await faceapi
              .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (detection) {
              descriptor = Array.from(detection.descriptor);
            }
            URL.revokeObjectURL(objUrl);
          } catch (e) {
            console.error(`Failed to extract face for ${profileName}:`, e);
          }

          // Check if profile exists
          const { data: existing } = await supabase
            .from('profiles')
            .select('id, name, photo_url, face_descriptor')
            .eq('name', profileName)
            .maybeSingle();

          if (existing) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ photo_url: photoUrl, face_descriptor: descriptor })
              .eq('id', existing.id);
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                name: profileName,
                role_type: 'staff',
                photo_url: photoUrl,
                face_descriptor: descriptor
              });
            if (insertError) throw insertError;
          }
          success++;
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
          failed++;
        }
      }

      toast.success(`Sync Complete: ✅ ${success} processed, ❌ ${failed} failed`);

    } catch (err: any) {
      toast.error('Failed to sync dataset: ' + err.message);
    } finally {
      setIsSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
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

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                // @ts-ignore - webkitdirectory is non-standard but works in modern browsers
                webkitdirectory="true"
                directory="true"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFolderUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <>Syncing...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Sync Local Dataset
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleComputeAllDescriptors}
                disabled={isComputingAll}
                className="gap-2"
              >
                {isComputingAll ? 'Computing...' : '⚡ Compute All Faces'}
              </Button>

              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Profile
              </Button>
            </div>
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
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.role_type === 'staff'
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
