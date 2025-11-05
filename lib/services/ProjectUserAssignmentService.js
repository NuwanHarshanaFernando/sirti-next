import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * Service to manage bidirectional project-user assignments
 * Ensures consistency between project.warehouseManager and user.availaleProjects fields
 */
class ProjectUserAssignmentService {
  
  /**
   * Assign a warehouse manager to a project
   * @param {string} projectId - The project ID
   * @param {string} userId - The user ID to assign as warehouse manager
   */
  static async assignWarehouseManager(projectId, userId) {
    try {
      const { db } = await connectToDatabase();
      
      // Convert IDs to ObjectId
      const projectObjectId = new ObjectId(projectId);
      const userObjectId = new ObjectId(userId);
      
      // 1. Update project with warehouse manager and add to users array
      await db.collection("Projects").updateOne(
        { _id: projectObjectId },
        { 
          $set: { 
            warehouseManager: userObjectId,
            updatedAt: new Date()
          },
          // Add the warehouse manager to the users array (avoid duplicates)
          $addToSet: { users: userObjectId }
        }
      );
      
      // 2. Add project to user's availaleProjects (using the typo field name that exists in DB)
      await db.collection("users").updateOne(
        { _id: userObjectId },
        { 
          $addToSet: { availaleProjects: projectObjectId },
          $set: { updatedAt: new Date() }
        }
      );
      
      console.log(` Assigned user ${userId} as warehouse manager for project ${projectId} and added to users array`);
      
    } catch (error) {
      console.error("Error in assignWarehouseManager:", error);
      throw error;
    }
  }
  
  /**
   * Assign multiple projects to a user
   * @param {string} userId - The user ID
   * @param {string[]} projectIds - Array of project IDs to assign
   */
  static async assignProjectsToUser(userId, projectIds) {
    try {
      const { db } = await connectToDatabase();
      
      // Convert IDs to ObjectId
      const userObjectId = new ObjectId(userId);
      const projectObjectIds = projectIds.map(id => new ObjectId(id));
      
      // 1. Update user's availaleProjects (using the typo field name that exists in DB)
      await db.collection("users").updateOne(
        { _id: userObjectId },
        { 
          $set: { 
            availaleProjects: projectObjectIds,
            updatedAt: new Date()
          }
        }
      );
      
      // 2. Add this user to each project's users array
      for (const projectId of projectObjectIds) {
        await db.collection("Projects").updateOne(
          { _id: projectId },
          { 
            $addToSet: { users: userObjectId },
            $set: { updatedAt: new Date() }
          }
        );
      }
      
      // 3. For each project, check if this user should be warehouse manager
      // (Optional: only if the user's role is manager or admin)
      const user = await db.collection("users").findOne({ _id: userObjectId });
      if (user && (user.role === 'manager' || user.role === 'admin')) {
        for (const projectId of projectObjectIds) {
          await db.collection("Projects").updateOne(
            { _id: projectId, warehouseManager: { $exists: false } },
            { 
              $set: { 
                warehouseManager: userObjectId,
                updatedAt: new Date()
              } 
            }
          );
        }
      }
      
      console.log(` Assigned ${projectIds.length} projects to user ${userId} and added user to projects' users arrays`);
      
    } catch (error) {
      console.error("Error in assignProjectsToUser:", error);
      throw error;
    }
  }
  
  /**
   * Remove a warehouse manager from a project
   * @param {string} projectId - The project ID
   * @param {string} userId - The user ID to remove as warehouse manager
   */
  static async removeWarehouseManager(projectId, userId) {
    try {
      const { db } = await connectToDatabase();
      
      // Convert IDs to ObjectId
      const projectObjectId = new ObjectId(projectId);
      const userObjectId = new ObjectId(userId);
      
      // 1. Remove warehouse manager from project and remove from users array
      await db.collection("Projects").updateOne(
        { _id: projectObjectId },
        { 
          $unset: { warehouseManager: 1 },
          $pull: { users: userObjectId },
          $set: { updatedAt: new Date() }
        }
      );
      
      // 2. Remove project from user's availaleProjects
      await db.collection("users").updateOne(
        { _id: userObjectId },
        { 
          $pull: { availaleProjects: projectObjectId },
          $set: { updatedAt: new Date() }
        }
      );
      
      console.log(` Removed user ${userId} as warehouse manager from project ${projectId} and removed from users array`);
      
    } catch (error) {
      console.error("Error in removeWarehouseManager:", error);
      throw error;
    }
  }
  
  /**
   * Get all projects assigned to a user
   * @param {string} userId - The user ID
   * @returns {Array} Array of project objects
   */
  static async getUserProjects(userId) {
    try {
      const { db } = await connectToDatabase();
      
      const userObjectId = new ObjectId(userId);
      
      const user = await db.collection("users").aggregate([
        { $match: { _id: userObjectId } },
        {
          $lookup: {
            from: "Projects",
            localField: "availaleProjects",
            foreignField: "_id",
            as: "assignedProjects"
          }
        },
        {
          $project: {
            assignedProjects: {
              _id: 1,
              projectName: 1,
              color: 1,
              warehouseLocation: 1
            }
          }
        }
      ]).toArray();
      
      return user[0]?.assignedProjects || [];
      
    } catch (error) {
      console.error("Error in getUserProjects:", error);
      throw error;
    }
  }
}

export default ProjectUserAssignmentService;