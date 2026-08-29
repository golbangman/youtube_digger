import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "records.json");

export interface ReferenceRecord {
  id: string;
  videoId: string;
  youtubeUrl: string;
  title: string;
  /** 영어 자막 원문. 자막이 없으면 없음. */
  englishText?: string;
  /** 한국어 번역. 번역까지 됐을 때만 있음. */
  koreanText?: string;
  /** 사용자가 남기는 메모. 없으면 빈 문자열. */
  memo: string;
  createdAt: string;
}

async function readAll(): Promise<ReferenceRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const rows = JSON.parse(raw) as ReferenceRecord[];
    return rows.map((row) => ({ ...row, memo: row.memo ?? "" }));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(records: ReferenceRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
}

/** 자막 번역이 완결된 레코드인지. 두 텍스트는 항상 함께 저장된다. */
export function hasCaption(record: ReferenceRecord): boolean {
  return Boolean(record.englishText && record.koreanText);
}

export async function getAllRecords(): Promise<ReferenceRecord[]> {
  const records = await readAll();
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRecordByVideoId(
  videoId: string,
): Promise<ReferenceRecord | null> {
  const records = await readAll();
  return records.find((r) => r.videoId === videoId) ?? null;
}

export async function saveRecord(record: ReferenceRecord): Promise<void> {
  const records = await readAll();
  const withoutExisting = records.filter((r) => r.videoId !== record.videoId);
  withoutExisting.push(record);
  await writeAll(withoutExisting);
}

export async function updateMemo(videoId: string, memo: string): Promise<void> {
  const records = await readAll();
  const next = records.map((r) => (r.videoId === videoId ? { ...r, memo } : r));
  await writeAll(next);
}

export async function deleteRecord(videoId: string): Promise<void> {
  const records = await readAll();
  await writeAll(records.filter((r) => r.videoId !== videoId));
}
