import { useRef, useState } from 'react';
import { auth, upload } from '../api';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePhotoField({ user, onUpdated }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pickFile = () => inputRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPEG, PNG, WebP, etc.).');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const url = await upload.profilePhoto(file);
      await auth.updateProfile({ profilePhoto: url });
      await onUpdated();
    } catch (err) {
      setError(err.message || 'Could not update photo');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setError('');
    setUploading(true);
    try {
      await auth.updateProfile({ profilePhoto: null });
      await onUpdated();
    } catch (err) {
      setError(err.message || 'Could not remove photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mws-profile-card mws-profile-card--photo">
      <h3 className="mws-profile-card-title">Profile photo</h3>
      <p className="mws-profile-card-hint">Shown on your account. JPG or PNG, up to 5 MB.</p>
      <div className="mws-profile-photo-row">
        <div className="mws-profile-avatar" aria-hidden>
          {user?.profile_photo ? (
            <img src={user.profile_photo} alt="" />
          ) : (
            <span className="mws-profile-avatar-placeholder">{initialsFromName(user?.full_name)}</span>
          )}
        </div>
        <div className="mws-profile-photo-actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="mws-profile-photo-input"
            onChange={onFileChange}
            disabled={uploading}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={pickFile} disabled={uploading}>
            {uploading ? 'Uploading…' : user?.profile_photo ? 'Change photo' : 'Upload photo'}
          </button>
          {user?.profile_photo && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={removePhoto} disabled={uploading}>
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mws-profile-photo-error" role="alert">{error}</p>}
    </div>
  );
}
