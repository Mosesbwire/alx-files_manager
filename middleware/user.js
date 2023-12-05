import dbClient from '../utils/db';

class UserMiddleware {
  // eslint-disable-next-line consistent-return
  static async fetchUser(req, res, next) {
    const { userId } = req;
    const user = await dbClient.client.db(dbClient.DATABASE).collection('users').findOne({ _id: userId });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  }
}

export default UserMiddleware;
