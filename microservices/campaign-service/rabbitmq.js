import amqp from "amqplib";
import axios from "axios";

let channel = null;

export const connectRabbitMQListener = async () => {
    try {
        const connection = await amqp.connect("amqp://localhost");
        channel = await connection.createChannel();
        await channel.assertExchange("donations_exchange", "topic", { durable: true });
        
        // Setup unique queue for campaign service binding
        const q = await channel.assertQueue("campaign_donations_queue", { exclusive: false });
        await channel.bindQueue(q.queue, "donations_exchange", "donation.created");
        
        console.log("? [Campaign Service] Listening for RabbitMQ async donation events...");
        
        channel.consume(q.queue, async (msg) => {
            if (msg !== null) {
                const eventData = JSON.parse(msg.content.toString());
                console.log(`?? [Campaign Service] Received async event for Campaign ID: ${eventData.campaignId} with amount: ${eventData.amount}`);
                
                try {
                    // Locally route it through the existing atomic add-funds endpoint
                    await axios.patch(`http://localhost:5002/api/campaigns/${eventData.campaignId}/add-funds`, { amount: eventData.amount });
                    channel.ack(msg); // Acknowledge successful processing
                } catch (err) {
                    console.error("Failed to process async donation event:", err.message);
                    // Do not ack, so rabbitMQ will retry it later
                }
            }
        });
    } catch (error) {
        console.error("? [Campaign Service] RabbitMQ not found. Will fallback to synchronous HTTP.", error.message);
    }
};
