// gallery.js - Complete Fixed Version
document.addEventListener('DOMContentLoaded', function() {
  console.log('Gallery script initialized'); // Debug 1

  // Sample data with multiple path options - try them one by one
  const clothingItems = [
    {
      id: 1,
      title: "Cropped Denim Top",
      // Try these paths in order until images appear:
      image: "../images/Gallery/4-5.png",    // Option 1 (most common)
      // image: "images/Gallery/4-5.png",   // Option 2
      // image: "/images/Gallery/4-5.png",  // Option 3
      // image: "Gallery/4-5.png",          // Option 4
      // image: "https://via.placeholder.com/400x500.png?text=Placeholder", // Option 5 (test)
      date: "05/15/2023",
      likes: 42,
      description: "Handmade cropped denim top with custom embroidery.",
      materials: "Denim, cotton thread",
      category: "tops"
    },
    // Additional items...
    {
      id: 2,
      title: "Patchwork Jeans",
      image: "../images/Gallery/4-5.png", // Use same path as first item
      date: "04/22/2023",
      likes: 28,
      description: "Upcycled jeans with patchwork design.",
      materials: "Recycled denim",
      category: "bottoms"
    }
  ];

  // 1. Find gallery container with error checking
  const galleryGrid = document.querySelector('.gallery-grid');
  if (!galleryGrid) {
    console.error('Error: Could not find .gallery-grid element');
    return;
  }
  console.log('Gallery grid found:', galleryGrid); // Debug 2

  // 2. Image loader with debugging
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        console.log(`Image loaded: ${url}`); // Debug 3
        resolve(url);
      };
      img.onerror = () => {
        console.error(`Failed to load: ${url}`); // Debug 4
        reject(url);
      };
    });
  }

  // 3. Render function with image validation
  async function renderGallery(items) {
    galleryGrid.innerHTML = '<div class="loading">Loading gallery...</div>';
    
    let successfulItems = [];
    
    // Verify each image loads before rendering
    for (const item of items) {
      try {
        await loadImage(item.image);
        successfulItems.push(item);
      } catch (error) {
        console.warn(`Skipping item "${item.title}" - image failed to load`);
      }
    }

    // Render only items with valid images
    galleryGrid.innerHTML = '';
    successfulItems.forEach(item => {
      const itemHTML = `
        <div class="gallery-item" data-category="${item.category}">
          <div class="item-image-container">
            <img src="${item.image}" alt="${item.title}" class="item-image">
            <div class="image-load-indicator">✓ Loaded</div>
          </div>
          <div class="item-info">
            <h3>${item.title}</h3>
            <span>Added: ${item.date}</span>
            <div>❤️ ${item.likes}</div>
          </div>
        </div>
      `;
      galleryGrid.insertAdjacentHTML('beforeend', itemHTML);
    });

    if (successfulItems.length === 0) {
      galleryGrid.innerHTML = `
        <div class="error">
          <p>⚠️ No images could be loaded.</p>
          <p>Check console for errors and verify:</p>
          <ol>
            <li>Image files exist in correct location</li>
            <li>File paths are correct (case-sensitive)</li>
            <li>Server is running (if testing locally)</li>
          </ol>
        </div>
      `;
    }
  }

  // 4. Initialize with error handling
  try {
    renderGallery(clothingItems);
  } catch (error) {
    console.error('Gallery rendering failed:', error);
    if (galleryGrid) {
      galleryGrid.innerHTML = `
        <div class="error">
          <p>⚠️ Gallery failed to load</p>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  // 5. Quick View Modal (simplified)
  document.addEventListener('click', function(e) {
    if (e.target.closest('.gallery-item')) {
      const item = clothingItems.find(
        item => item.title === e.target.closest('.gallery-item').querySelector('h3').textContent
      );
      if (item) {
        alert(`Quick view would show: ${item.title}\nImage: ${item.image}`);
        // Replace with your actual modal code when images work
      }
    }
  });
});