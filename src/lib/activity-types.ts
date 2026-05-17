/**
 * 활동 타입별 라벨 매핑 (basic/canvas/modeless 변형 공통)
 */
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  quiz: '퀴즈',
  assignment: '과제',
  page: '페이지',
  url: '링크',
  file: '파일',
  forum: '토론',
};

export function activityTypeLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}

export const GRADED_TYPES = new Set(['quiz', 'assignment']);
