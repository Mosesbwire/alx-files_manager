import express from 'express';
import { getStats, getStatus } from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import Auth from '../middleware/authMiddleware';
import UserMiddleware from '../middleware/user';

const route = express.Router();

route.get('/status', getStatus);
route.get('/stats', getStats);
route.post('/users', UsersController.postNew);
route.get('/connect', AuthController.getConnect);
route.get('/disconnect', Auth.isAuthenticated, AuthController.getDisconnect);
route.get('/users/me', Auth.isAuthenticated, UserMiddleware.fetchUser, AuthController.getMe);
route.post('/files', Auth.isAuthenticated, UserMiddleware.fetchUser, FilesController.postUpload);
route.get('/files/:id', Auth.isAuthenticated, UserMiddleware.fetchUser, FilesController.getShow);
route.get('/files', Auth.isAuthenticated, UserMiddleware.fetchUser, FilesController.getIndex);
route.put('/files/:id/publish', Auth.isAuthenticated, UserMiddleware.fetchUser, FilesController.putPublish);
route.put('/files/:id/unpublish', Auth.isAuthenticated, UserMiddleware.fetchUser, FilesController.putUnpublish);
route.get('/files/:id/data', Auth.isAuthenticated, UserMiddleware.fetchUser, FilesController.getFile);

module.exports = route;
