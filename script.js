console.log("JS file is linked correctly.");

// API URL - Change this to your Flask server address when deploying
const API_URL = 'https://dhp-w53a.onrender.com/';

// Global variables
let properties = [];
let currentPage = 1;
const propertiesPerPage = 8; // Show 8 properties per page (4 in a row, 2 rows)

// DOM Elements
const propertyContainer = document.getElementById('propertyContainer');
const paginationContainer = document.getElementById('paginationContainer');
const cityInput = document.getElementById('cityInput');
const bhkSelect = document.getElementById('bhkSelect');
const budgetSelect = document.getElementById('budgetSelect');
const typeSelect = document.getElementById('typeSelect');
const searchBtn = document.getElementById('searchBtn');
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeLogin = document.getElementById('closeLogin');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const mobileInput = document.getElementById('mobileInput');
const otpInput = document.getElementById('otpInput');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');

// Fetch available cities from API
async function fetchCities() {
  try {
    const response = await fetch(`${API_URL}/cities`);
    if (!response.ok) {
      throw new Error('Failed to fetch cities');
    }
    
    const data = await response.json();
    if (data.available_cities && data.available_cities.length > 0) {
      // Create datalist for city input
      const datalist = document.createElement('datalist');
      datalist.id = 'cityOptions';
      
      data.available_cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        datalist.appendChild(option);
      });
      
      document.body.appendChild(datalist);
      cityInput.setAttribute('list', 'cityOptions');
      
      // Set the first city as default
      cityInput.value = data.available_cities[0];
      
      // Load properties for the first city
      fetchPropertiesForCity(data.available_cities[0]);
    }
  } catch (error) {
    console.error('Error fetching cities:', error);
    alert('Failed to load cities. Please try again later.');
  }
}

// Fetch properties from API based on city and filters
async function fetchPropertiesForCity(city, filters = {}) {
  try {
    if (!city) {
      alert('Please select a city');
      return;
    }
    
    // Show loading message
    propertyContainer.innerHTML = '<div class="text-center p-4">Loading properties...</div>';
    
    // Build URL with query parameters
    let url = `${API_URL}/data/${city}`;
    const queryParams = new URLSearchParams();
    
    // Add BHK filter if selected
    if (filters.bhk) {
      queryParams.append('bhk', filters.bhk);
    }
    
    // Add limit parameter
    queryParams.append('limit', 100); // Fetch more and paginate on client side
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch properties for ${city}`);
    }
    
    const data = await response.json();
    console.log("Raw data from API:", data); // Log the raw data to see what's coming from the backend
    
    // Process the received properties
    properties = data.map(property => ({
      title: property.name || 'Unnamed Property',
      location: property.location || 'Location N/A',
      bhk: property.bhk || 'N/A',
      area: property.area_sqft ? `${property.area_sqft} sq.ft` : 'Area N/A',
      price: formatPrice(property.price_lakhs),
      // Always use the image_url from the backend
      image: property.image_url || `https://source.unsplash.com/random/300x200/?apartment,house&sig=${Math.random()}`,
      type: property.type || 'Apartment',
      isNew: Math.random() > 0.7 // Random flag for new properties
    }));
    
    console.log("Processed properties:", properties); // Log the processed properties
    
    currentPage = 1;
    renderProperties();
  } 
  catch (error) {
    console.error('Error:', error);
    propertyContainer.innerHTML = '<div class="text-center p-4 text-red-500">Failed to load properties. Please try again.</div>';
  }
}
// Format price for display - improved version that properly handles numeric values
function formatPrice(priceLakhs) {
  // Handle empty or null values
  if (priceLakhs === null || priceLakhs === undefined || priceLakhs === 'N/A' || priceLakhs === '') {
    return 'Price on Request';
  }
  }
  
  

function filterProperties() {
  const bhk = bhkSelect.value ? parseInt(bhkSelect.value) : null;
  const budget = budgetSelect.value;
  const type = typeSelect.value;
  
  return properties.filter(property => {
      // Filter by BHK if selected
      if (bhk !== null) {
          const propertyBhk = parseInt(property.bhk);
          if (isNaN(propertyBhk) || propertyBhk !== bhk) {
              return false;
          }
      }
      
      // Filter by budget if selected
      if (budget) {
          const price = property.price;
          
          // Extract numeric value from price string
          let priceValue;
          let inCrores = false;
          
          if (price.includes('Cr')) {
              const match = price.match(/₹([\d.]+) Cr/);
              if (match) {
                  priceValue = parseFloat(match[1]);
                  inCrores = true;
              }
          } else if (price.includes('Lakhs')) {
              const match = price.match(/₹([\d.]+) Lakhs/);
              if (match) {
                  priceValue = parseFloat(match[1]);
                  priceValue = priceValue / 100; // Convert to crores
                  inCrores = false;
              }
          }
          
          // If we couldn't extract a valid price, skip this property
          if (priceValue === undefined || isNaN(priceValue)) {
              return false;
          }
          
          // Filter based on budget ranges
          switch(budget) {
              case 'Below ₹50 L':
                  return priceValue < 0.5;  // 50 Lakhs = 0.5 Crores
              case '₹50 L - ₹1 Cr':
                  return priceValue >= 0.5 && priceValue <= 1;
              case '₹1 Cr - ₹2 Cr':
                  return priceValue > 1 && priceValue <= 2;
              case '₹2 Cr+':
                  return priceValue > 2;
              default:
                  return true;
          }
      }
      
      // Filter by property type if selected
      if (type && property.type !== type) {
          return false;
      }
      
      return true;
  });
}
// Create property cards
function createPropertyCard(property) {
  const card = document.createElement('div');
  card.className = 'property-card bg-white rounded-lg shadow-md overflow-hidden animate__animated animate__fadeIn';
  
  // Debug image URL
  console.log("Creating card with image URL:", property.image);
  
  card.innerHTML = `
    <div class="relative">
      ${property.isNew ? '<span class="property-tag">NEW</span>' : ''}
      <img src="${property.image}" alt="${property.title}" class="w-full h-48 object-cover" onerror="this.src='https://source.unsplash.com/random/300x200/?apartment,house&sig=${Math.random()}'">
      <div class="property-actions">
        <span class="action-btn"><i class="far fa-heart text-red-500"></i></span>
        <span class="action-btn"><i class="fas fa-share-alt text-blue-500"></i></span>
      </div>
    </div>
    <div class="p-4">
      <h3 class="text-lg font-bold mb-2 text-gray-800">${property.title}</h3>
      <p class="text-sm text-gray-600 mb-2"><i class="fas fa-map-marker-alt mr-1"></i> ${property.location}</p>
      <div class="flex flex-wrap gap-3 mb-3 text-sm text-gray-700">
        <span><i class="fas fa-bed mr-1"></i> ${property.bhk} BHK</span>
        <span><i class="fas fa-vector-square mr-1"></i> ${property.area}</span>
        <span><i class="fas fa-building mr-1"></i> ${property.type}</span>
      </div>
      <div class="flex justify-between items-center mt-3">
        <span class="text-lg font-bold text-green-600">${property.price}</span>
        <button class="contact-btn">Contact Agent</button>
      </div>
    </div>
  `;
  
  // Add an event listener to debug the image loading
  const img = card.querySelector('img');
  img.addEventListener('load', function() {
    console.log("Image loaded successfully:", this.src);
  });
  
  img.addEventListener('error', function() {
    console.error("Image failed to load:", this.src);
    // Fallback to a placeholder
    this.src = `https://source.unsplash.com/random/300x200/?apartment,house&sig=${Math.random()}`;
  });
  
  return card;
}

// Render properties with pagination
function renderProperties() {
  propertyContainer.innerHTML = '';
  const filteredProperties = filterProperties();
  
  if (filteredProperties.length === 0) {
    propertyContainer.innerHTML = `
      <div class="col-span-3 text-center py-10">
        <h3 class="text-xl font-bold mb-2">No properties found</h3>
        <p class="text-gray-600">Try changing your filters to see more results</p>
      </div>
    `;
    paginationContainer.innerHTML = '';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredProperties.length / propertiesPerPage);
  const startIndex = (currentPage - 1) * propertiesPerPage;
  const endIndex = Math.min(startIndex + propertiesPerPage, filteredProperties.length);
  
  // Get the current page properties
  const currentProperties = filteredProperties.slice(startIndex, endIndex);
  
  // Display the properties
  currentProperties.forEach(property => {
    const propertyCard = createPropertyCard(property);
    propertyContainer.appendChild(propertyCard);
  });
  
  // Add animation classes with delay for each card
  const cards = document.querySelectorAll('.animate__fadeIn');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add('animate__animated');
    }, index * 100);
  });
  
  // Render pagination
  renderPagination(totalPages);
}

// Render pagination controls
function renderPagination(totalPages) {
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) {
    return;
  }
  
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'flex items-center justify-center space-x-2 mt-4';
  
  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo; Prev';
    prevBtn.className = 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderProperties();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(prevBtn);
  }
  
  // Page numbers
  const maxDisplayedPages = 5; // Maximum number of page buttons to show
  let startPage = Math.max(1, currentPage - Math.floor(maxDisplayedPages / 2));
  let endPage = Math.min(totalPages, startPage + maxDisplayedPages - 1);
  
  // Adjust startPage if we're near the end
  if (endPage - startPage + 1 < maxDisplayedPages) {
    startPage = Math.max(1, endPage - maxDisplayedPages + 1);
  }
  
  // First page
  if (startPage > 1) {
    const firstPageBtn = document.createElement('button');
    firstPageBtn.textContent = '1';
    firstPageBtn.className = 'px-3 py-1 rounded hover:bg-gray-300';
    firstPageBtn.addEventListener('click', () => {
      currentPage = 1;
      renderProperties();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(firstPageBtn);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.className = 'px-2';
      paginationDiv.appendChild(ellipsis);
    }
  }
  
  // Page buttons
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.className = i === currentPage 
      ? 'px-3 py-1 bg-blue-600 text-white rounded' 
      : 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300';
    
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      renderProperties();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(pageBtn);
  }
  
  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.className = 'px-2';
      paginationDiv.appendChild(ellipsis);
    }
    
    const lastPageBtn = document.createElement('button');
    lastPageBtn.textContent = totalPages;
    lastPageBtn.className = 'px-3 py-1 rounded hover:bg-gray-300';
    lastPageBtn.addEventListener('click', () => {
      currentPage = totalPages;
      renderProperties();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(lastPageBtn);
  }

  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next &raquo;';
    nextBtn.className = 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      renderProperties();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(nextBtn);
  }
  
  paginationContainer.appendChild(paginationDiv);
}

// Event Listeners
searchBtn.addEventListener('click', () => {
  const selectedCity = cityInput.value;
  
  // Create filter object based on selections
  const filters = {};
  
  if (bhkSelect.value) {
    filters.bhk = bhkSelect.value;
  }
  
  // Fetch filtered properties
  fetchPropertiesForCity(selectedCity, filters);
});

// Login Modal
loginBtn.addEventListener('click', () => {
  loginModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
});

closeLogin.addEventListener('click', () => {
  loginModal.style.display = 'none';
  document.body.style.overflow = 'auto';
});

// Close modal when clicking outside
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

// OTP flow
sendOtpBtn.addEventListener('click', () => {
  const mobile = mobileInput.value.trim();
  if (mobile && mobile.length === 10) {
    const otpContainer = document.querySelector('#loginModal div.hidden');
    otpContainer.classList.remove('hidden');
    sendOtpBtn.textContent = 'Resend OTP';
    // Simulate OTP sent
    alert('OTP sent to ' + mobile);
  } else {
    alert('Please enter a valid 10-digit mobile number');
  }
});

verifyOtpBtn.addEventListener('click', () => {
  const otp = otpInput.value.trim();
  if (otp && otp.length === 4) {
    alert('Login successful!');
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    // Update login button to show logged in state
    loginBtn.innerHTML = '<i class="fas fa-user-circle"></i> My Account';
  } else {
    alert('Please enter a valid OTP');
  }
});

// Add this function to debug image loading issues
function debugImageLoading() {
  // Select all property images
  const propertyImages = document.querySelectorAll('.property-card img');
  
  console.log(`Found ${propertyImages.length} property images`);
  
  // Check each image
  propertyImages.forEach((img, index) => {
    console.log(`Image ${index + 1}:`, {
      src: img.src,
      naturalWidth: img.naturalWidth, // Will be 0 if image failed to load
      complete: img.complete,
      alt: img.alt
    });
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Fetch available cities from the backend
  fetchCities();
  
  // Add a button to debug images
  const debugBtn = document.createElement('button');
  debugBtn.textContent = 'Debug Images';
  debugBtn.className = 'fixed bottom-4 right-4 bg-gray-700 text-white px-3 py-1 rounded z-50';
  debugBtn.addEventListener('click', debugImageLoading);
  document.body.appendChild(debugBtn);
});