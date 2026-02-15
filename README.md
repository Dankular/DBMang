# Database Manager

A modern full-stack web application for managing databases with **Tailwind CSS**, centralized **MySQL storage**, and **DuckDB** as a query interface layer. Create database instances, generate unique credentials, and get connection strings with code examples.

## 🌐 Live Deployment

- **Production**: https://db-mang.vercel.app
- **Git Branch Preview**: https://db-mang-git-claude-database-list-webp-196743-dankulars-projects.vercel.app

## ✨ Features

- **🎨 Modern Tailwind UI**: Professional table view with search and filters
- **🔍 Search & Filter**: Real-time search by name/description, filter by type and status
- **🚀 Database Provisioning**: Create database instances with unique credentials
- **🔐 Credential Management**: Auto-generate usernames, passwords, and connection URIs
- **📊 Database Statistics**: View storage usage, available space, and table count
- **💾 Multiple Database Types**: MySQL, PostgreSQL, MongoDB, SQLite, Redis
- **🌍 Region Selection**: Deploy across 6 major regions (US, EU, Asia Pacific)
- **📍 Status Indicators**: Active, Stopped, Pending states with color badges
- **📋 Code Examples**: Get ready-to-use connection code in Node.js
- **🏢 Central MySQL Storage**: All database instances stored in central MySQL database
- **⚡ DuckDB Interface**: Query abstraction layer for multi-database support
- **☁️ Vercel Deployment**: Production-ready with serverless architecture

## 🏗️ Architecture

```
┌──────────────────────┐
│   Frontend           │
│  (Tailwind CSS)      │
│  - Table View        │
│  - Search & Filters  │
│  - Real-time Updates │
└──────────┬───────────┘
           │
           │ REST API
           ▼
┌──────────────────────┐
│   Backend            │
│  (Node.js/Express)   │
│  - API Endpoints     │
│  - Auth & CORS       │
│  - Vercel Serverless │
└──────────┬───────────┘
           │
      ┌────┴─────┐
      │          │
      ▼          ▼
┌──────────┐  ┌───────────┐
│  MySQL   │  │  DuckDB   │
│ Central  │  │ Interface │
│ Storage  │  │   Layer   │
│ (Remote) │  │ (:memory) │
└──────────┘  └───────────┘
```

### Backend (Node.js + Express + MySQL + DuckDB)
- RESTful API for database management
- **Central MySQL database** for all database instance metadata
- **DuckDB** as query interface and abstraction layer
- Automatic unique credential generation per database
- Statistics and usage tracking
- Environment-based configuration
- CORS configured for Vercel deployments

### Frontend (Tailwind CSS + Vanilla JavaScript)
- Modern table view with hover effects
- Real-time search and multi-filter functionality
- Modal dialogs for creating databases and viewing credentials
- Copy-to-clipboard for all connection details
- Toast notifications for success/error feedback
- Fully responsive design (mobile & desktop)
- Auto-detecting API URLs (local vs production)

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MySQL database (for central storage)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DBMang
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your MySQL credentials:
   ```env
   MYSQL_HOST=8eysec.h.filess.io
   MYSQL_USER=context_mightydeal
   MYSQL_PASSWORD=your_password_here
   MYSQL_DATABASE=context_mightydeal
   MYSQL_PORT=61001
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open the application**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Vercel Deployment

1. **Connect to Vercel**
   - Link your GitHub repository to Vercel
   - Vercel will auto-deploy on every push to your branch

2. **Configure Environment Variables in Vercel Dashboard**
   - Go to: Project Settings → Environment Variables
   - Add the following variables:
     - `MYSQL_HOST` = 8eysec.h.filess.io
     - `MYSQL_USER` = context_mightydeal
     - `MYSQL_PASSWORD` = (your password)
     - `MYSQL_DATABASE` = context_mightydeal
     - `MYSQL_PORT` = 61001

3. **Deploy**
   - Push to your branch
   - Vercel automatically builds and deploys
   - Access via: `https://db-mang.vercel.app`

### Manual Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
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

## 🔧 How It Works

1. **Database Creation**: When you create a database, the backend:
   - Inserts a new record into the **central MySQL database** (`database_instances` table)
   - Generates unique credentials (username, password, port, connection URI)
   - Sets initial status to `pending`, then transitions to `active` after 2 seconds
   - Returns connection information to the frontend
   - **No local files created** - everything stored in central MySQL

2. **Credential Generation**: Each database gets:
   - **Username**: `{database_name}_user` (sanitized)
   - **Password**: Random UUID-based 32-character string
   - **Port**: Type-specific (MySQL:3306, PostgreSQL:5432, MongoDB:27017, etc.)
   - **Connection URI**: Formatted based on database type

3. **Central Storage**: All database instances are stored in MySQL with:
   - Unique ID (UUID)
   - Name, type, description, region
   - Status (pending, active, stopped)
   - Full credentials and connection strings
   - Timestamps (created_at, updated_at)

4. **DuckDB Interface Layer**: Provides query abstraction:
   - Runs in **:memory:** mode (no persistence)
   - Translates queries between different database types
   - Acts as a unified interface for multiple database engines

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
