import crypto from 'node:crypto';
import fs from 'node:fs';

function isSecretKeyAvailable() {
  return new Promise((resolve, reject) => {
    fs.readFile('./key.txt', 'utf-8', (err, data) => {
      if (err) {
        reject(new Error('Failed to find encryption key', { err }));
      }
      resolve(data);
    });
  });
}

function persistSecretKey(key) {
  fs.writeFile('./key.txt', key, (err) => {
    if (err) throw new Error('Failed to persist encryption key');
  });
}

export async function createSecretKey() {
  try {
    const data = await isSecretKeyAvailable();
    process.env.SECRET_KEY = data;
  } catch (err) {
    if (err.message === 'Failed to find encryption key') {
      const secretKey = crypto.randomBytes(32).toString('base64');
      persistSecretKey(secretKey);
      process.env.SECRET_KEY = secretKey;
    }
  }
}

export async function hashPassword(password) {
  const key = process.env.SECRET_KEY;
  const initVector = crypto.randomBytes(12).toString('base64');
  if (!key) throw new Error('Encryption key missing');
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'base64'), Buffer.from(initVector, 'base64'));
  let cipherText = cipher.update(password, 'utf-8', 'base64');
  cipherText += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return { cipherText, initVector, tag: tag.toString('base64') };
}

function decryptPassword(password, initVector, tag) {
  const key = process.env.SECRET_KEY;
  if (!key) throw new Error('Encryption key missing');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'base64'), Buffer.from(initVector, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  let plainText = decipher.update(password, 'base64', 'utf-8');
  plainText += decipher.final('utf-8');
  return plainText;
}

export async function comparePassword(userPassword, hashedPassword, initVector, tag) {
  const pwd = decryptPassword(hashedPassword, initVector, tag);
  return pwd === userPassword;
}
