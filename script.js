// Database storage
let databases = [];

// DOM Elements
const createDbBtn = document.getElementById('createDbBtn');
const createDbModal = document.getElementById('createDbModal');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const createDbForm = document.getElementById('createDbForm');
const databaseContainer = document.getElementById('databaseContainer');
const emptyState = document.getElementById('emptyState');

// Load databases from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDatabases();
    renderDatabases();
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
createDbForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(createDbForm);
    const newDatabase = {
        id: Date.now(),
        name: formData.get('dbName'),
        type: formData.get('dbType'),
        description: formData.get('dbDescription'),
        createdAt: new Date().toISOString()
    };

    databases.push(newDatabase);
    saveDatabases();
    renderDatabases();
    closeModal();

    // Show success message
    showNotification(`Database "${newDatabase.name}" created successfully!`);
});

// Render databases
function renderDatabases() {
    if (databases.length === 0) {
        emptyState.classList.remove('hidden');
        databaseContainer.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');

    databaseContainer.innerHTML = databases.map(db => `
        <div class="database-card" data-id="${db.id}">
            <div class="database-card-header">
                <div>
                    <h3>${escapeHtml(db.name)}</h3>
                    <span class="database-type">${escapeHtml(db.type)}</span>
                </div>
            </div>
            ${db.description ? `<p class="database-description">${escapeHtml(db.description)}</p>` : ''}
            <div class="database-actions">
                <button class="btn-small btn-delete" onclick="deleteDatabase(${db.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Delete database
function deleteDatabase(id) {
    const db = databases.find(d => d.id === id);
    if (confirm(`Are you sure you want to delete "${db.name}"?`)) {
        databases = databases.filter(d => d.id !== id);
        saveDatabases();
        renderDatabases();
        showNotification(`Database "${db.name}" deleted successfully!`);
    }
}

// Save to localStorage
function saveDatabases() {
    localStorage.setItem('databases', JSON.stringify(databases));
}

// Load from localStorage
function loadDatabases() {
    const stored = localStorage.getItem('databases');
    if (stored) {
        databases = JSON.parse(stored);
    } else {
        // Add sample data for demonstration
        databases = [
            {
                id: 1,
                name: 'Production DB',
                type: 'PostgreSQL',
                description: 'Main production database for customer data',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Analytics DB',
                type: 'MongoDB',
                description: 'Database for analytics and reporting',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: 'Cache Store',
                type: 'Redis',
                description: 'Redis cache for session management',
                createdAt: new Date().toISOString()
            }
        ];
        saveDatabases();
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
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
