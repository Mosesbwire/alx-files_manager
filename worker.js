import Queue from 'bull/lib/queue';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'node:fs';
import dbClient from './utils/db';

const fileQueue = new Queue('generate thumb-nail');
const DEFAULT_WIDTH_SIZES = [100, 250, 500];

async function generateThumbnail(filePath, size) {
  try {
    const thumbnail = await imageThumbnail(filePath, { width: size });
    fs.writeFile(`filePath_${size}`, thumbnail, (err) => {
      if (err) {
        throw new Error('Failed to save thumbnail');
      }
    });
  } catch (err) {
    throw new Error('Failed to generate thumbnail');
  }
}

fileQueue.process(async (job, done) => {
  const { data } = job;
  if (!data.fileId) {
    throw new Error('Missing fileId');
  }
  if (!data.userId) {
    throw new Error('Missing userId');
  }
  let { fileId } = data;
  try {
    fileId = new ObjectId(fileId);
  } catch (err) {
    throw new Error('Invalid id type');
  }

  const file = await dbClient.client.db(dbClient.DATABASE).collection('files').findOne({ _id: fileId, userId: data.userId });
  if (!file) {
    throw new Error('File not found');
  }
  // eslint-disable-next-line max-len
  Promise.all(DEFAULT_WIDTH_SIZES.map((size) => generateThumbnail(file.localPath, size))).then(() => {
    done();
  });
});
// eslint-disable-next-line import/prefer-default-export
export async function addJobToFileQueue(job) {
  await fileQueue.add(job);
}
