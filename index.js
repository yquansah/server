require('app-module-path').addPath(__dirname);
const setup = require('src/loaders');
const logger = require('src/logger');

setup(process.env.PORT, logger, process.env.MONGODB_CONNECTION_URL);
