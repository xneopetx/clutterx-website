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
    this.acceleration = { x: 0, y: 0 }; // No automatic gravity - only on double-click
    this.gravityEnabled = false; // Toggle gravity with double-click
    this.friction = 0.98; // Less friction for better feel
    this.bounce = 0.6; // More bouncy
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
      titleBar.addEventListener('dblclick', this.toggleGravity.bind(this));
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
    
    // Track velocity for physics - better momentum calculation
    if (this.isDetached) {
      this.velocity.x = deltaX * 1.2; // More responsive
      this.velocity.y = deltaY * 1.2;
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
        
        // Add visual class for stretching
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

  toggleGravity(e) {
    // Only allow gravity toggle when detached
    if (!this.isDetached) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    this.gravityEnabled = !this.gravityEnabled;
    this.acceleration.y = this.gravityEnabled ? 0.4 : 0;
    
    console.log(`🌍 Gravity ${this.gravityEnabled ? 'ENABLED' : 'DISABLED'} for detached window`);
    
    // Visual feedback
    if (this.gravityEnabled) {
      this.showNotification('Gravity ON! Window will fall down');
      this.window.style.boxShadow = '0 0 20px rgba(255, 165, 0, 0.8)';
    } else {
      this.showNotification('Gravity OFF! Window floats freely');
      this.window.style.boxShadow = '';
    }
    
    // Start physics if not already running
    if (this.gravityEnabled && !this.physicsInterval) {
      this.startPhysics();
    }
  }

  applyStretchEffect() {
    console.log(`🔥 APPLYING STRETCH EFFECT - amount: ${this.stretchAmount}, maxStretch: ${this.maxStretch}`);
    
    const stretchPercent = this.stretchAmount / this.maxStretch;
    
    // Make it LONG and THIN - dramatic stretching
    const scaleY = 1 + (stretchPercent * 3); // Up to 4x taller!
    const scaleX = 1 - (stretchPercent * 0.4); // Get thinner as it stretches
    const skewX = stretchPercent * -8; // More dramatic skew
    const translateY = -this.stretchAmount * 1.2; // Move up dramatically
    
    // Color change for visual feedback - more dramatic
    const intensity = Math.min(stretchPercent, 1);
    const hue = 120 - (intensity * 120); // Green to red transition
    
    // Add pulsing effect when stretching
    const pulse = Math.sin(Date.now() * 0.03) * 0.2 + 1;
    const finalScaleY = scaleY * pulse;
    
    console.log(`🎨 TRANSFORM VALUES: scaleY=${finalScaleY.toFixed(2)}, scaleX=${scaleX.toFixed(2)}, translateY=${translateY.toFixed(0)}, skew=${skewX.toFixed(1)}`);
    
    // COMPLETELY CLEAR and set transform - ignore any original transform
    this.window.style.transformOrigin = 'center bottom';
    this.window.style.transition = 'none !important'; // Force disable transitions
    const transformString = `translateY(${translateY}px) scaleY(${finalScaleY}) scaleX(${scaleX}) skewX(${skewX}deg)`;
    this.window.style.transform = transformString;
    this.window.style.filter = `hue-rotate(${120 - hue}deg) brightness(${1 + intensity * 1.2}) saturate(${1 + intensity * 3}) drop-shadow(0 0 ${intensity * 30}px rgba(255, ${100 * intensity}, 0, 0.9))`;
    
    console.log(`🎨 APPLIED TRANSFORM: "${transformString}"`);
    
    // Add visual indicator when close to snap threshold
    if (this.stretchAmount >= this.snapThreshold * 0.7) {
      this.window.classList.add('ready-to-detach');
    } else {
      this.window.classList.remove('ready-to-detach');
    }
  }

  resetStretchEffect() {
    this.window.style.transform = '';  // Completely clear transform
    this.window.style.transformOrigin = '';
    this.window.style.filter = '';
    this.window.style.transition = '';
    this.window.classList.remove('ready-to-detach', 'stretching');
    console.log('🧹 Reset stretch effect - cleared all transforms');
  }

  snapBack() {
    console.log('↩️ Snapping back to taskbar - not enough stretch');
    
    // Remove stretching class
    this.window.classList.remove('stretching');
    
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
    this.window.style.transform = 'scale(1.1) rotate(2deg)';
    
    setTimeout(() => {
      this.window.style.transform = '';
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
    
    // Apply gravity and acceleration only if enabled
    if (this.gravityEnabled) {
      this.velocity.x += this.acceleration.x;
      this.velocity.y += this.acceleration.y;
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
    
    // Continuous check for reattachment during physics
    this.checkForAutoReattach();
  }
  
  checkForAutoReattach() {
    const windowRect = this.window.getBoundingClientRect();
    const taskbarZone = window.innerHeight - 100;
    
    // Auto-reattach if window settles near taskbar
    if (windowRect.bottom >= taskbarZone) {
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
      if (speed < 2) { // Window has slowed down near taskbar
        console.log('🔗 Auto-reattaching slow window near taskbar');
        this.reattachWindow();
      }
    }
  }

  checkForSlamReattach(e) {
    const windowRect = this.window.getBoundingClientRect();
    const taskbarZone = window.innerHeight - 120; // Larger detection zone
    
    // Check if window is near taskbar area (more generous)
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    const isNearTaskbar = windowRect.bottom >= taskbarZone;
    const isMovingDown = this.velocity.y > 0;
    
    console.log(`🎯 Reattach check: bottom=${windowRect.bottom.toFixed(0)}, zone=${taskbarZone}, speed=${speed.toFixed(1)}, movingDown=${isMovingDown}`);
    
    // Much easier reattachment conditions
    if (isNearTaskbar && (speed > 3 || isMovingDown)) {
      this.reattachWindow();
    }
  }

  reattachWindow() {
    if (!this.isDetached) return;
    
    console.log('🔗 REATTACHING WINDOW to taskbar');
    
    this.stopPhysics();
    this.isDetached = false;
    
    // Reset gravity state when reattaching
    this.gravityEnabled = false;
    this.acceleration.y = 0;
    console.log('🌍 Gravity RESET - disabled for reattached window');
    
    this.window.classList.remove('detached', 'ready-to-detach');
    this.window.style.zIndex = '';
    this.window.style.boxShadow = ''; // Remove gravity glow
    
    // Snap to taskbar with animation
    this.window.style.transition = 'transform 0.2s ease, bottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    this.window.style.bottom = '52px';
    this.window.style.top = 'auto';
    this.window.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      this.window.style.transform = '';
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

@keyframes stretchPulse {
  0% { transform: scaleX(1); }
  50% { transform: scaleX(1.05); }
  100% { transform: scaleX(1); }
}

.physics-enabled.ready-to-detach {
  box-shadow: 0 0 25px rgba(255, 0, 0, 0.8) !important;
  animation: readyPulse 0.3s ease-in-out infinite alternate, stretchPulse 0.5s ease-in-out infinite;
}

@keyframes readyPulse {
  from { 
    box-shadow: 0 0 25px rgba(255, 0, 0, 0.8);
    filter: brightness(1.2) saturate(1.5);
  }
  to { 
    box-shadow: 0 0 40px rgba(255, 100, 0, 1), 0 0 60px rgba(255, 200, 0, 0.5);
    filter: brightness(1.5) saturate(2);
  }
}

.physics-enabled.moving {
  z-index: 9998;
  transition: none !important;
}

.physics-enabled.detached {
  box-shadow: 0 20px 40px rgba(0, 255, 136, 0.6), 
              0 10px 20px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(0, 255, 136, 0.3);
  border: 3px solid #00ff88;
  animation: floatGlow 2s ease-in-out infinite alternate;
}

@keyframes floatGlow {
  from { 
    box-shadow: 0 20px 40px rgba(0, 255, 136, 0.6), 
                0 10px 20px rgba(0, 0, 0, 0.4),
                0 0 30px rgba(0, 255, 136, 0.3);
  }
  to { 
    box-shadow: 0 25px 50px rgba(0, 255, 136, 0.8), 
                0 15px 30px rgba(0, 0, 0, 0.3),
                0 0 40px rgba(0, 255, 136, 0.5);
  }
}

/* Enhanced stretch animation styles */
.physics-enabled {
  transform-origin: center bottom !important;
  transition: filter 0.1s ease !important;
}

.physics-enabled.moving {
  z-index: 9998 !important;
  transition: none !important;
}

.physics-enabled.moving.stretching {
  animation: elasticPulse 0.2s ease-in-out infinite alternate !important;
  transform-origin: center bottom !important;
}

@keyframes elasticPulse {
  from { 
    transform-origin: center bottom !important;
    filter: brightness(1.1) saturate(1.5) !important;
  }
  to { 
    transform-origin: center bottom !important;
    filter: brightness(1.4) saturate(2.2) !important;
  }
}
`;
document.head.appendChild(style);
