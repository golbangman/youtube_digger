import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "records.json");

export interface CaptionRecord {
  id: string;
  videoId: string;
  youtubeUrl: string;
  title: string;
  englishText: string;
  koreanText: string;
  createdAt: string;
}

async function readAll(): Promise<CaptionRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as CaptionRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(records: CaptionRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export async function getAllRecords(): Promise<CaptionRecord[]> {
  const records = await readAll();
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRecordByVideoId(
  videoId: string,
): Promise<CaptionRecord | null> {
  const records = await readAll();
  return records.find((r) => r.videoId === videoId) ?? null;
}

export async function saveRecord(record: CaptionRecord): Promise<void> {
  const records = await readAll();
  const withoutExisting = records.filter((r) => r.videoId !== record.videoId);
  withoutExisting.push(record);
  await writeAll(withoutExisting);
}
