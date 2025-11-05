import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import ProjectUserAssignmentService from "@/lib/services/ProjectUserAssignmentService";

export async function GET(req) {
  try {
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    
    if (session.user.role !== "admin") {
      console.warn(`🚫 Unauthorized users list access attempt by: ${session.user.email} (${session.user.role})`);
      return NextResponse.json({ 
        error: "Insufficient permissions", 
        message: "Only administrators can view user lists" 
      }, { status: 403 });
    }

    
    const { db } = await connectToDatabase();
    const users = await db
      .collection("users")
      .aggregate([
        
        {
          $lookup: {
            from: "Projects",
            localField: "availaleProjects",
            foreignField: "_id",
            as: "availableProjectsOld",
          },
        },
        
        {
          $lookup: {
            from: "Projects",
            localField: "assignedProject",
            foreignField: "_id",
            as: "assignedProjectNew",
          },
        },
        {
          $lookup: {
            from: "sessions",
            localField: "_id", 
            foreignField: "userId", 
            as: "sessionInfo",
          },
        },
        {
          $addFields: {
            lastAccessed: { $max: "$sessionInfo.lastAccessed" },
            
            availableProjects: {
              $concatArrays: [
                "$availableProjectsOld",
                "$assignedProjectNew"
              ]
            }
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            contact: 1,
            role: 1,
            availableProjects: {
              projectName: 1,
              color: 1,
            },
            lastAccessed: 1,
          },
        },
      ])
      .toArray();    
    users.forEach(user => {
      console.log(`  - ${user.name}: ${user.availableProjects?.length || 0} projects`);
    });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    
    if (session.user.role !== "admin") {
      console.warn(`🚫 Unauthorized user creation attempt by: ${session.user.email} (${session.user.role})`);
      return NextResponse.json({ 
        error: "Insufficient permissions", 
        message: "Only administrators can create users" 
      }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const body = await req.json();
    const { name, email, contact, accessCode, role, availableProjects, password } = body;

    
    if (!name || !email || !accessCode || !role || !password) {
      return NextResponse.json({ 
        error: "Missing required fields: name, email, accessCode, role, and password are required" 
      }, { status: 400 });
    }

    
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    
    if (!['admin', 'manager', 'staff', 'keeper'].includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be admin, manager, staff, or keeper" }, { status: 400 });
    }

    
    if (password.length < 8) {
      return NextResponse.json({ 
        error: "Password too weak", 
        message: "Password must be at least 8 characters long" 
      }, { status: 400 });
    }

    
    if (contact && !/^[\d\s\+\-\(\)]+$/.test(contact)) {
      return NextResponse.json({ error: "Invalid contact number format" }, { status: 400 });
    }

    
    const existingUserByEmail = await db.collection("users").findOne({ email });
    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    
    const existingUserByAccessCode = await db.collection("users").findOne({ accessCode });
    if (existingUserByAccessCode) {
      return NextResponse.json({ error: "Access code already exists" }, { status: 409 });
    }

    
    const hashedPassword = await bcrypt.hash(password, 12);

    
    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      contact: contact ? contact.trim() : null,
      accessCode: accessCode.trim(),
      role,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      availaleProjects: availableProjects ? availableProjects.map(id => new ObjectId(id)) : []
    };

    
    const result = await db.collection("users").insertOne(userData);

    if (result.insertedId) {
      return NextResponse.json({ 
        message: "User created successfully",
        userId: result.insertedId.toString()
      }, { status: 201 });
    } else {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      console.warn(`🚫 Unauthorized user update attempt by: ${session.user.email} (${session.user.role})`);
      return NextResponse.json({ 
        error: "Insufficient permissions", 
        message: "Only administrators can update users" 
      }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const body = await req.json();

    if (body.removeProjectId) {
      const projectId = body.removeProjectId;
      await db.collection("users").updateMany(
        { availaleProjects: new ObjectId(projectId) },
        { $pull: { availaleProjects: new ObjectId(projectId) } }
      );
      return NextResponse.json({ message: "Project removed from all users" });
    }

    const { userId, name, email, contact, accessCode, role, availableProjects, password } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (contact) updateData.contact = contact;
    if (accessCode) updateData.accessCode = accessCode;
    if (role) updateData.role = role;
    if (availableProjects) {
      updateData.availaleProjects = availableProjects.map(id => new ObjectId(id));
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateData.password = hashedPassword;
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (availableProjects && availableProjects.length > 0) {
      try {
        await ProjectUserAssignmentService.assignProjectsToUser(userId, availableProjects);
      } catch (assignmentError) {
        console.error("Error updating user project assignments:", assignmentError);
      }
    }

    return NextResponse.json({ 
      message: "User updated successfully",
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    
    if (session.user.role !== "admin") {
      console.warn(`🚫 Unauthorized user deletion attempt by: ${session.user.email} (${session.user.role})`);
      return NextResponse.json({ 
        error: "Insufficient permissions", 
        message: "Only administrators can delete users" 
      }, { status: 403 });
    }
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    
    const existingUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(userId) });

    if (result.deletedCount === 1) {
      return NextResponse.json({ 
        message: "User deleted successfully"
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
