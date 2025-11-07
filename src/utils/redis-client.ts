import { RedisClient } from "bun";
const client = new RedisClient(Bun.env.REDIS_URL);
export default client;