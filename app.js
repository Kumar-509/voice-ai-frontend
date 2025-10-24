// Voice AI Assistant - Complete JavaScript with OpenAI Integration
// Backend URL Configuration
const BACKEND_URL = 'https://voice-ai-backend-production-d079.up.railway.app';

// API Endpoints
const API = {
    health: `${BACKEND_URL}/health`,
    chat: `${BACKEND_URL}/api/chat`,
    search: `${BACKEND_URL}/api/search`,
    reminders: `${BACKEND_URL}/api/reminders`
};

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const micButton = document.getElementById('micButton');
const searchButton = document.getElementById('searchButton');
const reminderButton = document.getElementById('reminderButton');
const statusMessage = document.getElementById('statusMessage');
const connectionStatus = document.getElementById('connectionStatus');
const reminderModal = document.getElementById('reminderModal');
const closeModal = document.getElementById('closeModal');
const reminderForm = document.getElementById('reminderForm');

// State
let conversationId = null;
let isRecording = false;
let recognition = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkBackendConnection();
});

// Event Listeners
function setupEventListeners() {
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });
    micButton.addEventListener('click', toggleVoiceInput);
    searchButton.addEventListener('click', () => {
        const query = prompt('Enter search query:');
        if (query) performWebSearch(query);
    });
    reminderButton.addEventListener('click', () => {
        reminderModal.classList.add('active');
    });
    closeModal.addEventListener('click', () => {
        reminderModal.classList.remove('active');
    });
    reminderForm.addEventListener('submit', createReminder);
}

// Backend Connection Check
async function checkBackendConnection() {
    updateConnectionStatus('checking');
    try {
        const response = await fetch(API.health, { timeout: 10000 });
        const data = await response.json();
        if (data.status === 'ok') {
            updateConnectionStatus('connected');
            updateStatus('✅ Connected to AI backend', 3000);
        }
    } catch (error) {
        console.error('Backend connection error:', error);
        updateConnectionStatus('error');
        updateStatus('⚠️ Connecting... Retrying in 10s');
        setTimeout(checkBackendConnection, 10000);
    }
}

function updateConnectionStatus(status) {
    const dot = connectionStatus.querySelector('.status-dot');
    const text = connectionStatus.querySelector('.status-text');
    dot.className = 'status-dot';
    
    if (status === 'connected') {
        dot.classList.add('connected');
        text.textContent = 'Connected';
    } else if (status === 'error') {
        dot.classList.add('error');
        text.textContent = 'Connection Error';
    } else {
        text.textContent = 'Connecting...';
    }
}

// Send Message to OpenAI via Backend
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    addMessage(message, 'user');
    messageInput.value = '';
    
    const typingId = showTypingIndicator();
    setInputsEnabled(false);
    
    try {
        const response = await fetch(API.chat, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, conversationId })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.conversationId) conversationId = data.conversationId;
        
        removeTypingIndicator(typingId);
        addMessage(data.response, 'assistant');
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator(typingId);
        addMessage('Sorry, I encountered an error. Please ensure the backend is running.', 'system');
        updateStatus('❌ Error sending message');
    } finally {
        setInputsEnabled(true);
        messageInput.focus();
    }
}

// Web Search Function
async function performWebSearch(query) {
    updateStatus('🔍 Searching...');
    addMessage(`Search: ${query}`, 'user');
    
    const typingId = showTypingIndicator();
    
    try {
        const response = await fetch(API.search, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, type: 'web' })
        });
        
        const data = await response.json();
        removeTypingIndicator(typingId);
        
        if (data.results && data.results.length > 0) {
            const results = data.results.slice(0, 3).map((r, i) => 
                `${i+1}. ${r.title}\n${r.snippet}`
            ).join('\n\n');
            addMessage(`Search Results:\n\n${results}`, 'assistant');
        } else {
            addMessage('No results found.', 'system');
        }
        updateStatus('');
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('Search failed. Please try again.', 'system');
        updateStatus('❌ Search error');
    }
}

// Create Reminder
async function createReminder(e) {
    e.preventDefault();
    const text = document.getElementById('reminderText').value;
    const time = document.getElementById('reminderTime').value;
    
    try {
        const response = await fetch(API.reminders, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, time: new Date(time).toISOString() })
        });
        
        if (response.ok) {
            addMessage(`✅ Reminder set: "${text}" for ${new Date(time).toLocaleString()}`, 'system');
            reminderModal.classList.remove('active');
            reminderForm.reset();
        }
    } catch (error) {
        updateStatus('❌ Failed to create reminder');
    }
}

// Voice Input
function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Voice input not supported in your browser. Please use Chrome.');
        return;
    }
    
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        isRecording = true;
        micButton.classList.add('active');
        updateStatus('🎤 Listening...');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        updateStatus('');
    };
    
    recognition.onerror = () => {
        updateStatus('❌ Voice input error');
        stopRecording();
    };
    
    recognition.onend = () => stopRecording();
    
    recognition.start();
}

function stopRecording() {
    if (recognition) recognition.stop();
    isRecording = false;
    micButton.classList.remove('active');
    updateStatus('');
}

// UI Helper Functions
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-' + Date.now();
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(indicator);
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return typingDiv.id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}

function setInputsEnabled(enabled) {
    sendButton.disabled = !enabled;
    messageInput.disabled = !enabled;
    micButton.disabled = !enabled;
    searchButton.disabled = !enabled;
    reminderButton.disabled = !enabled;
}

function updateStatus(message, timeout = 0) {
    statusMessage.textContent = message;
    if (timeout) {
        setTimeout(() => statusMessage.textContent = '', timeout);
    }
}

console.log('Voice AI Assistant loaded successfully!');
console.log('Backend URL:', BACKEND_URL);
