'use strict';

/** ******* Imports ********/
const {
  bufferToString,
  genRandomSalt,
  generateEG, // async
  computeDH, // async
  verifyWithECDSA, // async
  HMACtoAESKey, // async
  HMACtoHMACKey, // async
  HKDF, // async
  encryptWithGCM, // async
  decryptWithGCM,
  cryptoKeyToJSON, // async
  govEncryptionDataStr,
} = require('./lib');

const { subtle } = require('node:crypto').webcrypto;

/** ******* Implementation ********/
class MessengerClient {
  constructor(certAuthorityPublicKey, govPublicKey) {
    // Public keys for certificate authority and government
    this.caPublicKey = certAuthorityPublicKey;
    this.govPublicKey = govPublicKey;

    // Active connections and certificates
    this.conns = {}; // data for each active connection
    this.certs = {}; // certificates of other users
    this.EGKeyPair = {}; // keypair from generateCertificate
  }

  /**
   * Generate a certificate to be stored with the certificate authority.
   * The certificate must contain the field "username".
   *
   * Arguments:
   *   username: string
   *
   * Return Type: certificate object/dictionary
   */
  async generateCertificate(username, role) {
    try {
      const keyPair = await subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256', // Curve
        },
        true, // Extractable keys
        ['deriveKey', 'deriveBits'] // Usages
      );
  
      const publicKeyJWK = await subtle.exportKey('jwk', keyPair.publicKey);
  
      return {
        username,
        role,
        privateKey: keyPair.privateKey, // Private key for derivation
        publicKey: publicKeyJWK, // Public key to share
      };
    } catch (error) {
      console.error('Error generating certificate:', error.message);
      throw new Error('Failed to generate certificate.');
    }
  }
  
  /**
   * Receive and store another user's certificate.
   *
   * Arguments:
   *   certificate: certificate object/dictionary
   *   signature: ArrayBuffer
   *
   * Return Type: void
   */
  async receiveCertificate(certificate, signature) {
    try {
      // Verify the certificate using CA's public key
      const certString = JSON.stringify(certificate);
      const isValid = await verifyWithECDSA(this.caPublicKey, certString, signature);
      if (!isValid) {
        throw new Error('Invalid certificate signature!');
      }
  
      // Convert the public key from JWK to CryptoKey
      const publicKey = await subtle.importKey(
        'jwk',
        certificate.publicKey, // JWK format
        {
          name: 'ECDH',
          namedCurve: 'P-256', // Ensure the curve matches
        },
        true,
        []
      );
  
      // Store the certificate
      this.certs[certificate.username] = {
        username: certificate.username,
        publicKey, // Store as CryptoKey
      };
  
      console.log(`Certificate for ${certificate.username} stored successfully.`);
    } catch (error) {
      console.error('Error receiving certificate:', error.message);
      throw new Error('Certificate verification failed.');
    }
  }
  

  /**
  * Generate and store a certificate for the client.
  *
  * Arguments:
  *   username: string
  *
  * Return Type: void
  */
  async generateAndStoreCertificate(username) {
    const certificate = await this.generateCertificate(username);
    this.certs[username] = {
     username: certificate.username,
     publicKey: certificate.publicKey,
    };
    console.log(`Certificate for client (${username}) generated and stored.`);
   }
 
   async importECDHPublicKey(publicKeyJWK) {
    try {
      const importedKey = await subtle.importKey(
        'jwk', // Input format
        publicKeyJWK, // Public key in JWK format
        { name: 'ECDH', namedCurve: 'P-256' }, // Algorithm and curve
        true, // Key extractable
        [] // No key usages for public keys
      );
      console.log('Public key imported successfully:', importedKey);
      return importedKey;
    } catch (error) {
      console.error('Error importing public key:', error.message);
      throw new Error('Failed to import recipient public key.');
    }
  }
   
  /**
   * Generate the message to be sent to another user.
   *
   * Arguments:
   *   name: string
   *   plaintext: string
   *
   * Return Type: Tuple of [dictionary, ArrayBuffer]
   */
  async sendMessage(sender, recipient, plaintext) {
    console.log(`Sending message from ${sender} to ${recipient}`);
  
    const senderCert = certificates[sender];
    const recipientCert = certificates[recipient];
  
    if (!senderCert) {
      throw new Error(`Certificate for sender (${sender}) not found.`);
    }
    if (!recipientCert) {
      throw new Error(`Certificate for recipient (${recipient}) not found.`);
    }
  
    // Import the recipient's public key
    const recipientPublicKey = await subtle.importKey(
      'jwk',
      recipientCert.publicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
  
    // Derive the AES key
    const aesKey = await this.computeDH(senderCert.privateKey, recipientPublicKey);
  
    // Encrypt the plaintext using AES-GCM
    const iv = crypto.randomBytes(12); // Generate a random IV
    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      Buffer.from(plaintext, 'utf-8')
    );
  
    console.log('Message encrypted successfully.');
    return {
      header: { iv: Buffer.from(iv).toString('base64') },
      ciphertext: Buffer.from(ciphertext).toString('base64'),
    };
  }
  

  /**
   * Decrypt a message received from another user.
   *
   * Arguments:
   *   name: string
   *   [header, ciphertext]: Tuple of [dictionary, ArrayBuffer]
   *
   * Return Type: string
   */
  async receiveMessage(name, [header, ciphertext]) {
    try {
      // Fetch sender's certificate
      const senderCert = this.certs[name];
      if (!senderCert) throw new Error(`Certificate for ${name} not found`);

      // First message setup: Compute DH shared secret and initialize keys
      if (!this.conns[name]) {
        const sharedSecret = await computeDH(this.EGKeyPair.sec, senderCert.publicKey);
        const rootKey = await HMACtoAESKey(sharedSecret, 'init');
        this.conns[name] = { receivingKey: rootKey };
      }

      const conn = this.conns[name];

      // Derive the message key and decrypt the message
      const messageKey = await HMACtoAESKey(conn.receivingKey, 'message-key');
      const plaintextBuffer = await decryptWithGCM(
        messageKey,
        ciphertext,
        header.receiverIV,
        ''
      );

      // Ratchet the receiving key
      conn.receivingKey = await HMACtoHMACKey(conn.receivingKey, 'ratchet');

      return bufferToString(plaintextBuffer);
    } catch (error) {
      console.error('Error receiving message:', error.message);
      throw new Error('Message decryption failed.');
    }
  }

  /**
   * Get a list of active connections.
   *
   * Return Type: Array of strings (usernames)
   */
  listActiveConnections() {
    return Object.keys(this.conns);
  }
}

module.exports = {
  MessengerClient,
};
