// API Configuration
// Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : `${window.location.protocol}//${window.location.host}/api`;

// Database storage
let databases = [];
let filteredDatabases = [];
let currentDatabase = null;

// DOM Elements
const createDbBtn = document.getElementById('createDbBtn');
const createDbModal = document.getElementById('createDbModal');
const createDbForm = document.getElementById('createDbForm');
const databaseTableBody = document.getElementById('databaseTableBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');

// Load databases from API on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDatabases();
});

// Open modal
createDbBtn.addEventListener('click', () => {
    createDbModal.classList.remove('hidden');
});

// Close modal function
function closeModal() {
    createDbModal.classList.add('hidden');
    createDbForm.reset();
}

// Close credentials modal
function closeCredentialsModal() {
    document.getElementById('credentialsModal').classList.add('hidden');
}

// Search functionality
searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
statusFilter.addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const typeValue = typeFilter.value;
    const statusValue = statusFilter.value;

    filteredDatabases = databases.filter(db => {
        const matchesSearch = db.name.toLowerCase().includes(searchTerm) ||
                            (db.description && db.description.toLowerCase().includes(searchTerm));
        const matchesType = !typeValue || db.type === typeValue;
        const matchesStatus = !statusValue || db.status === statusValue;

        return matchesSearch && matchesType && matchesStatus;
    });

    renderDatabases();
}

// Handle form submission
createDbForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(createDbForm);
    const dbData = {
        name: formData.get('dbName'),
        type: formData.get('dbType'),
        region: formData.get('dbRegion'),
        description: formData.get('dbDescription'),
        status: 'pending'
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
        filteredDatabases = databases;
        renderDatabases();
    } catch (error) {
        console.error('Error loading databases:', error);
        showNotification('Failed to load databases. Make sure the server is running.', 'error');
    }
}

// Render databases in table
function renderDatabases() {
    if (filteredDatabases.length === 0) {
        emptyState.classList.remove('hidden');
        databaseTableBody.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');

    databaseTableBody.innerHTML = filteredDatabases.map(db => {
        const statusBadge = getStatusBadge(db.status);
        const regionName = getRegionName(db.region);
        const createdDate = new Date(db.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick="showCredentials('${db.id}')">
                <td class="px-6 py-4">
                    <div class="font-semibold text-gray-900">${escapeHtml(db.name)}</div>
                    ${db.description ? `<div class="text-sm text-gray-500">${escapeHtml(db.description)}</div>` : ''}
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary bg-opacity-10 text-primary">
                        ${escapeHtml(db.type)}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">${regionName}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${db.sizeFormatted || '0 B'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${createdDate}</td>
                <td class="px-6 py-4 text-right" onclick="event.stopPropagation()">
                    <div class="flex justify-end gap-2">
                        <button
                            onclick="showCredentials('${db.id}')"
                            class="text-primary hover:text-opacity-80 font-medium text-sm transition-colors"
                        >
                            View
                        </button>
                        <button
                            onclick="deleteDatabase('${db.id}')"
                            class="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusConfig = {
        'active': {
            bg: 'bg-green-100',
            text: 'text-green-800',
            label: 'Active'
        },
        'stopped': {
            bg: 'bg-red-100',
            text: 'text-red-800',
            label: 'Stopped'
        },
        'pending': {
            bg: 'bg-yellow-100',
            text: 'text-yellow-800',
            label: 'Pending'
        }
    };

    const config = statusConfig[status] || statusConfig['active'];
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}">${config.label}</span>`;
}

// Get region display name
function getRegionName(region) {
    const regions = {
        'us-east-1': 'US East (N. Virginia)',
        'us-west-2': 'US West (Oregon)',
        'eu-west-1': 'EU West (Ireland)',
        'eu-central-1': 'EU Central (Frankfurt)',
        'ap-southeast-1': 'Asia Pacific (Singapore)',
        'ap-northeast-1': 'Asia Pacific (Tokyo)'
    };
    return regions[region] || region || 'N/A';
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

// Display credentials modal with Tailwind styling
function displayCredentialsModal(db) {
    const modal = document.getElementById('credentialsModal');
    const content = document.getElementById('credentialsContent');

    const cred = db.credentials;
    const stats = db.stats || {};
    const regionName = getRegionName(db.region);
    const statusBadge = getStatusBadge(db.status);

    const codeExamples = getCodeExamples(cred);

    content.innerHTML = `
        <div class="space-y-6">
            <!-- Header Info -->
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-2xl font-bold text-gray-900">${escapeHtml(db.name)}</h3>
                    <div class="flex items-center gap-3 mt-2">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary bg-opacity-10 text-primary">
                            ${escapeHtml(db.type)}
                        </span>
                        ${statusBadge}
                        <span class="text-sm text-gray-600">${regionName}</span>
                    </div>
                </div>
            </div>

            <!-- Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div class="text-sm font-medium text-blue-600 mb-1">Storage Usage</div>
                    <div class="text-2xl font-bold text-blue-900">${stats.usagePercent || 0}%</div>
                    <div class="text-xs text-blue-600 mt-1">${stats.size || '0 B'} / ${stats.maxSize || '10 MB'}</div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div class="text-sm font-medium text-green-600 mb-1">Available Space</div>
                    <div class="text-2xl font-bold text-green-900">${stats.availableSpace || '10 MB'}</div>
                </div>
                <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div class="text-sm font-medium text-purple-600 mb-1">Tables</div>
                    <div class="text-2xl font-bold text-purple-900">${stats.tables || 0}</div>
                </div>
            </div>

            <!-- Connection Information Tabs -->
            <div>
                <h4 class="text-lg font-bold text-gray-900 mb-4">Connection Information</h4>

                <!-- Tab Buttons -->
                <div class="border-b border-gray-200 mb-4">
                    <nav class="flex gap-6">
                        <button
                            class="tab-button border-b-2 border-primary text-primary font-semibold pb-3 transition-colors"
                            onclick="switchTab(event, 'general')"
                        >
                            General
                        </button>
                        <button
                            class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-semibold pb-3 transition-colors"
                            onclick="switchTab(event, 'uri')"
                        >
                            Connection URI
                        </button>
                        <button
                            class="tab-button border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-semibold pb-3 transition-colors"
                            onclick="switchTab(event, 'cli')"
                        >
                            CLI Command
                        </button>
                    </nav>
                </div>

                <!-- Tab Content -->
                <div id="general" class="tab-content">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${createInfoItem('User', cred.username)}
                        ${createInfoItem('Password', cred.password)}
                        ${createInfoItem('Host', cred.host)}
                        ${createInfoItem('Port', cred.port.toString())}
                        <div class="md:col-span-2">
                            ${createInfoItem('Database', cred.database)}
                        </div>
                    </div>
                </div>

                <div id="uri" class="tab-content hidden">
                    <div class="bg-gray-900 rounded-lg p-4 flex items-center justify-between gap-4">
                        <code class="text-green-400 text-sm flex-1 break-all font-mono">${escapeHtml(cred.connectionString)}</code>
                        <button
                            onclick="copyToClipboard('${escapeHtml(cred.connectionString)}')"
                            class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                        >
                            Copy
                        </button>
                    </div>
                </div>

                <div id="cli" class="tab-content hidden">
                    <div class="bg-gray-900 rounded-lg p-4 flex items-center justify-between gap-4">
                        <code class="text-green-400 text-sm flex-1 break-all font-mono">${getCLICommand(cred)}</code>
                        <button
                            onclick="copyToClipboard('${getCLICommand(cred)}')"
                            class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            </div>

            <!-- Code Examples -->
            <div>
                <h4 class="text-lg font-bold text-gray-900 mb-4">Code Examples</h4>
                ${codeExamples}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Create info item with copy button
function createInfoItem(label, value) {
    return `
        <div class="space-y-2">
            <label class="block text-sm font-semibold text-gray-700">${label}</label>
            <div class="flex items-center gap-2">
                <code class="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-mono text-gray-900">${escapeHtml(value)}</code>
                <button
                    onclick="copyToClipboard('${escapeHtml(value)}')"
                    class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                    Copy
                </button>
            </div>
        </div>
    `;
}

// Get code examples based on database type
function getCodeExamples(cred) {
    const examples = {
        'MySQL': `
            <div class="bg-gray-900 rounded-lg p-4">
                <div class="text-sm font-semibold text-gray-300 mb-3">Node.js (MySQL)</div>
                <pre class="text-green-400 text-sm overflow-x-auto"><code>const mysql = require('mysql');
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
        'PostgreSQL': `
            <div class="bg-gray-900 rounded-lg p-4">
                <div class="text-sm font-semibold text-gray-300 mb-3">Node.js (PostgreSQL)</div>
                <pre class="text-green-400 text-sm overflow-x-auto"><code>const { Client } = require('pg');
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
        'MongoDB': `
            <div class="bg-gray-900 rounded-lg p-4">
                <div class="text-sm font-semibold text-gray-300 mb-3">Node.js (MongoDB)</div>
                <pre class="text-green-400 text-sm overflow-x-auto"><code>const { MongoClient } = require('mongodb');
const uri = '${cred.connectionString}';
const client = new MongoClient(uri);

await client.connect();
console.log('Connected!');</code></pre>
            </div>`,
        'SQLite': `
            <div class="bg-gray-900 rounded-lg p-4">
                <div class="text-sm font-semibold text-gray-300 mb-3">Node.js (SQLite)</div>
                <pre class="text-green-400 text-sm overflow-x-auto"><code>const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('${cred.database}.db');

db.serialize(() => {
  console.log('Connected!');
});</code></pre>
            </div>`,
        'Redis': `
            <div class="bg-gray-900 rounded-lg p-4">
                <div class="text-sm font-semibold text-gray-300 mb-3">Node.js (Redis)</div>
                <pre class="text-green-400 text-sm overflow-x-auto"><code>const redis = require('redis');
const client = redis.createClient({
  host: '${cred.host}',
  port: ${cred.port},
  password: '${cred.password}'
});

await client.connect();
console.log('Connected!');</code></pre>
            </div>`
    };

    return examples[cred.type] || `<p class="text-gray-500">Code example not available for ${cred.type}</p>`;
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
        content.classList.add('hidden');
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('border-primary', 'text-primary');
        button.classList.add('border-transparent', 'text-gray-500');
    });

    // Show the selected tab content
    document.getElementById(tabName).classList.remove('hidden');

    // Add active class to the clicked button
    event.currentTarget.classList.add('border-primary', 'text-primary');
    event.currentTarget.classList.remove('border-transparent', 'text-gray-500');
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy', 'error');
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
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';

    notification.className = `fixed top-5 right-5 ${bgColor} text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-slide-in`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('animate-slide-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slide-out {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .animate-slide-in {
        animation: slide-in 0.3s ease;
    }

    .animate-slide-out {
        animation: slide-out 0.3s ease;
    }
`;
document.head.appendChild(style);
