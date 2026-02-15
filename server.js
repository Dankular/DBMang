const express = require('express');
const cors = require('cors');
const duckdb = require('duckdb');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database storage directory
const DB_DIR = path.join(__dirname, 'databases');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR);
}

// Store database metadata
const METADATA_FILE = path.join(__dirname, 'db-metadata.json');
let databaseMetadata = {};

// Load metadata
if (fs.existsSync(METADATA_FILE)) {
    databaseMetadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
}

// Save metadata
function saveMetadata() {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(databaseMetadata, null, 2));
}

// Generate random password
function generatePassword() {
    return uuidv4().replace(/-/g, '');
}

// Generate credentials
function generateCredentials(dbName, dbType) {
    const username = `${dbName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_user`;
    const password = generatePassword();
    const host = 'localhost';
    const port = PORT;
    const database = dbName;

    return {
        username,
        password,
        host,
        port,
        database,
        type: dbType,
        connectionString: getConnectionString(dbType, username, password, host, port, database)
    };
}

// Get connection string based on database type
function getConnectionString(type, username, password, host, port, database) {
    switch (type) {
        case 'PostgreSQL':
            return `postgresql://${username}:${password}@${host}:${port}/${database}`;
        case 'MySQL':
            return `mysql://${username}:${password}@${host}:${port}/${database}`;
        case 'MongoDB':
            return `mongodb://${username}:${password}@${host}:${port}/${database}`;
        case 'SQLite':
            return `sqlite:///${database}.db`;
        case 'Redis':
            return `redis://:${password}@${host}:${port}`;
        default:
            return `duckdb:///${database}.duckdb`;
    }
}

// Get database file size
function getDbSize(dbPath) {
    try {
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            return stats.size;
        }
        return 0;
    } catch (error) {
        return 0;
    }
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Create DuckDB database
function createDuckDBInstance(dbName, dbType, description) {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(DB_DIR, `${dbName}.duckdb`);
        const db = new duckdb.Database(dbPath);

        db.all('SELECT 1 as test', (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            const credentials = generateCredentials(dbName, dbType);
            const dbId = uuidv4();

            // Store metadata
            databaseMetadata[dbId] = {
                id: dbId,
                name: dbName,
                type: dbType,
                description: description || '',
                credentials,
                path: dbPath,
                createdAt: new Date().toISOString(),
                size: getDbSize(dbPath)
            };

            saveMetadata();
            db.close();
            resolve(databaseMetadata[dbId]);
        });
    });
}

// API Routes

// Get all databases
app.get('/api/databases', (req, res) => {
    const databases = Object.values(databaseMetadata).map(db => ({
        ...db,
        size: getDbSize(db.path),
        sizeFormatted: formatBytes(getDbSize(db.path))
    }));
    res.json(databases);
});

// Create new database
app.post('/api/databases', async (req, res) => {
    try {
        const { name, type, description } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        // Check if database already exists
        const exists = Object.values(databaseMetadata).some(
            db => db.name.toLowerCase() === name.toLowerCase()
        );

        if (exists) {
            return res.status(400).json({ error: 'Database with this name already exists' });
        }

        const database = await createDuckDBInstance(name, type, description);
        res.json(database);
    } catch (error) {
        console.error('Error creating database:', error);
        res.status(500).json({ error: 'Failed to create database' });
    }
});

// Get database by ID
app.get('/api/databases/:id', (req, res) => {
    const db = databaseMetadata[req.params.id];
    if (!db) {
        return res.status(404).json({ error: 'Database not found' });
    }

    res.json({
        ...db,
        size: getDbSize(db.path),
        sizeFormatted: formatBytes(getDbSize(db.path))
    });
});

// Delete database
app.delete('/api/databases/:id', (req, res) => {
    const db = databaseMetadata[req.params.id];
    if (!db) {
        return res.status(404).json({ error: 'Database not found' });
    }

    try {
        // Delete the database file
        if (fs.existsSync(db.path)) {
            fs.unlinkSync(db.path);
        }

        // Remove from metadata
        delete databaseMetadata[req.params.id];
        saveMetadata();

        res.json({ message: 'Database deleted successfully' });
    } catch (error) {
        console.error('Error deleting database:', error);
        res.status(500).json({ error: 'Failed to delete database' });
    }
});

// Execute query on database
app.post('/api/databases/:id/query', (req, res) => {
    const db = databaseMetadata[req.params.id];
    if (!db) {
        return res.status(404).json({ error: 'Database not found' });
    }

    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const duckdbInstance = new duckdb.Database(db.path);

    duckdbInstance.all(query, (err, result) => {
        if (err) {
            duckdbInstance.close();
            return res.status(400).json({ error: err.message });
        }

        duckdbInstance.close();
        res.json({ result });
    });
});

// Get database statistics
app.get('/api/databases/:id/stats', (req, res) => {
    const db = databaseMetadata[req.params.id];
    if (!db) {
        return res.status(404).json({ error: 'Database not found' });
    }

    const duckdbInstance = new duckdb.Database(db.path);

    duckdbInstance.all("SELECT * FROM duckdb_tables()", (err, tables) => {
        if (err) {
            duckdbInstance.close();
            return res.status(400).json({ error: err.message });
        }

        const size = getDbSize(db.path);
        const maxSize = 10 * 1024 * 1024; // 10 MB as shown in the example
        const usagePercent = (size / maxSize) * 100;

        duckdbInstance.close();
        res.json({
            tables: tables.length,
            size: formatBytes(size),
            sizeBytes: size,
            maxSize: formatBytes(maxSize),
            maxSizeBytes: maxSize,
            usagePercent: Math.round(usagePercent * 100) / 100,
            availableSpace: formatBytes(maxSize - size)
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Database Manager API running on http://localhost:${PORT}`);
    console.log(`Databases stored in: ${DB_DIR}`);
});
