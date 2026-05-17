/**
 * 테스트용 ?role= 쿼리 파라미터로 세션 역할을 override.
 * 운영 권한 검증은 여전히 session 기반 — admin은 서버 액션에서 owner처럼 허용됨.
 */
export type Role = 'admin' | 'teacher' | 'student';

const VALID: ReadonlySet<Role> = new Set(['admin', 'teacher', 'student']);

export function parseRoleOverride(
  raw: string | string[] | undefined,
): Role | null {
  if (typeof raw !== 'string') return null;
  return VALID.has(raw as Role) ? (raw as Role) : null;
}

export function effectiveRole(sessionRole: string, override: Role | null): Role {
  return override ?? (sessionRole as Role);
}

/**
 * canEdit: effective role이 teacher이고 (owner이거나 session role이 admin).
 * 즉 admin은 owner 아니어도 toggle로 teacher view에 들어가면 편집 가능.
 */
export function computeCanEdit(
  sessionRole: string,
  effRole: Role,
  isOwner: boolean,
): boolean {
  if (effRole !== 'teacher') return false;
  return isOwner || sessionRole === 'admin';
}
