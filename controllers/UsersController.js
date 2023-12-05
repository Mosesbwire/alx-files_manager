import { hashPassword } from '../utils/encryption';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const user = await dbClient.client.db(dbClient.DATABASE).collection('users').findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const data = await hashPassword(password);
    const doc = {
      email,
      password: data.cipherText,
      vector: data.initVector,
      authTag: data.tag,
    };

    const results = await dbClient.client.db(dbClient.DATABASE).collection('users').insertOne(doc);
    const clienData = {
      email: results.ops[0].email,
      password: results.ops[0].password,
      id: results.ops[0]._id,
    };
    return res.status(201).json(clienData);
  }
}

export default UsersController;
