import { MongoClient } from 'mongodb';

const getMongoConnection = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(uri);
  await client.connect();
  return client;
};

/**
 * @param {string} type
 * @returns {Promise<string>}
 */
export async function generateTransactionId(type, isOrder = false) {
  const client = await getMongoConnection();

  try {
    const db = client.db();
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');

    let prefix, transactionType;
    if (type === 'in' || type === 'IN') {
      prefix = 'GRN';
      transactionType = 'in';
    } else if ((type === 'out' || type === 'OUT') && isOrder) {
      prefix = 'DN';
      transactionType = 'out';
    } else if (type === 'out' || type === 'OUT') {
      prefix = 'DN';
      transactionType = 'out';
    }

    const existingCount = await db.collection('stocktransactions').countDocuments({
      type: transactionType,
      transactionId: { $regex: `^${prefix}-${dateStr}-`, $options: 'i' }
    });

    const sequenceNumber = existingCount + 1;
    const transactionId = `${prefix}-${dateStr}-${sequenceNumber}`.toUpperCase();

    console.log(`Generated transaction ID: ${transactionId} for type: ${type}, isOrder: ${isOrder}`);

    return transactionId;
  } finally {
    await client.close();
  }
}

/**
 * @param {string} type
 * @param {boolean} isOrder
 * @returns {Promise<string>}
 */
export async function previewNextTransactionId(type, isOrder = false) {
  const client = await getMongoConnection();

  try {
    const db = client.db();

    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');

    let prefix, transactionType;
    if (type === 'in' || type === 'IN') {
      prefix = 'GRN';
      transactionType = 'in';
    } else if ((type === 'out' || type === 'OUT') && isOrder) {
      prefix = 'DN';
      transactionType = 'out';
    } else if (type === 'out' || type === 'OUT') {
      prefix = 'DN';
      transactionType = 'out';
    }

    const existingCount = await db.collection('stocktransactions').countDocuments({
      type: transactionType,
      transactionId: { $regex: `^${prefix}-${dateStr}-`, $options: 'i' }
    });

    const nextSequence = existingCount + 1;
    const nextTransactionId = `${prefix}-${dateStr}-${nextSequence}`.toUpperCase();

    return nextTransactionId;
  } finally {
    await client.close();
  }
}
