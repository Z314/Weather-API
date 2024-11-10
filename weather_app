// John Patel
// Weather App
// Connects to your mongodb atlas database

// Import the 'express' framework for building web applications
const express = require('express');

// for batch uploading from file
const fs = require('fs');

// Import necessary MongoDB components: MongoClient for database connection, ObjectId for working with MongoDB ObjectIds, Int32 for working with 32-bit integers
const { MongoClient, ObjectId, Int32 } = require('mongodb');

// Import the 'swagger-ui-express' middleware for serving Swagger UI
const swaggerUi = require('swagger-ui-express');

// Import the Swagger (OpenAPI) document for the Weather API from the specified JSON file
const swaggerDocument = require('./swagger_weather.json');

const jwt = require('jsonwebtoken');
const { expressjwt: expressjwt } = require("express-jwt");

// Import the 'cors' middleware for enabling CORS
const cors = require('cors');

// Create an Express application
const app = express();

const secretKey = 'REPLACEWITHYOURKEY'; // Replace with your secret key

// Middleware to protect routes
const jwtMiddleware = expressjwt({ secret: secretKey, algorithms: ['HS256'], requestProperty: 'auth' });

app.use((req, res, next) => {
    if (req.auth) {
        req.user = {
            username: req.auth.username,
            role: req.auth.role
        };
    }
    next();
});


// Middleware to check if the user has at least one of the allowed roles
// Provides a 403 Forbidden response if the user does not have any of the required roles or if req.auth or req.auth.role is missing.
// roles is an array
const authorizeRole = (roles) => {
    return (req, res, next) => {
        // Check if req.auth and req.auth.role exist
        if (!req.auth || !req.auth.role) {
            return res.status(401).send('No authentication found');
        }

        // Check if the user's role is included in the allowed roles
        if (!roles.includes(req.auth.role)) {
            return res.status(403).send('Forbidden: You do not have the required role');
        }

        next(); // User has the required role 
    };
};


// const dbName = 'weatherData'; // Database name
const collectionName = 'collectionWeather'; // weather collection name within the database
const collectionUser = 'user'; // user collection name in database
const { connectToDatabase } = require('./db');

let db;

// Connect to the database 
connectToDatabase()
    .then(database => {
        db = database;
    })
    .catch(err => {
        console.error("Failed to connect to database", err);
        process.exit(1);
    });


// use the environment port number or if it doesn't exist use port 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Enable CORS for all endpoints 
const corsOptions = {
    //origin: 'https://www.test-cors.org', // Allow requests from this origin
    origin: 'null', // used when testing with html local machine app
    //origin: 'http://localhost', // Allow requests from this origin
    methods: 'GET, POST, PUT, DELETE', // Allowed methods
    allowedHeaders: 'Content-Type, Authorization', // Allowed headers
};
app.use(cors(corsOptions));

// Middleware to handle pre-flight requests
app.options('*', (req, res) => {
    console.log('Preflight request headers:', req.headers); // Log the incoming headers
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Specify allowed methods
    res.sendStatus(200); // Respond with 200 OK status
});

// The `express.json()` middleware parses incoming JSON data from requests
// It makes the parsed JSON data available in the `req.body` property of the request object
// This is useful when handling POST requests with JSON payloads
app.use(express.json());


// -------------------------------------------------------
// Authentication endpoints
app.post('/login', async (req, res) => {

    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const organiser = await db.collection(collectionUser).findOne({ email: username });

        // Check if the user exists and password is correct
        if (!organiser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (organiser.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update the last login date in database
        const result = await db.collection(collectionUser).updateOne(
            { email: username, password: password },
            { $set: { last_login: new Date() } }
        );

        // Generate a JWT token
        const token = jwt.sign({ username: organiser.email, role: organiser.role }, secretKey, { expiresIn: '1h' });
        console.log('Generated Token:', token);

        // Send token and role in response with 200 OK status
        res.status(200).json({ token, role: organiser.role });

    } catch (error) {
        // Forward error to centralized error-handling middleware
        next(err);
    }
});
// -------------------------------------------------------

// Retrieve all documents
app.get('/weather_data', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {
    try {
        const collection = db.collection(collectionName); // Access the specified collection within the database
        // Perform a query on the collection:
        // - Find all documents ({}) 
        // - Limit the number of records returned to 10
        const result = await collection
            // find all (no filter)
            .find({}, {})
            .limit(10) // Limit the number of records to 10
            .toArray(); // Convert the query result to an array

        // If no documents are found, send a 404 Not Found response
        if (result.length === 0) {
            return res.status(404).json({ error: 'No data found' });
        }

        // Send the JSON response containing the query result to the client with 200 OK status
        res.status(200).json(result);
    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        // If an error occurs during the try block, log the error to the console
        //console.error(err);
        // Send a 500 Internal Server Error response to the client
        //res.status(500).send('Error retrieving data');

    }
});
// Retrieve 1 document with specified fields projected displayed and display the results as JSON. Search by device name and date/time
// date/time input: 2021-05-07T03:34:05.000+00:00
app.get('/weather_data/:deviceName/:mydate', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {

    const { deviceName, mydate } = req.params;

    // Validate parameters are entered
    if (!deviceName || !mydate) {
        return res.status(400).json({ error: 'Device name and date are required' });
    }

    try {
        const collection = db.collection(collectionName);
        const deviceName = req.params.deviceName;
        const dateSelected = new Date(req.params.mydate);

        // Validate date format
        if (isNaN(dateSelected.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        const query = { "Device Name": deviceName, "Time": dateSelected }
        const result = await collection
            .findOne(query, {
                projection: {
                    "Device Name": 1,
                    "Temperature (°C)": 1,
                    "Atmospheric Pressure (kPa)": 1,
                    "Solar Radiation (W/m2)": 1,
                    "Precipitation mm/h": 1

                }
            });

        // Check if result is found
        if (!result) {
            return res.status(404).json({ error: 'No document found with the given name/date combination' });
        }
        //console.log(dateSelected)
        //console.error(result);
        // Check if result is found
        // Document found, respond with 200 OK
        res.status(200).json(result);


    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        // If an error occurs during the try block, log the error to the console
        //console.error(err);
        // Send a 500 Internal Server Error response to the client
        //res.status(500).send('Error retrieving dataa');

    }
});

// retrieve max temp for all stations by date range
// date/time input: 2021-05-07T03:34:05.000+00:00
app.get('/weather_data/dateRange/:mydate1/:mydate2', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {
    try {
        const collection = db.collection(collectionName);
        //const deviceName = req.params.deviceName;
        const dateSelected1 = new Date(req.params.mydate1);
        const dateSelected2 = new Date(req.params.mydate2);

        // Validate date inputs
        if (isNaN(dateSelected1.getTime()) || isNaN(dateSelected2.getTime())) {
            return res.status(400).send('Invalid date format');
        }

        //const query = { "Device Name": deviceName, "Time": dateSelected1 }
        const result = await collection
            .aggregate([
                // 1: Filter documents by date range
                {
                    $match: {
                        "Time": {
                            $gte: new Date(dateSelected1),
                            $lte: new Date(dateSelected2)
                        }
                    }
                },
                {
                    $sort: { "Device Name": 1, "Temperature (°C)": -1 }  // Sort by device name and temp in descending order
                },
                // Group by and find the maximum value
                {
                    $group: {
                        _id: "$Device Name", // Group by device name
                        maxValue: { $first: "$Temperature (°C)" }, // Calculate the maximum value
                        dateOfMax: { $first: "$Time" }
                    }
                },

                // Optional: Format the output
                {
                    $project: {
                        _id: 0,
                        "Device Name": "$_id",
                        dateOfMax: 1,
                        maxValue: 1
                    }
                }
            ]).toArray();

        // Check if result is empty
        if (result.length === 0) {
            return res.status(404).send('No documents found with the given device name and date range');
        }
        res.status(200).json(result);

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        // Send a 500 Internal Server Error response to the client
        //res.status(500).send('sorry Error retrieving data');
    }
});

// retrieve temp flucs for station by date range. Use of indexes
// date/time input: 2021-05-07T03:34:05.000+00:00
app.get('/weather_data/tempflucs/:deviceName/:mydate1/:mydate2', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {
    try {
        const collection = db.collection(collectionName);
        // Create a compound index on precip (ascending) and Time (descending) to speed up queries
        await collection.createIndex({ "Precipitation mm/h": 1, Time: -1 });
        const deviceName = req.params.deviceName;
        const dateSelected1 = new Date(req.params.mydate1);
        const dateSelected2 = new Date(req.params.mydate2);

        // Validate date inputs
        if (isNaN(dateSelected1.getTime()) || isNaN(dateSelected2.getTime())) {
            return res.status(400).send('Invalid date format');
        }
        //const query = { "Device Name": deviceName, "Time": dateSelected1 }
        const result = await collection
            .aggregate([
                // 1: Filter documents by date range
                {
                    $match: {
                        "Device Name": deviceName,
                        "Time": {
                            $gte: new Date(dateSelected1),
                            $lte: new Date(dateSelected2)
                        }
                    }
                },

                // Optional: Format the output
                {
                    $project: {
                        _id: 0,
                        "Device Name": 1,
                        "Temperature (°C)": 1,
                        Time: 1
                    }
                }
            ]).limit(10).toArray();
        console.log(result)
        // Check if result is empty
        if (result.length === 0) {
            return res.status(404).send('No documents found with the given device name and date range');
        }
        res.status(200).json(result);

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        // Send a 500 Internal Server Error response to the client
        //res.status(500).send('sorry Error retrieving data');

    }
});

// retrieve hum/rainfall for station by date range. Use of indexes
// date/time input: 2021-05-07T03:34:05.000+00:00
app.get('/weather_data/humRainflucs/:deviceName/:mydate1/:mydate2', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {
    try {
        const collection = db.collection(collectionName);
        // Create a compound index on precip (ascending) and humidity (descending) to speed up queries
        await collection.createIndex({ "Humidity (%)": 1, "Precipitation mm/h": -1 });
        const deviceName = req.params.deviceName;
        const dateSelected1 = new Date(req.params.mydate1);
        const dateSelected2 = new Date(req.params.mydate2);

        // Validate date inputs
        if (isNaN(dateSelected1.getTime()) || isNaN(dateSelected2.getTime())) {
            return res.status(400).send('Invalid date format');
        }

        //const query = { "Device Name": deviceName, "Time": dateSelected1 }
        const result = await collection
            .aggregate([
                // 1: Filter documents by date range
                {
                    $match: {
                        "Device Name": deviceName,
                        "Time": {
                            $gte: new Date(dateSelected1),
                            $lte: new Date(dateSelected2)
                        }
                    }
                },

                // Optional: Format the output
                {
                    $project: {
                        _id: 0,
                        "Humidity (%)": 1,
                        "Precipitation mm/h": 1,
                        Time: 1
                    }
                }
            ]).limit(10).toArray();

        // Check if result is empty
        if (result.length === 0) {
            return res.status(404).send('No documents found with the given device name and date range');
        }

        res.status(200).json(result);

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        // Send a 500 Internal Server Error response to the client
        //res.status(500).send('sorry Error retrieving data');

    }
});
// Retrieve max precip in last 5 months for specified sensor
app.get('/weather_data/deviceName/maxprecip/:device_name', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {
    const device_Name = req.params.device_name;
    try {
        const collection = db.collection(collectionName);

        // Validate the device name (optional, if needed)
        if (!device_Name || typeof device_Name !== 'string') {
            return res.status(400).send('Invalid device name');
        }

        const result = await collection
            .aggregate([
                // 1: Filter documents by date range (last 5 months)
                {
                    $match: {
                        "Time": {
                            $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)),
                            $lte: new Date()
                        },
                        "Device Name": device_Name
                    }
                },
                // 2: Group by sensor and find the maximum precipitation value and corresponding date/time
                {
                    $sort: { "Precipitation mm/h": -1 }  // Sort by precipitation in descending order
                },
                // 3: Group by sensor name and find the maximum precipitation value
                {
                    $group: {
                        _id: "$Device Name",
                        maxPrecipitation: { $first: "$Precipitation mm/h" }, // Get the maximum precipitation
                        Time: { $first: "$Time" }  // Get the date/time of the maximum precipitation
                    }
                },
                // 4: Project the desired fields 
                {
                    $project: {
                        _id: 0,                          // Exclude _id field
                        "Device Name": "$_id",              // Include sensorName
                        Time: "$Time", // Include the dateTime of max precipitation
                        "Precipitation mm/h": "$maxPrecipitation" // Include the max precipitation value
                    }
                }
            ]).toArray();
            console.log(new Date(new Date().setMonth(new Date().getMonth() - 5)));
        // Check if result is empty
        if (result.length === 0) {
            return res.status(404).send('No document found with the given device name and has data within last 5 months');
        }

        res.status(200).json(result);

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error retrieving datad');
    }
});
// Retrieve data based on the device_name field and all of document fields and display the first 10 records as JSON
app.get('/weather_data/deviceName2/allFields/:device_name', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {
    const device_Name = req.params.device_name;

    // Validate the device name
    if (!device_Name || typeof device_Name !== 'string') {
        return res.status(400).send('Invalid device name');
    }

    try {
        const collection = db.collection(collectionName);
        const result = await collection
            .find({ "Device Name": device_Name })
            .limit(10) // Limit the number of records to 10
            .toArray();

        // Check if result is empty
        if (result.length === 0) {
            return res.status(404).send('No documents found for the given device name');
        }

        res.status(200).json(result);

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error retrieving data');
    }
});
// Return all device names (distinct) using the device_name field and display the results as JSON
app.get('/device_names', jwtMiddleware, authorizeRole(['teacher', 'user']), async (req, res) => {
    try {
        const collection = db.collection(collectionName);
        const result = await collection.distinct("Device Name");

        // Check if result is empty
        if (result.length === 0) {
            return res.status(404).send('No device names found');
        }

        res.status(200).json(result);
    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error retrieving data');
    }
});

// Replace single existing weather record
app.put('/weather_data/replaceOne/:id', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {
    // value must be 24 character hexadecimal string
    const weatherid = req.params.id;

    if (!ObjectId.isValid(weatherid)) {
        return res.status(400).send('Invalid ID format');
    }

    const { device_name, wind_direction_deg, humidity_percent, vapor_pressure_kpa, solar_radiation_w_m2, max_wind_speed_m_s, atmospheric_pressure_kpa, temperature_c, longitude, latitude, time, precipitation_mm_h } = req.body;
    try {
        const collection = db.collection(collectionName);
        // Attempt to find a document with the given id
        const objectId = new ObjectId(weatherid);
        const existingWeather = await collection.findOne({ _id: objectId });

        if (!existingWeather) {
            // Document with the given ID does not exist
            return res.status(404).send('No document found with the given id');
        }

        // If a document found, replace the existing document
        const result = await collection.replaceOne(
            { _id: new ObjectId(weatherid) },

            {
                'Device Name': device_name,
                'Precipitation mm/h': precipitation_mm_h,
                'Time': new Date(time),
                'Latitude': latitude,
                'Longitude': longitude,
                'Temperature (°C)': temperature_c,
                'Atmospheric Pressure (kPa)': atmospheric_pressure_kpa, 'Max Wind Speed (m/s)': max_wind_speed_m_s,
                'Solar Radiation (W/m2)': solar_radiation_w_m2,
                'Vapor Pressure (kPa)': vapor_pressure_kpa,
                'Humidity (%)': humidity_percent,
                'Wind Direction (°)': wind_direction_deg
            }
        );
        if (result.matchedCount === 0) {
            return res.status(404).send('No document found with the given id');
        }

        if (result.modifiedCount === 0) {
            // Document was found but not replaced
            return res.status(304).send('No changes made to the document');
        }

        res.status(200).send('Record replaced successfully');

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error replacing record');
    }
});

// Replace multiple existing weather record NAMES
app.put('/weather_data/replaceUpdateMany/:devicename', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {

    // value must be 24 character hexadecimal string
    const devicename = req.params.devicename;

    const { device_name } = req.body;

    if (!device_name || typeof device_name !== 'string') {
        return res.status(400).send('Invalid device name');
    }

    try {
        const collection = db.collection(collectionName);
        const deviceExist = await collection.findOne({ 'Device Name': devicename });
        if (!deviceExist) {
            // No document found with the given name
            return res.status(404).send('No document found with the given name');
        }
        // If a document found, update the existing document
        const result = await collection.updateMany(
            { 'Device Name': devicename },
            { $set: { 'Device Name': device_name } }
        );
        // Check if any documents were modified
        if (result.modifiedCount === 0) {
            // won't occur if the `findOne` was successful and `device_name` is different
            return res.status(304).send('No changes made to the documents');
        }

        // Successful update
        res.status(200).send('Records replaced/updated successfully');

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error replacing record');
    }
});

// Replace specified existing weather record, only precip value for specified record
app.put('/weather_data/one/replaceUpdateOne/:id', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {

    const weatherid = req.params.id;

    // Validate that the provided id is a valid 24-character hexadecimal string
    if (!ObjectId.isValid(weatherid)) {
        return res.status(400).send('Invalid ID format');
    }

    const { precipitation_mm_h } = req.body;

    // Check if `precipitation_mm_h` is supplied and is  valid number
    if (typeof precipitation_mm_h !== 'number' || isNaN(precipitation_mm_h)) {
        return res.status(400).send('Invalid precipitation value');
    }

    try {
        const collection = db.collection(collectionName);
        // Attempt to find a document with the given id
        const objectId = new ObjectId(weatherid);
        const dn = await collection.findOne({ '_id': objectId });
        //newObjectId = new ObjectId("66add4b78112ac053bc2fc6c");
        if (!dn) {

            res.status(404).send('No document found with the given id');
        }
        // working
        // If a document found, update the existing document
        const result = await collection.updateOne(
            { '_id': objectId },
            { $set: { 'Precipitation mm/h': precipitation_mm_h } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).send('No document found with the given id');
        }

        if (result.modifiedCount === 0) {
            // Document was found but not modified
            return res.status(304).send('No changes made to the document');
        }

        // Successful update
        res.status(200).send('One record updated successfully');

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error replacing record');
    }
});

// Add single weather record for existing weather station
// checks if device name is valid 1st
app.post('/weather_data/addDoc', jwtMiddleware, authorizeRole(['teacher', 'sensor']), async (req, res) => {

    const { device_name, wind_direction_deg, humidity_percent, vapor_pressure_kpa, solar_radiation_w_m2, max_wind_speed_m_s, atmospheric_pressure_kpa, temperature_c, longitude, latitude, time, precipitation_mm_h } = req.body;

    // Validate required fields
    if (!device_name) {
        return res.status(400).send('Device name required');
    }

    if (typeof precipitation_mm_h !== 'number' || isNaN(precipitation_mm_h)) {
        return res.status(400).send('Invalid precipitation value');
    }

    arrayCheck = [
        "My_Sensor",
        "Woodford_sensor",
        "Wottodford_sensor",
        "Yandina_Sensor",
        "ford_senshh",
        "ford_sensor",
        "sensor"
    ];

    if (!arrayCheck.includes(device_name)) {
        return res.status(400).send('Record not added, device name not found');
    }
    try {
        const collection = db.collection(collectionName);

        const result = await collection.insertOne({
            'Device Name': device_name,
            'Precipitation mm/h': precipitation_mm_h,
            'Time': new Date(time),
            'Latitude': latitude,
            'Longitude': longitude,
            'Temperature (°C)': temperature_c,
            'Atmospheric Pressure (kPa)': atmospheric_pressure_kpa,
            'Max Wind Speed (m/s)': max_wind_speed_m_s,
            'Solar Radiation (W/m2)': solar_radiation_w_m2,
            'Vapor Pressure (kPa)': vapor_pressure_kpa,
            'Humidity (%)': humidity_percent,
            'Wind Direction (°)': wind_direction_deg

        });

        // Check the result 
        if (result.insertedCount === 1) {
            res.status(201).send('Record added successfully'); // 201 Created
        }

    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error adding record');
    }
});

// Insert multiple new records (from json file) Batch inserts
app.post('/weather_data_multipleInsert/', jwtMiddleware, authorizeRole(['teacher', 'sensor']), async (req, res) => {

    try {
        const collection = db.collection(collectionName);
        const docs = require('./docs.json');
        // this option prevents additional documents from being inserted if one fails
        const options = { ordered: true };
        const result = await collection.insertMany(docs, options);
        console.log(`${result.insertedCount} documents were inserted`);
        return res.status(201).send('Batch operation: Documents added successfully');
    } catch (err) {
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error inserting the records');
    }
});

// Delete record based on given id
app.delete('/weather_data/:deleteId', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {
    const id = req.params.deleteId;
    try {
        const collection = db.collection(collectionName);
        const objectId = new ObjectId(id);
        const result = await collection.deleteOne({ _id: objectId });
        // Check if any documents were deleted
        if (result.deletedCount === 0) {
            return res.status(404).send('No record found with the given id');
        } else {
            return res.status(200).send('Record deleted successfully');
        }
    } catch (err) {

        if (err.name === 'CastError') {
            return res.status(400).send('Invalid ID format'); // 400 Bad Request
        }
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error deleting record');
    }
});

// Delete many record based on given filter
app.delete('/weather_data/deleteMany/:deviceName', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {
    const dn = req.params.deviceName;
    try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany(
            { 'Device Name': dn },
        );
        // Check if any documents were deleted during the update
        if (result.deletedCount === 0) {
            // If no documents were deleted, send a 404 response indicating that no document was found with the given id
            res.status(404).send('No records found with the given device names');
        } else {
            // If at least one document was modified, send a success response
            res.status(200).send('Records deleted successfully');
        }
    } catch (err) {

        if (err.name === 'MongoError') {
            return res.status(400).send('Error deleting records: ' + err.message);
        }
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error deleting records');
    }
});

//---------------------------------------------------

// User collection

// Add single user. jwtMiddleware must come before autorizeRole()
app.post('/user/addOne', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {

    const { name, email, role, password, last_login } = req.body;

    // Validation
    if (!name || !email || !role || !password) {
        return res.status(400).send('Missing/invalid required fields');
    }

    try {
        const collection = db.collection(collectionUser);

        // Check if the email already exists
        const userexist = await collection.findOne({ email });
        if (userexist) {
            return res.status(409).send('User with this email already exists in database'); // 409 Conflict
        }

        const creation = new Date();
        const result = await collection.insertOne({
            'name': name,
            'email': email,
            'role': role,
            'password': password,
            'last_login': last_login,
            'creation': creation

        });
        console.log(result);
        res.status(201).send('user added successfully');


    } catch (err) {

        if (err.name === 'MongoError') {
            return res.status(400).send('Error adding user: ' + err.message);
        }
        // Forward error to centralized error-handling middleware
        next(err);
        /* console.error(err);
        if (err.name === 'UnauthorizedError') {
            return res.status(401).json({ error: 'Unauthorized access' });
        }
        res.status(500).send('Error adding user'); */
    }
});

// Insert multiple new records (from json file) Batch inserts
app.post('/user/addMultiple/users', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {

    try {
        const collection = db.collection(collectionUser);
        // Load and parse the JSON file
        const data = JSON.parse(fs.readFileSync('user_data.json', 'utf8'));

        // Validation: check data is an array and not empty
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).send('Invalid or empty user data');
        }

        // Add the creation date to each document
        const now = new Date();
        const dataWithDate = data.map(doc => ({
            ...doc,
            creation: now
        }));
        const result = await collection.insertMany(dataWithDate);
        console.log(`${result.insertedCount} documents were inserted`);
        const creation = new Date();

        // Check if any documents were inserted
        if (result.insertedCount === 0) {
            return res.status(500).send('No documents were added'); // 500 Internal Server Error
        }

        return res.status(201).send('Batch operation: User documents added successfully');

    } catch (err) {

        if (err.code === 'ENOENT') {
            return res.status(404).send('User data file not found');
        }

        // Handle JSON parsing errors
        if (err instanceof SyntaxError) {
            return res.status(400).send('Error parsing user data');
        }
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error inserting the user records');
    }
});

// update multiple users role. jwtMiddleware must come before autorizeRole()
app.put('/user/updateMany/:role/:date1/:date2', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {
    try {
        const collection = db.collection(collectionUser);
        const roleChosen = req.params.role;
        const dateSelected1 = new Date(req.params.date1);
        const dateSelected2 = new Date(req.params.date2);

        // Ensure valid date range
        if (isNaN(dateSelected1) || isNaN(dateSelected2)) {
            return res.status(400).send('Invalid date format');
        }

        const filter =
        {
            "creation": {
                $gte: new Date(dateSelected1),
                $lte: new Date(dateSelected2)
            }
        };
        const result = await collection.updateMany(filter, { $set: { "role": roleChosen } });

        if (result.modifiedCount === 0) {
            return res.status(404).send('No records were modified');
        } else {
            return res.status(200).send('Records modified successfully');
        }

    } catch (err) {

        if (err.name === 'MongoError') {
            return res.status(400).send('Error updating records: ' + err.message);
        }
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error adding user');
    }
});

// delete single user by ID. jwtMiddleware must come before autorizeRole()
app.delete('/user/deleteOne/:id', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {
    const id = req.params.id;
    try {
        const collection = db.collection(collectionUser);
        const objectId = new ObjectId(id);
        const result = await collection.deleteOne(
            { _id: objectId },
        );
        // Check if any documents were deleted
        if (result.deletedCount === 0) {
            return res.status(404).send('No user record found with the given id');
        } else {
            return res.status(200).send('User record deleted successfully');
        }
    } catch (err) {

        if (err.name === 'CastError') {
            return res.status(400).send('Invalid user ID format');
        }
        // Forward error to centralized error-handling middleware
        next(err);
        //console.error(err);
        //res.status(500).send('Error deleting user record');
    }
});

// delete multiple users. jwtMiddleware must come before autorizeRole()
app.delete('/user/deleteMultiple/users/:role/:date1/:date2', jwtMiddleware, authorizeRole(['teacher']), async (req, res) => {

    try {
        const collection = db.collection(collectionUser);
        const roleChosen = req.params.role;
        const dateSelected1 = new Date(req.params.date1);
        const dateSelected2 = new Date(req.params.date2);

        // Ensure valid date range
        if (isNaN(dateSelected1) || isNaN(dateSelected2)) {
            return res.status(400).send('Invalid date format');
        }

        const query =
        {
            "role": roleChosen,
            "creation": {
                $gte: new Date(dateSelected1),
                $lte: new Date(dateSelected2)
            }
        };

        const result = await collection.deleteMany(query);
        console.log(query);
        // Check if any documents were deleted
        if (result.deletedCount === 0) {
            return res.status(404).send('No user records found with the given details');
        } else {
            return res.status(200).send('User records deleted successfully');
        }
    } catch (err) {

        if (err.name === 'MongoError') {
            return res.status(400).send('Error deleting user records: ' + err.message);
        }
        // Forward error to centralized error-handling middleware
        next(err);
        // Handle any errors that occurred during the try block
        //console.error(err);
        //res.status(500).send('Error deleting user records');
    }
});

// Below must be after all routes
// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling middleware for all routes
app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Unauthorised Access' });
    }

    // Handle other error types
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error';
    res.status(statusCode).json({ error: message });
});
