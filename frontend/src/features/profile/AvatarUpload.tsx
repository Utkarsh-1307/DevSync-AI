import { useRef, useState } from "react";
import { Camera, X, Check, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [bio, setBio] = useState((user as any)?.bio ?? "");
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function save() {
    setUploading(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;

      if (selectedFile) {
        const form = new FormData();
        form.append("file", selectedFile);
        const res = await api.post<{ url: string }>("/upload/avatar", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        avatarUrl = res.data.url;
      }

      const updates: Record<string, string> = {};
      if (fullName.trim() && fullName.trim() !== user?.full_name) updates.full_name = fullName.trim();
      if (bio.trim() !== ((user as any)?.bio ?? "")) updates.bio = bio.trim();
      if (avatarUrl) updates.avatar_url = avatarUrl;

      if (Object.keys(updates).length > 0) {
        const res = await api.patch("/auth/me", updates);
        setUser(res.data);
      }

      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const avatarSrc = preview ?? user?.avatar_url;
  const initials = (user?.full_name ?? "U").slice(0, 1).toUpperCase();

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Avatar picker */}
        <div className="flex justify-center mb-5">
          <div className="relative group">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Display name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="A short bio..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={uploading}
            className="flex-1 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {uploading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
