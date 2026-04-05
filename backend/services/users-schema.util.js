import { query } from '../db.js';

/** Once the column exists, we cache `true` only (no long-lived `false` cache so migrations apply without restart). */
let profilePhotoColumnConfirmed = false;

export async function usersHasProfilePhotoColumn() {
  if (profilePhotoColumnConfirmed) return true;
  try {
    const r = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'profile_photo'
       LIMIT 1`
    );
    if (r.rows.length > 0) profilePhotoColumnConfirmed = true;
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

/** User columns for SELECT (login / me) — omit profile_photo if column missing. */
export async function usersSelectColumnsForAuth() {
  const has = await usersHasProfilePhotoColumn();
  return has
    ? 'id, email, password_hash, full_name, phone, profile_photo, role'
    : 'id, email, password_hash, full_name, phone, role';
}

export async function usersSelectColumnsForMe() {
  const has = await usersHasProfilePhotoColumn();
  return has
    ? 'id, email, full_name, phone, profile_photo, role, created_at'
    : 'id, email, full_name, phone, role, created_at';
}
