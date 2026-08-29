import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "records.json");
const LOCK_DIR = `${DATA_FILE}.lock`;

type SeedRecord = {
  videoId: string;
  title: string;
  youtubeUrl?: string;
  englishText?: string;
  koreanText?: string;
};

// records.json은 dev 서버 한 대가 공유한다. 병렬 스펙이 read-modify-write로
// 서로를 덮어쓰지 않도록 mkdir 기반 스핀 락으로 감싼다.
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (let attempt = 0; attempt < 400; attempt += 1) {
    try {
      await fs.mkdir(LOCK_DIR);
      try {
        return await fn();
      } finally {
        await fs.rm(LOCK_DIR, { recursive: true, force: true });
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error("records.json 락을 얻지 못했습니다.");
}

async function readRecords(): Promise<Array<Record<string, unknown> & { videoId: string }>> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

/** 이 스펙이 쓸 레코드 하나를 자기 것만 갈아끼우며 추가한다. */
export async function seedRecord(record: SeedRecord): Promise<void> {
  await withLock(async () => {
    const rows = (await readRecords()).filter((r) => r.videoId !== record.videoId);
    rows.push({
      id: record.videoId,
      videoId: record.videoId,
      youtubeUrl:
        record.youtubeUrl ?? `https://www.youtube.com/watch?v=${record.videoId}`,
      title: record.title,
      englishText: record.englishText ?? "Seeded transcript.",
      koreanText: record.koreanText ?? "심어 둔 번역.",
      createdAt: new Date().toISOString(),
    });
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf-8");
  });
}

/** 자기 레코드만 지운다. 다른 스펙·사용자 레코드는 건드리지 않는다. */
export async function removeSeededRecord(videoId: string): Promise<void> {
  await withLock(async () => {
    const rows = (await readRecords()).filter((r) => r.videoId !== videoId);
    await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf-8");
  });
}
