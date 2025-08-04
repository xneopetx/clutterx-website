// window-physics.js - Advanced window physics system
class WindowPhysics {
  constructor(windowElement) {
    this.window = windowElement;
    this.isDetached = false;
    this.isDragging = false;
    this.lastPositions = [];
    this.shakeThreshold = 15; // pixels
    this.shakeCount = 0;
    this.slamVelocityThreshold = 500; // pixels per second
    this.taskbarHeight = 60; // adjust based on your taskbar
    this.dragOffset = { x: 0, y: 0 };
    this.originalDragHandler = null;
    
    this.init();
  }

  init() {
    // Find the title bar for dragging
    const titleBar = this.window.querySelector('.window-title-bar') || 
                     this.window.querySelector('.header') ||
                     this.window.querySelector('.title-bar');
    
    if (titleBar) {
      // Remove any existing drag handlers
      this.overrideDragHandlers(titleBar);
      
      titleBar.addEventListener('mousedown', this.startDrag.bind(this));
      titleBar.style.cursor = 'grab';
    }
    
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.endDrag.bind(this));
    
    // Add visual indicators
    this.window.classList.add('physics-enabled');
  }

  overrideDragHandlers(titleBar) {
    // Clone the element to remove all existing event listeners
    const newTitleBar = titleBar.cloneNode(true);
    titleBar.parentNode.replaceChild(newTitleBar, titleBar);
    return newTitleBar;
  }

  startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.isDragging = true;
    this.lastPositions = [];
    this.shakeCount = 0;
    this.dragStartTime = Date.now();
    
    // Calculate offset from mouse to window corner
    const rect = this.window.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
    
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
    
    if (this.isDetached) {
      // Free movement when detached
      this.moveWindowFreely(e.clientX - this.dragOffset.x, e.clientY - this.dragOffset.y);
    } else {
      // Constrained to taskbar rail when attached
      this.moveOnTaskbarRail(e.clientX - this.dragOffset.x, e.clientY - this.dragOffset.y);
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
    if (this.lastPositions.length < 5) return;
    
    // Check for rapid up-down movement (shake)
    let verticalMovements = 0;
    let upwardMovement = 0;
    
    for (let i = 1; i < this.lastPositions.length; i++) {
      const deltaY = this.lastPositions[i].y - this.lastPositions[i-1].y;
      if (Math.abs(deltaY) > this.shakeThreshold) {
        verticalMovements++;
        if (deltaY < 0) upwardMovement++; // negative = upward
      }
    }
    
    // If enough upward movement detected (shake up gesture)
    if (verticalMovements >= 3 && upwardMovement >= 2) {
      this.detachWindow();
    }
  }

  detachWindow() {
    if (this.isDetached) return; // Already detached
    
    this.isDetached = true;
    this.window.classList.add('detached');
    this.window.style.zIndex = '9999';
    
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
    this.showNotification('Window detached! Drag freely anywhere.');
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
    this.window.style.position = 'fixed';
  }

  moveOnTaskbarRail(x, y) {
    // Constrain to horizontal movement along taskbar
    const taskbarY = window.innerHeight - this.taskbarHeight - this.window.offsetHeight;
    const maxX = window.innerWidth - this.window.offsetWidth;
    
    x = Math.max(0, Math.min(maxX, x));
    
    this.window.style.left = x + 'px';
    this.window.style.top = taskbarY + 'px';
    this.window.style.position = 'fixed';
  }

  snapToTaskbar() {
    const taskbarY = window.innerHeight - this.taskbarHeight - this.window.offsetHeight;
    this.window.style.top = taskbarY + 'px';
    this.window.style.position = 'fixed';
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

// Auto-initialize physics for existing windows
function initializeWindowPhysics() {
  // Wait a bit for the DOM to settle
  setTimeout(() => {
    const windows = document.querySelectorAll('#chat-window, #ipod-window, .vista-window');
    windows.forEach((window) => {
      if (!window.windowPhysics && window.style.display !== 'none') {
        console.log('Initializing physics for:', window.id);
        window.windowPhysics = new WindowPhysics(window);
        window.windowPhysics.loadWindowPosition();
      }
    });
  }, 500);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWindowPhysics);
} else {
  initializeWindowPhysics();
}

// Also initialize when windows are shown/created
document.addEventListener('click', (e) => {
  if (e.target.id === 'chat-btn' || e.target.id === 'music-btn') {
    setTimeout(initializeWindowPhysics, 100);
  }
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
`;
document.head.appendChild(style);
