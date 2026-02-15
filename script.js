// API Configuration
const API_URL = 'http://localhost:3000/api';

// Database storage
let databases = [];
let currentDatabase = null;

// DOM Elements
const createDbBtn = document.getElementById('createDbBtn');
const createDbModal = document.getElementById('createDbModal');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const createDbForm = document.getElementById('createDbForm');
const databaseContainer = document.getElementById('databaseContainer');
const emptyState = document.getElementById('emptyState');

// Load databases from API on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDatabases();
});

// Open modal
createDbBtn.addEventListener('click', () => {
    createDbModal.classList.add('show');
});

// Close modal
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createDbModal) {
        closeModal();
    }
});

function closeModal() {
    createDbModal.classList.remove('show');
    createDbForm.reset();
}

// Handle form submission
createDbForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(createDbForm);
    const dbData = {
        name: formData.get('dbName'),
        type: formData.get('dbType'),
        description: formData.get('dbDescription')
    };

    try {
        const response = await fetch(`${API_URL}/databases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dbData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create database');
        }

        const newDatabase = await response.json();
        showNotification(`Database "${newDatabase.name}" created successfully!`);
        closeModal();
        loadDatabases();

        // Show credentials modal after creation
        setTimeout(() => showCredentials(newDatabase.id), 500);
    } catch (error) {
        showNotification(error.message, 'error');
    }
});

// Load databases from API
async function loadDatabases() {
    try {
        const response = await fetch(`${API_URL}/databases`);
        if (!response.ok) {
            throw new Error('Failed to load databases');
        }
        databases = await response.json();
        renderDatabases();
    } catch (error) {
        console.error('Error loading databases:', error);
        showNotification('Failed to load databases. Make sure the server is running.', 'error');
    }
}

// Render databases
function renderDatabases() {
    if (databases.length === 0) {
        emptyState.classList.remove('hidden');
        databaseContainer.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');

    databaseContainer.innerHTML = databases.map(db => `
        <div class="database-card" data-id="${db.id}" onclick="showCredentials('${db.id}')">
            <div class="database-card-header">
                <div>
                    <h3>${escapeHtml(db.name)}</h3>
                    <span class="database-type">${escapeHtml(db.type)}</span>
                </div>
            </div>
            ${db.description ? `<p class="database-description">${escapeHtml(db.description)}</p>` : ''}
            ${db.sizeFormatted ? `<p class="database-size">Size: ${escapeHtml(db.sizeFormatted)}</p>` : ''}
            <div class="database-actions" onclick="event.stopPropagation()">
                <button class="btn-small btn-view" onclick="showCredentials('${db.id}')">View Details</button>
                <button class="btn-small btn-delete" onclick="deleteDatabase('${db.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Show credentials modal
async function showCredentials(id) {
    try {
        const response = await fetch(`${API_URL}/databases/${id}`);
        if (!response.ok) {
            throw new Error('Failed to load database details');
        }

        const db = await response.json();
        const statsResponse = await fetch(`${API_URL}/databases/${id}/stats`);
        const stats = await statsResponse.json();

        currentDatabase = { ...db, stats };
        displayCredentialsModal(currentDatabase);
    } catch (error) {
        console.error('Error loading database details:', error);
        showNotification('Failed to load database details', 'error');
    }
}

// Delete database
async function deleteDatabase(id) {
    const db = databases.find(d => d.id === id);
    if (!confirm(`Are you sure you want to delete "${db.name}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/databases/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete database');
        }

        showNotification(`Database "${db.name}" deleted successfully!`);
        loadDatabases();
    } catch (error) {
        console.error('Error deleting database:', error);
        showNotification('Failed to delete database', 'error');
    }
}

// Display credentials modal
function displayCredentialsModal(db) {
    const modal = document.getElementById('credentialsModal');
    const content = document.getElementById('credentialsContent');

    const cred = db.credentials;
    const stats = db.stats || {};

    const codeExamples = getCodeExamples(cred);

    content.innerHTML = `
        <div class="credentials-section">
            <h3>${escapeHtml(db.name)}</h3>
            <span class="database-type">${escapeHtml(db.type)}</span>

            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Storage Usage</div>
                    <div class="stat-value">${stats.usagePercent || 0}%</div>
                    <div class="stat-details">${stats.size || '0 Bytes'} / ${stats.maxSize || '10 MB'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Available Space</div>
                    <div class="stat-value">${stats.availableSpace || '10 MB'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Tables</div>
                    <div class="stat-value">${stats.tables || 0}</div>
                </div>
            </div>

            <h4>Connection Information</h4>
            <div class="tab-container">
                <div class="tabs">
                    <button class="tab-btn active" onclick="switchTab(event, 'general')">General</button>
                    <button class="tab-btn" onclick="switchTab(event, 'uri')">Connection URI</button>
                    <button class="tab-btn" onclick="switchTab(event, 'cli')">CLI Command</button>
                </div>

                <div id="general" class="tab-content active">
                    <div class="info-grid">
                        <div class="info-item">
                            <label>User:</label>
                            <div class="info-value">
                                <code>${escapeHtml(cred.username)}</code>
                                <button onclick="copyToClipboard('${escapeHtml(cred.username)}')">Copy</button>
                            </div>
                        </div>
                        <div class="info-item">
                            <label>Password:</label>
                            <div class="info-value">
                                <code>${escapeHtml(cred.password)}</code>
                                <button onclick="copyToClipboard('${escapeHtml(cred.password)}')">Copy</button>
                            </div>
                        </div>
                        <div class="info-item">
                            <label>Host:</label>
                            <div class="info-value">
                                <code>${escapeHtml(cred.host)}</code>
                                <button onclick="copyToClipboard('${escapeHtml(cred.host)}')">Copy</button>
                            </div>
                        </div>
                        <div class="info-item">
                            <label>Port:</label>
                            <div class="info-value">
                                <code>${escapeHtml(cred.port.toString())}</code>
                                <button onclick="copyToClipboard('${escapeHtml(cred.port.toString())}')">Copy</button>
                            </div>
                        </div>
                        <div class="info-item full-width">
                            <label>Database name:</label>
                            <div class="info-value">
                                <code>${escapeHtml(cred.database)}</code>
                                <button onclick="copyToClipboard('${escapeHtml(cred.database)}')">Copy</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="uri" class="tab-content">
                    <div class="connection-string-box">
                        <label>Connection URI</label>
                        <div class="connection-value">
                            <code>${escapeHtml(cred.connectionString)}</code>
                            <button onclick="copyToClipboard('${escapeHtml(cred.connectionString)}')">Copy</button>
                        </div>
                    </div>
                </div>

                <div id="cli" class="tab-content">
                    <div class="connection-string-box">
                        <label>CLI Command</label>
                        <div class="connection-value">
                            <code>${getCLICommand(cred)}</code>
                            <button onclick="copyToClipboard('${getCLICommand(cred)}')">Copy</button>
                        </div>
                    </div>
                </div>
            </div>

            <h4>Code Examples</h4>
            <div class="code-examples">
                ${codeExamples}
            </div>
        </div>
    `;

    modal.classList.add('show');
}

// Get code examples based on database type
function getCodeExamples(cred) {
    const examples = {
        'MySQL': `<div class="code-example">
            <h5>Node.js (MySQL)</h5>
            <pre><code>const mysql = require('mysql');
const connection = mysql.createConnection({
  host: '${cred.host}',
  port: ${cred.port},
  user: '${cred.username}',
  password: '${cred.password}',
  database: '${cred.database}'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected!');
});</code></pre>
        </div>`,
        'PostgreSQL': `<div class="code-example">
            <h5>Node.js (PostgreSQL)</h5>
            <pre><code>const { Client } = require('pg');
const client = new Client({
  host: '${cred.host}',
  port: ${cred.port},
  user: '${cred.username}',
  password: '${cred.password}',
  database: '${cred.database}'
});

await client.connect();
console.log('Connected!');</code></pre>
        </div>`,
        'MongoDB': `<div class="code-example">
            <h5>Node.js (MongoDB)</h5>
            <pre><code>const { MongoClient } = require('mongodb');
const uri = '${cred.connectionString}';
const client = new MongoClient(uri);

await client.connect();
console.log('Connected!');</code></pre>
        </div>`,
        'SQLite': `<div class="code-example">
            <h5>Node.js (SQLite)</h5>
            <pre><code>const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('${cred.database}.db');

db.serialize(() => {
  console.log('Connected!');
});</code></pre>
        </div>`,
        'Redis': `<div class="code-example">
            <h5>Node.js (Redis)</h5>
            <pre><code>const redis = require('redis');
const client = redis.createClient({
  host: '${cred.host}',
  port: ${cred.port},
  password: '${cred.password}'
});

await client.connect();
console.log('Connected!');</code></pre>
        </div>`
    };

    return examples[cred.type] || `<p>Code example not available for ${cred.type}</p>`;
}

// Get CLI command based on database type
function getCLICommand(cred) {
    const commands = {
        'MySQL': `mysql -u ${cred.username} -P ${cred.port} -p${cred.password} -h ${cred.host} ${cred.database}`,
        'PostgreSQL': `psql -h ${cred.host} -p ${cred.port} -U ${cred.username} -d ${cred.database}`,
        'MongoDB': `mongo ${cred.connectionString}`,
        'SQLite': `sqlite3 ${cred.database}.db`,
        'Redis': `redis-cli -h ${cred.host} -p ${cred.port} -a ${cred.password}`
    };
    return commands[cred.type] || `# CLI command not available for ${cred.type}`;
}

// Switch between tabs
function switchTab(event, tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Show the selected tab content
    document.getElementById(tabName).classList.add('active');

    // Add active class to the clicked button
    event.currentTarget.classList.add('active');
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#dc3545' : '#4CAF50';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
