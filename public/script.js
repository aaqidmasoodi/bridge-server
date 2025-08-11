// Initialize Socket.IO connection
const socket = io();

// DOM elements
const setupContainer = document.getElementById('setup-container');
const roomContainer = document.getElementById('room-container');
const chatContainer = document.getElementById('chat-container');
const roomLink = document.getElementById('room-link');
const copyBtn = document.getElementById('copy-btn');
const status = document.getElementById('status');
const timerDisplay = document.getElementById('timer');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const userLanguageSelect = document.getElementById('user-language');
const partnerLanguageSelect = document.getElementById('partner-language');
const partnerName = document.getElementById('partner-name');
const translationLang = document.getElementById('translation-lang');
const startBtn = document.getElementById('start-btn');
const usernameInput = document.getElementById('username');
const endChatBtn = document.getElementById('end-chat-btn');

// Global variables
let currentRoomId = null;
let username = 'User';
let userLanguage = 'en';
let partnerLanguage = 'ar';
let timeLeft = 300; // 5 minutes in seconds
let timer = null;
let isJoiningRoom = false;

// Language names mapping
const languageNames = {
    'en': 'English',
    'ar': 'Arabic',
    'ur': 'Urdu',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese (Simplified)',
    'ja': 'Japanese',
    'ko': 'Korean',
    'hi': 'Hindi',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'fi': 'Finnish',
    'da': 'Danish',
    'no': 'Norwegian',
    'cs': 'Czech'
};

// Set default values (English to Arabic)
userLanguageSelect.value = 'en';
partnerLanguageSelect.value = 'ar';
translationLang.textContent = languageNames['ar'];

// Update language when dropdown changes
userLanguageSelect.addEventListener('change', function() {
    userLanguage = this.value;
});

partnerLanguageSelect.addEventListener('change', function() {
    partnerLanguage = this.value;
    translationLang.textContent = languageNames[partnerLanguage] || partnerLanguage;
});

// Start chat button
startBtn.addEventListener('click', function() {
    username = usernameInput.value.trim() || 'User';
    userLanguage = userLanguageSelect.value;
    partnerLanguage = partnerLanguageSelect.value;
    
    if (isJoiningRoom) {
        joinExistingRoom();
    } else {
        startChat();
    }
});

// End chat button
endChatBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to end this chat? This will close the room for both participants.')) {
        endChat('ended');
    }
});

// Copy room link to clipboard
copyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(roomLink.textContent).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback: select text and prompt user to copy
        const textArea = document.createElement('textarea');
        textArea.value = roomLink.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
            }, 2000);
        } catch (err) {
            alert('Please press Ctrl+C to copy the link');
        }
        document.body.removeChild(textArea);
    });
});

// Send message when button is clicked
sendButton.addEventListener('click', sendMessage);

// Send message when Enter is pressed
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Function to start chat
function startChat() {
    // Hide setup, show room container
    setupContainer.style.display = 'none';
    roomContainer.style.display = 'block';
    
    // Create room with selected languages
    socket.emit('create-room', {
        username: username,
        userLanguage: userLanguage,
        partnerLanguage: partnerLanguage
    });
}

// Function to join existing room
function joinExistingRoom() {
    // Hide setup, show room container
    setupContainer.style.display = 'none';
    roomContainer.style.display = 'block';
    
    const path = window.location.pathname;
    const roomMatch = path.match(/\/room\/([a-zA-Z0-9]+)/);
    
    if (roomMatch) {
        socket.emit('join-room', {
            roomId: roomMatch[1],
            username: username,
            language: userLanguage
        });
    }
}

// Function to end chat
function endChat(reason = 'ended') {
    // Notify server that chat is ending
    if (currentRoomId) {
        socket.emit('end-chat', {
            roomId: currentRoomId
        });
    }
}

// Function to redirect to homepage (as if visiting for first time)
function redirectToHomepage() {
    // Redirect to root path
    window.location.href = '/';
}

// Function to send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message && currentRoomId) {
        socket.emit('send-message', {
            roomId: currentRoomId,
            message: message
        });
        messageInput.value = '';
    }
}

// Function to add message to chat
function addMessage(message, translatedMessage, username, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isOwn ? 'sent' : 'received');
    
    const now = new Date();
    const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    
    messageDiv.innerHTML = `
        <div class="original-text">${message}</div>
        <div class="translated-text">${translatedMessage}</div>
        <div class="message-time">${timeString} ${isOwn ? '' : '(' + username + ')'}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to add system message to chat
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add('system');
    
    const now = new Date();
    const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    
    messageDiv.innerHTML = `
        <div>${text}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to start room timer
function startTimer() {
    // Clear any existing timer
    if (timer) {
        clearInterval(timer);
    }
    
    timer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            status.innerHTML = '<i class="fas fa-times-circle"></i> Room expired. Please create a new room.';
            status.className = 'status waiting';
        }
    }, 1000);
}

// Function to automatically select partner language
function autoSelectPartnerLanguage(creatorLanguage, partnerLanguage) {
    console.log('Auto-selecting languages:', creatorLanguage, partnerLanguage);
    
    // Select partner's language as user's language (for joiner)
    userLanguageSelect.value = partnerLanguage;
    userLanguage = partnerLanguage;
    
    // Select creator's language as partner's language
    partnerLanguageSelect.value = creatorLanguage;
    partnerLanguage = creatorLanguage;
    translationLang.textContent = languageNames[creatorLanguage] || creatorLanguage;
}

// Socket event listeners
socket.on('room-created', (data) => {
    currentRoomId = data.roomId;
    // Use the actual URL from the browser
    const actualUrl = window.location.origin + '/room/' + currentRoomId;
    roomLink.textContent = actualUrl;
    startTimer();
    
    // Update the browser URL to the new room URL
    window.history.pushState({}, '', '/room/' + currentRoomId);
});

socket.on('joined-room', (data) => {
    currentRoomId = data.roomId;
    
    if (data.otherUser) {
        partnerName.textContent = data.otherUser.username;
        partnerLanguage = data.otherUser.language;
        translationLang.textContent = languageNames[partnerLanguage] || partnerLanguage;
        
        // Show chat interface
        roomContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
    }
});

socket.on('user-joined', (data) => {
    partnerName.textContent = data.username;
    partnerLanguage = data.language;
    translationLang.textContent = languageNames[partnerLanguage] || partnerLanguage;
    
    // Clear timer since room is now full
    clearInterval(timer);
    status.innerHTML = '<i class="fas fa-user-check"></i> Partner joined the chat!';
    status.className = 'status connected';
    
    // Add system message
    addSystemMessage(`${data.username} joined the chat`);
    
    // Show chat interface after delay
    setTimeout(() => {
        roomContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
    }, 1500);
});

socket.on('message-received', (data) => {
    addMessage(
        data.message,
        data.translatedMessage,
        data.username,
        data.isOwn
    );
});

socket.on('room-expired', () => {
    alert('The chat room has expired. Please create a new room.');
    redirectToHomepage();
});

socket.on('user-left', (data) => {
    addSystemMessage(`${data.username} has left the chat. You can continue waiting for them to return.`);
});

socket.on('chat-ended', (data) => {
    addSystemMessage(`${data.username} has ended the chat. The room is now closed.`);
    setTimeout(() => {
        alert(`${data.username} has ended the chat. You will be returned to the setup screen.`);
        redirectToHomepage();
    }, 2000);
});

socket.on('return-to-setup', () => {
    // This is sent to the user who ended the chat
    redirectToHomepage();
});

socket.on('error', (data) => {
    alert(`Error: ${data.message}`);
});

// Check if we're joining an existing room
window.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const roomMatch = path.match(/\/room\/([a-zA-Z0-9]+)/);
    
    if (roomMatch) {
        // Someone is joining an existing room
        isJoiningRoom = true;
        
        // Show setup for joiner but with different flow
        setupContainer.style.display = 'block';
        document.querySelector('.setup-title').textContent = 'Join Chat Room';
        document.querySelector('.start-btn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Room';
        
        // Request room info to get language preferences
        socket.emit('get-room-info', {
            roomId: roomMatch[1]
        });
    } else {
        // First visitor - show setup
        setupContainer.style.display = 'block';
        isJoiningRoom = false;
    }
});

// Handle getting room info for joiners
socket.on('room-info', (data) => {
    if (data.creatorLanguage && data.partnerLanguage) {
        console.log('Received room info:', data);
        autoSelectPartnerLanguage(data.creatorLanguage, data.partnerLanguage);
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    location.reload();
});

// Handle page unload (browser close/tab close) - don't send end-chat
window.addEventListener('beforeunload', function(e) {
    // Don't notify server when browser closes - just let disconnect handle it
    // This prevents "ended chat" message when user just closes browser
});