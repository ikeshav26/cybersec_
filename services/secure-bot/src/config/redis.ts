import { createClient } from 'redis';
import 'dotenv/config'

const client = createClient({
    url: process.env.REDIS_URL!,
});

export const connectRedis = async () => {
    try {
        await client.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.error('Error connecting to Redis:', err)
    }
}