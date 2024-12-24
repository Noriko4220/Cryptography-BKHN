const { subtle } = require('crypto').webcrypto;

async function generateKeys() {
  try {
    console.log('Generating Certificate Authority (CA) key pair...');
    const caKeyPair = await subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );

    console.log('Generating Government key pair...');
    const govKeyPair = await subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );
    const certAuthorityPublicKey = await subtle.exportKey('jwk', caKeyPair.publicKey);
    const govPublicKey = await subtle.exportKey('jwk', govKeyPair.publicKey);

    const certAuthorityPrivateKey = await subtle.exportKey('jwk', caKeyPair.privateKey);
    const govPrivateKey = await subtle.exportKey('jwk', govKeyPair.privateKey);

    console.log('Certificate Authority Public Key:', JSON.stringify(certAuthorityPublicKey, null, 2));
    console.log('Government Public Key:', JSON.stringify(govPublicKey, null, 2));
    console.log('Certificate Authority Private Key:', JSON.stringify(certAuthorityPrivateKey, null, 2));
    console.log('Government Private Key:', JSON.stringify(govPrivateKey, null, 2));

    return { certAuthorityPublicKey, govPublicKey };
  } catch (error) {
    console.error('Error generating keys:', error);
  }
}

generateKeys();
