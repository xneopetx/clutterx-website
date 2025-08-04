// window-physics.js - Advanced window physics system
class WindowPhysics {
  constructor(windowElement) {
    this.window = windowElement;
    this.isDetached = false;
    this.isDragging = false;
    this.lastPositions = [];
    this.shakeThreshold = 25; // pixels - much higher threshold
    this.shakeCount = 0;
    this.slamVelocityThreshold = 500; // pixels per second
    this.taskbarHeight = 50; // match your actual taskbar height
    this.taskbarOffset = 2; // match the +2px offset from taskbar.js
    this.dragOffset = { x: 0, y: 0 };
    
    // Physics properties for detached windows
    this.velocity = { x: 0, y: 0 };
    this.friction = 0.95; // damping factor
    this.bounce = 0.3; // bounce factor when hitting edges
    this.physicsInterval = null;
    this.originalDragHandler = null;
    
    this.init();
  }

  init() {
    // Find the title bar for dragging - updated to match your HTML structure
    const titleBar = this.window.querySelector('.window-title-bar') || 
                     this.window.querySelector('.chat-header') ||
                     this.window.querySelector('.ipod-header') ||
                     this.window.querySelector('.header') ||
                     this.window.querySelector('.title-bar');
    
    if (titleBar) {
      console.log('Found title bar for', this.window.id, titleBar);
      
      titleBar.addEventListener('mousedown', this.startDrag.bind(this));
      // Add Shift+double-click alternative to detach (less accidental)
      titleBar.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (e.shiftKey) { // Require Shift key to prevent accidental detach
          if (!this.isDetached) {
            console.log('🔄 Shift+Double-click detach triggered!');
            this.detachWindow();
          } else {
            console.log('🔄 Shift+Double-click reattach triggered!');
            this.reattachWindow();
          }
        }
      });
      titleBar.style.cursor = 'grab';
    } else {
      console.warn('No title bar found for window:', this.window.id);
    }
    
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.endDrag.bind(this));
    
    // Add visual indicators
    this.window.classList.add('physics-enabled');
  }

  startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.isDragging = true;
    this.lastPositions = [];
    this.shakeCount = 0;
    this.dragStartTime = Date.now();
    
    // Get current window position
    const rect = this.window.getBoundingClientRect();
    
    // Store initial window position
    this.initialWindowX = rect.left;
    this.initialWindowY = rect.top;
    
    // Calculate offset from mouse to window corner
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
    
    // Store the current mouse position
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    // Record initial position for shake detection
    this.recordPosition(e.clientX, e.clientY);
    
    // Add visual feedback
    this.window.style.cursor = 'grabbing';
    this.window.classList.add('moving');
    
    // Bring to front
    if (window.bringToFront) {
      window.bringToFront(this.window);
    }
  }

  drag(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    this.recordPosition(e.clientX, e.clientY);
    
    // Calculate how much the mouse moved
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    
    // Track velocity for physics when detached
    if (this.isDetached) {
      this.velocity.x = deltaX * 0.8; // Apply some momentum
      this.velocity.y = deltaY * 0.8;
    }
    
    // Update last mouse position
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    // Get current window position
    const currentRect = this.window.getBoundingClientRect();
    const newX = currentRect.left + deltaX;
    const newY = currentRect.top + deltaY;
    
    if (this.isDetached) {
      // Free movement when detached with physics
      this.moveWindowFreely(newX, newY);
    } else {
      // Constrained to taskbar rail when attached - only allow horizontal movement
      this.moveOnTaskbarRail(newX, newY);
      this.detectShake();
    }
  }

  endDrag(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.window.style.cursor = '';
    this.window.classList.remove('moving');
    
    if (this.isDetached) {
      this.checkForSlamReattach(e);
      // Start physics simulation when letting go of detached window
      this.startPhysics();
    } else {
      // Stop physics when attached
      this.stopPhysics();
    }
    
    // Save position
    this.saveWindowPosition();
  }

  recordPosition(x, y) {
    this.lastPositions.push({ x, y, time: Date.now() });
    // Keep only last 10 positions for performance
    if (this.lastPositions.length > 10) {
      this.lastPositions.shift();
    }
  }

  detectShake() {
    if (this.lastPositions.length < 8) return; // Need more positions for strict detection
    
    // Much more strict shake detection - need significant upward movement
    let verticalMovements = 0;
    let upwardMovement = 0;
    let totalVerticalDistance = 0;
    let maxUpwardDelta = 0;
    let consecutiveUpward = 0;
    let maxConsecutiveUpward = 0;
    
    for (let i = 1; i < this.lastPositions.length; i++) {
      const deltaY = this.lastPositions[i].y - this.lastPositions[i-1].y;
      const absDeltaY = Math.abs(deltaY);
      
      // Higher threshold for stricter detection
      if (absDeltaY > this.shakeThreshold) {
        verticalMovements++;
        totalVerticalDistance += absDeltaY;
        
        if (deltaY < 0) { // upward movement
          upwardMovement++;
          maxUpwardDelta = Math.max(maxUpwardDelta, absDeltaY);
          consecutiveUpward++;
          maxConsecutiveUpward = Math.max(maxConsecutiveUpward, consecutiveUpward);
        } else {
          consecutiveUpward = 0;
        }
      }
    }
    
    // Debug output
    if (verticalMovements > 0) {
      console.log('🔍 Shake analysis:', {
        verticalMovements,
        upwardMovement,
        totalDistance: totalVerticalDistance,
        maxUpwardDelta,
        maxConsecutiveUpward,
        threshold: this.shakeThreshold
      });
    }
    
    // Much stricter conditions: need significant upward shaking
    const hasStrongShake = verticalMovements >= 5;
    const hasUpwardForce = upwardMovement >= 3;
    const hasDistance = totalVerticalDistance > 100;
    const hasIntensity = maxUpwardDelta > 35;
    const hasConsistency = maxConsecutiveUpward >= 2;
    
    if (hasStrongShake && hasUpwardForce && hasDistance && hasIntensity && hasConsistency) {
      console.log('🚀 DETACHING WINDOW - strict shake criteria met!');
      this.detachWindow();
    }
  }

  detachWindow() {
    if (this.isDetached) return; // Already detached
    
    this.isDetached = true;
    this.window.classList.add('detached');
    this.window.style.zIndex = '9999';
    
    // Convert to top positioning for free movement
    const rect = this.window.getBoundingClientRect();
    this.window.style.left = rect.left + 'px';
    this.window.style.top = rect.top + 'px';
    this.window.style.bottom = 'auto';
    
    // Add shake animation
    this.window.classList.add('shaking');
    setTimeout(() => {
      this.window.classList.remove('shaking');
    }, 150);
    
    // Trigger custom event
    this.window.dispatchEvent(new CustomEvent('windowDetached', {
      detail: { windowId: this.window.id }
    }));
    
    console.log('🚀 Window detached from taskbar!');
    
    // Visual notification
    this.showNotification('Window detached! Now has physics - try throwing it!');
  }

  checkForSlamReattach(e) {
    const windowRect = this.window.getBoundingClientRect();
    const taskbarTop = window.innerHeight - this.taskbarHeight;
    
    // Check if window is near taskbar
    if (Math.abs(windowRect.bottom - taskbarTop) < 100) {
      // Calculate slam velocity
      const velocity = this.calculateVelocity();
      
      if (velocity > this.slamVelocityThreshold) {
        this.reattachWindow();
      }
    }
  }

  calculateVelocity() {
    if (this.lastPositions.length < 2) return 0;
    
    const recent = this.lastPositions.slice(-3);
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].x - recent[i-1].x;
      const dy = recent[i].y - recent[i-1].y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      const time = recent[i].time - recent[i-1].time;
      
      totalDistance += distance;
      totalTime += time;
    }
    
    return totalDistance / (totalTime || 1) * 1000; // pixels per second
  }

  reattachWindow() {
    if (!this.isDetached) return; // Already attached
    
    // Stop physics simulation
    this.stopPhysics();
    
    this.isDetached = false;
    this.window.classList.remove('detached');
    this.window.style.zIndex = '';
    
    // Snap to taskbar
    this.snapToTaskbar();
    
    // Add slam animation
    this.window.classList.add('reattaching');
    setTimeout(() => {
      this.window.classList.remove('reattaching');
    }, 300);
    
    // Trigger custom event
    this.window.dispatchEvent(new CustomEvent('windowReattached', {
      detail: { windowId: this.window.id }
    }));
    
    console.log('🔗 Window reattached to taskbar!');
    
    // Visual notification
    this.showNotification('Window reattached to taskbar!');
  }

  moveWindowFreely(x, y) {
    // Constrain to viewport
    const maxX = window.innerWidth - this.window.offsetWidth;
    const maxY = window.innerHeight - this.window.offsetHeight;
    
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    
    this.window.style.left = x + 'px';
    this.window.style.top = y + 'px';
    this.window.style.bottom = 'auto'; // Clear bottom positioning when free
    this.window.style.position = 'fixed';
  }

  moveOnTaskbarRail(x, y) {
    // Constrain to horizontal movement along taskbar
    // Use bottom positioning to match taskbar.js logic exactly
    const maxX = window.innerWidth - this.window.offsetWidth;
    
    x = Math.max(0, Math.min(maxX, x));
    
    this.window.style.left = x + 'px';
    this.window.style.bottom = `${this.taskbarHeight + this.taskbarOffset}px`;
    this.window.style.top = 'auto'; // Clear any top positioning
    this.window.style.position = 'fixed';
  }

  snapToTaskbar() {
    this.window.style.bottom = `${this.taskbarHeight + this.taskbarOffset}px`;
    this.window.style.top = 'auto'; // Clear any top positioning
    this.window.style.position = 'fixed';
  }

  startPhysics() {
    // Stop any existing physics
    this.stopPhysics();
    
    console.log('🌪️ Starting physics with velocity:', this.velocity);
    
    // Start physics simulation
    this.physicsInterval = setInterval(() => {
      this.updatePhysics();
    }, 16); // ~60fps
  }

  stopPhysics() {
    if (this.physicsInterval) {
      clearInterval(this.physicsInterval);
      this.physicsInterval = null;
    }
    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  updatePhysics() {
    if (!this.isDetached || this.isDragging) {
      this.stopPhysics();
      return;
    }

    // Get current position
    const rect = this.window.getBoundingClientRect();
    let newX = rect.left + this.velocity.x;
    let newY = rect.top + this.velocity.y;

    // Boundary collision detection with bounce
    const maxX = window.innerWidth - this.window.offsetWidth;
    const maxY = window.innerHeight - this.window.offsetHeight;

    // Horizontal boundaries
    if (newX <= 0) {
      newX = 0;
      this.velocity.x = -this.velocity.x * this.bounce;
    } else if (newX >= maxX) {
      newX = maxX;
      this.velocity.x = -this.velocity.x * this.bounce;
    }

    // Vertical boundaries
    if (newY <= 0) {
      newY = 0;
      this.velocity.y = -this.velocity.y * this.bounce;
    } else if (newY >= maxY) {
      newY = maxY;
      this.velocity.y = -this.velocity.y * this.bounce;
    }

    // Apply friction
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    // Stop physics if velocity is very low
    if (Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.y) < 0.1) {
      this.stopPhysics();
      return;
    }

    // Update position
    this.window.style.left = newX + 'px';
    this.window.style.top = newY + 'px';
  }

  saveWindowPosition() {
    if (this.window.id) {
      localStorage.setItem(`${this.window.id}Left`, this.window.style.left.replace('px', ''));
      localStorage.setItem(`${this.window.id}Top`, this.window.style.top.replace('px', ''));
      localStorage.setItem(`${this.window.id}Detached`, this.isDetached);
    }
  }

  loadWindowPosition() {
    if (this.window.id) {
      const left = localStorage.getItem(`${this.window.id}Left`);
      const top = localStorage.getItem(`${this.window.id}Top`);
      const detached = localStorage.getItem(`${this.window.id}Detached`) === 'true';
      
      if (left !== null && top !== null) {
        this.window.style.left = left + 'px';
        this.window.style.top = top + 'px';
        
        if (detached) {
          this.isDetached = true;
          this.window.classList.add('detached');
          this.window.style.zIndex = '9999';
        }
      }
    }
  }

  showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'physics-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 255, 136, 0.9);
      color: black;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 10000;
      transition: all 0.3s ease;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

// Export for use in other modules
window.WindowPhysics = WindowPhysics;

// Debug function - you can call this in browser console
window.debugWindowPhysics = function() {
  console.log('🔍 Debug Window Physics:');
  const chatWindow = document.getElementById('chat-window');
  const ipodWindow = document.getElementById('ipod-window');
  
  console.log('Chat window:', chatWindow, 'display:', chatWindow?.style.display, 'hidden:', chatWindow?.hidden);
  console.log('iPod window:', ipodWindow, 'display:', ipodWindow?.style.display, 'hidden:', ipodWindow?.hidden);
  
  if (chatWindow && !chatWindow.windowPhysics) {
    console.log('🚀 Manually initializing chat window physics');
    chatWindow.windowPhysics = new WindowPhysics(chatWindow);
  }
  
  if (ipodWindow && !ipodWindow.windowPhysics) {
    console.log('🚀 Manually initializing iPod window physics');
    ipodWindow.windowPhysics = new WindowPhysics(ipodWindow);
  }
};

// Auto-initialize physics for existing windows
function initializeWindowPhysics() {
  console.log('🔧 Initializing window physics...');
  
  // Wait a bit for the DOM to settle
  setTimeout(() => {
    const windows = document.querySelectorAll('#chat-window, #ipod-window, .vista-window');
    console.log('Found windows:', windows.length);
    
    windows.forEach((window) => {
      console.log('Checking window:', window.id, 'display:', window.style.display, 'hidden:', window.hidden);
      
      if (!window.windowPhysics) {
        console.log('✅ Initializing physics for:', window.id);
        window.windowPhysics = new WindowPhysics(window);
        window.windowPhysics.loadWindowPosition();
      } else {
        console.log('⚠️ Physics already initialized for:', window.id);
      }
    });
  }, 100);
}

// Initialize multiple times to catch windows when they become visible
function tryInitialize() {
  initializeWindowPhysics();
  setTimeout(initializeWindowPhysics, 500);
  setTimeout(initializeWindowPhysics, 1000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitialize);
} else {
  tryInitialize();
}

// Also initialize when windows are shown/created
document.addEventListener('click', (e) => {
  if (e.target.id === 'chat-btn' || e.target.id === 'music-btn') {
    console.log('🎯 Button clicked:', e.target.id);
    setTimeout(initializeWindowPhysics, 50);
    setTimeout(initializeWindowPhysics, 200);
    setTimeout(initializeWindowPhysics, 500);
  }
});

// Watch for any window that becomes visible
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && 
        (mutation.attributeName === 'hidden' || mutation.attributeName === 'style')) {
      const target = mutation.target;
      if (target.id === 'chat-window' || target.id === 'ipod-window') {
        console.log('👀 Window visibility changed:', target.id);
        setTimeout(() => initializeWindowPhysics(), 100);
      }
    }
  });
});

// Start observing
setTimeout(() => {
  const chatWindow = document.getElementById('chat-window');
  const ipodWindow = document.getElementById('ipod-window');
  
  if (chatWindow) observer.observe(chatWindow, { attributes: true });
  if (ipodWindow) observer.observe(ipodWindow, { attributes: true });
}, 1000);

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
`;
document.head.appendChild(style);
