import amqp from "amqplib";

let channel = null;
let confirmChannel = null;
let connection = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

export const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        // Regular channel for consuming (if needed)
        channel = await connection.createChannel();
        // Confirm channel for reliable publishing
        confirmChannel = await connection.createConfirmChannel();
        await confirmChannel.assertExchange("donations_exchange", "topic", { durable: true });
        console.log("[Payment Service][RabbitMQ] Connected to RabbitMQ successfully");
    } catch (error) {
        console.error("[Payment Service][RabbitMQ] Connection error. Will fallback to synchronous HTTP (Axios)", error.message);
    }
};


// Batching logic
const publishBatch = [];
const BATCH_SIZE = 5;
const BATCH_INTERVAL = 500; // ms
let batchTimer = null;

async function flushBatch() {
    if (!confirmChannel || publishBatch.length === 0) return;
    const batch = publishBatch.splice(0, BATCH_SIZE);
    for (const { eventData, resolve, reject, attempt } of batch) {
        let retries = attempt || 0;
        let published = false;
        let lastError = null;
        while (!published && retries < 3) {
            try {
                await new Promise((res, rej) => {
                    confirmChannel.publish(
                        "donations_exchange",
                        "donation.created",
                        Buffer.from(JSON.stringify(eventData)),
                        { persistent: true },
                        (err, ok) => {
                            if (err) {
                                rej(err);
                            } else {
                                res(ok);
                            }
                        }
                    );
                });
                published = true;
                console.log("[Payment Service][RabbitMQ] Published event (confirmed):", eventData);
                resolve(true);
            } catch (error) {
                retries++;
                lastError = error;
                console.warn(`[Payment Service][RabbitMQ] Publish failed, retrying (${retries}/3)...`, error.message);
                await new Promise(r => setTimeout(r, 500 * retries)); // Exponential backoff
            }
        }
        if (!published) {
            console.error("[Payment Service][RabbitMQ] Failed to publish message after retries:", lastError);
            reject(false);
        }
    }
}

function scheduleBatchFlush() {
    if (!batchTimer) {
        batchTimer = setTimeout(async () => {
            await flushBatch();
            batchTimer = null;
        }, BATCH_INTERVAL);
    }
}

export const publishDonationEvent = async (eventData) => {
    if (!confirmChannel) {
        console.log("[Payment Service][RabbitMQ] Confirm channel not available, falling back to HTTP.");
        return false;
    }
    return new Promise((resolve, reject) => {
        publishBatch.push({ eventData, resolve, reject, attempt: 0 });
        if (publishBatch.length >= BATCH_SIZE) {
            flushBatch();
        } else {
            scheduleBatchFlush();
        }
    });
};

// Graceful shutdown for RabbitMQ
const shutdown = async () => {
    try {
        if (confirmChannel) {
            await confirmChannel.close();
            console.log("[Payment Service][RabbitMQ] Confirm channel closed.");
        }
        if (channel) {
            await channel.close();
            console.log("[Payment Service][RabbitMQ] Channel closed.");
        }
        if (connection) {
            await connection.close();
            console.log("[Payment Service][RabbitMQ] Connection closed.");
        }
    } catch (err) {
        console.error("[Payment Service][RabbitMQ] Error during shutdown:", err);
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
