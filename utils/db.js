import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.HOST = process.env.DB_HOST || 'localhost';
    this.PORT = process.env.DB_PORT || 27017;
    this.DATABASE = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(`mongodb://${this.HOST}:${this.PORT}`, { useUnifiedTopology: true });
    this.client.connect(() => console.log('Connected to mongoDB'));
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const users = await this.client.db().collection('users').countDocuments();
    return users;
  }

  async nbFiles() {
    const files = await this.client.db().collection('files').countDocuments();
    return files;
  }
}

const dbClient = new DBClient();

export default dbClient;
