# DuckDB Database Manager

A full-stack web application for managing databases powered by DuckDB. Create database instances, generate credentials, and get connection strings with code examples.

## Features

- **🚀 Database Provisioning**: Create database instances via DuckDB backend
- **🔐 Credential Management**: Automatically generate usernames, passwords, and connection strings
- **📊 Database Statistics**: View storage usage, available space, and table count
- **💾 Multiple Database Types**: Support for MySQL, PostgreSQL, MongoDB, SQLite, and Redis
- **📋 Code Examples**: Get ready-to-use connection code in Node.js
- **🎨 Modern UI**: Clean, responsive interface with gradient backgrounds
- **📦 Real Database Storage**: Uses DuckDB for actual database creation and storage

## Architecture

### Backend (Node.js + Express + DuckDB)
- RESTful API for database management
- DuckDB integration for database provisioning
- Automatic credential generation
- Database file storage and metadata management
- Statistics and usage tracking

### Frontend (Vanilla JavaScript)
- Interactive database list view
- Modal dialogs for creating databases and viewing credentials
- Real-time connection to backend API
- Copy-to-clipboard functionality
- Success/error notifications

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Instructions

1. **Clone or navigate to the repository**
   ```bash
   cd DBMang
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open the application**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Creating a Database

1. Click the green **"Create New Database"** button
2. Fill in the form:
   - **Database Name**: Enter a unique name for your database
   - **Database Type**: Select from MySQL, PostgreSQL, MongoDB, SQLite, or Redis
   - **Description**: Optional description of the database purpose
3. Click **"Create Database"**
4. The credentials modal will automatically appear with connection details

### Viewing Database Details

Click on any database card or the **"View Details"** button to see:

- **Storage Statistics**:
  - Storage usage percentage
  - Current size / Maximum size
  - Available space
  - Number of tables

- **Connection Information**:
  - Host
  - Port
  - Database name
  - Username
  - Password
  - Full connection string

- **Code Examples**:
  - Ready-to-use Node.js connection code
  - Tailored to the specific database type

### Deleting a Database

1. Click the **"Delete"** button on any database card
2. Confirm the deletion in the popup dialog
3. The database file and metadata will be permanently removed

## API Endpoints

### GET `/api/databases`
Returns a list of all databases with metadata and size information.

### POST `/api/databases`
Creates a new database instance.

**Request Body:**
```json
{
  "name": "my_database",
  "type": "PostgreSQL",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "my_database",
  "type": "PostgreSQL",
  "description": "Optional description",
  "credentials": {
    "username": "my_database_user",
    "password": "generated-password",
    "host": "localhost",
    "port": 3000,
    "database": "my_database",
    "connectionString": "postgresql://..."
  },
  "path": "/path/to/my_database.duckdb",
  "createdAt": "2026-02-15T...",
  "size": 16384
}
```

### GET `/api/databases/:id`
Returns detailed information about a specific database.

### DELETE `/api/databases/:id`
Deletes a database and its associated files.

### POST `/api/databases/:id/query`
Executes a SQL query on a specific database.

**Request Body:**
```json
{
  "query": "SELECT * FROM my_table"
}
```

### GET `/api/databases/:id/stats`
Returns statistics about a database.

**Response:**
```json
{
  "tables": 5,
  "size": "256 KB",
  "sizeBytes": 262144,
  "maxSize": "10 MB",
  "maxSizeBytes": 10485760,
  "usagePercent": 2.5,
  "availableSpace": "9.75 MB"
}
```

## File Structure

```
DBMang/
├── server.js              # Express server with DuckDB integration
├── package.json          # Node.js dependencies
├── index.html            # Main HTML structure
├── styles.css            # Styling and layout
├── script.js             # Frontend JavaScript
├── README.md             # This file
├── databases/            # Directory for DuckDB files (auto-created)
└── db-metadata.json      # Database metadata (auto-created)
```

## Technology Stack

### Backend
- **Express.js**: Web framework
- **DuckDB**: Embedded analytical database
- **UUID**: Unique ID generation
- **CORS**: Cross-origin resource sharing

### Frontend
- **HTML5**: Structure
- **CSS3**: Styling with modern features
- **Vanilla JavaScript**: No framework dependencies
- **Fetch API**: Backend communication

## How It Works

1. **Database Creation**: When you create a database, the backend:
   - Creates a new DuckDB database file in the `databases/` directory
   - Generates unique credentials (username and password)
   - Stores metadata in `db-metadata.json`
   - Returns connection information to the frontend

2. **Credential Generation**: Each database gets:
   - Username: `{database_name}_user`
   - Password: Random 32-character string
   - Connection string: Formatted based on database type

3. **Storage Management**: DuckDB files are stored locally and tracked with metadata including:
   - File path
   - Creation date
   - Database type
   - Description
   - Credentials

## Example Connection Strings

### PostgreSQL
```
postgresql://mydb_user:abc123...@localhost:3000/mydb
```

### MySQL
```
mysql://mydb_user:abc123...@localhost:3000/mydb
```

### MongoDB
```
mongodb://mydb_user:abc123...@localhost:3000/mydb
```

### SQLite
```
sqlite:///mydb.db
```

### Redis
```
redis://:abc123...@localhost:3000
```

## Browser Compatibility

Works in all modern browsers that support:
- CSS Grid
- Fetch API
- ES6+ JavaScript
- Clipboard API

## Security Notes

⚠️ **Important**: This is a development/demonstration tool. For production use:
- Implement proper authentication and authorization
- Use HTTPS for all connections
- Store credentials securely (encrypted)
- Implement rate limiting
- Add input validation and sanitization
- Use environment variables for sensitive configuration

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License
