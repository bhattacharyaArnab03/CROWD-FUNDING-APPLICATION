

import amqp from "amqplib";
import axios from "axios";

let channel = null;
let connection = null;

let userExchangeAsserted = false;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:5001";

const MAIN_QUEUE = "user_donations_queue";
const processedIds = new Set();

async function connectRabbitMQWithRetry() {
    while (true) {
        try {
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();
            await channel.assertExchange("donations_exchange", "topic", { durable: true });
            await channel.assertExchange("users_exchange", "topic", { durable: true });
            userExchangeAsserted = true;
            await channel.assertQueue(MAIN_QUEUE, { durable: true });
            await channel.bindQueue(MAIN_QUEUE, "donations_exchange", "donation.created");

            console.log("[User Service][RabbitMQ] Listening for async donation events...");

            channel.prefetch(5);

            channel.consume(MAIN_QUEUE, async (msg) => {
                if (msg !== null) {
                    let eventData;
                    try {
                        eventData = JSON.parse(msg.content.toString());
                    } catch (e) {
                        console.error("[User Service][RabbitMQ] Invalid message format, dropping message.");
                        channel.nack(msg, false, false); // Drop message
                        return;
                    }

                    // Idempotency check
                    const msgId = eventData.transactionNumber || eventData._id;
                    if (msgId && processedIds.has(msgId)) {
                        console.log(`[User Service][RabbitMQ] Duplicate message detected (id: ${msgId}), acking.`);
                        channel.ack(msg);
                        return;
                    }

                    try {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await axios.patch(`${USER_SERVICE_URL}/api/users/${eventData.userId}/totalDonated`, { amount: eventData.amount });
                        channel.ack(msg); // Acknowledge successful processing
                        if (msgId) processedIds.add(msgId);
                    } catch (err) {
                        console.error(`[User Service][RabbitMQ] Processing failed, dropping message:`, err.message);
                        channel.nack(msg, false, false); // Drop message
                    }
                }
            });

            connection.on("close", () => {
                console.warn("[User Service][RabbitMQ] Connection closed. Attempting to reconnect...");
                reconnectRabbitMQ();
            });
            connection.on("error", (err) => {
                console.error("[User Service][RabbitMQ] Connection error:", err.message);
            });
            break;
        } catch (error) {
            console.error("[User Service][RabbitMQ] Connection error. Will fallback to synchronous HTTP.", error.message);
            await new Promise((res) => setTimeout(res, 5000));
        }
    }
}

async function reconnectRabbitMQ() {
    let reconnected = false;
    while (!reconnected) {
        try {
            await connectRabbitMQWithRetry();
            console.log("[User Service][RabbitMQ] Reconnected successfully");
            reconnected = true;
        } catch {
            await new Promise((res) => setTimeout(res, 5000));
        }
    }
}

export const connectRabbitMQListener = connectRabbitMQWithRetry;

// Publishes a user registration event to users_exchange
export const publishUserRegisteredEvent = async (user) => {
    if (!channel) {
        console.error("[User Service][RabbitMQ] Channel not initialized. Cannot publish user registration event.");
        return;
    }
    if (!userExchangeAsserted) {
        await channel.assertExchange("users_exchange", "topic", { durable: true });
        userExchangeAsserted = true;
    }
    const event = {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        registeredAt: user.createdAt || new Date().toISOString()
    };
    channel.publish(
        "users_exchange",
        "user.registered",
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
    );
    console.log("[User Service][RabbitMQ] Published user.registered event:", event);
};
