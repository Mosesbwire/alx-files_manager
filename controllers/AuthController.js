import { v4 as uuid } from 'uuid';
import { Buffer } from 'buffer';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { comparePassword } from '../utils/encryption';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).json({ error: 'Authorization Header is missing' });
    }
    const authScheme = authHeader.split(' ')[0];
    if (authScheme !== 'Basic') {
      return res.status(400).json({ error: 'invalid authorization scheme' });
    }
    let userCredentials = authHeader.split(' ')[1];
    userCredentials = Buffer.from(userCredentials, 'base64').toString('utf-8');
    userCredentials = userCredentials.split(':');
    const email = userCredentials[0];
    const password = userCredentials[1];

    const user = await dbClient.client.db(dbClient.DATABASE).collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const correctPwd = await comparePassword(password, user.password, user.vector, user.authTag);

    if (!correctPwd) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = uuid();
    const key = `auth_${token}`;
    const expTime = 24 * 60 * 60;
    await redisClient.set(key, user._id.toString(), expTime);
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const { token } = req;
    await redisClient.del(token);
    return res.status(204).json();
  }

  static async getMe(req, res) {
    const { user } = req;
    return res.status(200).json({ email: user.email, id: user._id });
  }
}

export default AuthController;
