// Migration script to convert base64 images to files
// Run this script to convert existing base64 product images to file storage

const { connectToDatabase } = require('../lib/mongodb');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function migrateBase64ToFiles() {
  
  try {
    const { db } = await connectToDatabase();
    const products = await db.collection('products').find({
      productImage: { $regex: '^data:image/' }
    }).toArray();


    let converted = 0;
    let errors = 0;

    for (const product of products) {
      try {
        if (product.productImage && product.productImage.startsWith('data:image/')) {
          // Extract file extension and base64 data
          const matches = product.productImage.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (!matches) {
            continue;
          }

          const [, extension, base64Data] = matches;
          const buffer = Buffer.from(base64Data, 'base64');

          // Generate unique filename
          const fileName = `${uuidv4()}.${extension}`;
          const filePath = path.join(process.cwd(), 'public', 'images', 'productImages', fileName);

          // Write file
          await fs.writeFile(filePath, buffer);

          // Update database with file path
          const newImagePath = `/images/productImages/${fileName}`;
          await db.collection('products').updateOne(
            { _id: product._id },
            { $set: { productImage: newImagePath } }
          );

          converted++;
        }
      } catch (error) {
        console.error(` Error converting product ${product._id}:`, error.message);
        errors++;
      }
    }



  } catch (error) {
    console.error(' Migration failed:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  migrateBase64ToFiles().then(() => {
    console.log(' Migration complete');
    process.exit(0);
  }).catch(error => {
    console.error(' Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateBase64ToFiles };
