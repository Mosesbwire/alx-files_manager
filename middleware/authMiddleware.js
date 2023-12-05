import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';

class Auth {
  // eslint-disable-next-line consistent-return
  static async isAuthenticated(req, res, next) {
    const { headers } = req;
    const authToken = headers['x-token'];
    if (!authToken) {
      return res.status(400).json({ error: 'X-Token Header is missing' });
    }
    const key = `auth_${authToken}`;
    let userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    userId = new ObjectId(userId);
    req.userId = userId;
    req.token = key;
    next();
  }
}

export default Auth;
