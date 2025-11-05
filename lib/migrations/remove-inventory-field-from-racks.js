// Migration: Remove inventory field from racks collection
// This cleans up the old inventory references that are no longer needed

import { connectToDatabase } from "../mongodb.js";

async function removeInventoryFieldFromRacks() {
  try {
    const { db } = await connectToDatabase();

    console.log("Starting migration: Remove inventory field from racks...");

    // Remove the inventory field from all rack documents
    const result = await db
      .collection("racks")
      .updateMany(
        { inventory: { $exists: true } },
        { $unset: { inventory: "" } }
      );

    console.log(`Migration completed successfully:`);
    console.log(`- Documents matched: ${result.matchedCount}`);
    console.log(`- Documents modified: ${result.modifiedCount}`);

    // Verify the cleanup
    const remainingWithInventory = await db
      .collection("racks")
      .countDocuments({ inventory: { $exists: true } });
    console.log(
      `- Documents with inventory field remaining: ${remainingWithInventory}`
    );

    if (remainingWithInventory === 0) {
      console.log(
        " Migration successful: All inventory fields removed from racks"
      );
    } else {
      console.log(" Warning: Some documents still have inventory field");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration if called directly
if (
  process.argv[1] ===
  import.meta.url.replace("file://", "").replace(/\//g, "\\")
) {
  removeInventoryFieldFromRacks()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { removeInventoryFieldFromRacks };
