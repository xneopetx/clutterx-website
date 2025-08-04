// taskbar.js - Handles taskbar functionality

// Define the functions at the top level
export let bringToFront, centerWindow, makeDraggable;

// Track if music player is initialized
let isMusicPlayerInitialized = false;

// Track window states (minimized, etc)
const windowStates = new Map();

// Ensure this runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const chatButton = document.getElementById('chat-btn');
    const musicButton = document.getElementById('music-btn');
    const chatWindow = document.getElementById('chat-window');
    const ipodWindow = document.getElementById('ipod-window');
    const taskbarHeight = 50;
    const windowOffset = 5;

    // Initialize windows on taskbar level
    [chatWindow, ipodWindow].forEach(win => {
        if (!win) return;
        win.style.position = 'fixed';
        win.style.bottom = `${taskbarHeight + 2}px`; // Position directly on top of taskbar with tiny upward adjustment
        win.style.display = 'none';
        win.style.opacity = '0';
        win.style.transition = 'opacity 0.2s ease-out';
        win.style.zIndex = '1001';
        win.style.transform = 'none';
    });

    // Generic toggle for showing/hiding
    function toggleWindow(win, displayType = 'block', slide = false) {
        const isHidden = win.style.display === 'none' || !win.style.display;
        if (isHidden) {
            win.style.display = displayType;
            win.style.opacity = '0';
            if (slide) win.style.transform = 'translateY(20px)';
            
            // Restore saved position or center if no saved position
            const key = `${win.id}Left`;
            const savedLeft = localStorage.getItem(key);
            if (savedLeft !== null) {
                win.style.left = `${savedLeft}px`;
            } else {
                const left = (window.innerWidth - win.offsetWidth) / 2;
                win.style.left = `${Math.max(0, left)}px`;
            }
            
            void win.offsetHeight;
            win.style.opacity = '1';
            if (slide) win.style.transform = 'translateY(0)';
            bringToFront(win);
            if (!windowStates.has(win)) windowStates.set(win, { isMinimized: false });
        } else {
            win.style.opacity = '0';
            setTimeout(() => { win.style.display = 'none'; }, 200);
        }
    }

    // Chat toggle
    if (chatButton && chatWindow) {
        chatButton.addEventListener('click', e => {
            e.stopPropagation();
            toggleWindow(chatWindow, 'flex', true);
            const input = document.getElementById('text');
            if (input) setTimeout(() => input.focus(), 100);
        });
    }

    // Music toggle
    if (musicButton && ipodWindow) {
        musicButton.addEventListener('click', e => {
            e.stopPropagation();
            toggleWindow(ipodWindow, 'block', false);
            if (!isMusicPlayerInitialized && window.iPodMusicPlayer) {
                try { window.iPodPlayer = new window.iPodMusicPlayer(); isMusicPlayerInitialized = true; }
                catch (err) { console.error('Music init error', err); }
            }
        });
    }

    // Bring to front utility - Updated to use CSS custom properties
    bringToFront = function(win) {
        const floats = document.querySelectorAll('.floating-window, #chat-window, #ipod-window, .vista-window');
        const baseZ = 1001;
        const activeZ = 1002;
        
        floats.forEach(w => {
            w.style.zIndex = baseZ;
            w.classList.remove('active');
        });
        win.style.zIndex = activeZ;
        win.classList.add('active');
    };
    
    // Make bringToFront globally available for window physics
    window.bringToFront = bringToFront;

    // Center window utility
    centerWindow = function(win) {
        if (!win) return;
        if (win.style.display === 'none') win.style.display = 'block';
        const w = win.offsetWidth, h = win.offsetHeight;
        const sw = window.innerWidth, sh = window.innerHeight;
        const left = (sw - w) / 2;
        const top = Math.max(20, (sh - h) / 3);
        win.style.transition = 'left 0.3s ease-out, top 0.3s ease-out';
        win.style.left = `${Math.max(0, left)}px`;
        win.style.top = `${top}px`;
        setTimeout(() => win.style.transition = 'opacity 0.2s ease-out', 300);
    };

    // Simple horizontal drag with inertia physics (based on user's old implementation)
    makeDraggable = function(win, header) {
        if (!win || !header) return;
        const key = `${win.id}Left`;
        
        // Restore previous position if present
        const savedLeft = localStorage.getItem(key);
        if (savedLeft !== null) {
            win.style.left = savedLeft + 'px';
        }
        
        // Fix: Declare drag variables
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        
        header.style.cursor = 'grab';
        
        // --- Physics variables ---
        let lastMoveTime = 0;
        let lastMoveX = 0;
        let velocity = 0;
        let inertiaFrame = null;
        
        function stopInertia() {
            if (inertiaFrame) {
                cancelAnimationFrame(inertiaFrame);
                inertiaFrame = null;
            }
        }
        
        header.addEventListener('pointerdown', (e) => {
            // Prevent drag if clicking on a control button
            const isButton = e.target.closest('button, .close-btn, .minimize-btn');
            if (isButton) return;
            
            isDragging = true;
            startX = e.clientX;
            startLeft = parseInt(window.getComputedStyle(win).left, 10) || win.offsetLeft;
            header.setPointerCapture(e.pointerId);
            header.style.cursor = 'grabbing';
            lastMoveTime = Date.now();
            lastMoveX = startX;
            velocity = 0;
            stopInertia();
            bringToFront(win);
        });
        
        header.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            let newLeft = startLeft + dx;
            // Clamp within viewport
            const minLeft = 0;
            const maxLeft = window.innerWidth - win.offsetWidth;
            newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
            win.style.left = newLeft + 'px';
            // Calculate velocity
            const now = Date.now();
            const dt = now - lastMoveTime;
            if (dt > 0) {
                velocity = (e.clientX - lastMoveX) / dt * 16; // px per frame (assuming ~60fps)
                lastMoveTime = now;
                lastMoveX = e.clientX;
            }
        });
        
        header.addEventListener('pointerup', (e) => {
            if (isDragging) {
                isDragging = false;
                header.releasePointerCapture(e.pointerId);
                header.style.cursor = 'grab';
                // Save position
                localStorage.setItem(key, parseInt(win.style.left, 10));
                // Inertia physics
                // --- Responsive physics tweaks ---
                const minVelocity = 0.2; // Lower threshold, more responsive
                const maxVelocity = 60; // px/frame, velocity cap
                velocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity));
                let left = parseInt(win.style.left, 10) || 0;
                const minLeft = 0;
                const maxLeft = window.innerWidth - win.offsetWidth;
                const friction = 0.95;
                const bounce = 0.7;
                // Snap to edge if released near it
                if (left - minLeft < 10) left = minLeft;
                if (maxLeft - left < 10) left = maxLeft;
                
                function bounceVisual() {
                    win.classList.remove('bounce');
                    void win.offsetWidth; // Force reflow
                    win.classList.add('bounce');
                }
                
                function animate() {
                    left += velocity;
                    // Bounce at edges
                    if (left < minLeft) {
                        left = minLeft;
                        velocity = -velocity * bounce;
                        bounceVisual();
                    } else if (left > maxLeft) {
                        left = maxLeft;
                        velocity = -velocity * bounce;
                        bounceVisual();
                    }
                    win.style.left = left + 'px';
                    velocity *= friction;
                    if (Math.abs(velocity) > minVelocity) {
                        inertiaFrame = requestAnimationFrame(animate);
                    } else {
                        inertiaFrame = null;
                        // Final snap and save
                        win.style.left = left + 'px';
                        localStorage.setItem(key, parseInt(left, 10));
                    }
                }
                if (Math.abs(velocity) > minVelocity) animate();
            }
        });
        
        // Prevent accidental text selection
        header.addEventListener('dragstart', (e) => e.preventDefault());
        
        // Bring to front on any interaction
        ['pointerdown', 'pointerup', 'focusin'].forEach(evt => {
            win.addEventListener(evt, () => bringToFront(win));
            header.addEventListener(evt, () => bringToFront(win));
        });
    };

    // Initialize draggables
    const chatHdr = chatWindow?.querySelector('.chat-header');
    const ipodHdr = ipodWindow?.querySelector('.ipod-header');
    if (chatWindow && chatHdr) makeDraggable(chatWindow, chatHdr);
    if (ipodWindow && ipodHdr) makeDraggable(ipodWindow, ipodHdr);

    // Minimize & Close Handlers for Chat
    if (chatWindow && chatHdr) {
        const minBtn = chatHdr.querySelector('#minimize-btn');
        const closeBtn = chatHdr.querySelector('#close-chat');
        minBtn && minBtn.addEventListener('click', e => {
            e.stopPropagation();
            // Add squishy animation
            chatWindow.classList.remove('bounce');
            void chatWindow.offsetWidth; // Force reflow
            chatWindow.classList.add('bounce');
            
            const state = windowStates.get(chatWindow) || { isMinimized: false };
            state.isMinimized = !state.isMinimized;
            const screen = chatWindow.querySelector('.chat-screen');
            const inputArea = chatWindow.querySelector('.chat-input-container');
            if (state.isMinimized) {
                screen.style.display = 'none';
                inputArea.style.display = 'none';
                chatWindow.style.height = `${chatHdr.offsetHeight}px`;
            } else {
                screen.style.display = '';
                inputArea.style.display = '';
                chatWindow.style.height = '';
            }
            windowStates.set(chatWindow, state);
        });
        closeBtn && closeBtn.addEventListener('click', e => {
            e.stopPropagation();
            chatWindow.style.opacity = '0';
            setTimeout(() => { chatWindow.style.display = 'none'; }, 200);
        });
    }

    // Minimize & Close Handlers for Music Player
    if (ipodWindow && ipodHdr) {
        const minBtn = ipodHdr.querySelector('#minimize-ipod');
        const closeBtn = ipodHdr.querySelector('#close-ipod');
        minBtn && minBtn.addEventListener('click', e => {
            e.stopPropagation();
            // Add squishy animation
            ipodWindow.classList.remove('bounce');
            void ipodWindow.offsetWidth; // Force reflow
            ipodWindow.classList.add('bounce');
            
            const state = windowStates.get(ipodWindow) || { isMinimized: false };
            state.isMinimized = !state.isMinimized;
            const body = ipodWindow.querySelector('.ipod-body');
            if (state.isMinimized) {
                body.style.display = 'none';
                ipodWindow.style.height = `${ipodHdr.offsetHeight}px`;
            } else {
                body.style.display = '';
                ipodWindow.style.height = '';
            }
            windowStates.set(ipodWindow, state);
        });
        closeBtn && closeBtn.addEventListener('click', e => {
            e.stopPropagation();
            ipodWindow.style.opacity = '0';
            setTimeout(() => { ipodWindow.style.display = 'none'; }, 200);
            if (window.iPodPlayer?.audio) window.iPodPlayer.audio.pause();
        });
    }

    // Expose globals
    window.bringToFront = bringToFront;
    window.centerWindow = centerWindow;
    window.Taskbar = { bringToFront, centerWindow, toggleWindow };
});

// Global fallback
window.bringToFront = bringToFront;
window.centerWindow = centerWindow; 