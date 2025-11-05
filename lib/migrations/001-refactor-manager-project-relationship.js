/**
 * Migration: Refactor Manager-Project Relationship
 *
 * OLD STRUCTURE:
 * - 1 manager can have MANY projects (via availaleProjects array in Users)
 * - 1 project has 1 warehouse manager
 *
 * NEW STRUCTURE:
 * - 1 manager can have only 1 project (via assignedProject field in Users)
 * - 1 project can be assigned by many managers (via assignedManagers array in Projects)
 */

import { connectToDatabase } from "../mongodb.js";
import { ObjectId } from "mongodb";

const migrateManagerProjectRelationship = async () => {

  try {
    const { db } = await connectToDatabase();

    // Step 1: Get all users with availaleProjects
    const usersWithProjects = await db
      .collection("users")
      .find({
        availaleProjects: { $exists: true, $ne: [], $ne: null },
      })
      .toArray();


    // Step 2: Process each user
    for (const user of usersWithProjects) {
      const userId = user._id;
      const availableProjects = user.availaleProjects || [];

      if (availableProjects.length === 0) continue;

      // NEW RULE: 1 manager = 1 project (keep the first one)
      const assignedProject = availableProjects[0];

      // Update user: set assignedProject, remove availaleProjects
      await db.collection("users").updateOne(
        { _id: userId },
        {
          $set: { assignedProject: assignedProject },
          $unset: { availaleProjects: "" },
        }
      );

      // Update all projects this user was assigned to
      for (const projectId of availableProjects) {
        // Add user to project's assignedManagers array
        await db.collection("Projects").updateOne(
          { _id: new ObjectId(projectId) },
          {
            $addToSet: { assignedManagers: userId },
          }
        );
      }

     
    }

    // Step 3: Initialize assignedManagers for projects that don't have it
    const projectsWithoutAssignedManagers = await db
      .collection("Projects")
      .find({
        assignedManagers: { $exists: false },
      })
      .toArray();

 

    for (const project of projectsWithoutAssignedManagers) {
      const warehouseManager = project.warehouseManager;

      await db.collection("Projects").updateOne(
        { _id: project._id },
        {
          $set: {
            assignedManagers: warehouseManager ? [warehouseManager] : [],
          },
        }
      );
    }

    // Step 4: Handle orphaned projects (projects with no assigned managers)
    await handleOrphanedProjects(db);

    // Step 5: Verify migration
    await verifyMigration(db);


    return {
      success: true,
      usersProcessed: usersWithProjects.length,
      projectsUpdated: projectsWithoutAssignedManagers.length,
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

async function handleOrphanedProjects(db) {

  const orphanedProjects = await db
    .collection("Projects")
    .find({
      $or: [
        { assignedManagers: { $exists: false } },
        { assignedManagers: { $size: 0 } },
      ],
    })
    .toArray();

  if (orphanedProjects.length > 0) {


    // Find managers without assigned projects
    const availableManagers = await db
      .collection("users")
      .find({
        role: { $in: ["manager", "admin"] },
        assignedProject: { $exists: false },
      })
      .toArray();

    let managerIndex = 0;

    for (const project of orphanedProjects) {
      if (managerIndex < availableManagers.length) {
        const manager = availableManagers[managerIndex];

        // Assign project to manager
        await db
          .collection("users")
          .updateOne(
            { _id: manager._id },
            { $set: { assignedProject: project._id } }
          );

        // Add manager to project
        await db.collection("Projects").updateOne(
          { _id: project._id },
          {
            $set: {
              assignedManagers: [manager._id],
              warehouseManager: manager._id, // Also set as warehouse manager if not set
            },
          }
        );

    
        managerIndex++;
      } else {
        console.log(
          `     No available managers for project ${project.projectName}`
        );
      }
    }
  }
}

async function verifyMigration(db) {

  // Count users with old structure
  const usersWithOldStructure = await db.collection("users").countDocuments({
    availaleProjects: { $exists: true },
  });

  // Count users with new structure
  const usersWithNewStructure = await db.collection("users").countDocuments({
    assignedProject: { $exists: true },
  });

  // Count projects with assignedManagers
  const projectsWithAssignedManagers = await db
    .collection("Projects")
    .countDocuments({
      assignedManagers: { $exists: true, $ne: [] },
    });

  const totalProjects = await db.collection("Projects").countDocuments({});

  console.log(
    `   - Users with old structure (availaleProjects): ${usersWithOldStructure}`
  );
  console.log(
    `   - Users with new structure (assignedProject): ${usersWithNewStructure}`
  );
  console.log(
    `   - Projects with assignedManagers: ${projectsWithAssignedManagers}/${totalProjects}`
  );

  if (usersWithOldStructure > 0) {
    console.log(
      "  Warning: Some users still have the old availaleProjects structure"
    );
  }

  if (projectsWithAssignedManagers < totalProjects) {
    console.log("  Warning: Some projects don't have assignedManagers");
  }
}

// Export the migration function
export { migrateManagerProjectRelationship };
