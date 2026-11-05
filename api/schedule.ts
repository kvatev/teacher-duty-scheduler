import { Redis } from "@upstash/redis";
import { put, head } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import fs from "fs";
import path from "path";

export const config = {
  maxDuration: 15,
};

interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
  end: () => void;
}

// Cross-Origin Resource Sharing helper
function setCorsHeaders(res: ApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key");
}

// Check which storage engines are configured in Vercel environment variables
function getStorageConfig() {
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasRedis = Boolean(redisUrl && redisToken);

  let blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_TOKEN;
  if (!blobToken) {
    const foundKey = Object.keys(process.env).find(
      (k) => k.endsWith("READ_WRITE_TOKEN") || (k.includes("BLOB") && k.includes("TOKEN"))
    );
    if (foundKey) blobToken = process.env[foundKey];
  }
  const hasBlob = Boolean(blobToken);

  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const hasPostgres = Boolean(postgresUrl);

  return {
    hasRedis,
    redisUrl,
    redisToken,
    hasBlob,
    blobToken,
    hasPostgres,
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const storage = getStorageConfig();

  // Status check endpoint
  if (req.query?.status === "1" || req.query?.status === "true") {
    return res.status(200).json({
      connected: storage.hasRedis || storage.hasBlob || storage.hasPostgres,
      storageEngines: {
        redis: storage.hasRedis,
        blob: storage.hasBlob,
        postgres: storage.hasPostgres,
      },
      activeStorage: storage.hasRedis
        ? "Upstash Redis / Vercel KV"
        : storage.hasBlob
        ? "Vercel Blob"
        : storage.hasPostgres
        ? "Vercel Postgres (Neon)"
        : "Локален fallback (няма активирана Vercel база)",
      timestamp: new Date().toISOString(),
    });
  }

  /* ─────────────────────────────────────────────────────────────
     POST: Save updated schedule to cloud database
  ───────────────────────────────────────────────────────────── */
  if (req.method === "POST") {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: "Невалиден JSON формат" });
        }
      }

      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Липсват данни за графика" });
      }

      // Ensure exportedAt timestamp is updated to current time
      const updatedSchedule = {
        ...body,
        version: body.version || 1,
        exportedAt: new Date().toISOString(),
      };

      // 1. Try Upstash Redis / Vercel KV
      if (storage.hasRedis) {
        const redis = new Redis({
          url: storage.redisUrl!,
          token: storage.redisToken!,
        });
        await redis.set("teacher_duty_schedule", updatedSchedule);
        return res.status(200).json({
          success: true,
          storageType: "Upstash Redis / Vercel KV",
          exportedAt: updatedSchedule.exportedAt,
          message: "Графикът е записан успешно в Upstash Redis!",
        });
      }

      // 2. Try Vercel Blob
      if (storage.hasBlob) {
        const jsonString = JSON.stringify(updatedSchedule, null, 2);
        let blob;
        try {
          blob = await put("schedule-data.json", jsonString, {
            access: "public",
            addRandomSuffix: false,
            token: storage.blobToken,
          });
        } catch {
          blob = await put("schedule-data.json", jsonString, {
            access: "public",
            addRandomSuffix: false,
            token: storage.blobToken,
          });
        }
        return res.status(200).json({
          success: true,
          storageType: "Vercel Blob",
          url: blob.url,
          exportedAt: updatedSchedule.exportedAt,
          message: "Графикът е записан успешно във Vercel Blob!",
        });
      }

      // 3. Try Vercel Postgres
      if (storage.hasPostgres) {
        await sql`
          CREATE TABLE IF NOT EXISTS app_schedule (
            id TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
        await sql`
          INSERT INTO app_schedule (id, data, updated_at)
          VALUES ('current', ${JSON.stringify(updatedSchedule)}, NOW())
          ON CONFLICT (id) DO UPDATE
          SET data = EXCLUDED.data, updated_at = NOW();
        `;
        return res.status(200).json({
          success: true,
          storageType: "Vercel Postgres (Neon)",
          exportedAt: updatedSchedule.exportedAt,
          message: "Графикът е записан успешно във Vercel Postgres!",
        });
      }

      // 4. If in development or no storage connected yet, try local disk write
      const localFilePath = path.join(process.cwd(), "public", "schedule-data.json");
      if (fs.existsSync(localFilePath)) {
        try {
          fs.writeFileSync(localFilePath, JSON.stringify(updatedSchedule, null, 2), "utf-8");
          return res.status(200).json({
            success: true,
            storageType: "Локален файл (public/schedule-data.json)",
            exportedAt: updatedSchedule.exportedAt,
            message: "Записан в public/schedule-data.json. За глобална база данни свържете Storage във Vercel.",
          });
        } catch (e: unknown) {
          console.warn("Could not write to local public file:", e);
        }
      }

      return res.status(503).json({
        success: false,
        error: "Няма активирана Vercel база данни. Моля активирайте 'Redis (Upstash)', 'Blob' или 'Postgres' в таблото на Vercel (раздел Storage).",
      });
    } catch (err: unknown) {
      console.error("Error saving schedule to Vercel database:", err);
      const errMsg = err instanceof Error ? err.message : "Грешка при запис в базата данни";
      return res.status(500).json({ error: errMsg });
    }
  }

  /* ─────────────────────────────────────────────────────────────
     GET: Read current schedule from cloud database
  ───────────────────────────────────────────────────────────── */
  if (req.method === "GET") {
    try {
      // 1. Try Upstash Redis / Vercel KV
      if (storage.hasRedis) {
        const redis = new Redis({
          url: storage.redisUrl!,
          token: storage.redisToken!,
        });
        const cached = await redis.get("teacher_duty_schedule");
        if (cached && typeof cached === "object") {
          res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=59");
          res.setHeader("X-Storage-Engine", "redis");
          return res.status(200).json(cached);
        }
      }

      // 2. Try Vercel Blob
      if (storage.hasBlob) {
        try {
          const blobInfo = await head("schedule-data.json", { token: storage.blobToken });
          if (blobInfo?.url) {
            const blobRes = await fetch(`${blobInfo.url}?t=${Date.now()}`);
            if (blobRes.ok) {
              const blobData = await blobRes.json();
              const hasZafirova = Array.isArray(blobData.teachers) && blobData.teachers.some((t: { name?: string }) => t.name?.includes("Зафирова"));
              const hasFullAssignments = (blobData.assignments?.length || 0) >= 79;

              // If Blob has outdated schedule (missing Ekaterina Zafirova or < 79 assignments), reseed it!
              if (!hasZafirova || !hasFullAssignments) {
                const localFilePath = path.join(process.cwd(), "public", "schedule-data.json");
                if (fs.existsSync(localFilePath)) {
                  const fileContent = fs.readFileSync(localFilePath, "utf-8");
                  await put("schedule-data.json", fileContent, {
                    access: "public",
                    addRandomSuffix: false,
                    token: storage.blobToken,
                  }).catch(() => null);
                  res.setHeader("Cache-Control", "no-cache");
                  res.setHeader("X-Storage-Engine", "blob-reseeded");
                  return res.status(200).json(JSON.parse(fileContent));
                }
              }

              res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=59");
              res.setHeader("X-Storage-Engine", "blob");
              return res.status(200).json(blobData);
            }
          }
        } catch {
          // If Blob does not exist yet in the store, automatically seed it!
          try {
            const localFilePath = path.join(process.cwd(), "public", "schedule-data.json");
            if (fs.existsSync(localFilePath)) {
              const fileContent = fs.readFileSync(localFilePath, "utf-8");
              await put("schedule-data.json", fileContent, {
                access: "public",
                addRandomSuffix: false,
                token: storage.blobToken,
              }).catch(() => null);
              res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=59");
              res.setHeader("X-Storage-Engine", "blob-seeded");
              return res.status(200).json(JSON.parse(fileContent));
            }
          } catch (seedErr) {
            console.warn("Could not seed Blob on first GET:", seedErr);
          }
        }
      }

      // 3. Try Vercel Postgres
      if (storage.hasPostgres) {
        try {
          const { rows } = await sql`SELECT data FROM app_schedule WHERE id = 'current' LIMIT 1;`;
          if (rows.length > 0 && rows[0].data) {
            res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=59");
            res.setHeader("X-Storage-Engine", "postgres");
            return res.status(200).json(rows[0].data);
          }
        } catch (pgErr) {
          console.warn("Postgres table not initialized yet:", pgErr);
        }
      }

      // 4. Fallback: Read from local public/schedule-data.json
      const localFilePath = path.join(process.cwd(), "public", "schedule-data.json");
      if (fs.existsSync(localFilePath)) {
        const fileContent = fs.readFileSync(localFilePath, "utf-8");
        res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
        res.setHeader("X-Storage-Engine", "static-file");
        return res.status(200).json(JSON.parse(fileContent));
      }

      return res.status(404).json({ error: "Няма намерен график" });
    } catch (err: unknown) {
      console.error("Error reading schedule from Vercel database:", err);
      const errMsg = err instanceof Error ? err.message : "Грешка при четене на графика";
      return res.status(500).json({ error: errMsg });
    }
  }

  return res.status(405).json({ error: "Методът не се поддържа" });
}
