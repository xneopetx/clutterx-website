// window-physics.js - Stretching-based window physics system
class WindowPhysics {
  constructor(windowElement) {
    this.window = windowElement;
    this.isDetached = false;
    this.isDragging = false;
    this.isStretching = false;
    this.stretchStartY = 0;
    this.stretchAmount = 0;
    this.maxStretch = 80; // pixels before visual indication
    this.snapThreshold = 60; // when to actually detach
    this.dragOffset = { x: 0, y: 0 };
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.originalTransform = '';
    
    // Physics properties for detached windows
    this.velocity = { x: 0, y: 0 };
    this.friction = 0.95;
    this.bounce = 0.3;
    this.physicsInterval = null;
    
    this.init();
  }

  init() {
    // Find the title bar for dragging
    const titleBar = this.window.querySelector('.window-title-bar') || 
                     this.window.querySelector('.chat-header') ||
                     this.window.querySelector('.ipod-header') ||
                     this.window.querySelector('.header') ||
                     this.window.querySelector('.title-bar');
    
    if (titleBar) {
      console.log('🔧 Initializing stretch physics for:', this.window.id);
      
      titleBar.addEventListener('mousedown', this.startDrag.bind(this));
      titleBar.style.cursor = 'grab';
      
      // Store original transform
      this.originalTransform = this.window.style.transform || '';
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
    this.isStretching = false;
    this.stretchAmount = 0;
    
    // Store initial positions
    const rect = this.window.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
    this.stretchStartY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    // Visual feedback
    this.window.style.cursor = 'grabbing';
    this.window.classList.add('moving');
    this.window.style.transition = 'none'; // Disable transitions while dragging
    
    // Bring to front
    if (window.bringToFront) {
      window.bringToFront(this.window);
    }
    
    console.log('🎯 Started dragging window');
  }

  drag(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    
    // Calculate mouse movement
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    
    // Track velocity for physics
    if (this.isDetached) {
      this.velocity.x = deltaX * 0.8;
      this.velocity.y = deltaY * 0.8;
    }
    
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    if (this.isDetached) {
      // Free movement when detached
      const rect = this.window.getBoundingClientRect();
      this.moveWindowFreely(rect.left + deltaX, rect.top + deltaY);
    } else {
      // Check for upward stretch when attached
      const upwardDistance = this.stretchStartY - e.clientY;
      
      if (upwardDistance > 10) {
        // Started stretching upward
        this.isStretching = true;
        this.stretchAmount = Math.min(upwardDistance, this.maxStretch);
        
        console.log(`🔥 Stretching: ${this.stretchAmount.toFixed(0)}px / ${this.snapThreshold}px`);
        
        // Apply stretch visual effect
        this.applyStretchEffect();
        
        // Check if should detach
        if (this.stretchAmount >= this.snapThreshold) {
          this.detachWindow(e);
        }
      } else {
        // Normal horizontal movement along taskbar
        this.isStretching = false;
        this.stretchAmount = 0;
        this.resetStretchEffect();
        
        const rect = this.window.getBoundingClientRect();
        this.moveOnTaskbarRail(rect.left + deltaX);
      }
    }
  }

  endDrag(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.window.style.cursor = '';
    this.window.classList.remove('moving');
    
    if (this.isStretching && !this.isDetached) {
      // Snap back if didn't reach detach threshold
      this.snapBack();
    } else if (this.isDetached) {
      // Start physics simulation for detached window
      this.startPhysics();
      this.checkForSlamReattach(e);
    }
    
    console.log('🏁 Ended drag');
  }

  applyStretchEffect() {
    const stretchPercent = this.stretchAmount / this.maxStretch;
    const scaleY = 1 + (stretchPercent * 0.4); // Stretch up to 40% taller
    const skewX = stretchPercent * -4; // Slight skew for elastic feel
    const translateY = -this.stretchAmount * 0.6; // Move up as it stretches
    
    // Color change for visual feedback
    const intensity = Math.min(stretchPercent, 1);
    const hue = 120 - (intensity * 90); // Green to red transition
    
    this.window.style.transform = `${this.originalTransform} translateY(${translateY}px) scaleY(${scaleY}) skewX(${skewX}deg)`;
    this.window.style.filter = `hue-rotate(${120 - hue}deg) brightness(${1 + intensity * 0.5}) saturate(${1 + intensity})`;
    
    // Add visual indicator when close to snap threshold
    if (this.stretchAmount >= this.snapThreshold * 0.8) {
      this.window.classList.add('ready-to-detach');
    } else {
      this.window.classList.remove('ready-to-detach');
    }
  }

  resetStretchEffect() {
    this.window.style.transform = this.originalTransform;
    this.window.style.filter = '';
    this.window.classList.remove('ready-to-detach');
  }

  snapBack() {
    console.log('↩️ Snapping back to taskbar - not enough stretch');
    
    // Elastic snap back animation
    this.window.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), filter 0.3s ease';
    this.resetStretchEffect();
    
    setTimeout(() => {
      this.window.style.transition = 'none';
      this.isStretching = false;
      this.stretchAmount = 0;
    }, 500);
  }

  detachWindow(e) {
    if (this.isDetached) return;
    
    console.log('🚀 DETACHING WINDOW - Stretch threshold reached!');
    
    this.isDetached = true;
    this.isStretching = false;
    
    // Visual feedback
    this.window.classList.add('detached');
    this.window.style.zIndex = '9999';
    
    // Convert to top positioning for free movement
    const rect = this.window.getBoundingClientRect();
    this.window.style.left = rect.left + 'px';
    this.window.style.top = rect.top + 'px';
    this.window.style.bottom = 'auto';
    this.window.style.position = 'fixed';
    
    // Dramatic detach effect
    this.window.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.window.style.transform = this.originalTransform + ' scale(1.1) rotate(2deg)';
    
    setTimeout(() => {
      this.window.style.transform = this.originalTransform;
      this.window.style.transition = 'none';
    }, 300);
    
    // Reset stretch effects
    this.resetStretchEffect();
    
    // Show notification
    this.showNotification('Window detached! Now has physics - try throwing it!');
    
    // Trigger event
    this.window.dispatchEvent(new CustomEvent('windowDetached', {
      detail: { windowId: this.window.id }
    }));
  }

  moveOnTaskbarRail(x) {
    // Constrain to horizontal movement along taskbar
    const maxX = window.innerWidth - this.window.offsetWidth;
    x = Math.max(0, Math.min(maxX, x));
    
    this.window.style.left = x + 'px';
    this.window.style.bottom = '52px'; // Match taskbar positioning
    this.window.style.top = 'auto';
    this.window.style.position = 'fixed';
  }

  moveWindowFreely(x, y) {
    // Constrain to viewport
    const maxX = window.innerWidth - this.window.offsetWidth;
    const maxY = window.innerHeight - this.window.offsetHeight;
    
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    
    this.window.style.left = x + 'px';
    this.window.style.top = y + 'px';
    this.window.style.bottom = 'auto';
    this.window.style.position = 'fixed';
  }

  startPhysics() {
    this.stopPhysics();
    console.log('🌪️ Starting physics with velocity:', this.velocity);
    
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

    const rect = this.window.getBoundingClientRect();
    let newX = rect.left + this.velocity.x;
    let newY = rect.top + this.velocity.y;

    // Boundary collision with bounce
    const maxX = window.innerWidth - this.window.offsetWidth;
    const maxY = window.innerHeight - this.window.offsetHeight;

    if (newX <= 0) {
      newX = 0;
      this.velocity.x = -this.velocity.x * this.bounce;
    } else if (newX >= maxX) {
      newX = maxX;
      this.velocity.x = -this.velocity.x * this.bounce;
    }

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

    // Stop if very slow
    if (Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.y) < 0.1) {
      this.stopPhysics();
      return;
    }

    this.moveWindowFreely(newX, newY);
  }

  checkForSlamReattach(e) {
    const windowRect = this.window.getBoundingClientRect();
    const taskbarTop = window.innerHeight - 50;
    
    // Check if window is near taskbar and moving fast
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    
    if (Math.abs(windowRect.bottom - window.innerHeight) < 80 && speed > 8) {
      this.reattachWindow();
    }
  }

  reattachWindow() {
    if (!this.isDetached) return;
    
    console.log('🔗 REATTACHING WINDOW to taskbar');
    
    this.stopPhysics();
    this.isDetached = false;
    this.window.classList.remove('detached', 'ready-to-detach');
    this.window.style.zIndex = '';
    
    // Snap to taskbar with animation
    this.window.style.transition = 'transform 0.2s ease, bottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    this.window.style.bottom = '52px';
    this.window.style.top = 'auto';
    this.window.style.transform = this.originalTransform + ' scale(0.9)';
    
    setTimeout(() => {
      this.window.style.transform = this.originalTransform;
      this.window.style.transition = 'none';
    }, 400);
    
    this.resetStretchEffect();
    this.showNotification('Window reattached to taskbar!');
    
    this.window.dispatchEvent(new CustomEvent('windowReattached', {
      detail: { windowId: this.window.id }
    }));
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'physics-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 255, 136, 0.95);
      color: black;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      transition: all 0.3s ease;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }
}

// Export for use
window.WindowPhysics = WindowPhysics;

// Auto-initialize physics for existing windows
function initializeWindowPhysics() {
  console.log('🔧 Initializing stretch-based window physics...');
  
  setTimeout(() => {
    const windows = document.querySelectorAll('#chat-window, #ipod-window, .vista-window');
    console.log('Found windows:', windows.length);
    
    windows.forEach((window) => {
      if (!window.windowPhysics) {
        console.log('✅ Initializing stretch physics for:', window.id);
        window.windowPhysics = new WindowPhysics(window);
      }
    });
  }, 100);
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWindowPhysics);
} else {
  initializeWindowPhysics();
}

// Watch for button clicks to initialize physics
document.addEventListener('click', (e) => {
  if (e.target.id === 'chat-btn' || e.target.id === 'music-btn') {
    console.log('🎯 Button clicked:', e.target.id);
    setTimeout(initializeWindowPhysics, 100);
    setTimeout(initializeWindowPhysics, 500);
  }
});

// Debug function
window.debugWindowPhysics = function() {
  console.log('🔍 Debug Stretch Physics:');
  const chatWindow = document.getElementById('chat-window');
  const ipodWindow = document.getElementById('ipod-window');
  
  if (chatWindow && !chatWindow.windowPhysics) {
    console.log('🚀 Manually initializing chat window stretch physics');
    chatWindow.windowPhysics = new WindowPhysics(chatWindow);
  }
  
  if (ipodWindow && !ipodWindow.windowPhysics) {
    console.log('🚀 Manually initializing iPod window stretch physics');
    ipodWindow.windowPhysics = new WindowPhysics(ipodWindow);
  }
};

// Add CSS for stretch effects
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.physics-enabled.ready-to-detach {
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.6) !important;
  animation: readyPulse 0.5s ease-in-out infinite alternate;
}

@keyframes readyPulse {
  from { box-shadow: 0 0 20px rgba(255, 0, 0, 0.6); }
  to { box-shadow: 0 0 30px rgba(255, 100, 0, 0.8); }
}

.physics-enabled.moving {
  z-index: 9998;
}

.physics-enabled.detached {
  box-shadow: 0 15px 35px rgba(0, 255, 136, 0.4), 
              0 5px 15px rgba(0, 0, 0, 0.3);
  border: 2px solid #00ff88;
}
`;
document.head.appendChild(style);
