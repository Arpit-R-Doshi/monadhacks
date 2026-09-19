import axios from 'axios';
import FormData from 'form-data';

const PINATA_API_URL = 'https://api.pinata.cloud';

/**
 * Upload data to IPFS via Pinata
 * @param {Buffer|string} data - Data to upload
 * @param {string} filename - Filename for the pin
 * @returns {Promise<{cid: string, size: number}>}
 */
export async function uploadToIPFS(data, filename = 'encrypted_data') {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    // Fallback: simulate IPFS upload for demo without Pinata
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    const fakeCID = `Qm${hash.substring(0, 44)}`;
    console.log(`[IPFS-SIM] Simulated upload: ${fakeCID}`);
    return { cid: fakeCID, size: Buffer.byteLength(data) };
  }

  const formData = new FormData();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  formData.append('file', buffer, { filename });

  const metadata = JSON.stringify({ name: filename });
  formData.append('pinataMetadata', metadata);

  const res = await axios.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, formData, {
    maxBodyLength: Infinity,
    headers: {
      'Authorization': `Bearer ${jwt}`,
      ...formData.getHeaders(),
    },
  });

  return {
    cid: res.data.IpfsHash,
    size: res.data.PinSize,
  };
}

/**
 * Fetch data from IPFS via gateway
 * @param {string} cid - IPFS CID
 * @returns {Promise<Buffer>}
 */
export async function fetchFromIPFS(cid) {
  const gateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
  const res = await axios.get(`${gateway}/${cid}`, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(res.data);
}

/**
 * Test Pinata connection
 */
export async function testConnection() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return { connected: false, mode: 'simulation' };

  try {
    const res = await axios.get(`${PINATA_API_URL}/data/testAuthentication`, {
      headers: { 'Authorization': `Bearer ${jwt}` },
    });
    return { connected: true, mode: 'pinata', data: res.data };
  } catch (err) {
    return { connected: false, mode: 'pinata', error: err.message };
  }
}
