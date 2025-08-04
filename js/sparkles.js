// Sparkle effects for navigation buttons
document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation buttons
    const navButtons = document.querySelectorAll('.nav-button');
    
    // Track active states
    const activeButtons = new WeakSet();
    let animationFrameId = null;
    
    // Function to get a random pattern number (1-4)
    function getRandomPattern() {
        return Math.floor(Math.random() * 4) + 1;
    }
    
    // Initialize sparkles for each button
    function initializeSparkles(button) {
        const pattern = getRandomPattern();
        button.setAttribute('data-pattern', pattern);
        
        const sparkles = button.querySelectorAll('.sparkle');
        sparkles.forEach(sparkle => {
            if (!sparkle.textContent) {
                sparkle.textContent = '✦';
            }
            sparkle.style.opacity = '0';
            sparkle.style.transition = 'opacity 0.2s ease-out';
        });
    }
    
    // Show sparkles with animation
    function showSparkles(button) {
        if (activeButtons.has(button)) return;
        activeButtons.add(button);
        
        const pattern = getRandomPattern();
        button.setAttribute('data-pattern', pattern);
        
        const sparkles = Array.from(button.querySelectorAll('.sparkle'));
        const startTime = performance.now();
        const duration = 300; // ms
        
        function animateSparkles(timestamp) {
            if (!activeButtons.has(button)) return;
            
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            sparkles.forEach((sparkle, index) => {
                const delay = index * 50; // Staggered delay
                const sparkleProgress = Math.max(0, Math.min(1, (progress * duration - delay) / (duration - delay)));
                
                if (elapsed >= delay) {
                    sparkle.style.opacity = sparkleProgress.toString();
                }
            });
            
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animateSparkles);
            }
        }
        
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animateSparkles);
    }
    
    // Hide sparkles
    function hideSparkles(button) {
        if (!activeButtons.has(button)) return;
        
        const sparkles = button.querySelectorAll('.sparkle');
        sparkles.forEach(sparkle => {
            sparkle.style.opacity = '0';
            sparkle.style.transition = 'opacity 0.2s ease-out';
        });
        
        // Small delay to ensure the transition completes
        setTimeout(() => {
            if (!button.matches(':hover')) {
                activeButtons.delete(button);
            }
        }, 250);
    }
    
    // Initialize all buttons
    navButtons.forEach(button => {
        initializeSparkles(button);
        
        // Use mouseenter/mouseleave for better performance than mouseover/mouseout
        button.addEventListener('mouseenter', () => showSparkles(button));
        button.addEventListener('mouseleave', () => hideSparkles(button));
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            cancelAnimationFrame(animationFrameId);
        });
    });
});
