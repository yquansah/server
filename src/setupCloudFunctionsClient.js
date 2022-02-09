const { CloudFunctionsServiceClient } = require('@google-cloud/functions');

const clientOptions = {};
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
  clientOptions.credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('ascii'));
}
const client = new CloudFunctionsServiceClient(clientOptions);

module.exports = client;
