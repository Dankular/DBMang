const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const duckdb = require('duckdb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zfbevkdsjxgxzfbbhvza.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_iZ47UWNzumsl9q8JjaBcYw_Z0rqVfGb';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DuckDB instance — persistent in-memory database for query translation
const duckDB = new duckdb.Database(':memory:');
const duckConn = duckDB.connect();

// Initialize DuckDB with cross-database helper views
function initializeDuckDB() {
    // DuckDB natively supports SQL dialects from MySQL, PostgreSQL, SQLite
    // It acts as our universal translation layer
    duckConn.run("SET search_path TO main", (err) => {
        if (err) console.error('DuckDB init warning:', err.message);
    });
    console.log('✓ DuckDB translation layer initialized');
}

initializeDuckDB();

// CORS configuration for Vercel
const allowedOrigins = [
    'http://localhost:3000',
    'https://db-mang.vercel.app',
    'https://db-mang-git-claude-database-list-webp-196743-dankulars-projects.vercel.app',
    /\.vercel\.app$/
];

app.use(cors({
    origin: function(origin, callback) {
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

app.use(express.json());
app.use(express.static('.'));

// Generate random password
function generatePassword() {
    return uuidv4().replace(/-/g, '');
}

// Generate credentials based on database type
function generateCredentials(dbName, dbType) {
    const username = `${dbName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_user`;
    const password = generatePassword();
    const host = 'localhost';

    const ports = {
        'MySQL': 3306,
        'PostgreSQL': 5432,
        'MongoDB': 27017,
        'SQLite': 0,
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
    return tableCount * 100 * 1024;
}

// ─── SQL Dialect Translation via DuckDB ───────────────────────────────
// DuckDB understands MySQL, PostgreSQL, and SQLite SQL natively.
// For other types we map to DuckDB-compatible SQL.

function translateQuery(query, dbType) {
    // DuckDB handles standard SQL, MySQL, and PostgreSQL dialects natively.
    // For MongoDB-style or Redis commands, we provide a translation layer.
    switch (dbType) {
        case 'MongoDB': {
            // Basic MongoDB-style command translation to SQL
            const findMatch = query.match(/db\.(\w+)\.find\((\{.*?\})?\)/);
            if (findMatch) {
                const collection = findMatch[1];
                const filter = findMatch[2];
                if (filter && filter !== '{}') {
                    // Parse simple key:value filters
                    const conditions = filter.replace(/[{}]/g, '')
                        .split(',')
                        .map(pair => {
                            const [key, val] = pair.split(':').map(s => s.trim().replace(/['"]/g, ''));
                            return `${key} = '${val}'`;
                        })
                        .join(' AND ');
                    return `SELECT * FROM ${collection} WHERE ${conditions}`;
                }
                return `SELECT * FROM ${collection}`;
            }
            const insertMatch = query.match(/db\.(\w+)\.insertOne\((\{.*?\})\)/);
            if (insertMatch) {
                const collection = insertMatch[1];
                try {
                    const doc = JSON.parse(insertMatch[2].replace(/(\w+):/g, '"$1":'));
                    const keys = Object.keys(doc).join(', ');
                    const vals = Object.values(doc).map(v => `'${v}'`).join(', ');
                    return `INSERT INTO ${collection} (${keys}) VALUES (${vals})`;
                } catch {
                    return query;
                }
            }
            return query;
        }
        case 'Redis': {
            // Basic Redis command translation to SQL key-value operations
            const parts = query.trim().split(/\s+/);
            const cmd = parts[0].toUpperCase();
            if (cmd === 'GET' && parts[1]) {
                return `SELECT value FROM kv_store WHERE key = '${parts[1]}'`;
            }
            if (cmd === 'SET' && parts[1] && parts[2]) {
                return `INSERT INTO kv_store (key, value) VALUES ('${parts[1]}', '${parts.slice(2).join(' ')}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
            }
            if (cmd === 'DEL' && parts[1]) {
                return `DELETE FROM kv_store WHERE key = '${parts[1]}'`;
            }
            if (cmd === 'KEYS' && parts[1]) {
                const pattern = parts[1].replace(/\*/g, '%');
                return `SELECT key FROM kv_store WHERE key LIKE '${pattern}'`;
            }
            return query;
        }
        case 'MySQL': {
            // DuckDB handles most MySQL syntax natively
            // Translate MySQL-specific functions that DuckDB doesn't support
            let translated = query;
            translated = translated.replace(/IFNULL\(/gi, 'COALESCE(');
            translated = translated.replace(/LIMIT\s+(\d+)\s*,\s*(\d+)/gi, 'LIMIT $2 OFFSET $1');
            return translated;
        }
        case 'SQLite': {
            // DuckDB is highly compatible with SQLite SQL
            return query;
        }
        case 'PostgreSQL': {
            // DuckDB natively supports most PostgreSQL syntax
            return query;
        }
        default:
            return query;
    }
}

// ─── API Routes ───────────────────────────────────────────────────────

// Get all databases
app.get('/api/databases', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('database_instances')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const databases = (data || []).map(db => {
            const size = calculateDatabaseSize(0);
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
    } catch (error) {
        console.error('Error fetching databases:', error);
        res.status(500).json({ error: 'Failed to fetch databases' });
    }
});

// Create new database
app.post('/api/databases', async (req, res) => {
    try {
        const { name, type, description, region, status } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        // Check if database already exists
        const { data: existing } = await supabase
            .from('database_instances')
            .select('id')
            .eq('name', name)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'Database with this name already exists' });
        }

        // Generate credentials
        const credentials = generateCredentials(name, type);
        const dbId = uuidv4();

        // Insert into Supabase
        const { data, error } = await supabase
            .from('database_instances')
            .insert({
                id: dbId,
                name,
                type,
                description: description || '',
                region: region || 'us-east-1',
                status: status || 'pending',
                username: credentials.username,
                password: credentials.password,
                host: credentials.host,
                port: credentials.port,
                database_name: credentials.database,
                connection_string: credentials.connectionString
            })
            .select()
            .single();

        if (error) throw error;

        // Also create a DuckDB namespace for this database instance
        // This allows DuckDB to manage per-instance schema translation
        duckConn.run(`CREATE SCHEMA IF NOT EXISTS "db_${dbId.replace(/-/g, '_')}"`, (err) => {
            if (err) console.error('DuckDB schema creation warning:', err.message);
        });

        // Simulate provisioning - mark as active after delay
        setTimeout(async () => {
            await supabase
                .from('database_instances')
                .update({ status: 'active' })
                .eq('id', dbId);
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
    } catch (error) {
        console.error('Error creating database:', error);
        res.status(500).json({ error: 'Failed to create database' });
    }
});

// Get database by ID
app.get('/api/databases/:id', async (req, res) => {
    try {
        const { data: db, error } = await supabase
            .from('database_instances')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !db) {
            return res.status(404).json({ error: 'Database not found' });
        }

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
    } catch (error) {
        console.error('Error fetching database:', error);
        res.status(500).json({ error: 'Failed to fetch database' });
    }
});

// Delete database
app.delete('/api/databases/:id', async (req, res) => {
    try {
        // Clean up DuckDB schema for this instance
        const schemaName = `db_${req.params.id.replace(/-/g, '_')}`;
        duckConn.run(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`, () => {});

        const { error, count } = await supabase
            .from('database_instances')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Database deleted successfully' });
    } catch (error) {
        console.error('Error deleting database:', error);
        res.status(500).json({ error: 'Failed to delete database' });
    }
});

// Execute query on database using DuckDB as translation layer
app.post('/api/databases/:id/query', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        // Get database instance to know its type
        const { data: db, error: fetchError } = await supabase
            .from('database_instances')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !db) {
            return res.status(404).json({ error: 'Database not found' });
        }

        // Translate the query from the source dialect to DuckDB-compatible SQL
        const translatedQuery = translateQuery(query, db.type);

        // Set the search path to this database's DuckDB schema
        const schemaName = `db_${req.params.id.replace(/-/g, '_')}`;
        duckConn.run(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`, () => {});
        duckConn.run(`SET search_path TO "${schemaName}"`, (err) => {
            if (err) {
                console.error('DuckDB schema switch warning:', err.message);
            }

            // Execute the translated query via DuckDB
            duckConn.all(translatedQuery, (err, result) => {
                if (err) {
                    return res.status(400).json({
                        error: err.message,
                        originalQuery: query,
                        translatedQuery: translatedQuery,
                        dialect: db.type
                    });
                }

                res.json({
                    result,
                    metadata: {
                        dialect: db.type,
                        originalQuery: query,
                        translatedQuery: translatedQuery !== query ? translatedQuery : undefined,
                        engine: 'DuckDB',
                        rowCount: result ? result.length : 0
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Failed to execute query' });
    }
});

// Get database statistics
app.get('/api/databases/:id/stats', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('database_tables')
            .select('id')
            .eq('database_id', req.params.id);

        if (error) throw error;

        const tableCount = data ? data.length : 0;
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
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Create table in database instance
app.post('/api/databases/:id/tables', async (req, res) => {
    const { tableName, schema } = req.body;

    if (!tableName) {
        return res.status(400).json({ error: 'Table name is required' });
    }

    try {
        const tableId = uuidv4();

        const { data, error } = await supabase
            .from('database_tables')
            .insert({
                id: tableId,
                database_id: req.params.id,
                table_name: tableName,
                schema_definition: schema || ''
            })
            .select()
            .single();

        if (error) throw error;

        // Also create the table in DuckDB for query execution
        const schemaName = `db_${req.params.id.replace(/-/g, '_')}`;
        if (schema) {
            duckConn.run(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`, () => {});
            duckConn.run(`CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (${schema})`, (err) => {
                if (err) console.error('DuckDB table creation warning:', err.message);
            });
        }

        res.json({
            id: tableId,
            database_id: req.params.id,
            table_name: tableName,
            schema_definition: schema || ''
        });
    } catch (error) {
        console.error('Error creating table:', error);
        res.status(500).json({ error: 'Failed to create table' });
    }
});

// Get tables for a database instance
app.get('/api/databases/:id/tables', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('database_tables')
            .select('*')
            .eq('database_id', req.params.id);

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check Supabase connectivity
        const { error } = await supabase
            .from('database_instances')
            .select('id')
            .limit(1);

        if (error) throw error;

        res.json({
            status: 'healthy',
            backend: 'supabase',
            translationLayer: 'duckdb',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            backend: 'supabase',
            error: error.message
        });
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    duckConn.close();
    duckDB.close();
    console.log('DuckDB connection closed');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✓ Database Manager API running on http://localhost:${PORT}`);
    console.log(`✓ Supabase backend: ${SUPABASE_URL}`);
    console.log(`✓ DuckDB translation layer active`);
    console.log(`✓ Supported dialects: MySQL, PostgreSQL, MongoDB, SQLite, Redis\n`);
});
