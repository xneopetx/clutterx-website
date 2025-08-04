// Configuration
const UPDATE_INTERVAL = 30000; // 30 seconds
const MESSAGES_PER_PAGE = 20; // Number of messages to load at once
const DISCORD_API_URL = 'https://8aa5dba9-a0d7-49a0-be13-bb0913d48f60-00-3rwl9v1mf0e9l.janeway.replit.dev/api/messages';

// No global discordContent variable—always get fresh DOM reference

// Format Discord timestamp to local time
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Track message state
let messages = [];
let isLoading = false;
let hasMoreMessages = true;
let isInitialLoad = true;
let lastFetchTime = 0;

// Track all message IDs we've seen
const seenMessageIds = new Set();

// Update the content window with messages from Discord
function updateContent(newMessages, isLoadMore = false) {
    console.log('Updating content with', newMessages.length, 'messages, isLoadMore:', isLoadMore);
    
    const loadingEl = document.getElementById('updates-loading');
    const contentEl = document.getElementById('updates-content');
    const discordContent = document.getElementById('discord-content');
    if (!discordContent) {
        console.error('[DEBUG] #discord-content not found in DOM when updateContent called. Current DOM:', document.body.innerHTML);
    }
    if (!loadingEl) {
        console.error('[DEBUG] #updates-loading not found in DOM when updateContent called. Children of #discord-content:', discordContent ? discordContent.innerHTML : '(no discord-content)');
    }
    if (!contentEl) {
        console.error('[DEBUG] #updates-content not found in DOM when updateContent called. Children of #discord-content:', discordContent ? discordContent.innerHTML : '(no discord-content)');
    }
    if (!(loadingEl && contentEl)) {
        console.error('Could not find loading or content elements');
        return;
    }
    // Always hide spinner and show content after fetch completes
    loadingEl.classList.remove('fade-in');
    loadingEl.classList.add('fade-out');
    setTimeout(() => {
        loadingEl.style.display = 'none';
        loadingEl.classList.remove('fade-out');
        contentEl.style.display = 'block';
        contentEl.classList.add('fade-in');
        setTimeout(() => contentEl.classList.remove('fade-in'), 250);
    }, 250);
    console.log('Updated loading/content visibility');
    
    // Check if we have messages to process
    if (!newMessages || newMessages.length === 0) {
        console.log('No new messages to display');
        if (isInitialLoad && discordContent && !discordContent.hasChildNodes()) {
            discordContent.innerHTML = `
                <div class="empty-state" role="status" aria-live="polite" style="text-align: center; color: #6c757d; padding: 32px 20px; animation: fadeIn 0.25s;">
                    <div style="font-size: 32px; margin-bottom: 12px;">📭</div>
                    <div style="font-size: 18px;">No updates found.<br>Check back later!</div>
                </div>
            `;
            console.log('Displayed "no updates" message');
        }
        hasMoreMessages = false;
        isInitialLoad = false;
        return;
    }
    
    console.log('Processing', newMessages.length, 'new messages');
    
    // Check for deleted messages on initial load
    if (!isLoadMore) {
        console.log('Checking for deleted messages...');
        const currentMessageIds = new Set(newMessages.map(msg => msg.id));
        const messageElements = document.querySelectorAll('.discord-message');
        let removedCount = 0;
        
        // Remove messages that are no longer in the API response
        messageElements.forEach(el => {
            const messageId = el.dataset.messageId;
            if (!currentMessageIds.has(messageId)) {
                el.remove();
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            console.log(`Removed ${removedCount} deleted messages`);
        }
    }

    // Filter out any duplicate messages by ID
    const existingIds = new Set(messages.map(msg => msg.id));
    const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
    
    console.log('Found', uniqueNewMessages.length, 'unique new messages');
    
    if (uniqueNewMessages.length === 0) {
        console.log('No new unique messages to add');
        hasMoreMessages = false;
        isInitialLoad = false;
        return;
    }

    // Sort messages by timestamp (newest first)
    uniqueNewMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    console.log('Sorted messages by timestamp');

    if (isLoadMore) {
        console.log('Appending older messages');
        // Append older messages to the existing ones
        messages = [...messages, ...uniqueNewMessages];
        
        // Re-render all messages to maintain proper order
        renderAllMessages();
    } else {
        console.log('Adding new messages to the beginning');
        // For initial load or new messages, add to the beginning
        messages = [...uniqueNewMessages, ...messages];
        
        if (isInitialLoad) {
            console.log('Initial load, rendering all messages');
            renderAllMessages();
        } else {
            console.log('Rendering only new messages');
            const newHtml = uniqueNewMessages.map(msg => createMessageHtml(msg)).join('');
            const discordContent = document.getElementById('discord-content');
            if (discordContent) {
                discordContent.insertAdjacentHTML('afterbegin', newHtml);
                console.log('Inserted new messages at the beginning');
                console.log('discord-content after insert:', discordContent.innerHTML);
            } else {
                console.error('discordContent element not found');
            }
        }
    }
    
    hasMoreMessages = newMessages.length === MESSAGES_PER_PAGE;
    isInitialLoad = false;
    isLoading = false;
    lastFetchTime = Date.now();
    
    console.log('Content update complete. Total messages:', messages.length, 'Has more messages:', hasMoreMessages);
}

// Render all messages in the messages array
function renderAllMessages() {
    console.log('Rendering all messages. Total messages:', messages.length);
    // Always ensure loading spinner is hidden and content is visible after rendering
    const loadingEl = document.getElementById('updates-loading');
    const contentEl = document.getElementById('updates-content');
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    
    const discordContent = document.getElementById('discord-content');
    if (!discordContent) {
        console.error('Cannot render messages: discordContent element not found');
        return;
    }
    
    if (!messages || messages.length === 0) {
        console.log('No messages to render');
        discordContent.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No messages found.</p>';
        return;
    }
    
    try {
        // Sort messages by timestamp (newest first)
        const sortedMessages = [...messages].sort((a, b) => {
            const timeA = new Date(a.timestamp);
            const timeB = new Date(b.timestamp);
            return timeB - timeA;
        });
        
        console.log(`Rendering ${sortedMessages.length} sorted messages`);
        
        // Create HTML for all messages
        const html = sortedMessages.map(msg => {
            try {
                return createMessageHtml(msg);
            } catch (error) {
                console.error('Error creating message HTML:', error, 'Message:', msg);
                return ''; // Skip this message if there's an error
            }
        }).filter(Boolean).join(''); // Remove any empty strings from failed renders
        
        if (!html) {
            console.error('No valid message HTML was generated');
            discordContent.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No valid messages to display.</p>';
            return;
        }
        
        console.log('Updating DOM with rendered messages');
        discordContent.innerHTML = html;
        console.log('Messages rendered successfully');
        console.log('discord-content after render:', discordContent.innerHTML);
        // Always ensure loading spinner is hidden and content is visible after rendering
        const loadingEl = document.getElementById('updates-loading');
        const contentEl = document.getElementById('updates-content');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        
    } catch (error) {
        console.error('Error rendering messages:', error);
        discordContent.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <p>Error displaying messages. Please try refreshing the page.</p>
                <button onclick="window.location.reload()" style="
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                ">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// Load more messages when scrolling to bottom
function setupInfiniteScroll() {
    const discordContent = document.getElementById('discord-content');
    if (!discordContent) {
        console.error('setupInfiniteScroll: discordContent not found');
        return;
    }
    // Remove previous scroll handler if it exists
    if (discordContent._scrollHandler) {
        discordContent.removeEventListener('scroll', discordContent._scrollHandler);
    }
    // Create a new handler and save it on the element
    const handler = () => {
        // Only load more if we're near the bottom
        const { scrollTop, scrollHeight, clientHeight } = discordContent;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        if (isNearBottom && !isLoading && hasMoreMessages) {
            loadMoreMessages();
        }
    };
    discordContent.addEventListener('scroll', handler);
    discordContent._scrollHandler = handler;
}

// Load older messages
async function loadMoreMessages() {
    if (isLoading || !hasMoreMessages) return;
    await fetchMessages(true);
}

// Helper function to create HTML for a single message
function createMessageHtml(msg) {
    try {
        console.log('Creating HTML for message:', msg.id);
        
        // Validate message object
        if (!msg || typeof msg !== 'object') {
            console.error('Invalid message object:', msg);
            return '';
        }

        // Get the best available display name
        let displayName = 'Unknown User';
        let avatarUrl = '';
        
        try {
            // Try to get server nickname first, then fall back to other names
            if (msg.member?.nickname) {
                displayName = String(msg.member.nickname);
            } else if (msg.member?.user?.global_name) {
                displayName = String(msg.member.user.global_name);
            } else if (msg.author?.global_name) {
                displayName = String(msg.author.global_name);
            } else if (msg.author?.username) {
                displayName = String(msg.author.username);
            }
            
            // Escape HTML in display name to prevent XSS
            displayName = displayName
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
                
            // Get avatar URL if available
            if (msg.member?.avatar && msg.guild_id && msg.author?.id) {
                avatarUrl = `https://cdn.discordapp.com/guilds/${msg.guild_id}/users/${msg.author.id}/avatars/${msg.member.avatar}.png`;
            } else if (msg.author?.avatar && msg.author?.id) {
                avatarUrl = `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`;
            } else if (msg.author) {
                // Default Discord avatar based on discriminator or user ID
                const defaultAvatar = msg.author.discriminator && msg.author.discriminator !== '0' 
                    ? (parseInt(msg.author.discriminator, 10) % 5) || 0
                    : (parseInt(msg.author.id, 10) >> 22) % 6;
                avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
            }
        } catch (error) {
            console.error('Error processing message author info:', error);
            // Continue with default values
        }
        
        // Process message content
        let content = '';
        if (msg.content) {
            // Convert newlines to <br> and escape HTML
            content = String(msg.content)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
        }
        
        // Process attachments if any
        let attachmentsHtml = '';
        if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
            try {
                attachmentsHtml = `
                    <div class="attachments" style="margin-top: 8px;">
                        ${msg.attachments.map(attachment => {
                            if (!attachment || !attachment.url) return '';
                            
                            const isImage = attachment.contentType?.startsWith('image/');
                            const filename = String(attachment.filename || 'Download')
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;');
                            
                            if (isImage) {
                                return `
                                    <div style="max-width: 400px; margin: 4px 0;">
                                        <img 
                                            src="${attachment.url}" 
                                            alt="${filename}" 
                                            style="max-width: 100%; max-height: 300px; border-radius: 4px; object-fit: contain; cursor: pointer; display: block;" 
                                            onclick="this.style.maxHeight = this.style.maxHeight === 'none' ? '300px' : 'none'"
                                            loading="lazy"
                                        >
                                    </div>`;
                            } else {
                                return `
                                    <a 
                                        href="${attachment.url}" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style="display: block; margin: 4px 0; color: #007bff; text-decoration: none; font-size: 14px;"
                                    >
                                        📎 ${filename}
                                    </a>`;
                            }
                        }).join('')}
                    </div>`;
            } catch (error) {
                console.error('Error processing attachments:', error);
            }
        }
        
        // Format timestamp
        let timestamp = '';
        try {
            timestamp = formatTimestamp(msg.timestamp || new Date().toISOString());
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            timestamp = 'Just now';
        }
        
        // Build the final HTML
        const messageHtml = `
            <div class="discord-message" data-message-id="${msg.id || ''}">
                <div class="message-header">
                    <strong>${displayName}</strong>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-content">
                    ${content}
                    ${attachmentsHtml}
                </div>
            </div>
            <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e0e0e0;">
        `;
        
        return messageHtml;
        
    } catch (error) {
        console.error('Error in createMessageHtml:', error, 'Message:', msg);
        return `
            <div class="error-message" style="color: #dc3545; padding: 10px; margin: 5px 0; background: #fff5f5; border-left: 3px solid #dc3545;">
                Error displaying this message.
            </div>
        `;
    }
}

// Make fetchMessages available globally
window.fetchMessages = async function(isLoadingMore = false) {
    if (isLoading) return;
    
    // Get DOM references first
    const reloadBtn = document.getElementById('reload-updates-btn');
    const loadingEl = document.getElementById('updates-loading');
    const contentEl = document.getElementById('updates-content');
    let loadingTimeout;
    
    // Function to hide loading state
    const hideLoading = () => {
        console.log('Hiding loading state');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        if (contentEl) {
            contentEl.style.display = 'block';
        }
        if (reloadBtn) {
            reloadBtn.disabled = false;
        }
        isLoading = false;
        if (loadingTimeout) clearTimeout(loadingTimeout);
    };
    
    // Function to show error message
    const showError = (message) => {
        console.error('Discord updates error:', message);
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="error-message" role="alert" aria-live="assertive" style="animation: fadeIn 0.25s;">
                    <p style="color: #dc3545; font-weight: bold;">Failed to load updates.</p>
                    <p style="color: #6c757d;">${message}</p>
                    <button id="retry-updates" class="retry-btn" aria-label="Retry loading Discord updates">Retry</button>
                </div>
            `;
            const retryBtn = document.getElementById('retry-updates');
            if (retryBtn) {
                retryBtn.addEventListener('click', fetchMessages);
                retryBtn.focus();
            }
        }
        hideLoading();
    };
    
    // Show loading state immediately in the next animation frame
    requestAnimationFrame(() => {
        console.log('Showing loading state');
        if (contentEl) {
            contentEl.style.display = 'none';
        }
        if (loadingEl) {
            loadingEl.style.display = 'block';
            loadingEl.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div class="loading-spinner" role="status" aria-label="Loading updates"></div>
                    <p style="color: #6c757d; margin-top: 10px;">Loading updates...</p>
                </div>
            `;
            loadingEl.classList.add('fade-in');
            setTimeout(() => loadingEl.classList.remove('fade-in'), 250);
        }
        
        if (reloadBtn) {
            reloadBtn.disabled = true;
        }
        
        // Set a timeout to hide loading after 10 seconds if still loading
        loadingTimeout = setTimeout(() => {
            if (isLoading) {
                // Hide spinner and show content even if it times out
                if (loadingEl) loadingEl.style.display = 'none';
                if (contentEl) contentEl.style.display = 'block';
                console.log('No response after 10 seconds, checking connection...');
                showError('Connection timed out. The server might be down or you might be offline.');
            }
        }, 10000);
    });
    
    // Set loading state after the UI update is scheduled
    isLoading = true;
    
    console.log('Fetching messages...');
    
    // Initialize AbortController for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.log('Request timeout reached');
        controller.abort();
    }, 15000); // 15 second timeout
    
    try {
        console.log(isLoadingMore ? 'Loading more messages...' : 'Fetching messages...');
        
        // Build the URL with query parameters
        const params = new URLSearchParams();
        params.append('limit', MESSAGES_PER_PAGE);
        
        // Always include member data in the response
        params.append('include_members', 'true');
        
        if (isLoadingMore && messages.length > 0) {
            // If loading more, get messages before the oldest one we have
            const oldestMessage = [...messages].sort((a, b) => 
                new Date(a.timestamp) - new Date(b.timestamp)
            )[0];
            if (oldestMessage) {
                params.append('before', oldestMessage.id);
            }
        }
        
        const url = `${DISCORD_API_URL}?${params.toString()}`;
        console.log('API Request:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server responded with:', errorText);
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json().catch(e => {
            console.error('Error parsing JSON:', e);
            throw new Error('Invalid response from server');
        });
        
        // Process the messages
        if (data && Array.isArray(data)) {
            console.log('Received', data.length, 'messages');
            if (data.length === 0) {
                console.log('No new messages available');
                if (isLoadingMore) {
                    hasMoreMessages = false;
                } else {
                    updateContent([], false);
                    const discordContent = document.getElementById('discord-content');
                    if (discordContent && !discordContent.hasChildNodes()) {
                        discordContent.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No updates available. Check back later!</p>';
                    }
                }
            } else {
                updateContent(data, isLoadingMore);
            }
        } else {
            console.error('Invalid data format received from server:', data);
            throw new Error('Invalid data format received');
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        hasMoreMessages = false;
        
        // Always show error in the UI, not just on initial load
        const errorContainer = document.createElement('div');
        errorContainer.innerHTML = `
            <div class="error-container" role="alert" aria-live="assertive" style="
                text-align: center; 
                padding: 20px;
                animation: fadeIn 0.25s;
            ">
                <p style="color: #dc3545; margin-bottom: 10px; font-weight: bold;">Error loading updates</p>
                <p style="color: #6c757d; margin-bottom: 15px;">Please try again later.</p>
                <button id="reload-updates-btn" class="retry-btn" aria-label="Retry loading Discord updates">
                    <span class="btn-text">Reload Updates</span>
                    <span class="btn-loading" style="display: none; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);">↻</span>
                </button>
                <p style="color: #6c757d; margin-top: 15px;">
                    Error details: ${error.message}
                </p>
            </div>
        `;
        // Clear existing content and show error
        const discordContent = document.getElementById('discord-content');
        if (discordContent) {
            discordContent.innerHTML = '';
            discordContent.appendChild(errorContainer);
            // Add retry button functionality
            const retryBtn = errorContainer.querySelector('#reload-updates-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    errorContainer.remove();
                    fetchMessages();
                });
                retryBtn.focus();
            }
        }
    } finally {
        isLoading = false;
        isInitialLoad = false;
        // Clear any pending timeout
        if (loadingTimeout) clearTimeout(loadingTimeout);
        // Hide loading state if it's still showing
        const reloadBtn = document.getElementById('reload-updates-btn');
        const loadingEl = document.getElementById('updates-loading');
        const contentEl = document.getElementById('updates-content');
        
        if (loadingEl && contentEl && loadingEl.style.display === 'block') {
            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
        }
        
        if (reloadBtn) {
            reloadBtn.disabled = false;
        }
    }
}

// Set up auto-refresh
function startAutoRefresh() {
    console.log('Starting auto-refresh...');
    
    // Only set up auto-refresh if we're not in an error state
    const checkAndFetch = () => {
        console.log('Checking for updates...');
        const errorContainer = document.querySelector('.error-container');
        if (!errorContainer) {  // Only fetch if there's no error shown
            console.log('No error found, fetching messages...');
            fetchMessages().catch(error => {
                console.error('Error in auto-refresh:', error);
            });
        } else {
            console.log('Skipping fetch - error container exists');
        }
    };
    
    // Initial load with a small delay to let the page settle
    console.log('Scheduling initial fetch...');
    setTimeout(() => {
        console.log('Running initial fetch...');
        checkAndFetch();
    }, 100);
    
    // Set up interval for auto-refresh
    console.log(`Setting up auto-refresh interval (${UPDATE_INTERVAL}ms)...`);
    const refreshInterval = setInterval(() => {
        console.log('Auto-refresh triggered...');
        checkAndFetch();
    }, UPDATE_INTERVAL);
    
    // Return cleanup function
    return () => {
        console.log('Clearing auto-refresh interval');
        clearInterval(refreshInterval);
    };
}

// Initialize Discord updates
function initialize() {
    // Always get fresh DOM references
    const discordContent = document.getElementById('discord-content');
    const loadingEl = document.getElementById('updates-loading');
    const contentEl = document.getElementById('updates-content');
    if (!discordContent || !loadingEl || !contentEl) {
        console.error('Could not find required elements:', { discordContent, loadingEl, contentEl });
        return;
    }
    // Reset all state variables
    messages = [];
    isLoading = false;
    hasMoreMessages = true;
    isInitialLoad = true;
    lastFetchTime = 0;
    seenMessageIds.clear();

    // Show loading state
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';

    // Clear any existing messages
    contentEl.innerHTML = '';

    // Set up infinite scroll
    setupInfiniteScroll();

    // ---- Fix: clear previous auto-refresh interval ----
    if (window.discordUpdatesCleanup) {
        window.discordUpdatesCleanup();
        window.discordUpdatesCleanup = null;
    }
    // Start auto-refresh (will trigger initial load)
    window.discordUpdatesCleanup = startAutoRefresh();

    console.log('Discord updates initialized');
}

// Wait for required DOM elements before initializing
function waitForDiscordElements(callback) {
    const check = () => {
        const discordContent = document.getElementById('discord-content');
        const loadingEl = document.getElementById('updates-loading');
        const contentEl = document.getElementById('updates-content');
        if (discordContent && loadingEl && contentEl) {
            callback();
        } else {
            setTimeout(check, 100); // Try again in 100ms
        }
    };
    check();
}

// Listen for SPA navigation (hashchange) and re-initialize Discord updates
function robustDiscordInit() {
    waitForDiscordElements(() => {
        initialize();
    });
}
window.robustDiscordInit = robustDiscordInit;


