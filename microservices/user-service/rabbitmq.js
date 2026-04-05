import amqp from "amqplib";
import axios from "axios";

let channel = null;

export const connectRabbitMQListener = async () => {
    try {
        const connection = await amqp.connect("amqp://localhost");
        channel = await connection.createChannel();
        await channel.assertExchange("donations_exchange", "topic", { durable: true });
        
        // Setup unique queue for user service binding
        const q = await channel.assertQueue("user_donations_queue", { exclusive: false });
        await channel.bindQueue(q.queue, "donations_exchange", "donation.created");
        
        console.log("? [User Service] Listening for RabbitMQ async donation events...");
        
        // Prevent HTTP stampede by processing only 5 messages at a time concurrenty
        channel.prefetch(5);
        
        channel.consume(q.queue, async (msg) => {
            if (msg !== null) {
                const eventData = JSON.parse(msg.content.toString());
                
                // ARTIFICIAL DELAY: Slow down processing by 1 second so you can visually see the queue fill up in the RabbitMQ Dashboard!
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log(`?? [User Service] Received async event for User ID: ${eventData.userId} with amount: ${eventData.amount}`);
                
                try {
                    // Locally route it through the existing atomic add-funds endpoint
                    await axios.patch(`http://localhost:5001/api/users/${eventData.userId}/totalDonated`, { amount: eventData.amount });
                    channel.ack(msg); // Acknowledge successful processing
                } catch (err) {
                    console.error("Failed to process async user totalDonated event:", err.message);
                    // Do not ack, so rabbitMQ will retry it later
                }
            }
        });
    } catch (error) {
        console.error("? [User Service] RabbitMQ not found. Will fallback to synchronous HTTP.", error.message);
    }
};
