/**
 * Layer 2 — API and access control.
 *
 * The server authenticates the user and enforces permissions on every
 * request; the user application only uses them to decide what to offer.
 */

export type Role = 'owner' | 'manager' | 'worker' | 'viewer';

export type Permission =
  | 'farm:read'
  | 'alerts:acknowledge'
  | 'alerts:resolve'
  | 'reports:export'
  | 'tariffs:edit';

export interface UserProfile {
  id: string;
  displayName: string;
  role: Role;
}

export interface Session {
  user: UserProfile;
  /** Farms this user may access. */
  farmIds: string[];
  permissions: Permission[];
}
