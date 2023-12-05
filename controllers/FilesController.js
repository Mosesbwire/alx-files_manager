import fs from 'node:fs';
import { v4 as uuid } from 'uuid';
import { Buffer } from 'node:buffer';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import { addJobToFileQueue } from '../worker';

const fileTypes = {
  image: 'image',
  file: 'file',
  folder: 'folder',
};

class FilesController {
  static async postUpload(req, res) {
    const { body, userId } = req;
    const {
      name, type, data, parentId, isPublic,
    } = body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || type in fileTypes === false) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== fileTypes.folder) {
      return res.status(400).json({ error: 'Missing data' });
    }
    if (parentId) {
      const parent = await dbClient.client.db(dbClient.DATABASE).collection('files').findOne({ parentId });
      if (!parent) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parent.type !== fileTypes.folder) {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    const doc = {
      userId,
      name,
      type,
      parentId: parentId || 0,
      isPublic: isPublic || false,
    };
    if (type === fileTypes.folder) {
      const folder = await dbClient.client.db(dbClient.DATABASE).collection('files').insertOne(doc);
      return res.status(201).json(folder.ops[0]);
    }
    const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const content = Buffer.from(data, 'base64').toString('utf-8');
    const absolutePath = `${filePath}/${uuid()}`;

    if (!fs.existsSync(filePath)) {
      // eslint-disable-next-line consistent-return
      fs.mkdir(filePath, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Server error: Try again' });
        }
      });
    }
    // eslint-disable-next-line consistent-return
    fs.writeFile(absolutePath, content, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save files. Try again' });
      }
    });
    // eslint-disable-next-line dot-notation
    doc['localPath'] = absolutePath;
    const file = await dbClient.client.db(dbClient.DATABASE).collection('files').insertOne(doc);
    if (type === fileTypes.image) {
      await addJobToFileQueue({ fileId: file._id, userId });
    }
    return res.status(201).json(file.ops[0]);
  }

  static async getShow(req, res) {
    let { userId } = req;
    let fileId = req.params.id;
    try {
      userId = new ObjectId(userId);
      fileId = new ObjectId(fileId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid id type' });
    }
    const file = await dbClient.client.db(dbClient.DATABASE).collection('files').findOne({ _id: fileId, userId });

    if (!file) {
      return res.status(404).json({ error: 'Not Found' });
    }
    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const pageSize = 20;
    let { userId } = req;
    const { page } = req.query || 1;
    const parentId = req.query.parentId || 0;
    const skip = (page - 1) * pageSize;

    try {
      userId = new ObjectId(userId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid id type' });
    }
    const files = await dbClient.client.db(dbClient.DATABASE).collection('files').find({ parentId, userId }).skip(skip)
      .limit(pageSize)
      .toArray();

    return res.status(200).json(files);
  }

  static async isPublicUpdated(req, value) {
    let fileId = req.params.id;
    let { userId } = req;

    try {
      fileId = new ObjectId(fileId);
      userId = new ObjectId(userId);
    } catch (err) {
      return { data: null, error: { status: 400, message: 'Invalid id type' } };
    }
    const file = await dbClient.client.db(dbClient.DATABASE).collection('files').findOneAndUpdate({ _id: fileId, userId }, { $set: { isPublic: value } }, { returnDocument: 'after' });
    if (!file.value) {
      return { data: null, error: { status: 404, message: 'Not found' } };
    }
    return { data: file.value, error: null };
  }

  static async putPublish(req, res) {
    const { data, error } = await FilesController.isPublicUpdated(req, true);
    if (!data) {
      res.status(error.status).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  static async putUnpublish(req, res) {
    const { data, error } = await FilesController.isPublicUpdated(req, false);
    if (!data) {
      res.status(error.status).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // eslint-disable-next-line consistent-return
  static async getFile(req, res) {
    let fileId = req.params.id;
    const { userId } = req;
    try {
      fileId = new ObjectId(fileId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid id type' });
    }
    const file = await dbClient.client.db(dbClient.DATABASE).collection('files').findOne({ _id: fileId });
    if (!file) {
      console.log('not in db');
      return res.status(404).json({ error: 'Not Found' });
    }
    if (file.type === fileTypes.folder) {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }
    if (!file.isPublic && file.userId.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Not Found' });
    }

    fs.readFile(file.localPath, 'utf-8', (err, data) => {
      if (err) {
        return res.status(404).json({ error: 'Not Found' });
      }

      res.setHeader('Content-Type', mime.contentType(file.name));
      return res.status(200).json(data);
    });
  }
}

export default FilesController;
