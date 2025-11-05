import { connectToDatabase } from '@/lib/mongodb';
import { genSalt, hash, compare } from 'bcrypt-ts';

// User schema definition (for reference, not enforced by MongoDB directly)
const userSchema = {
  name: String,
  email: String, // Keeping for backward compatibility
  accessCode: String, // New field for access code
  password: String,
  role: String, // 'admin', 'manager', 'staff', or 'keeper'
  createdAt: Date,
  updatedAt: Date
};

// Helper functions for User model
export async function getUserByEmail(email) {
  const { db } = await connectToDatabase();
  // Support both email and accessCode fields for backward compatibility
  return db.collection('users').findOne({ 
    $or: [
      { email: { $regex: new RegExp('^' + email + '$', 'i') } },
      { accessCode: { $regex: new RegExp('^' + email + '$', 'i') } }
    ]
  });
}

export async function getUserById(id) {
  const { db } = await connectToDatabase();
  return db.collection('users').findOne({ _id: id });
}

export async function createUser(userData) {
  const { db } = await connectToDatabase();
  
  // Prepare user object
  const user = {
    ...userData,
    role: userData.role || 'staff',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Hash password
  const salt = await genSalt(10);
  user.password = await hash(user.password, salt);
  
  // Insert into database
  const result = await db.collection('users').insertOne(user);
  return { ...user, _id: result.insertedId };
}

export async function updateUser(id, userData) {
  const { db } = await connectToDatabase();
  
  // Prepare update data
  const updateData = {
    ...userData,
    updatedAt: new Date()
  };
  
  // Hash password if it's being updated
  if (updateData.password) {
    const salt = await genSalt(10);
    updateData.password = await hash(updateData.password, salt);
  }
  
  // Update in database
  await db.collection('users').updateOne(
    { _id: id },
    { $set: updateData }
  );
  
  return getUserById(id);
}

export async function comparePassword(plainPassword, hashedPassword) {
  return compare(plainPassword, hashedPassword);
}

// Export a default object with all the methods
const UserModel = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  comparePassword
};

export default UserModel;