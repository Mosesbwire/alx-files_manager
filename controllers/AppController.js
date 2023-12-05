import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export function getStatus(req, res) {
  res.status(200).json({
    redis: redisClient.isAlive(),
    db: dbClient.isAlive(),
  });
}

export async function getStats(req, res) {
  const users = await dbClient.nbUsers();
  const files = await dbClient.nbFiles();
  res.status(200).json({
    users,
    files,
  });
}
