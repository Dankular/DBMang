# Database Manager

A simple, elegant web interface for managing databases.

## Features

- **Database List View**: Display all your databases in a clean, grid-based layout
- **Create New Database**: Easy-to-use modal form for creating new databases
- **Database Types**: Support for MySQL, PostgreSQL, MongoDB, SQLite, and Redis
- **Delete Databases**: Remove databases with confirmation
- **Local Storage**: All data persists in browser localStorage
- **Responsive Design**: Works on desktop and mobile devices
- **Sample Data**: Pre-populated with example databases for demonstration

## How to Use

1. Open `index.html` in your web browser
2. View the list of existing databases (sample data included)
3. Click "Create New Database" to add a new database
4. Fill in the database name, type, and optional description
5. Click "Create Database" to add it to the list
6. Use the "Delete" button on any database card to remove it

## Technologies Used

- HTML5
- CSS3 (with modern gradient backgrounds and animations)
- Vanilla JavaScript
- localStorage for data persistence

## File Structure

```
DBMang/
├── index.html      # Main HTML structure
├── styles.css      # Styling and layout
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Features Explained

### Create New Database
Click the green "Create New Database" button to open a modal form where you can:
- Enter a database name
- Select a database type
- Add an optional description

### Database Cards
Each database is displayed as a card showing:
- Database name
- Database type (as a colored badge)
- Description (if provided)
- Delete button

### Data Persistence
All databases are stored in your browser's localStorage, so they'll persist between page refreshes.

## Browser Compatibility

Works in all modern browsers that support:
- CSS Grid
- localStorage
- ES6 JavaScript
