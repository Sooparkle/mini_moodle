import { sql } from '@/lib/db';

export interface PageContent {
  body: string;
}
export interface UrlContent {
  external_url: string;
  open_in_new_tab: boolean;
}
export interface FileContent {
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
}

export async function loadPageContent(activityId: number): Promise<PageContent> {
  const { rows } = await sql`
    SELECT body FROM activity_pages WHERE activity_id = ${activityId}
  `;
  return rows[0] ? { body: rows[0].body } : { body: '' };
}

export async function loadUrlContent(activityId: number): Promise<UrlContent | null> {
  const { rows } = await sql`
    SELECT external_url, open_in_new_tab
    FROM activity_urls WHERE activity_id = ${activityId}
  `;
  if (rows.length === 0) return null;
  return {
    external_url: rows[0].external_url,
    open_in_new_tab: rows[0].open_in_new_tab,
  };
}

export async function loadFileContent(activityId: number): Promise<FileContent | null> {
  const { rows } = await sql`
    SELECT file_name, file_url, file_size_bytes
    FROM activity_files WHERE activity_id = ${activityId}
  `;
  if (rows.length === 0) return null;
  return {
    file_name: rows[0].file_name,
    file_url: rows[0].file_url,
    file_size_bytes: rows[0].file_size_bytes,
  };
}
