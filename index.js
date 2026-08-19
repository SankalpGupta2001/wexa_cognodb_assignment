import 'dotenv/config';
import app from './app/index.js';
import dotenv from 'dotenv';
import http from 'http';

// For env File
dotenv.config();
const port = process.env.PORT || 80;

const httpServer = http.createServer(app);

httpServer.listen(port);
