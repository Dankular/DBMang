const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const duckdb = require('duckdb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for Vercel
const allowedOrigins = [
    'http://localhost:3000',
    'https://sn6i2gei26xsvov19n4s44ve.app.khosa.co',
    'https://db-mang.vercel.app',
    'https://db-mang-git-claude-database-list-webp-196743-dankulars-projects.vercel.app',
    /\.vercel\.app$/ // Allow all vercel preview deployments
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);

        if (allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) return allowed.test(origin);
            return allowed === origin;
        })) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.get('/healthz', (_req, res) => res.json({status: 'ok'}));
app.use((req, res, next) => {
 const expected = Buffer.from('admin:' + process.env.ADMIN_BASIC_AUTH_PASSWORD);
 const supplied = Buffer.from((req.headers.authorization || '').replace(/^Basic /, ''), 'base64');
 if (expected.length === supplied.length && require('crypto').timingSafeEqual(expected, supplied)) return next();
 res.setHeader('WWW-Authenticate', 'Basic realm=DBMang');
 return res.status(401).send('Authentication required');
});
app.use(express.json());
const path = require('path');
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
for (const asset of ['script.js', 'styles.css']) app.get('/' + asset, (_req, res) => res.sendFile(path.join(__dirname, asset)));
app.get('/healthz', (_req, res) => res.json({status:'ok'}));

// Central MySQL Database Connection (stores ALL database instances)
const centralDB = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT) || 61001
});

// Connect to central database
centralDB.connect(function (err) {
    if (err) {
        console.error('Failed to connect to central MySQL database:', err);
        process.exit(1);
    }
    console.log('✓ Connected to central MySQL database');
    initializeDatabaseSchema();
});

// Initialize database schema
function initializeDatabaseSchema() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS database_instances (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            type VARCHAR(50) NOT NULL,
            description TEXT,
            region VARCHAR(50),
            status VARCHAR(20) DEFAULT 'pending',
            username VARCHAR(255),
            password VARCHAR(255),
            host VARCHAR(255),
            port INT,
            database_name VARCHAR(255),
            connection_string TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name),
            INDEX idx_type (type),
            INDEX idx_status (status)
        )
    `;

    centralDB.query(createTableQuery, (err) => {
        if (err) {
            console.error('Failed to create database_instances table:', err);
        } else {
            console.log('✓ Database schema initialized');
        }
    });

    // Create a table to store actual data for each database instance
    const createDataTablesQuery = `
        CREATE TABLE IF NOT EXISTS database_tables (
            id VARCHAR(36) PRIMARY KEY,
            database_id VARCHAR(36) NOT NULL,
            table_name VARCHAR(255) NOT NULL,
            schema_definition TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (database_id) REFERENCES database_instances(id) ON DELETE CASCADE,
            UNIQUE KEY unique_table (database_id, table_name)
        )
    `;

    centralDB.query(createDataTablesQuery, (err) => {
        if (err) {
            console.error('Failed to create database_tables table:', err);
        } else {
            console.log('✓ Database tables schema initialized');
        }
    });
}

// Generate random password
function generatePassword() {
    return uuidv4().replace(/-/g, '');
}

// Generate credentials based on database type
function generateCredentials(dbName, dbType) {
    const username = `${dbName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_user`;
    const password = generatePassword();
    const host = 'localhost';

    // Different ports for different database types
    const ports = {
        'MySQL': 3306,
        'PostgreSQL': 5432,
        'MongoDB': 27017,
        'SQLite': 0, // No network port for SQLite
        'Redis': 6379
    };

    const port = ports[dbType] || 3000;
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
            return `${type.toLowerCase()}://${username}:${password}@${host}:${port}/${database}`;
    }
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Calculate database size (simulate based on table count)
function calculateDatabaseSize(tableCount) {
    // Simulate size based on number of tables (each table ~100KB)
    return tableCount * 100 * 1024;
}

// API Routes

// Get all databases
app.get('/api/databases', (req, res) => {
    const query = 'SELECT * FROM database_instances ORDER BY created_at DESC';

    centralDB.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching databases:', err);
            return res.status(500).json({ error: 'Failed to fetch databases' });
        }

        // Format results
        const databases = results.map(db => {
            // Get table count for size calculation
            const size = calculateDatabaseSize(0); // Will be updated with actual table count

            return {
                id: db.id,
                name: db.name,
                type: db.type,
                description: db.description,
                region: db.region,
                status: db.status,
                credentials: {
                    username: db.username,
                    password: db.password,
                    host: db.host,
                    port: db.port,
                    database: db.database_name,
                    type: db.type,
                    connectionString: db.connection_string
                },
                createdAt: db.created_at,
                size: size,
                sizeFormatted: formatBytes(size)
            };
        });

        res.json(databases);
    });
});

// Create new database
app.post('/api/databases', async (req, res) => {
    try {
        const { name, type, description, region, status } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        // Check if database already exists
        centralDB.query('SELECT id FROM database_instances WHERE name = ?', [name], (err, results) => {
            if (err) {
                console.error('Error checking database existence:', err);
                return res.status(500).json({ error: 'Failed to create database' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: 'Database with this name already exists' });
            }

            // Generate credentials
            const credentials = generateCredentials(name, type);
            const dbId = uuidv4();

            // Insert into central database
            const insertQuery = `
                INSERT INTO database_instances
                (id, name, type, description, region, status, username, password, host, port, database_name, connection_string)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                dbId,
                name,
                type,
                description || '',
                region || 'us-east-1',
                status || 'pending',
                credentials.username,
                credentials.password,
                credentials.host,
                credentials.port,
                credentials.database,
                credentials.connectionString
            ];

            centralDB.query(insertQuery, values, (err, result) => {
                if (err) {
                    console.error('Error creating database:', err);
                    return res.status(500).json({ error: 'Failed to create database' });
                }

                // Simulate database provisioning by updating status to active after a delay
                setTimeout(() => {
                    centralDB.query(
                        'UPDATE database_instances SET status = ? WHERE id = ?',
                        ['active', dbId],
                        (err) => {
                            if (err) {
                                console.error('Error updating database status:', err);
                            }
                        }
                    );
                }, 2000);

                // Return created database
                const database = {
                    id: dbId,
                    name,
                    type,
                    description: description || '',
                    region: region || 'us-east-1',
                    status: status || 'pending',
                    credentials,
                    createdAt: new Date().toISOString(),
                    size: 0,
                    sizeFormatted: '0 B'
                };

                res.json(database);
            });
        });
    } catch (error) {
        console.error('Error creating database:', error);
        res.status(500).json({ error: 'Failed to create database' });
    }
});

// Get database by ID
app.get('/api/databases/:id', (req, res) => {
    const query = 'SELECT * FROM database_instances WHERE id = ?';

    centralDB.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching database:', err);
            return res.status(500).json({ error: 'Failed to fetch database' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Database not found' });
        }

        const db = results[0];
        const size = calculateDatabaseSize(0);

        res.json({
            id: db.id,
            name: db.name,
            type: db.type,
            description: db.description,
            region: db.region,
            status: db.status,
            credentials: {
                username: db.username,
                password: db.password,
                host: db.host,
                port: db.port,
                database: db.database_name,
                type: db.type,
                connectionString: db.connection_string
            },
            createdAt: db.created_at,
            size: size,
            sizeFormatted: formatBytes(size)
        });
    });
});

// Delete database
app.delete('/api/databases/:id', (req, res) => {
    const query = 'DELETE FROM database_instances WHERE id = ?';

    centralDB.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error deleting database:', err);
            return res.status(500).json({ error: 'Failed to delete database' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Database not found' });
        }

        res.json({ message: 'Database deleted successfully' });
    });
});

// Execute query on database using DuckDB as interface
app.post('/api/databases/:id/query', (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Get database instance
    centralDB.query('SELECT * FROM database_instances WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Database not found' });
        }

        const db = results[0];

        // Use DuckDB as query interface
        // DuckDB can connect to MySQL and translate queries
        const duckdbInstance = new duckdb.Database(':memory:');

        duckdbInstance.all(query, (err, result) => {
            if (err) {
                duckdbInstance.close();
                return res.status(400).json({ error: err.message });
            }

            duckdbInstance.close();
            res.json({ result });
        });
    });
});

// Get database statistics
app.get('/api/databases/:id/stats', (req, res) => {
    // Get table count for this database
    const tableQuery = 'SELECT COUNT(*) as tableCount FROM database_tables WHERE database_id = ?';

    centralDB.query(tableQuery, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.status(500).json({ error: 'Failed to fetch statistics' });
        }

        const tableCount = results[0]?.tableCount || 0;
        const size = calculateDatabaseSize(tableCount);
        const maxSize = 10 * 1024 * 1024; // 10 MB
        const usagePercent = (size / maxSize) * 100;

        res.json({
            tables: tableCount,
            size: formatBytes(size),
            sizeBytes: size,
            maxSize: formatBytes(maxSize),
            maxSizeBytes: maxSize,
            usagePercent: Math.round(usagePercent * 100) / 100,
            availableSpace: formatBytes(maxSize - size)
        });
    });
});

// Create table in database instance
app.post('/api/databases/:id/tables', (req, res) => {
    const { tableName, schema } = req.body;

    if (!tableName) {
        return res.status(400).json({ error: 'Table name is required' });
    }

    const tableId = uuidv4();
    const query = `
        INSERT INTO database_tables (id, database_id, table_name, schema_definition)
        VALUES (?, ?, ?, ?)
    `;

    centralDB.query(query, [tableId, req.params.id, tableName, schema || ''], (err) => {
        if (err) {
            console.error('Error creating table:', err);
            return res.status(500).json({ error: 'Failed to create table' });
        }

        res.json({
            id: tableId,
            database_id: req.params.id,
            table_name: tableName,
            schema_definition: schema || ''
        });
    });
});

// Get tables for a database instance
app.get('/api/databases/:id/tables', (req, res) => {
    const query = 'SELECT * FROM database_tables WHERE database_id = ?';

    centralDB.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching tables:', err);
            return res.status(500).json({ error: 'Failed to fetch tables' });
        }

        res.json(results);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    centralDB.query('SELECT 1', (err) => {
        if (err) {
            return res.status(500).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: err.message
            });
        }

        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nClosing database connection...');
    centralDB.end((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✓ Database Manager API running on http://localhost:${PORT}`);
    console.log(`✓ All database instances stored in central MySQL database`);
    console.log(`✓ DuckDB acting as query interface layer\n`);
});
