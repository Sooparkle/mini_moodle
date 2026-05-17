import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { QuestionManager } from './QuestionManager';
import { PageEditor } from './PageEditor';
import { UrlEditor } from './UrlEditor';
import { FileEditor } from './FileEditor';
import {
  loadPageContent,
  loadUrlContent,
  loadFileContent,
} from '@/lib/activity-content';
import styles from './quiz-edit.module.css';

interface Question {
  id: number;
  activity_id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  sort_order: number;
}

const EDITABLE_TYPES = new Set(['quiz', 'page', 'url', 'file']);

const EDIT_HEADINGS: Record<string, string> = {
  quiz: '문제 편집',
  page: '페이지 본문 편집',
  url: 'URL 편집',
  file: '파일 편집',
};

export default async function ActivityEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = Number(id);
  if (isNaN(activityId)) notFound();

  const session = (await getServerSession(authOptions))!;
  const { role, id: userId } = session.user;

  const { rows: actRows } = await sql`
    SELECT a.*, s.course_id, c.created_by, c.title AS course_title
    FROM activities a
    JOIN sections s ON s.id = a.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = ${activityId}
  `;
  if (actRows.length === 0) notFound();

  const activity = actRows[0];

  if (role !== 'teacher' || activity.created_by !== Number(userId)) {
    redirect(`/activities/${activityId}`);
  }
  if (!EDITABLE_TYPES.has(activity.type)) {
    redirect(`/activities/${activityId}`);
  }

  const heading = EDIT_HEADINGS[activity.type] ?? '활동 편집';

  let body: React.ReactNode = null;
  if (activity.type === 'quiz') {
    const { rows: questions } = await sql`
      SELECT * FROM quiz_questions
      WHERE activity_id = ${activityId}
      ORDER BY sort_order
    `;
    body = (
      <QuestionManager
        activityId={activityId}
        initialQuestions={questions as Question[]}
      />
    );
  } else if (activity.type === 'page') {
    const { body: pageBody } = await loadPageContent(activityId);
    body = <PageEditor activityId={activityId} initialBody={pageBody} />;
  } else if (activity.type === 'url') {
    const content = await loadUrlContent(activityId);
    body = (
      <UrlEditor
        activityId={activityId}
        initialUrl={content?.external_url ?? ''}
        initialOpenInNewTab={content?.open_in_new_tab ?? true}
      />
    );
  } else if (activity.type === 'file') {
    const content = await loadFileContent(activityId);
    body = (
      <FileEditor
        activityId={activityId}
        initialName={content?.file_name ?? ''}
        initialUrl={content?.file_url ?? ''}
        initialSize={content?.file_size_bytes ?? null}
      />
    );
  }

  return (
    <main className={styles.content}>
      <Link href={`/activities/${activityId}`} className={styles.backLink}>
        &larr; {activity.title}
      </Link>

      <div className={styles.header}>
        <h1>{heading}</h1>
      </div>

      {body}
    </main>
  );
}
