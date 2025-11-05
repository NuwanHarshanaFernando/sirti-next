const { MongoClient } = require('mongodb');

async function main() {
    const uri = "mongodb+srv://inventory:kyPRPwwYRvjgI4Yf@cluster0.fm0eirq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('sirti-inventory');
        
        // Get all projects
        const projects = await db.collection('Projects').find({}).toArray();
        

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
        console.log('\nConnection closed.');
    }
}

main().catch(console.error); 