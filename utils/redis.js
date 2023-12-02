import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.log(err));
    this.client.on('connect', () => console.log('Connected to redis'));
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const asyncGet = promisify(this.client.get).bind(this.client);
    const data = await asyncGet(key);
    return data;
  }

  async set(key, value, expirationTime) {
    const asyncSet = promisify(this.client.setex).bind(this.client);
    await asyncSet(key, expirationTime, value);
  }

  async del(key) {
    const asyncDel = promisify(this.client.del).bind(this.client);
    await asyncDel(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
