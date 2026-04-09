import { createClient } from "redis";

let isRedisConnected = false;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = createClient({
  url: REDIS_URL
});

redisClient.on("error", (err) => {
  if (isRedisConnected) console.error("[Campaign Service][Redis] Connection lost:", err.message);
  isRedisConnected = false;
});

redisClient.on("connect", () => {
  console.log("[Campaign Service][Redis] Client connected successfully.");
  isRedisConnected = true;
});

redisClient.connect().catch(() => {
  console.log("[Campaign Service][Redis] Not available locally. Defaulting to direct DB queries.");
});

// Graceful shutdown for Redis
const shutdown = async () => {
  try {
    await redisClient.quit();
    console.log("[Campaign Service][Redis] Client connection closed.");
  } catch (err) {
    console.error("[Campaign Service][Redis] Error during shutdown:", err);
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