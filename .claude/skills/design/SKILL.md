---
name: design
description: "MoodleLite UI design guideline — neutral mono + single accent color tokens, semantic HTML tag rules, CSS component patterns. Use when writing or reviewing CSS, TSX, or HTML structure."
paths:
  - "src/**/*.css"
  - "src/**/*.tsx"
---

# MoodleLite Design Guideline

> 제정: 2026-04-12 | 적용 범위: 전체 프론트엔드

## 1. 색상: Neutral Mono + Single Accent

- **장식 목적의 색 사용 금지.** 정보 구분은 grayscale 명도차 + typography로 해결.
- 액센트 1색만 사용. interactive element에만.
- 역할(admin/teacher/student) 구분은 색이 아니라 콘텐츠로 해결.
- 다크모드 미지원.

### 토큰 (globals.css :root)
```
Gray (6단계)
--gray-50:  #fafafa    page background
--gray-100: #f5f5f5    card/section background
--gray-200: #e5e5e5    border
--gray-400: #a3a3a3    placeholder, disabled, 보조 텍스트
--gray-600: #525252    body text
--gray-900: #171717    heading, nav background

Accent — interactive only
--accent:       #2563eb    버튼, 링크, focus ring
--accent-hover: #1d4ed8    hover state

Semantic — system feedback only
--danger:    #dc2626 / --danger-bg:  #fef2f2
--success:   #16a34a / --success-bg: #f0fdf4
```

- `#fff`만 예외 하드코딩 허용 (카드 배경, 버튼 텍스트). 그 외 `var(--token)` 사용.

## 2. Typography (4단계)

```
--text-sm:   0.875rem (14px)  caption, badge
--text-base: 1rem     (16px)  body, input, button
--text-lg:   1.25rem  (20px)  section heading (h2)
--text-xl:   1.5rem   (24px)  page heading (h1)
```

- heading: `color: var(--gray-900)`, `font-weight: 600`
- body: `color: var(--gray-600)`, `line-height: 1.5`
- 보조 텍스트: `color: var(--gray-400)`

## 3. Spacing (4px base)

```
--space-1:  0.25rem ( 4px)    --space-4:  1rem    (16px)
--space-2:  0.5rem  ( 8px)    --space-6:  1.5rem  (24px)
--space-3:  0.75rem (12px)    --space-8:  2rem    (32px)
                               --space-12: 3rem    (48px)
```

## 4. Border & Radius

```
--radius-sm: 4px  --radius-md: 6px  --radius-lg: 8px  --radius-full: 9999px
```
기본 border: `1px solid var(--gray-200)`

## 5. 시맨틱 HTML

| 태그 | 용도 |
|------|------|
| `<header>` | 전역 nav 래퍼 |
| `<nav>` | 내비게이션 링크 그룹 |
| `<main>` | 페이지 고유 콘텐츠 (각 page 최상위) |
| `<section>` | 논리적 구획 (card grid 래퍼 등) |
| `<article>` | 독립 콘텐츠 단위 (카드 1개) |
| `<aside>` | 보조 정보 (사이드바, 필터) |

규칙:
- `<div>`는 스타일링 래퍼로만. 의미 있는 구획에 div 금지.
- heading level 순서 보장: h1 → h2 → h3
- 에러 메시지에 `role="alert"`
- input에 `<label>` 필수 + `autoComplete` 명시
- 전역 `:focus-visible` 으로 키보드 접근성

## 6. 컴포넌트 패턴

**카드** (`<article>`): `background: #fff; border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: var(--space-6);`

**버튼 (Primary)**: `background: var(--accent); color: #fff; border-radius: var(--radius-md); padding: var(--space-3); font-weight: 500;`

**Input**: `border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: var(--space-3); focus → border-color: var(--accent);`

**에러**: `background: var(--danger-bg); color: var(--danger); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);`

## 7. 한계

1. 반응형 breakpoint 미정의 — Phase 7에서 필요 시 추가.
2. 애니메이션 — `transition: 0.15s`만 사용 중. 미규칙화.
3. 아이콘 — 미사용.
