
import amqp from "amqplib";

let channel = null;
let processedDonations = 0;
let confirmChannel = null;
let connection = null;

const USER_REGISTERED_QUEUE = "payment_user_registered_queue";
const DONATION_QUEUE = "donations_queue"; // Moved to top-level scope for global access

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

export const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        // Regular channel for consuming (if needed)
        channel = await connection.createChannel();
        // Confirm channel for reliable publishing
        confirmChannel = await connection.createConfirmChannel();
        await confirmChannel.assertExchange("donations_exchange", "topic", { durable: true });
        await channel.assertExchange("users_exchange", "topic", { durable: true });
        // User registration event subscription
        await channel.assertQueue(USER_REGISTERED_QUEUE, { durable: true });
        await channel.bindQueue(USER_REGISTERED_QUEUE, "users_exchange", "user.registered");
        channel.consume(USER_REGISTERED_QUEUE, async (msg) => {
            if (msg !== null) {
                try {
                    const eventData = JSON.parse(msg.content.toString());
                    // TODO: Implement user payment profile initialization logic here
                    console.log("[Payment Service][RabbitMQ] Received user.registered event:", eventData);
                    channel.ack(msg);
                } catch (e) {
                    console.error("[Payment Service][RabbitMQ] Invalid user.registered message, dropping.");
                    channel.nack(msg, false, false);
                }
            }
        });

        // Show queue length and processed count for donations
        await showDonationQueueStats();
        setInterval(showDonationQueueStats, 5000); // Update every 5 seconds

        console.log("[Payment Service][RabbitMQ] Connected to RabbitMQ successfully");
    } catch (error) {
        console.error("[Payment Service][RabbitMQ] Connection error. Will fallback to synchronous HTTP (Axios)", error.message);
    }
};

// Donation queue stats function now uses top-level DONATION_QUEUE
async function showDonationQueueStats() {
    if (!channel) return;
    try {
        // Ensure the queue exists before checking
        await channel.assertQueue(DONATION_QUEUE, { durable: true });
        const q = await channel.checkQueue(DONATION_QUEUE);
        console.log(`[Payment Service][RabbitMQ] [Queue] '${DONATION_QUEUE}': ${q.messageCount} in queue, ${processedDonations} processed.`);
    } catch (e) {
        // Only log if queue doesn't exist
        if (e && e.message && !e.message.includes('NOT_FOUND')) {
            console.error(`[Payment Service][RabbitMQ] Error checking queue '${DONATION_QUEUE}':`, e.message);
        }
    }
}


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
        processedDonations++;
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
