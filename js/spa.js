// spa.js
async function loadPage(name, push = true) {
  const container = document.getElementById('content');
  container.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const res = await fetch(`pages/${name}.html`);
    if (!res.ok) throw new Error('Not found');
    container.innerHTML = await res.text();
    
    // Initialize page-specific scripts
    if (name === 'shop') {
      initShopPage();
    }
  } catch {
    container.innerHTML = `<p class="error">Page “${name}” not found.</p>`;
  }
  if (push) history.pushState({ page: name }, '', `#${name}`);
}

// Shop page initialization
function initShopPage() {
  // No MailerLite initialization needed; handled by Universal snippet.
  console.log('Initializing shop page...');
}


// Intercept top nav (decorative) clicks
document.querySelectorAll('a.nav-button').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    loadPage(link.getAttribute('href').slice(1));
  });
});

// Browser back/forward
window.addEventListener('popstate', e => {
  const page = e.state?.page || (location.hash.slice(1) || 'shop');
  loadPage(page, false);
});

// Chat toggle (matches your #chat-btn)
const chatBtn = document.getElementById('chat-btn');
if (chatBtn) {
  chatBtn.addEventListener('click', () => {
    const w = document.getElementById('chat-window');
    w.hidden = !w.hidden;
  });
}

// Music toggle (matches your #music-btn)
const musicBtn = document.getElementById('music-btn');
if (musicBtn) {
  musicBtn.addEventListener('click', () => {
    const p = document.getElementById('ipod-window');
    p.hidden = !p.hidden;
  });
}

// Initial load: use hash or default to home
document.addEventListener('DOMContentLoaded', () => {
  const initial = location.hash.slice(1) || 'shop';
  loadPage(initial, false);
  if (initial === 'home' && window.robustDiscordInit) {
    // Wait for DOM elements to exist before initializing
    const waitForDiscordElements = (cb) => {
      const dc = document.getElementById('discord-content');
      const ul = document.getElementById('updates-loading');
      const uc = document.getElementById('updates-content');
      if (dc && ul && uc) {
        cb();
      } else {
        setTimeout(() => waitForDiscordElements(cb), 30);
      }
    };
    waitForDiscordElements(() => window.robustDiscordInit());
  }

  // Listen for hash changes and load the correct page
  window.addEventListener('hashchange', async () => {
    const page = location.hash.slice(1) || 'shop';
    await loadPage(page, false);
    if (page === 'home' && window.robustDiscordInit) {
      // Wait for DOM elements to exist before initializing
      const waitForDiscordElements = (cb) => {
        const dc = document.getElementById('discord-content');
        const ul = document.getElementById('updates-loading');
        const uc = document.getElementById('updates-content');
        if (dc && ul && uc) {
          cb();
        } else {
          setTimeout(() => waitForDiscordElements(cb), 30);
        }
      };
      waitForDiscordElements(() => window.robustDiscordInit());
    }
  });
});
