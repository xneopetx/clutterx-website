// chat.js - ES Module

// Import the Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { bannedWordsPatterns } from './banlist.js';

const SUPABASE_URL = 'https://ztqjfchivferpkqubjpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cWpmY2hpdmZlcnBrcXVianB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDkzMzAsImV4cCI6MjA2NzEyNTMzMH0.dNV4hixc20P1LTnf7DxqD-oUJN48fZLqpNcJwsGwyr4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate a pastel color based on a hash of the name to keep it consistent per user
function stringToPastelColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 80%)`;
}

// Invert HSL color (simple inversion of lightness)
function invertPastelColor(hsl) {
  const regex = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/;
  const match = hsl.match(regex);
  if (!match) return 'white';

  const h = Number(match[1]);
  const s = Number(match[2]);
  let l = Number(match[3]);

  let invertedL = 100 - l;
  invertedL = Math.min(Math.max(invertedL, 30), 90); // Clamp

  return `hsl(${h}, ${s}%, ${invertedL}%)`;
}

function censorText(text) {
  if (!text) return '';
  
  let censored = text;
  // Apply each pattern to the text
  bannedWordsPatterns.forEach(pattern => {
    censored = censored.replace(pattern, match => '*'.repeat(match.length));
  });
  
  return censored;
}

let lastMessageCount = 0;

// Function to scroll chat to bottom
function scrollToBottom() {
  const messagesDiv = document.getElementById('messages');
  if (messagesDiv) {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }
}

// Import window management functions from taskbar.js
import { bringToFront } from './taskbar.js';

// Window management (drag, minimize, close, toggle) is handled in taskbar.js

// Scroll to bottom when page loads and after messages are rendered
document.addEventListener('DOMContentLoaded', () => {
  // Initial scroll after a small delay to ensure DOM is ready
  setTimeout(scrollToBottom, 100);
  
  // Also scroll after messages are loaded
  const observer = new MutationObserver(() => {
    scrollToBottom();
  });
  
  const messagesDiv = document.getElementById('messages');
  if (messagesDiv) {
    observer.observe(messagesDiv, { childList: true, subtree: true });
  }
});

async function loadMessages(forceScroll = false) {
  return new Promise(async (resolve) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        resolve();
        return;
      }

      const messagesDiv = document.getElementById('messages');
      const messagesList = messagesDiv.querySelector('.messages-list');
      messagesList.innerHTML = '';

      // Notify if new message(s) arrived
      if (Array.isArray(data) && data.length > lastMessageCount) {
        const lastMsg = data[data.length - 1];
        if (window.notifyTab && lastMsg && lastMsg.name) {
          window.notifyTab(lastMsg.name);
        }
      }
      lastMessageCount = data ? data.length : 0;

      (data || []).forEach((msg) => {
        const el = document.createElement('div');
        el.className = 'message';
        // Name span
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = msg.name || 'anon';
        nameSpan.style.backgroundColor = msg.color || stringToPastelColor(msg.name || 'anon');
        nameSpan.style.color = invertPastelColor(msg.color || stringToPastelColor(msg.name || 'anon'));
        // Text span
        const textSpan = document.createElement('span');
        if (msg.wingdings) {
          textSpan.textContent = toWingdings(msg.text);
          textSpan.style.fontFamily = 'Wingdings, "Wingdings 2", "Wingdings 3", sans-serif';
        } else {
          textSpan.textContent = msg.text;
          textSpan.style.fontFamily = '';
        }
        textSpan.className = 'message-text';
        el.appendChild(nameSpan);
        el.appendChild(textSpan);
        messagesList.appendChild(el);
      });
      if (forceScroll) scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      resolve();
    }
  });
}

// Chat Settings
function getChatSettings() {
  return {
    name: localStorage.getItem('chatName') || 'anon',
    color: localStorage.getItem('chatColor') || '#5d8aa8',
    wingdings: localStorage.getItem('chatWingdings') === 'true',
  };
}

function setChatSettings({name, color, wingdings}) {
  if (name) localStorage.setItem('chatName', name);
  if (color) localStorage.setItem('chatColor', color);
  if (wingdings !== undefined) localStorage.setItem('chatWingdings', wingdings);
}

// Wingdings translation map
const wingdingsMap = {
  'A':'✈', 'B':'✌', 'C':'☯', 'D':'✡', 'E':'☮', 'F':'☢', 'G':'☣', 'H':'☤', 'I':'☥', 'J':'☦', 'K':'☧', 'L':'☨', 'M':'☩', 'N':'☪', 'O':'☫', 'P':'☬', 'Q':'☭', 'R':'☮', 'S':'☯', 'T':'☸', 'U':'☹', 'V':'☺', 'W':'☻', 'X':'☼', 'Y':'☽', 'Z':'☾',
  'a':'✈', 'b':'✌', 'c':'☯', 'd':'✡', 'e':'☮', 'f':'☢', 'g':'☣', 'h':'☤', 'i':'☥', 'j':'☦', 'k':'☧', 'l':'☨', 'm':'☩', 'n':'☪', 'o':'☫', 'p':'☬', 'q':'☭', 'r':'☮', 's':'☯', 't':'☸', 'u':'☹', 'v':'☺', 'w':'☻', 'x':'☼', 'y':'☽', 'z':'☾',
  '0':'0', '1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9',
  '.':'•', ',':'‚', '!':'‼', '?':'¿', ' ':' ', '\n':'\n'
};

function toWingdings(str) {
  return str.split('').map(ch => wingdingsMap[ch] || ch).join('');
}

// Update color preview
function updateColorPreview(color) {
    const valueDisplay = document.getElementById('color-value');
    valueDisplay.textContent = color.toUpperCase();
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Focus the input when the chat window is shown
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        const messageInput = document.getElementById('text');
        if (messageInput) {
            // Focus the input when the window is shown
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style') {
                        const display = window.getComputedStyle(chatWindow).display;
                        if (display !== 'none' && messageInput) {
                            setTimeout(() => messageInput.focus(), 100);
                        }
                    }
                });
            });
            
            observer.observe(chatWindow, { attributes: true });
        }
    }
    
    // Rest of the initialization
    // Set up color picker
    const colorPicker = document.getElementById('settings-color');
    colorPicker.addEventListener('input', (e) => {
        updateColorPreview(e.target.value);
    });
    
    // Initialize color preview with current value
    updateColorPreview(colorPicker.value);
    
  // Get DOM elements - chatWindow is already defined above
  // Window visibility is now managed by taskbar.js
  const chatButton = document.getElementById('xchatx-button');
  const closeButton = document.getElementById('close-chat');
  const minimizeButton = document.getElementById('minimize-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('chat-settings-modal');
  const settingsForm = document.getElementById('settings-form');
  const cancelSettings = document.getElementById('cancel-settings');
  const chatForm = document.getElementById('chat-form');
  const emojiBtn = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');
  const messageInput = document.getElementById('text');

  // Initialize with default settings if not set
  const settings = getChatSettings();
  setChatSettings(settings);

  // Emoji picker
  const emojis = ['😀','😂','😍','😎','😢','😡','👍','🙏','🎉','💖','🔥','🌈','✨','🥳','💯'];
  emojis.forEach(e => {
    const span = document.createElement('span');
    span.textContent = e;
    span.addEventListener('click', () => {
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      const text = messageInput.value;
      messageInput.value = text.substring(0, start) + e + text.substring(end);
      messageInput.selectionStart = messageInput.selectionEnd = start + e.length;
      messageInput.focus();
    });
    emojiPicker.appendChild(span);
  });

  // Toggle emoji picker with Windows 98 style
  emojiBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    emojiBtn.style.borderColor = '#808080 #ffffff #ffffff #808080';
    emojiBtn.style.padding = '1px 0 0 1px';
  });

  emojiBtn.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    emojiBtn.style.borderColor = '#ffffff #808080 #808080 #ffffff';
    emojiBtn.style.padding = '0';
    
    // Toggle emoji picker
    emojiPicker.classList.toggle('hidden');
  });

  emojiBtn.addEventListener('mouseleave', () => {
    emojiBtn.style.borderColor = '#ffffff #808080 #808080 #ffffff';
    emojiBtn.style.padding = '0';
  });

  // Close emoji picker when clicking outside
  const handleClickOutside = (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
      emojiPicker.classList.add('hidden');
    }
  };

  // Only add the event listener when the picker is shown
  emojiBtn.addEventListener('click', (e) => {
    if (!emojiPicker.classList.contains('hidden')) {
      document.addEventListener('click', handleClickOutside, { once: true });
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  });

  // Prevent emoji picker from closing when clicking inside it
  emojiPicker.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Chat window toggle is now handled by taskbar.js

  // Window controls (close, minimize) are now handled by taskbar.js

  // Settings modal
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const s = getChatSettings();
    document.getElementById('settings-name').value = s.name;
    document.getElementById('settings-color').value = s.color;
    document.getElementById('settings-wingdings').checked = s.wingdings;
    settingsModal.style.display = 'flex';
    document.getElementById('messages').classList.add('hide-messages');
  });

  // Close settings modal
  cancelSettings.addEventListener('click', (e) => {
    e.preventDefault();
    settingsModal.style.display = 'none';
    document.getElementById('messages').classList.remove('hide-messages');
  });

  // Save settings
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setChatSettings({
      name: document.getElementById('settings-name').value.trim() || 'anon',
      color: document.getElementById('settings-color').value,
      wingdings: document.getElementById('settings-wingdings').checked
    });
    settingsModal.style.display = 'none';
    document.getElementById('messages').classList.remove('hide-messages');
  });

  // Send message
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = getChatSettings();
    const name = settings.name;
    let text = messageInput.value.trim();
    
    if (settings.wingdings) {
      text = toWingdings(text);
    }
    
    if (name && text) {
      try {
        await supabase.from('messages').insert([
          { name, text: censorText(text), color: settings.color, wingdings: settings.wingdings }
        ]);
        messageInput.value = '';
        loadMessages(true);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  });

  // Load initial messages and set up polling
  loadMessages(true);
  setInterval(() => loadMessages(), 5000);
});

// Export functions that might be needed by other modules
export {
  stringToPastelColor,
  invertPastelColor,
  censorText,
  scrollToBottom,
  loadMessages,
  getChatSettings,
  setChatSettings,
  toWingdings
};
