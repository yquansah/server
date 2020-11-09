const axios = require('axios').default;
const { StatusCodes } = require('http-status-codes');

const logger = require('../src/logger');

class HttpClient {
  constructor() {
    this.requestInterceptor = this.requestInterceptor.bind(this);
    this.responseErrorInterceptor = this.responseErrorInterceptor.bind(this);

    const client = axios.create({
      baseURL: process.env.API_URL,
    });
    client.interceptors.request.use(this.requestInterceptor);
    client.interceptors.response.use((response) => response, this.responseErrorInterceptor);

    this.client = client;
    this.authenticated = false;
    this.accessToken = null;
    this.refreshToken = null;
  }

  requestInterceptor(config) {
    const newConfig = config;
    if (this.accessToken) {
      newConfig.headers.Authorization = `Bearer ${this.accessToken}`;
    }
    return newConfig;
  }

  async responseErrorInterceptor(error) {
    const originalRequest = error.config;
    console.log(error);
    if (error.response.status === StatusCodes.UNAUTHORIZED && !originalRequest.accessTokenRetry) {
      originalRequest.accessTokenRetry = true;
      const response = await this.client.get('/users/token', { headers: { Authorization: `Bearer ${this.refreshToken}` } });
      if (response.status === StatusCodes.OK) {
        this.accessToken = response.data.accessToken;
      } else {
        this.authenticated = false;
        this.accessToken = null;
        this.refreshToken = null;
        return this.client(originalRequest);
      }
    }

    throw error;
  }

  async login(username, password) {
    try {
      const response = await this.client.post('/users/login', { username, password });
      this.authenticated = true;
      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;
    } catch (error) {
      if (error.response) {
        if (error.response.message) {
          logger.error(error.response.message);
        } else {
          logger.error(`Error contacting server: ${error.response.status}`);
        }
      } else if (error.request) {
        logger.error('Failed to contact server');
      } else {
        logger.error('Client error');
      }
    }
  }

  async logout() {
    this.authenticated = false;
    this.accessToken = null;
    this.refreshToken = null;
    try {
      await this.client.delete('/users/logout');
    } catch (error) {
      if (error.response) {
        if (error.response.message) {
          logger.error(error.response.message);
        } else {
          logger.error(`Error contacting server: ${error.response.status}`);
        }
      } else if (error.request) {
        logger.error('Failed to contact server');
      } else {
        logger.error('Client error');
      }
    }
  }

  async signup(userDoc) {
    try {
      const { data: { user, accessToken, refreshToken } } = await this.client.post('/users/signup', { user: userDoc });
      this.authenticated = true;
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      return user;
    } catch (error) {
      if (error.response) {
        if (error.response.message) {
          logger.error(error.response.message);
        } else {
          logger.error(`Error contacting server: ${error.response.status}`);
        }
      } else if (error.request) {
        logger.error('Failed to contact server');
      } else {
        logger.error('Client error');
        console.log(error);
      }
    }
    return {};
  }
}

const client = new HttpClient();

module.exports = client;
