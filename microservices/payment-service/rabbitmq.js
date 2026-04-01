import amqp from "amqplib";

let channel = null;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect("amqp://localhost");
        channel = await connection.createChannel();
        await channel.assertExchange("donations_exchange", "topic", { durable: true });
        console.log("? [Payment Service] Connected to RabbitMQ successfully"); 
    } catch (error) {
        console.error("? [Payment Service] RabbitMQ not found. Will fallback to synchronous HTTP (Axios)", error.message);
    }
};

export const publishDonationEvent = async (eventData) => {
    if (!channel) {
        return false; // Tells the router to fallback to synchronous axios      
    }
    try {
        channel.publish("donations_exchange", "donation.created", Buffer.from(JSON.stringify(eventData)));
        console.log("?? [Payment Service] Published async donation event to RabbitMQ");
        return true;
    } catch (error) {
        console.error("Failed to publish message:", error);
        return false;
    }
};
