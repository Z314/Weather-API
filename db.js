require('dotenv').config(); // Load environment variables from .env file
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let database;

async function connectToDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        database = client.db('weatherData'); // Store the database instance
        return database;
    } catch (err) {
        console.error("Failed to connect to MongoDB Atlas", err);
        process.exit(1);
    }
}

module.exports = { connectToDatabase, client };
