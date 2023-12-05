import express from 'express';
import route from './routes/index';
import { createSecretKey } from './utils/encryption';

const app = express();

createSecretKey();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(route);
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
