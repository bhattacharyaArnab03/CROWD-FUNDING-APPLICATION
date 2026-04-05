import { createClient } from "redis";

let isRedisConnected = false;

const redisClient = createClient({
  url: "redis://127.0.0.1:6379"
});

redisClient.on("error", (err) => {
  if (isRedisConnected) console.error("Redis connection lost:", err.message);
  isRedisConnected = false;
});

redisClient.on("connect", () => {
  console.log("Redis client connected successfully.");
  isRedisConnected = true;
});

redisClient.connect().catch(() => {
  console.log("Redis not available locally. Defaulting to direct DB queries.");
});

export { redisClient, isRedisConnected };