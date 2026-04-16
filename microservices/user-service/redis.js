import { createClient } from "redis";

let isRedisConnected = false;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = createClient({
  url: REDIS_URL
});

redisClient.on("error", (err) => {
  if (isRedisConnected) console.error("[User Service][Redis] Connection lost:", err.message);
  isRedisConnected = false;
});

redisClient.on("connect", () => {
  console.log("[User Service][Redis] Client connected successfully.");
  isRedisConnected = true;
});

redisClient.connect().catch(() => {
  console.log("[User Service][Redis] Not available locally. Defaulting to direct DB queries.");
});

// Graceful shutdown for Redis
const shutdown = async () => {
  try {
    await redisClient.quit();
    console.log("[User Service][Redis] Client connection closed.");
  } catch (err) {
    console.error("[User Service][Redis] Error during shutdown:", err);
  }
};

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

export { redisClient, isRedisConnected };