const { logs } = require('../logging');

module.exports.decrypt = async function decrypt(basePath, clientConfigPath, next) {
  const fs = require('fs');
  const { promisify } = require('util');
  const readFile = promisify(fs.readFile);

  // Import the library and create a client
  const kms = require('@google-cloud/kms');
  const client = new kms.KeyManagementServiceClient();

  // The location of the crypto key's key ring, e.g. "global"
  const locationId = 'global';

  // Reads the client configuration file
  const configBuffer = await readFile(clientConfigPath);
  const {
    projectId,
    keyRingId,
    cryptoKeyId,
  } = JSON.parse(configBuffer);

  // Reads the file to be decrypted
  const contentsBuffer = await readFile(basePath + '.enc');
  const name = client.cryptoKeyPath(
    projectId,
    locationId,
    keyRingId,
    cryptoKeyId
  );
  const ciphertext = contentsBuffer.toString('base64');

  // Decrypts the file using the specified crypto key
  const [result] = await client.decrypt({ name, ciphertext });

  // Writes the decrypted file to disk
  const writeFile = promisify(fs.writeFile);
  await writeFile(basePath, Buffer.from(result.plaintext, 'base64'));
  logs(`decrypted ${basePath}.enc result saved to ${basePath}`);

  next();
}
// [END kms_decrypt]