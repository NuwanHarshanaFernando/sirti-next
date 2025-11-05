// Migration script to add accessCode field to all users
import { connectToDatabase } from '@/lib/mongodb';

export async function migrateUsersToAccessCode() {
  try {
    const { db } = await connectToDatabase();
    const users = await db.collection('users').find({}).toArray();
    
    for (const user of users) {
      // Skip users that already have accessCode
      if (user.accessCode) continue;
      
      // Update user to include accessCode (using existing email as default value)
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            accessCode: user.email,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`Updated user ${user._id} to include accessCode`);
    }
    
    console.log('Migration completed successfully');
    return { success: true, count: users.length };
  } catch (error) {
    console.error('Error in migration:', error);
    return { success: false, error: error.message };
  }
}

// Export a function to run the migration
export default migrateUsersToAccessCode;
