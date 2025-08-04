// window-physics.js - Clean stretching-based window physics system
class WindowPhysics {
  constructor(windowElement) {
    this.window = windowElement;
    this.isDetached = false;
    this.isDragging = false;
    this.isStretching = false;
    this.stretchStartY = 0;
    this.stretchAmount = 0;
    this.maxStretch = 60; // Reduced for less dramatic effect
    this.snapThreshold = 40; // Lower threshold
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.windowStartX = 0;
    this.windowStartY = 0;
    
    // Physics properties for detached windows
    this.velocity = { x: 0, y: 0 };
    this.gravityEnabled = false;
    this.friction = 0.98;
    this.bounce = 0.6;
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
      console.log('🔧 Initializing clean physics for:', this.window.id);
      
      titleBar.addEventListener('mousedown', this.startDrag.bind(this));
      titleBar.addEventListener('dblclick', this.toggleGravity.bind(this));
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
    this.isStretching = false;
    this.stretchAmount = 0;
    
    // Store initial positions for proper offset calculation
    const rect = this.window.getBoundingClientRect();
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientX;
    this.windowStartX = rect.left;
    this.windowStartY = rect.top;
    this.stretchStartY = e.clientY;
    
    // Visual feedback
    this.window.style.cursor = 'grabbing';
    this.window.classList.add('moving');
    this.window.style.transition = 'none';
    
    // Bring to front
    if (window.bringToFront) {
      window.bringToFront(this.window);
    }
    
    console.log('🎯 Started dragging window');
  }

  drag(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    
    // Calculate movement from start position
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    
    if (this.isDetached) {
      // Free movement when detached - follow mouse exactly
      const newX = this.windowStartX + deltaX;
      const newY = this.windowStartY + deltaY;
      this.moveWindowFreely(newX, newY);
      
      // Track velocity for physics
      this.velocity.x = deltaX * 0.3;
      this.velocity.y = deltaY * 0.3;
    } else {
      // Check for upward stretch when attached
      const upwardDistance = this.stretchStartY - e.clientY;
      
      if (upwardDistance > 10) {
        // Started stretching upward
        this.isStretching = true;
        this.stretchAmount = Math.min(upwardDistance, this.maxStretch);
        
        this.window.classList.add('stretching');
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
        this.window.classList.remove('stretching');
        this.resetStretchEffect();
        
        // Move horizontally on taskbar
        const newX = this.windowStartX + deltaX;
        this.moveOnTaskbarRail(newX);
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
      this.checkForSlamReattach();
    }
    
    console.log('🏁 Ended drag');
  }

  applyStretchEffect() {
    const stretchPercent = this.stretchAmount / this.maxStretch;
    
    // More subtle stretching effect
    const scaleY = 1 + (stretchPercent * 0.8); // Max 1.8x taller (was 4x)
    const scaleX = 1 - (stretchPercent * 0.2); // Slightly thinner (was 0.4)
    const skewX = stretchPercent * -3; // Less skew (was -8)
    const translateY = -this.stretchAmount * 0.5; // Less dramatic movement (was 1.2)
    
    // Subtle color change
    const intensity = Math.min(stretchPercent, 1);
    const hue = 60 * intensity; // Green to yellow instead of red
    
    // Set transform origin and apply effect
    this.window.style.transformOrigin = 'center bottom';
    this.window.style.transition = 'none';
    this.window.style.transform = `translateY(${translateY}px) scaleY(${scaleY}) scaleX(${scaleX}) skewX(${skewX}deg)`;
    this.window.style.filter = `hue-rotate(${hue}deg) brightness(${1 + intensity * 0.3}) saturate(${1 + intensity * 0.5})`;
    
    // Visual indicator when close to snap threshold
    if (this.stretchAmount >= this.snapThreshold * 0.8) {
      this.window.classList.add('ready-to-detach');
    } else {
      this.window.classList.remove('ready-to-detach');
    }
  }

  resetStretchEffect() {
    this.window.style.transform = '';
    this.window.style.transformOrigin = '';
    this.window.style.filter = '';
    this.window.style.transition = '';
    this.window.classList.remove('ready-to-detach', 'stretching');
  }

  snapBack() {
    console.log('↩️ Snapping back to taskbar - not enough stretch');
    
    this.window.classList.remove('stretching');
    this.window.style.transition = 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    this.resetStretchEffect();
    
    setTimeout(() => {
      this.window.style.transition = 'none';
      this.isStretching = false;
      this.stretchAmount = 0;
    }, 300);
  }

  detachWindow(e) {
    if (this.isDetached) return;
    
    console.log('🚀 DETACHING WINDOW');
    
    this.isDetached = true;
    this.isStretching = false;
    
    // Visual feedback
    this.window.classList.add('detached');
    this.window.style.zIndex = '9999';
    
    // Convert to free positioning - stay where it is
    const rect = this.window.getBoundingClientRect();
    this.window.style.position = 'fixed';
    this.window.style.left = rect.left + 'px';
    this.window.style.top = rect.top + 'px';
    this.window.style.bottom = 'auto'; // Important: remove bottom constraint
    
    // Simple detach effect
    this.window.style.transition = 'transform 0.2s ease';
    this.window.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
      this.window.style.transform = '';
      this.window.style.transition = 'none';
    }, 200);
    
    // Reset stretch effects
    this.resetStretchEffect();
    
    // Update drag start positions for new coordinate system
    this.windowStartX = rect.left;
    this.windowStartY = rect.top;
    
    this.showNotification('Window detached! Drag freely or double-click for gravity');
  }

  moveOnTaskbarRail(x) {
    // Constrain to horizontal movement along taskbar
    const maxX = window.innerWidth - this.window.offsetWidth;
    x = Math.max(0, Math.min(maxX, x));
    
    this.window.style.position = 'fixed';
    this.window.style.left = x + 'px';
    this.window.style.bottom = '52px'; // Stay on taskbar
    this.window.style.top = 'auto';
  }

  moveWindowFreely(x, y) {
    // Constrain to viewport
    const maxX = window.innerWidth - this.window.offsetWidth;
    const maxY = window.innerHeight - this.window.offsetHeight;
    
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    
    this.window.style.position = 'fixed';
    this.window.style.left = x + 'px';
    this.window.style.top = y + 'px';
    this.window.style.bottom = 'auto'; // Ensure no bottom constraint
  }

  toggleGravity(e) {
    if (!this.isDetached) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    this.gravityEnabled = !this.gravityEnabled;
    
    console.log(`🌍 Gravity ${this.gravityEnabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (this.gravityEnabled) {
      this.showNotification('Gravity ON! Window will fall');
      this.window.style.boxShadow = '0 0 15px rgba(255, 165, 0, 0.6)';
      this.startPhysics();
    } else {
      this.showNotification('Gravity OFF! Window floats freely');
      this.window.style.boxShadow = '';
    }
  }

  startPhysics() {
    if (this.physicsInterval) return;
    
    console.log('🌪️ Starting physics');
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
    
    // Apply gravity if enabled
    if (this.gravityEnabled) {
      this.velocity.y += 0.3; // Gravity
    }
    
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
    
    // Check for reattachment
    this.checkForAutoReattach();
  }

  checkForSlamReattach() {
    const windowRect = this.window.getBoundingClientRect();
    const taskbarZone = window.innerHeight - 100;
    
    if (windowRect.bottom >= taskbarZone) {
      this.reattachWindow();
    }
  }

  checkForAutoReattach() {
    const windowRect = this.window.getBoundingClientRect();
    const taskbarZone = window.innerHeight - 80;
    
    if (windowRect.bottom >= taskbarZone) {
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
      if (speed < 2) {
        console.log('🔗 Auto-reattaching slow window near taskbar');
        this.reattachWindow();
      }
    }
  }

  reattachWindow() {
    if (!this.isDetached) return;
    
    console.log('🔗 REATTACHING WINDOW to taskbar');
    
    this.stopPhysics();
    this.isDetached = false;
    
    // Reset gravity state
    this.gravityEnabled = false;
    console.log('🌍 Gravity RESET');
    
    this.window.classList.remove('detached', 'ready-to-detach');
    this.window.style.zIndex = '';
    this.window.style.boxShadow = '';
    
    // Snap to taskbar with animation
    this.window.style.transition = 'bottom 0.3s ease';
    this.window.style.bottom = '52px';
    this.window.style.top = 'auto';
    
    setTimeout(() => {
      this.window.style.transition = 'none';
    }, 300);
    
    this.resetStretchEffect();
    this.showNotification('Window reattached! Gravity reset');
    
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
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      z-index: 10000;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

// Export for use
window.WindowPhysics = WindowPhysics;

// Auto-initialize physics for existing windows
function initializeWindowPhysics() {
  console.log('🔧 Initializing clean window physics...');
  
  setTimeout(() => {
    const windows = document.querySelectorAll('#chat-window, #ipod-window, .vista-window');
    console.log('🔍 Found windows:', windows.length);
    
    windows.forEach((window) => {
      if (!window.windowPhysics) {
        console.log('✅ Initializing clean physics for:', window.id || 'unnamed-window');
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
  }
});

// Debug function
window.debugWindowPhysics = function() {
  console.log('🔍 Debug Clean Physics:');
  const chatWindow = document.getElementById('chat-window');
  const ipodWindow = document.getElementById('ipod-window');
  
  if (chatWindow && !chatWindow.windowPhysics) {
    console.log('🚀 Manually initializing chat window physics');
    chatWindow.windowPhysics = new WindowPhysics(chatWindow);
  }
  
  if (ipodWindow && !ipodWindow.windowPhysics) {
    console.log('🚀 Manually initializing iPod window physics');
    ipodWindow.windowPhysics = new WindowPhysics(ipodWindow);
  }
};

// Add clean CSS for effects
const style = document.createElement('style');
style.textContent = `
.physics-enabled {
  transform-origin: center bottom;
}

.physics-enabled.moving {
  z-index: 9998;
  transition: none !important;
}

.physics-enabled.ready-to-detach {
  box-shadow: 0 0 15px rgba(255, 200, 0, 0.7) !important;
  animation: readyPulse 0.4s ease-in-out infinite alternate;
}

@keyframes readyPulse {
  from { 
    box-shadow: 0 0 15px rgba(255, 200, 0, 0.7);
  }
  to { 
    box-shadow: 0 0 25px rgba(255, 150, 0, 0.9);
  }
}

.physics-enabled.detached {
  box-shadow: 0 10px 25px rgba(0, 255, 136, 0.4), 
              0 5px 15px rgba(0, 0, 0, 0.2);
  border: 2px solid #00ff88;
}
`;
document.head.appendChild(style);
