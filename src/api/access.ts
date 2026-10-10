import type { Permission, Role, Session } from '../types/domain';

/** Default permissions per role. The server is the authority; this mirrors it for the UI. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['farm:read', 'alerts:acknowledge', 'alerts:resolve', 'reports:export', 'tariffs:edit'],
  manager: ['farm:read', 'alerts:acknowledge', 'alerts:resolve', 'reports:export', 'tariffs:edit'],
  worker: ['farm:read', 'alerts:acknowledge'],
  viewer: ['farm:read'],
};

export function can(session: Session | null, permission: Permission): boolean {
  return session?.permissions.includes(permission) ?? false;
}
