import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import clientPromise from '@/lib/mongodb';
import { getUserByEmail, comparePassword } from '@/lib/models/User';
import { ObjectId } from 'mongodb';

async function storeSession(userId, email, name, role) {
  try {
    if (!userId || !email) {
      console.error("Missing required user data for session storage");
      return false;
    }
    
    const client = await clientPromise;
    const db = client.db();
    
    const sessionCollection = db.collection('sessions');
    
    const existingSession = await sessionCollection.findOne({
      userId: userId
    });
    
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30); 
    
    const sessionToken = `${userId}_${now.getTime()}`;
    
    if (existingSession) {
      await sessionCollection.updateOne(
        { userId: userId },
        { 
          $set: {
            sessionToken: sessionToken,
            expires: expiresAt,
            lastAccessed: now
          }
        }
      );
      if (process.env.NODE_ENV === 'development') {
        console.log("Updated existing session for user:", email);
      }
    } else {
      const newSession = {
        userId: userId,
        sessionToken: sessionToken,
        expires: expiresAt,
        userEmail: email,
        userName: name,
        userRole: role,
        createdAt: now,
        lastAccessed: now
      };
      
      await sessionCollection.insertOne(newSession);
      if (process.env.NODE_ENV === 'development') {
        console.log("Created new session for user:", email);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error storing session in MongoDB:", error);
    return false;
  }
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Access Code', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log("Attempting to authorize:", credentials.email);
          }
          
          const user = await getUserByEmail(credentials.email);
          
          if (!user) {
            if (process.env.NODE_ENV === 'development') {
              console.log("User not found:", credentials.email);
            }
            return null;
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log("User found:", user.email, "with role:", user.role);
          }
          
          const passwordMatch = await comparePassword(credentials.password, user.password);
          if (!passwordMatch) {
            if (process.env.NODE_ENV === 'development') {
              console.log("Password doesn't match for user:", user.email);
            }
            return null;
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log("Authentication successful for:", user.email);
          }
          
          const sessionStored = await storeSession(
            user._id.toString(),
            user.email,
            user.name,
            user.role
          );
          
          if (!sessionStored) {
            console.error("Failed to store session for user:", user.email);
          }
          
          return {
            id: user._id.toString(),
            email: user.email || user.accessCode, // For backward compatibility
            accessCode: user.accessCode || user.email, // New field
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        
        try {
          const client = await clientPromise;
          const db = client.db();
          
          await db.collection('sessions').updateOne(
            { userId: user.id },
            { $set: { lastAccessed: new Date() } }
          );
        } catch (error) {
          console.error("Error updating session lastAccessed:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.id = token.id;
        
        try {
          const client = await clientPromise;
          const db = client.db();
          
          const user = await db.collection('users').findOne({ _id: new ObjectId(token.id) });
          if (user) {
            session.user.availableProjects = user.availaleProjects || user.availableProjects || [];
            session.user.assignedProject = user.assignedProject || null;
            session.user.projects = (user.availaleProjects || user.availableProjects || []).map(p => {
              try {
                return (p?._id || p)?.toString();
              } catch {
                return p;
              }
            });
          }
        } catch (error) {
          console.error("Error fetching user projects for session:", error);
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('/api/auth/signin') || url.includes('/login')) {
        return baseUrl;
      }
      
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      return baseUrl;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 