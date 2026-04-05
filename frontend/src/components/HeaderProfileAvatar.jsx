import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resolvePublicUrl } from '../api';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function HeaderProfileAvatar({ user, to, onNavigate }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = initialsFromName(user?.full_name);
  const showImg = user?.profile_photo && !imgErr;

  return (
    <Link
      to={to}
      className="mws-header-avatar"
      aria-label="Profile"
      onClick={() => onNavigate?.()}
    >
      {showImg ? (
        <img src={resolvePublicUrl(user.profile_photo)} alt="" onError={() => setImgErr(true)} />
      ) : (
        <span className="mws-header-avatar-placeholder" aria-hidden>
          {initials}
        </span>
      )}
    </Link>
  );
}
