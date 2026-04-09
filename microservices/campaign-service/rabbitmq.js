
import amqp from "amqplib";
import axios from "axios";

let channel = null;
let connection = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const CAMPAIGN_SERVICE_URL = process.env.CAMPAIGN_SERVICE_URL || "http://localhost:5002";

const MAIN_QUEUE = "campaign_donations_queue";
const processedIds = new Set();

export const connectRabbitMQListener = async () => {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertExchange("donations_exchange", "topic", { durable: true });
        await channel.assertQueue(MAIN_QUEUE, { durable: true });
        await channel.bindQueue(MAIN_QUEUE, "donations_exchange", "donation.created");

        console.log("[Campaign Service][RabbitMQ] Listening for async donation events...");

        channel.prefetch(5);

        channel.consume(MAIN_QUEUE, async (msg) => {
            if (msg !== null) {
                let eventData;
                try {
                    eventData = JSON.parse(msg.content.toString());
                } catch (e) {
                    console.error("[Campaign Service][RabbitMQ] Invalid message format, dropping message.");
                    channel.nack(msg, false, false); // Drop message
                    return;
                }

                // Idempotency check
                const msgId = eventData.transactionNumber || eventData._id;
                if (msgId && processedIds.has(msgId)) {
                    console.log(`[Campaign Service][RabbitMQ] Duplicate message detected (id: ${msgId}), acking.`);
                    channel.ack(msg);
                    return;
                }

                try {
                    // Simulate processing delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Locally route it through the existing atomic add-funds endpoint
                    const result = await axios.patch(`${CAMPAIGN_SERVICE_URL}/api/campaigns/${eventData.campaignId}/add-funds`, { amount: eventData.amount });
                    console.log("[Campaign Service][RabbitMQ] DB update result:", result.data);
                    channel.ack(msg); // Acknowledge successful processing
                    if (msgId) processedIds.add(msgId);
                    console.log("[Campaign Service][RabbitMQ] Message acknowledged.");
                } catch (err) {
                    console.error(`[Campaign Service][RabbitMQ] Processing failed, dropping message:`, err.message);
                    channel.nack(msg, false, false); // Drop message
                }
            }
        });
    } catch (error) {
        console.error("[Campaign Service][RabbitMQ] Connection error. Will fallback to synchronous HTTP.", error.message);
    }
};

// Graceful shutdown for RabbitMQ
const shutdown = async () => {
    try {
        if (channel) {
            await channel.close();
            console.log("[Campaign Service][RabbitMQ] Channel closed.");
        }
        if (connection) {
            await connection.close();
            console.log("[Campaign Service][RabbitMQ] Connection closed.");
        }
    } catch (err) {
        console.error("[Campaign Service][RabbitMQ] Error during shutdown:", err);
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
