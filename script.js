// DOM Elements
const indexSelector = document.getElementById('indexSelector');
const expiryDateSelector = document.getElementById('expiryDateSelector');
const currentIndexValue = document.getElementById('currentIndexValue');
const themeToggle = document.getElementById('themeToggle');
const historicalDataBtn = document.getElementById('historicalDataBtn');
const closeDrawer = document.getElementById('closeDrawer');
const historicalDataDrawer = document.getElementById('historicalDataDrawer');
const optionsChainBody = document.getElementById('optionsChainBody');
const graphContainer = document.getElementById('graphContainer');
const closeGraph = document.getElementById('closeGraph');
const graphStrike = document.getElementById('graphStrike');
const oiChangeGraph = document.getElementById('oiChangeGraph');

// Chart.js instance
let chart = null;

// Global variables
let mockOptionChainData = {};
let currentIndex = 'NIFTY';
let isLiveMode = true; // Flag to control live updates
const trendData = {
    callVolumeTrend: 'up',
    putVolumeTrend: 'up',
    callOITrend: 'up',
    putOITrend: 'up',
    callOIChangeTrend: 'up',
    putOIChangeTrend: 'up'
};

// Historical data for playback
let historicalData = {};

// Current state
let currentExpiry = 'current';
let playbackInterval = null;
let currentPlaybackMinute = 0; // Track current minute for pause/resume

// Zoom functionality for options chain
let currentZoomLevel = 100;
const zoomStep = 2; // Smaller step for more gradual zoom
const minZoom = 70;
const maxZoom = 150;

// Initialize mock data immediately
initMockData();

function initZoomControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    const optionsChainTable = document.getElementById('optionsChainTable');
    const optionsChainContainer = document.querySelector('.options-chain-container');

    // Zoom in button
    zoomInBtn.addEventListener('click', () => {
        if (currentZoomLevel < maxZoom) {
            currentZoomLevel += zoomStep;
            applyZoom();
        }
    });

    // Zoom out button
    zoomOutBtn.addEventListener('click', () => {
        if (currentZoomLevel > minZoom) {
            currentZoomLevel -= zoomStep;
            applyZoom();
        }
    });

    // Reset zoom button
    resetZoomBtn.addEventListener('click', () => {
        currentZoomLevel = 100;
        applyZoom();
    });

    // Apply zoom function
    function applyZoom() {
        zoomLevelDisplay.textContent = `${currentZoomLevel}%`;
        
        // Apply zoom to table font size
        const baseFontSize = {
            th: 0.8,     // Base font size for headers in rem
            td: 0.75     // Base font size for data cells in rem
        };
        
        const zoomFactor = currentZoomLevel / 100;
        
        // Center the table with CSS transform instead of padding
        optionsChainContainer.style.transform = `scale(${zoomFactor})`;
        optionsChainContainer.style.transformOrigin = 'center top';
        
        // Adjust container height to accommodate the zoomed content
        if (zoomFactor > 1) {
            // Adjust the height to fit the zoomed content
            optionsChainContainer.style.height = `calc((100vh - 120px) * ${zoomFactor})`;
            // Reset container width to ensure equal space on both sides
            optionsChainContainer.style.width = '100%';
            optionsChainTable.style.width = '100%';
            optionsChainTable.style.margin = '0 auto';
        } else {
            // Reset height for normal or smaller zoom
            optionsChainContainer.style.height = 'calc(100vh - 120px)';
            optionsChainContainer.style.paddingRight = '0';
            optionsChainTable.style.width = '100%';
        }
        
        // Apply to headers
        const headers = optionsChainTable.querySelectorAll('th');
        headers.forEach(header => {
            header.style.fontSize = `${baseFontSize.th * zoomFactor}rem`;
            
            // Adjust padding based on zoom
            const paddingValue = 0.5 * zoomFactor;
            header.style.padding = `${paddingValue}rem`;
        });
        
        // Apply to data cells
        const cells = optionsChainTable.querySelectorAll('td');
        cells.forEach(cell => {
            cell.style.fontSize = `${baseFontSize.td * zoomFactor}rem`;
            
            // Adjust padding based on zoom
            const paddingValue = 0.4 * zoomFactor;
            cell.style.padding = `${paddingValue}rem`;
        });
        
        // Make sure the container is properly scrollable in both directions
        optionsChainContainer.style.overflowX = 'auto';
        optionsChainContainer.style.overflowY = 'auto';
    }
    
    // Add mouse wheel zoom support
    optionsChainContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey) { // Only zoom if Ctrl key is pressed
            e.preventDefault();
            if (e.deltaY < 0 && currentZoomLevel < maxZoom) {
                // Zoom in
                currentZoomLevel += zoomStep;
                applyZoom();
            } else if (e.deltaY > 0 && currentZoomLevel > minZoom) {
                // Zoom out
                currentZoomLevel -= zoomStep;
                applyZoom();
            }
        }
    }, { passive: false });
    
    // Apply initial zoom
    applyZoom();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed, setting up options chain app");
    
    // Apply saved theme preference if available
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = 'fas fa-sun';
        }
    }
    
    // Try to get optionsChainTable
    const optionsChainTable = document.getElementById('optionsChainTable');
    if (!optionsChainTable) {
        console.error("Critical Error: Cannot find options chain table!");
        return;
    }
    
    // Create the headers for the options chain table
    createTableHeaders();
    
    // Set the current index to NIFTY (default)
    currentIndex = 'NIFTY';
    
    // Add event handler for index selector
    const indexSelector = document.getElementById('indexSelector');
    if (indexSelector) {
        indexSelector.addEventListener('change', function() {
            currentIndex = this.value; // Use string value as key (NIFTY or BANKNIFTY)
            console.log("Index changed to:", currentIndex);
            
            // Update expiry dropdown for the new symbol
            populateExpiryDropdown();
            
            // Update UI with new info
            updateSymbolInfo(this.value, mockOptionChainData[currentIndex].spotPrice);
            
            // Render options chain with new data
            renderOptionsChain(mockOptionChainData[currentIndex]);
            
            // Update arrows in column headers
            updateColumnHeaders();
        });
    }
    
    // Add event handler for expiry date selector
    const expiryDateSelector = document.getElementById('expiryDateSelector');
    if (expiryDateSelector) {
        expiryDateSelector.addEventListener('change', function() {
            currentExpiry = this.value;
            console.log("Expiry changed to:", currentExpiry);
            
            // For now we use the same data since this is a mock implementation
            // In a real implementation, we would fetch data for the specific expiry date
            
            // Render options chain with current data
            renderOptionsChain(mockOptionChainData[currentIndex]);
            
            // Update arrows in column headers
            updateColumnHeaders();
        });
    }
    
    // Populate the expiry dropdown based on the current symbol
    populateExpiryDropdown();
    
    // Update the symbol information based on the current data
    updateSymbolInfo(
        currentIndex,
        mockOptionChainData[currentIndex].spotPrice
    );
    
    // Render the options chain with the current data
    renderOptionsChain(mockOptionChainData[currentIndex]);
    
    // Add event listeners for various UI elements
    addTableEventListeners();
    
    // Set up other UI elements
    setupResizablePane();
    setupPlaybackControls();
    setupVolumeOIToggle();
    
    // Set up event listeners for UI controls
    setupEventListeners();
    
    // Start live data simulation
    startLiveDataSimulation();
    
    console.log("Options chain application setup complete!");
});

// Force initial arrows to show for testing
function forceInitialArrows() {
    // Set test trend data
    trendData.callVolumeTrend = 'up';
    trendData.putVolumeTrend = 'up';
    trendData.callOITrend = 'down';
    trendData.putOITrend = 'up';
    trendData.callOIChangeTrend = 'up';
    trendData.putOIChangeTrend = 'down';
    
    // Show arrows directly
    const allHeaders = [
        'callOIChangeHeader', 'callOIHeader', 'callVolumeHeader',
        'putVolumeHeader', 'putOIHeader', 'putOIChangeHeader'
    ];
    
    allHeaders.forEach(headerId => {
        const header = document.getElementById(headerId);
        if (header) {
            const upArrow = header.querySelector('.fixed-arrow-up');
            const downArrow = header.querySelector('.fixed-arrow-down');
            
            if (upArrow && downArrow) {
                // By default both are hidden
                upArrow.style.display = 'none';
                downArrow.style.display = 'none';
                
                // Show based on predefined patterns for test
                if (headerId.includes('Volume') || headerId === 'callOIChangeHeader' || headerId === 'putOIHeader') {
                    upArrow.style.display = 'inline-block';
                } else {
                    downArrow.style.display = 'inline-block';
                }
            }
        }
    });
}

// Theme toggle functionality
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        if (document.body.classList.contains('dark-mode')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
    
    // Store theme preference in localStorage for persistence
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
    
    console.log(`Theme toggled to ${isDarkMode ? 'dark' : 'light'} mode`);
}

// Historical data drawer toggle
function toggleHistoricalDataDrawer() {
    historicalDataDrawer.classList.toggle('open');
    if (historicalDataDrawer.classList.contains('open')) {
        isLiveMode = false;
        populateHistoricalDates();
    } else {
        isLiveMode = true;
        renderOptionsChain(mockOptionChainData[currentIndex]);
    }
}

// Handle index change
function handleIndexChange() {
    currentIndex = indexSelector.value;
    updateIndexInfo();
    populateExpiryDates();
    renderOptionsChain(mockOptionChainData[currentIndex]);
}

// Handle expiry date change
function handleExpiryChange() {
    currentExpiry = expiryDateSelector.value;
    renderOptionsChain(mockOptionChainData[currentIndex]);
}

// Populate expiry dates in the dropdown
function populateExpiryDates() {
    // Clear existing options except the first one
    while (expiryDateSelector.options.length > 1) {
        expiryDateSelector.remove(1);
    }
    
    // Add new options
    const dates = mockOptionChainData[currentIndex].expiryDates;
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        expiryDateSelector.appendChild(option);
    });
}

// Update the index information
function updateIndexInfo() {
    const data = mockOptionChainData[currentIndex];
    currentIndexValue.textContent = data.spotPrice.toLocaleString();
    document.getElementById('spotPriceDisplay').textContent = data.spotPrice.toLocaleString();
    const changeElement = document.querySelector('.change-value');
    changeElement.textContent = `${data.change} ${data.percentChange}`;
    changeElement.className = 'change-value';
    changeElement.classList.add(parseFloat(data.change) >= 0 ? 'green' : 'red');
}

// Update column headers with trend indicators
function updateColumnHeaders() {
    console.log("Updating column headers with trend indicators");
    
    // Get the header elements
    const callVolumeHeader = document.getElementById('callVolumeHeader');
    const callOIHeader = document.getElementById('callOIHeader');
    const callOIChangeHeader = document.getElementById('callOIChangeHeader');
    const putVolumeHeader = document.getElementById('putVolumeHeader');
    const putOIHeader = document.getElementById('putOIHeader');
    const putOIChangeHeader = document.getElementById('putOIChangeHeader');
    
    if (!callVolumeHeader || !callOIHeader || !callOIChangeHeader || 
        !putVolumeHeader || !putOIHeader || !putOIChangeHeader) {
        console.error("Some header elements not found");
        return;
    }
    
    // Update the CALL side arrows
    updateHeaderArrows(callVolumeHeader, trendData.callVolumeTrend);
    updateHeaderArrows(callOIHeader, trendData.callOITrend);
    updateHeaderArrows(callOIChangeHeader, trendData.callOIChangeTrend);
    
    // Update the PUT side arrows
    updateHeaderArrows(putVolumeHeader, trendData.putVolumeTrend);
    updateHeaderArrows(putOIHeader, trendData.putOITrend);
    updateHeaderArrows(putOIChangeHeader, trendData.putOIChangeTrend);
}

// Helper function to update header arrows
function updateHeaderArrows(headerElement, trend) {
    if (!headerElement) return;
    
    const upArrow = headerElement.querySelector('.fixed-arrow-up');
    const downArrow = headerElement.querySelector('.fixed-arrow-down');
    
    if (!upArrow || !downArrow) {
        console.error(`Arrows not found in header: ${headerElement.id}`);
        return;
    }
    
    // OPTIMIZATION: Check if we're already in the correct state to avoid unnecessary DOM updates
    const currentState = upArrow.style.display === 'inline-block' ? 'up' : 
                         downArrow.style.display === 'inline-block' ? 'down' : 'none';
    
    // Only update DOM if the trend has actually changed
    if (currentState !== trend) {
        // Make sure arrows are inside a span with fixed dimensions
        const span = headerElement.querySelector('span');
        if (span) {
            // Set fixed width and height to prevent layout shifts
            span.style.width = '20px';
            span.style.height = '18px';
            span.style.float = 'left';
            span.style.marginRight = '5px';
            span.style.display = 'inline-block';
            span.style.verticalAlign = 'middle';
            // Force to take space even when arrows are hidden
            span.style.position = 'relative';
        }
        
        if (trend === 'up') {
            upArrow.style.display = 'inline-block';
            downArrow.style.display = 'none';
        } else if (trend === 'down') {
            upArrow.style.display = 'none';
            downArrow.style.display = 'inline-block';
        } else {
            upArrow.style.display = 'none';
            downArrow.style.display = 'none';
        }
    }
}

// Add a scroll performance optimizing function
function optimizeScrolling() {
    const container = document.querySelector('.options-chain-container');
    if (!container) return;
    
    let scrollTimeout;
    let isScrolling = false;
    let isRefreshing = false; // Add flag to prevent multiple refreshes
    
    // Add scroll event listener
    container.addEventListener('scroll', function() {
        if (!isScrolling) {
            isScrolling = true;
            container.classList.add('is-scrolling');
            document.body.classList.add('is-scrolling');
        }
        
        // Clear the timeout if it's set
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // Save current scroll position for more accurate restoration
        container.dataset.currentScrollPos = container.scrollTop.toString();
        
        // Set a timeout to detect when scrolling stops
        scrollTimeout = setTimeout(function() {
            isScrolling = false;
            container.classList.remove('is-scrolling');
            document.body.classList.remove('is-scrolling');
            
            // Save the visible strike price when scrolling stops
            saveCurrentViewPosition(container);
        }, 250); // Increased timing to ensure proper debounce
    }, { passive: true }); // Use passive listener for better performance
    
    // Override default scroll restoration behavior for smoother experience
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
}

// Render the options chain table based on the current data
function renderOptionsChain(optionData) {
    console.log("Rendering options chain with correct data structure...", optionData);
    
    if (!optionData) {
        console.error("Error: optionData is undefined or null:", optionData);
        console.log("Current index:", currentIndex);
        console.log("Available mockOptionChainData keys:", Object.keys(mockOptionChainData));
        // Try to recover by using directly from mockOptionChainData
        optionData = mockOptionChainData[currentIndex];
        if (!optionData) {
            console.error("Cannot recover from missing data. Regenerating mock data...");
            // Try regenerating mock data
            initMockData();
            optionData = mockOptionChainData[currentIndex];
            if (!optionData) {
                console.error("Critical failure: Cannot generate mock data");
                return;
            }
        }
    }
    
    // Get spot price
    const spotPrice = optionData.spotPrice;
    console.log("Spot price:", spotPrice);
    
    // Check if strikes exist
    if (!optionData.strikes || !Array.isArray(optionData.strikes) || optionData.strikes.length === 0) {
        console.error("No strikes data available:", optionData);
        return;
    }
    
    // Check if tbody exists
    const tableBody = document.getElementById('optionsChainTable').querySelector('tbody');
    if (!tableBody) {
        console.error("Error: Cannot find tbody in optionsChainTable");
        return;
    }
    
    // THIS IS CRITICAL - Save current scroll position BEFORE any DOM changes
    const container = document.querySelector('.options-chain-container');
    let savedScrollPos = 0;
    let scrollTopPercentage = 0;
    let visibleATMRow = null;
    
    if (container) {
        // IMPORTANT: Save both absolute position and percentage for reliability
        savedScrollPos = container.scrollTop;
        scrollTopPercentage = savedScrollPos / (container.scrollHeight - container.clientHeight);
        console.log("Saving scroll positions - absolute:", savedScrollPos, "percentage:", scrollTopPercentage);
        
        // Also find which row is currently visible in center (as another fallback)
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        
        // Find currently visible ATM row if any
        visibleATMRow = document.querySelector('.atm-row');
        if (visibleATMRow) {
            // Measure distance from top
            const rowRect = visibleATMRow.getBoundingClientRect();
            const rowDistanceFromTop = rowRect.top - containerRect.top;
            // Save this position as a percentage of container height
            container.dataset.atmRowPosition = (rowDistanceFromTop / containerRect.height).toString();
            console.log("Saving ATM row position:", container.dataset.atmRowPosition);
        }
        
        // Performance optimization: temporarily block UI 
        // to prevent interaction during render
        container.classList.add('is-scrolling');
        document.body.classList.add('is-scrolling');
        
        // Disable smooth scrolling temporarily to prevent scroll jumping
        container.style.scrollBehavior = 'auto';
    }
    
    // Create a document fragment for batch DOM operations
    const fragment = document.createDocumentFragment();
    
    // Create a reference to the original table before clearing
    const clonedTable = tableBody.cloneNode(true);
    const oldRows = Array.from(clonedTable.querySelectorAll('tr'));
    
    // Find ATM index (the strike price closest to the spot price)
    const atmIndex = optionData.strikes.findIndex(s => s.strike >= spotPrice);
    console.log(`ATM strike index: ${atmIndex}, ATM strike: ${optionData.strikes[atmIndex].strike}`);
    
    // Remove ATM border functionality
    localStorage.removeItem('fixedBorderStrike');
    let atmBorderIndex = null;
    
    // Use ATM strike price without border
    if (atmIndex > 0 && optionData.strikes[atmIndex] && optionData.strikes[atmIndex-1]) {
        // Just calculate the ATM strike prices without setting a border
        const atmStrike = optionData.strikes[atmIndex].strike;
    } else {
        // No special border handling
    }
    
    console.log(`ATM strike index: ${atmIndex}, ATM strike: ${optionData.strikes[atmIndex].strike}`);
    
    // Calculate how many rows to show on each side of ATM
    const rowsPerSide = 35; // Equal number of rows above and below ATM
    
    // Calculate start and end indices to ensure equal number of strikes above and below ATM
    const startIndex = Math.max(0, atmIndex - rowsPerSide);
    const endIndex = Math.min(optionData.strikes.length, atmIndex + rowsPerSide + 1);
    
    console.log(`Displaying strikes from index ${startIndex} to ${endIndex-1}`);
    console.log(`Rows below ATM: ${atmIndex - startIndex}, Rows above ATM: ${endIndex - atmIndex - 1}`);
    
    // If we want to preserve the exact view the user was looking at
    let userViewStrikePrice = null;
    if (container && container.dataset.lastViewedStrike) {
        userViewStrikePrice = parseFloat(container.dataset.lastViewedStrike);
        console.log("User was viewing strike price:", userViewStrikePrice);
    }

    // IMPORTANT: Don't clear the table before creating all new rows
    // This helps avoid flashing and better preserves scroll position
    
    let atmRow = null;
    const newRows = [];
    
    // For each visible strike price, create a row in the table
    for (let i = startIndex; i < endIndex; i++) {
        const strike = optionData.strikes[i];
        if (!strike) {
            console.error(`Missing strike data at index ${i}`);
            continue;
        }
        
        const row = document.createElement('tr');
        newRows.push(row);
        
        // Mark the ATM row specially
        if (i === atmIndex) {
            row.classList.add('atm-row');
            row.setAttribute('id', 'atm-row'); // Add ID for easy selection
            atmRow = row;
        }
        
        // Mark if this is the user's last viewed row
        if (userViewStrikePrice && Math.abs(strike.strike - userViewStrikePrice) < 1) {
            row.classList.add('last-viewed-row');
            row.setAttribute('data-last-viewed', 'true');
        }
        
        try {
            // CALL side columns
            appendCallData(row, strike.call, strike.strike);
            
            // CENTER column - Strike Price
            const strikePriceCell = document.createElement('td');
            strikePriceCell.textContent = strike.strike;
            strikePriceCell.classList.add('strike-price');
            row.setAttribute('data-strike', strike.strike);
            
            // If this is the ATM row, add strike class immediately
            if (i === atmIndex) {
                strikePriceCell.classList.add('atm-strike');
            }
            
            row.appendChild(strikePriceCell);
            
            // PUT side columns
            appendPutData(row, strike.put, strike.strike);
            
            // Add the completed row to the fragment
            fragment.appendChild(row);
        } catch (error) {
            console.error(`Error creating row for strike ${strike.strike}:`, error);
        }
    }
    
    // IMPORTANT: Now clear the table and add all rows at once
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
    
    // Directly apply ATM highlighting without waiting for highlightITM
    if (atmRow) {
        const atmCells = atmRow.querySelectorAll('td');
        atmCells.forEach(cell => {
            cell.classList.add('atm-cell');
        });
    }
    
    // Highlight in-the-money options after rendering all rows
    highlightITM(spotPrice);
    
    // CRITICAL: Immediately restore scroll position with multiple fallback strategies
    if (container) {
        // Disable smooth scrolling temporarily during scroll restoration
        const originalScrollBehavior = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';
        
        // Use requestAnimationFrame to ensure DOM has updated before we scroll
        requestAnimationFrame(() => {
            // FIRST APPROACH: Try to restore to exact scroll position
            container.scrollTop = savedScrollPos;
            
            // Use a single setTimeout to apply any fallback method if needed
            // This prevents multiple scroll adjustments competing with each other
            setTimeout(() => {
                // Only try fallback if first approach was off by more than 50px
                if (Math.abs(container.scrollTop - savedScrollPos) > 50) {
                    let restoreMethod = "direct"; // Default
                    
                    // SECOND APPROACH: If we find a specific strike price user was viewing, scroll to it
                    const lastViewedRow = document.querySelector('[data-last-viewed="true"]');
                    if (lastViewedRow) {
                        // Use scrollIntoView which is more reliable than calculating offsets
                        lastViewedRow.scrollIntoView({ block: 'center', behavior: 'auto' });
                        restoreMethod = "last-viewed-row";
                    }
                    // THIRD APPROACH: If direct scrollTop failed and no last viewed row, try percentage
                    else if (scrollTopPercentage > 0) {
                        const newScrollTop = scrollTopPercentage * (container.scrollHeight - container.clientHeight);
                        container.scrollTop = newScrollTop;
                        restoreMethod = "percentage";
                    }
                    
                    console.log("Restored scroll position using method:", restoreMethod);
                } else {
                    console.log("Restored scroll position using direct method");
                }
                
                // Save the strike price that's currently in the center of view
                saveCurrentViewPosition(container);
                
                // Release the scrolling lock 
                container.classList.remove('is-scrolling');
                document.body.classList.remove('is-scrolling');
                
                // Restore original scroll behavior
                container.style.scrollBehavior = originalScrollBehavior;
            }, 50); // Single delay to apply fallback
        });
    }
    
    // Force ATM highlighting and ensure ATM row is visible
    setTimeout(() => {
        // Make sure ATM cells are highlighted
        const atmRow = document.querySelector('.atm-row');
        if (atmRow) {
            const atmCells = atmRow.querySelectorAll("td");
            atmCells.forEach(cell => {
                cell.classList.add("atm-cell");
            });
            
            // Make sure ATM border is on the correct row (two strikes below ATM)
            if (!document.querySelector('.atm-border') && atmBorderRow) {
                // Remove any existing borders first
                document.querySelectorAll('.atm-border').forEach(row => {
                    row.classList.remove('atm-border');
                });
                
                // Add border to the correct row
                atmBorderRow.classList.add('atm-border');
            }
            
            // Only scroll if explicitly requested by the user
            if (document.getElementById('scrollToATMBtn').dataset.userRequested === 'true') {
                scrollToATM();
                document.getElementById('scrollToATMBtn').dataset.userRequested = 'false';
            }
        }
    }, 300);
    
    // After rendering, perform final adjustments
    setTimeout(() => {
        console.log("Running final safety check...");
        ensureCorrectDataInVolumeCells();
        
        // Disable automatic scroll restoration to prevent unwanted scrolling
        if (container) {
            // Only check if we're still far off from user's intended position
            if (userViewStrikePrice && Math.abs(container.scrollTop - savedScrollPos) > 100) {
                // Try once more with the original position
                container.scrollTop = savedScrollPos;
                console.log("Last resort scroll correction applied");
            }
            
            // Store the current scroll position for future reference
            container.dataset.lastScrollPos = container.scrollTop.toString();
            
            // Re-enable smooth scrolling for future interactions
            setTimeout(() => {
                container.style.scrollBehavior = 'smooth';
                container.classList.remove('is-scrolling');
                document.body.classList.remove('is-scrolling');
            }, 300);
        }
    }, 50);
    
    // Add click handlers to volume cells after rendering
    addVolumeClickHandlers();
}

// Save which strike price is currently in center view
function saveCurrentViewPosition(container) {
    if (!container) return;
    
    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerCenterY = containerRect.top + containerRect.height / 2;
    
    // Find all rows
    const rows = container.querySelectorAll('#optionsChainTable tbody tr');
    if (!rows.length) return;
    
    // Find which row is closest to the center of the container
    let closestRow = null;
    let minDistance = Number.MAX_VALUE;
    
    rows.forEach(row => {
        const rowRect = row.getBoundingClientRect();
        const rowCenterY = rowRect.top + rowRect.height / 2;
        const distance = Math.abs(rowCenterY - containerCenterY);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestRow = row;
        }
    });
    
    // Save the strike price of the center row
    if (closestRow) {
        const strikePrice = closestRow.getAttribute('data-strike');
        if (strikePrice) {
            container.dataset.lastViewedStrike = strikePrice;
            console.log("Saved current view position at strike:", strikePrice);
        }
    }
}

// Append call data to the row
function appendCallData(row, callData, strikePrice) {
    console.log(`Appending CALL data for strike price ${strikePrice} with volume ${callData.volume}`);
    
    // Create all the cells in screenshot order
    const ivCell = document.createElement('td');
    ivCell.textContent = callData.iv + '%';
    
    const deltaCell = document.createElement('td');
    deltaCell.textContent = callData.delta;
    
    const gammaCell = document.createElement('td');
    gammaCell.textContent = callData.gamma;
    
    const thetaCell = document.createElement('td');
    thetaCell.textContent = callData.theta;
    
    const vegaCell = document.createElement('td');
    vegaCell.textContent = callData.vega;
    
    const ltpCell = document.createElement('td');
    ltpCell.textContent = callData.ltp;
    
    const oiChangeCell = document.createElement('td');
    oiChangeCell.textContent = formatNumber(callData.changeOI);
    oiChangeCell.classList.add('oi-change-cell');
    oiChangeCell.dataset.value = callData.changeOI;
    oiChangeCell.dataset.type = 'oiChange';
    oiChangeCell.dataset.side = 'call';
    
    const oiCell = document.createElement('td');
    oiCell.textContent = formatNumber(callData.oi);
    oiCell.classList.add('oi-cell');
    oiCell.dataset.value = callData.oi;
    oiCell.dataset.type = 'oi';
    oiCell.dataset.side = 'call';
    
    const volumeCell = document.createElement('td');
    volumeCell.textContent = formatNumber(callData.volume);
    volumeCell.classList.add('volume-cell', 'call-volume');
    volumeCell.dataset.value = callData.volume;
    volumeCell.dataset.type = 'volume';
    volumeCell.dataset.side = 'call';
    volumeCell.dataset.strike = strikePrice;
    
    // Append cells in the correct order
    row.appendChild(ivCell);
    row.appendChild(deltaCell);
    row.appendChild(gammaCell);
    row.appendChild(thetaCell);
    row.appendChild(vegaCell);
    row.appendChild(ltpCell);
    row.appendChild(oiChangeCell);
    row.appendChild(oiCell);
    row.appendChild(volumeCell);
}

// Append put data to the row
function appendPutData(row, putData, strikePrice) {
    console.log(`Appending PUT data for strike price ${strikePrice} with volume ${putData.volume}`);
    
    // Create all the cells in screenshot order
    const volumeCell = document.createElement('td');
    volumeCell.textContent = formatNumber(putData.volume);
    volumeCell.classList.add('volume-cell', 'put-volume');
    volumeCell.dataset.value = putData.volume;
    volumeCell.dataset.type = 'volume';
    volumeCell.dataset.side = 'put';
    volumeCell.dataset.strike = strikePrice;
    
    const oiCell = document.createElement('td');
    oiCell.textContent = formatNumber(putData.oi);
    oiCell.classList.add('oi-cell');
    oiCell.dataset.value = putData.oi;
    oiCell.dataset.type = 'oi';
    oiCell.dataset.side = 'put';
    
    const oiChangeCell = document.createElement('td');
    oiChangeCell.textContent = formatNumber(putData.changeOI);
    oiChangeCell.classList.add('oi-change-cell');
    oiChangeCell.dataset.value = putData.changeOI;
    oiChangeCell.dataset.type = 'oiChange';
    oiChangeCell.dataset.side = 'put';
    
    const ltpCell = document.createElement('td');
    ltpCell.textContent = putData.ltp;
    
    const vegaCell = document.createElement('td');
    vegaCell.textContent = putData.vega;
    
    const thetaCell = document.createElement('td');
    thetaCell.textContent = putData.theta;
    
    const gammaCell = document.createElement('td');
    gammaCell.textContent = putData.gamma;
    
    const deltaCell = document.createElement('td');
    deltaCell.textContent = putData.delta;
    
    const ivCell = document.createElement('td');
    ivCell.textContent = putData.iv + '%';
    
    // Append all cells in correct order
    row.appendChild(volumeCell);
    row.appendChild(oiCell);
    row.appendChild(oiChangeCell);
    row.appendChild(ltpCell);
    row.appendChild(vegaCell);
    row.appendChild(thetaCell);
    row.appendChild(gammaCell);
    row.appendChild(deltaCell);
    row.appendChild(ivCell);
}

// Format numbers with commas and + sign for positive values
function formatNumber(num) {
    if (num === undefined || num === null) {
        console.error("Trying to format undefined or null number");
        return "0";
    }
    
    if (typeof num !== 'number') {
        console.error("Invalid number format:", num, typeof num);
        // Try to convert to number
        num = parseFloat(num);
        if (isNaN(num)) {
            return "0";
        }
    }
    
    // Format with commas
    return num.toLocaleString();
}

// Highlight in-the-money options
function highlightITM(spotPrice) {
    console.log("Highlighting ITM options for spot price:", spotPrice);
    
    if (!spotPrice) {
        console.error("No spot price provided for ITM highlighting");
        return;
    }

    // Clear previous ITM highlights
    const tdElements = document.querySelectorAll("td.call-itm, td.put-itm");
    tdElements.forEach(td => {
        td.classList.remove("call-itm", "put-itm");
    });

    // Find the row with the ATM class
    const atmRow = document.querySelector(".atm-row");
    if (atmRow) {
        console.log("Processing designated ATM row");
        
        // Get the strike price from this row
        const strikeCell = atmRow.querySelector(".strike-price");
        if (strikeCell) {
            const atmStrike = parseFloat(strikeCell.textContent.trim());
            console.log("ATM strike price:", atmStrike);
            
            // Add special highlighting to the strike price cell
            strikeCell.classList.add("atm-strike");
        }
        
        // Add highlighting to all cells in the ATM row
        const atmCells = atmRow.querySelectorAll("td");
        atmCells.forEach(cell => {
            cell.classList.add("atm-cell");
        });

        // Don't auto-scroll to ATM row to prevent unwanted scrolling
        // The scrollToATM function will be called manually when needed
    } else {
        // Find the closest strike price to spot price (ATM) as fallback
        const strikePrices = Array.from(document.querySelectorAll(".strike-price"))
            .map(strikeCell => {
                return {
                    cell: strikeCell,
                    price: parseFloat(strikeCell.textContent.trim()),
                    diff: Math.abs(parseFloat(strikeCell.textContent.trim()) - spotPrice)
                };
            });

        if (strikePrices.length === 0) {
            console.error("No strike prices found for ITM highlighting");
            return;
        }

        // Sort by closest to spot price
        strikePrices.sort((a, b) => a.diff - b.diff);
        
        // Get the closest strike cell (ATM)
        const atmStrikeCell = strikePrices[0].cell;
        
        // Add ATM class to the row (but not the border which is managed separately)
        const atmRowFallback = atmStrikeCell.parentElement;
        atmRowFallback.classList.add("atm-row"); // Add atm-row class for consistency
        atmStrikeCell.classList.add("atm-strike");
        console.log("Added ATM class to row for strike price:", strikePrices[0].price);
        
        // Add highlighting to all cells in the ATM row
        const atmCells = atmRowFallback.querySelectorAll("td");
        atmCells.forEach(cell => {
            cell.classList.add("atm-cell");
        });

        // Don't auto-scroll to ATM row to prevent unwanted scrolling
    }

    // Get all strike cells and highlight ITM for call and put sides
    const strikePrices = Array.from(document.querySelectorAll(".strike-price"))
        .map(strikeCell => {
            return {
                cell: strikeCell,
                price: parseFloat(strikeCell.textContent.trim())
            };
        });

    // Highlight in-the-money options
    strikePrices.forEach(({ cell, price }) => {
        const row = cell.parentElement;
        
        // For calls, strikes below spot price are ITM
        if (price < spotPrice) {
            // Apply to first 9 cells (call side)
            const callCells = row.querySelectorAll("td:nth-child(-n+9)");
            callCells.forEach(callCell => {
                callCell.classList.add("call-itm");
            });
            cell.classList.add("call-itm"); // Also style the strike cell
        }
        
        // For puts, strikes above spot price are ITM
        if (price > spotPrice) {
            // Apply to last 9 cells (put side)
            const putCells = row.querySelectorAll("td:nth-child(n+11)");
            putCells.forEach(putCell => {
                putCell.classList.add("put-itm");
            });
            cell.classList.add("put-itm"); // Also style the strike cell
        }
    });
}

// Highlight high volume and OI change
function highlightVolumeAndOIChange() {
    console.log("Highlighting volume, OI and OI change values");
    
    // Process Call Volume
    const callVolumeResult = processDataByAttribute('volume', 'call');
    trendData.callVolumeTrend = callVolumeResult.trend;
    
    // Process Put Volume
    const putVolumeResult = processDataByAttribute('volume', 'put');
    trendData.putVolumeTrend = putVolumeResult.trend;
    
    // Process Call OI
    const callOIResult = processDataByAttribute('oi', 'call');
    trendData.callOITrend = callOIResult.trend;
    
    // Process Put OI
    const putOIResult = processDataByAttribute('oi', 'put');
    trendData.putOITrend = putOIResult.trend;
    
    // Process Call OI Change
    const callOIChangeResult = processDataByAttribute('oiChange', 'call');
    trendData.callOIChangeTrend = callOIChangeResult.trend;
    
    // Process Put OI Change
    const putOIChangeResult = processDataByAttribute('oiChange', 'put');
    trendData.putOIChangeTrend = putOIChangeResult.trend;
    
    // Update column headers with new trend indicators
    updateColumnHeaders();
}

// Process and highlight cells based on attribute and side
function processDataByAttribute(attributeType, side) {
    // Select all cells matching the data type and side
    const cells = document.querySelectorAll(`[data-type="${attributeType}"][data-side="${side}"]`);
    if (cells.length === 0) {
        return { trend: 'none' };
    }
    
    // Convert NodeList to Array for easier processing
    const cellsArray = Array.from(cells);
    
    // Sort cells by value (descending)
    cellsArray.sort((a, b) => {
        const aValue = parseFloat(a.dataset.value);
        const bValue = parseFloat(b.dataset.value);
        return bValue - aValue;
    });
    
    // Get highest value
    const highestValue = parseFloat(cellsArray[0].dataset.value);
    if (highestValue <= 0) {
        return { trend: 'none' };
    }
    
    // Get highest value position (top/bottom) by getting its parent row's index
    const highestRow = cellsArray[0].closest('tr');
    const allRows = Array.from(document.querySelectorAll('#optionsChainTable tbody tr'));
    const highestRowIndex = allRows.indexOf(highestRow);
    
    // Reset all cells first
    cellsArray.forEach(cell => {
        cell.classList.remove('high-volume', 'medium-volume', 'high-oi-change', 'medium-oi-change');
        cell.style.backgroundColor = '';
        cell.style.color = '';
        cell.style.fontWeight = '';
        
        // Remove any percentage displays
        const percentageSpan = cell.querySelector('.value-percentage');
        if (percentageSpan) {
            percentageSpan.remove();
        }
    });
    
    // Track if we have a second highest ≥ 75%
    let hasHighSecond = false;
    let trendDirection = 'none';
    
    // Process each cell - both CALL and PUT sides get the same highlighting
    cellsArray.forEach((cell, index) => {
        const value = parseFloat(cell.dataset.value);
        
        // Skip if value is non-positive
        if (value <= 0) return;
        
        // Calculate percentage of highest value
        const percentage = Math.round((value / highestValue) * 100);
        
        // Store original text for reference
        const originalText = cell.textContent;
        
        // Create the percentage display
        const percentageSpan = document.createElement('span');
        percentageSpan.className = 'value-percentage';
        percentageSpan.textContent = `${percentage}%`;
        
        // Clear cell and re-add content with percentage
        cell.textContent = originalText;
        cell.appendChild(percentageSpan);
        
        // Apply highlighting for highest value (100%) with DARK YELLOW - for both CALL and PUT sides
        if (index === 0) {
            // Add appropriate classes based on attribute type
            if (attributeType === 'volume') {
                cell.classList.add('high-volume');
            } else {
                cell.classList.add('high-oi-change');
            }
            
            // Set dark yellow background and black text directly
            cell.style.backgroundColor = '#ffd700'; // Dark yellow
            cell.style.color = '#000000';
            cell.style.fontWeight = 'bold';
            
            // Store the current value as previous for next comparison
            cell.dataset.previousValue = value.toString();
        }
        // Apply highlighting for second highest if ≥ 75% with LIGHT YELLOW - for both CALL and PUT sides
        else if (index === 1 && percentage >= 75) {
            // Add appropriate classes based on attribute type
            if (attributeType === 'volume') {
                cell.classList.add('medium-volume');
            } else {
                cell.classList.add('medium-oi-change');
            }
            
            // Set light yellow background and black text directly
            cell.style.backgroundColor = '#fff7cc'; // Light yellow
            cell.style.color = '#000000';
            cell.style.fontWeight = 'bold';
            hasHighSecond = true;
            
            // Get second highest value position
            const secondRow = cell.closest('tr');
            const secondRowIndex = allRows.indexOf(secondRow);
            
            // Determine trend direction based on second value's position and movement
            const prevValue = parseFloat(cell.dataset.previousValue || "0");
            const highestPrevValue = parseFloat(cellsArray[0].dataset.previousValue || highestValue.toString());
            
            if (highestRowIndex < secondRowIndex) {
                // Highest is above second
                if (value > prevValue && value > (prevValue + (highestValue - prevValue) * 0.1)) {
                    // Second value is moving upward toward highest
                    trendDirection = 'up';
                } else if (value < prevValue && value < (prevValue - (highestValue - prevValue) * 0.1)) {
                    // Second value is moving downward away from highest
                    trendDirection = 'down';
                }
            } else {
                // Highest is below second
                if (value < prevValue && value < (prevValue - (highestValue - prevValue) * 0.1)) {
                    // Second value is moving downward toward highest
                    trendDirection = 'up';
                } else if (value > prevValue && value > (prevValue + (highestValue - prevValue) * 0.1)) {
                    // Second value is moving upward away from highest
                    trendDirection = 'down';
                }
            }
            
            // Store current value for next comparison
            cell.dataset.previousValue = value.toString();
        }
        
        // Add tooltip
        cell.title = `Value: ${originalText}, Percentage: ${percentage}% of highest`;
    });
    
    return {
        trend: trendDirection,
        hasHighSecond: hasHighSecond
    };
}

// Add click handlers to volume cells
function addVolumeClickHandlers() {
    console.log("Adding volume click handlers and verifying volume data...");
    
    // First ensure all volume cells have correct data
    ensureCorrectDataInVolumeCells();
    
    // Get all rows in the table
    const rows = document.querySelectorAll('#optionsChainTable tbody tr');
    
    // Get the current data
    const currentData = mockOptionChainData[currentIndex];
    if (!currentData) {
        console.error("No data available for index:", currentIndex);
        return;
    }
    
    console.log("Current index:", currentIndex, "spotPrice:", currentData.spotPrice);
    
    rows.forEach(row => {
        // Check if row has the expected number of cells
        const cells = row.querySelectorAll('td');
        if (cells.length !== 19) {
            console.error(`Row has ${cells.length} cells instead of expected 19`);
            return;
        }
        
        // Get the strike price from the center cell (index 9)
        const strikePrice = parseFloat(cells[9].textContent.replace(/,/g, ''));
        if (isNaN(strikePrice)) {
            console.error(`Invalid strike price: ${cells[9].textContent}`);
            return;
        }
        
        // Find the corresponding option data in mock data
        const strikeData = currentData.strikes.find(s => Math.abs(s.strike - strikePrice) < 1);
        
        if (!strikeData) {
            console.error(`No data found for strike price ${strikePrice}`);
            return;
        }
        
        // CALL side volume cell (index 8 - it's the 9th column in the call side)
        const callVolumeCell = cells[8];
        if (callVolumeCell) {
            // Make sure it has the correct value and data attributes
            callVolumeCell.textContent = formatNumber(strikeData.call.volume);
            callVolumeCell.dataset.strike = strikePrice;
            callVolumeCell.dataset.side = 'call';
            callVolumeCell.classList.add('volume-cell');
            
            // Add click handler with explicit function
            callVolumeCell.onclick = function() {
                console.log(`CALL volume cell clicked for strike ${strikePrice}`);
                showVolumeGraph(strikePrice, 'call');
            };
        }
        
        // PUT side volume cell (index 10 - it's the 1st column in the put side)
        const putVolumeCell = cells[10];
        if (putVolumeCell) {
            // Make sure it has the correct value and data attributes
            putVolumeCell.textContent = formatNumber(strikeData.put.volume);
            putVolumeCell.dataset.strike = strikePrice;
            putVolumeCell.dataset.side = 'put';
            putVolumeCell.classList.add('volume-cell');
            
            // Add click handler with explicit function
            putVolumeCell.onclick = function() {
                console.log(`PUT volume cell clicked for strike ${strikePrice}`);
                showVolumeGraph(strikePrice, 'put');
            };
        }
    });
    
    console.log("Volume click handlers added with verified data.");
}

// Function to ensure all volume cells have correct data
function ensureCorrectDataInVolumeCells() {
    console.log("Running volume cell data validation...");
    
    // Check if we have valid mock data
    if (!mockOptionChainData || !mockOptionChainData[currentIndex]) {
        console.error("Mock data not available for current index:", currentIndex);
        return;
    }
    
    // Get the table rows
    const rows = document.querySelectorAll('#optionsChainTable tbody tr');
    if (rows.length === 0) {
        console.log("No rows found in the options chain table.");
        return;
    }
    
    console.log(`Validating ${rows.length} rows of data for ${currentIndex}`);
    
    // Get all available strikes for the current index
    const strikes = mockOptionChainData[currentIndex].strikes;
    
    rows.forEach((row, index) => {
        try {
            // Get the strike price from the center cell
            const strikeCell = row.querySelector('td:nth-child(10)');
            if (!strikeCell) {
                console.warn(`Row ${index}: Strike price cell not found`);
                return;
            }
            
            const strikeText = strikeCell.textContent;
            const strikePrice = parseFloat(strikeText.replace(/,/g, ''));
            
            if (isNaN(strikePrice)) {
                console.warn(`Row ${index}: Invalid strike price text: ${strikeText}`);
                return;
            }
            
            // Find matching strike in our data
            const strike = strikes.find(s => Math.abs(s.strike - strikePrice) < 1);
            
            if (!strike) {
                console.warn(`Row ${index}: No matching data found for strike ${strikePrice}`);
                return;
            }
            
            // CALL volume cell (2nd cell)
            const callVolumeCell = row.cells[1]; // Using cells collection instead of querySelector
            
            if (callVolumeCell) {
                // Update with correct volume
                callVolumeCell.textContent = formatNumber(strike.call.volume);
            }
            
            // PUT volume cell (18th cell)
            const putVolumeCell = row.cells[17]; // Using cells collection instead of querySelector
            
            if (putVolumeCell) {
                // Update with correct volume
                putVolumeCell.textContent = formatNumber(strike.put.volume);
            }
        } catch (error) {
            console.error(`Error processing row ${index}:`, error);
        }
    });
    
    console.log("Volume cell validation complete");
}

// Function to set up other UI elements
function setupResizablePane() {
    console.log("Setting up resizable pane...");
    // Code to make panes resizable would go here
}

function setupPlaybackControls() {
    console.log("Setting up playback controls...");
    
    // Play button event listener
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', startPlayback);
    }
    
    // Pause button event listener
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pausePlayback);
    }
    
    // Stop button event listener
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopPlayback);
    }
    
    // Time slider event listener
    const timeSlider = document.getElementById('timeSlider');
    if (timeSlider) {
        timeSlider.addEventListener('input', handleTimeSliderChange);
    }
}

function setupVolumeOIToggle() {
    console.log("Setting up volume/OI toggle...");
    // Code to set up volume/OI toggle would go here
}

function addTableEventListeners() {
    console.log("Adding table event listeners...");
    
    // Add click handlers for column headers (for sorting)
    const headers = document.querySelectorAll('#optionsChainTable th');
    headers.forEach(header => {
        if (header.id) {
            header.addEventListener('click', function() {
                // Sorting logic would go here
                console.log(`Column header clicked: ${header.id}`);
            });
        }
    });
    
    // Add event listeners for other UI elements
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Refresh logic
            console.log("Refresh button clicked");
        });
    }
}

// Function to show volume graph
function showVolumeGraph(strikePrice, side) {
    console.log(`Showing OI Change comparison graph for strike ${strikePrice}`);
    
    // Show the graph container and remove hidden class
    const graphContainer = document.getElementById('graphContainer');
    graphContainer.style.display = 'block';
    graphContainer.classList.remove('hidden');
    
    // Update strike price display
    const graphStrike = document.getElementById('graphStrike');
    graphStrike.textContent = strikePrice;
    
    // Create or update chart for OI Change
    if (chart) {
        chart.destroy();
    }
    
    // Find the corresponding option data in mock data
    const currentData = mockOptionChainData[currentIndex];
    const strikeData = currentData.strikes.find(s => Math.abs(s.strike - strikePrice) < 1);
    
    if (!strikeData) {
        console.error(`No data found for strike price ${strikePrice}`);
        return;
    }
    
    // Generate mock data for both CALL and PUT OI change
    const callOIChange = strikeData.call.changeOI;
    const putOIChange = strikeData.put.changeOI;
    
    const callOIChangeData = generateMockTimeSeriesData(20, callOIChange, Math.abs(callOIChange/2));
    const putOIChangeData = generateMockTimeSeriesData(20, putOIChange, Math.abs(putOIChange/2));
    
    // Labels for time (last 20 minutes)
    const labels = [];
    const now = new Date();
    for (let i = 19; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000);
        labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    
    // Chart configuration for comparing CALL and PUT OI change
    const ctx = oiChangeGraph.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `CALL OI Change`,
                    data: callOIChangeData,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: `PUT OI Change`,
                    data: putOIChangeData,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: `OI Change Comparison for Strike ${strikePrice}`,
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
    
    // Start live updating the graph
    if (window.graphUpdateInterval) {
        clearInterval(window.graphUpdateInterval);
    }
    
    window.graphUpdateInterval = setInterval(() => {
        // Only update if graph is visible
        if (graphContainer.style.display === 'block') {
            // Update the data with new values
            const callData = [...chart.data.datasets[0].data];
            const putData = [...chart.data.datasets[1].data];
            
            // Remove the first point
            callData.shift();
            putData.shift();
            
            // Generate new points
            const newCallPoint = Math.round(callData[callData.length-1] + (Math.random() * 2 - 1) * Math.abs(callOIChange/4));
            const newPutPoint = Math.round(putData[putData.length-1] + (Math.random() * 2 - 1) * Math.abs(putOIChange/4));
            
            // Add new points
            callData.push(newCallPoint);
            putData.push(newPutPoint);
            
            // Update chart datasets
            chart.data.datasets[0].data = callData;
            chart.data.datasets[1].data = putData;
            
            // Update labels
            const labels = chart.data.labels;
            labels.shift();
            const now = new Date();
            labels.push(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            chart.data.labels = labels;
            
            // Update the chart
            chart.update();
        }
    }, 1000);
    
    // Clear interval when graph is closed
    closeGraph.onclick = function() {
        if (window.graphUpdateInterval) {
            clearInterval(window.graphUpdateInterval);
        }
        graphContainer.style.display = 'none';
        graphContainer.classList.add('hidden');
    };
}

// Helper function to generate mock time series data
function generateMockTimeSeriesData(count, baseValue, variance) {
    const data = [];
    let currentValue = baseValue;
    
    for (let i = 0; i < count; i++) {
        // Add some randomness to create variations
        const change = (Math.random() * 2 - 1) * variance;
        currentValue += change;
        data.push(Math.round(currentValue));
    }
    
    return data;
}

// Function to update symbol info in the UI
function updateSymbolInfo(symbol, spotPrice) {
    console.log(`Updating symbol info: ${symbol}, spot price: ${spotPrice}`);
    
    const symbolElement = document.getElementById('selected-symbol');
    const spotPriceElement = document.getElementById('spot-price');
    const changeElement = document.getElementById('price-change');
    const percentChangeElement = document.getElementById('percent-change');
    
    if (symbolElement) {
        symbolElement.textContent = symbol;
    }
    
    if (spotPriceElement) {
        spotPriceElement.textContent = spotPrice.toFixed(2);
    }
    
    const data = mockOptionChainData[symbol];
    if (data && changeElement && percentChangeElement) {
        changeElement.textContent = data.change;
        percentChangeElement.textContent = data.percentChange;
        
        // Update the color based on change
        if (parseFloat(data.change) >= 0) {
            changeElement.classList.remove('text-danger');
            changeElement.classList.add('text-success');
            percentChangeElement.classList.remove('text-danger');
            percentChangeElement.classList.add('text-success');
        } else {
            changeElement.classList.remove('text-success');
            changeElement.classList.add('text-danger');
            percentChangeElement.classList.remove('text-success');
            percentChangeElement.classList.add('text-danger');
        }
    }
}

// Function to populate expiry dropdown
function populateExpiryDropdown() {
    console.log("Populating expiry dropdown...");
    
    const expirySelect = document.getElementById('expiryDateSelector');
    if (!expirySelect) {
        console.error("Expiry select element not found!");
        return;
    }
    
    // Clear existing options except the first one (Current Expiry)
    while (expirySelect.options.length > 1) {
        expirySelect.remove(1);
    }
    
    // Add expiry dates from current data
    const currentData = mockOptionChainData[currentIndex];
    if (currentData && currentData.expiryDates) {
        currentData.expiryDates.forEach((date) => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            expirySelect.appendChild(option);
        });
    }
    
    console.log("Expiry dropdown populated with dates:", currentData.expiryDates);
}

// Function to create table headers
function createTableHeaders() {
    console.log("Setting up table headers...");
    
    const optionsChainTable = document.getElementById('optionsChainTable');
    if (!optionsChainTable) {
        console.error("Options chain table element not found!");
        return;
    }
    
    // Get or create thead element
    let thead = optionsChainTable.querySelector('thead');
    if (!thead) {
        thead = document.createElement('thead');
        optionsChainTable.appendChild(thead);
    } else {
        thead.innerHTML = ''; // Clear existing headers
    }
    
    // Create first header row with column group labels
    const headerRow1 = document.createElement('tr');
    
    // CALL side header (spans 9 columns)
    const callHeader = document.createElement('th');
    callHeader.textContent = 'CALL';
    callHeader.colSpan = 9;
    callHeader.className = 'call-header';
    headerRow1.appendChild(callHeader);
    
    // Strike price header (center column)
    const strikeHeader = document.createElement('th');
    strikeHeader.className = 'strike-header';
    strikeHeader.innerHTML = `Strike Price <span class="spot-price">Spot: <span id="spotPriceDisplay">22,445.65</span></span>`;
    headerRow1.appendChild(strikeHeader);
    
    // PUT side header (spans 9 columns)
    const putHeader = document.createElement('th');
    putHeader.textContent = 'PUT';
    putHeader.colSpan = 9;
    putHeader.className = 'put-header';
    headerRow1.appendChild(putHeader);
    
    thead.appendChild(headerRow1);
    
    // Create second header row with individual column labels based on screenshot
    const headerRow2 = document.createElement('tr');
    
    // CALL side column headers (9 columns) - Update order based on screenshot
    const callColumns = [
        {id: '', text: 'IV'},
        {id: '', text: 'Delta'},
        {id: '', text: 'Gamma'},
        {id: '', text: 'Theta'},
        {id: '', text: 'Vega'},
        {id: '', text: 'LTP'},
        {id: 'callOIChangeHeader', text: 'OI Change'},
        {id: 'callOIHeader', text: 'OI'},
        {id: 'callVolumeHeader', text: 'Volume'}
    ];
    
    callColumns.forEach(col => {
        const th = document.createElement('th');
        if (col.id) {
            th.id = col.id;
            th.innerHTML = `<span style="float: left !important; margin-right: 5px !important; display: inline-block !important; width: 20px; height: 18px; position: relative;"><i class="fas fa-arrow-up fixed-arrow-up"></i><i class="fas fa-arrow-down fixed-arrow-down"></i></span>${col.text}`;
        } else {
            th.textContent = col.text;
        }
        headerRow2.appendChild(th);
    });
    
    // Strike Price column header
    const strikeTh = document.createElement('th');
    strikeTh.textContent = 'Strike';
    headerRow2.appendChild(strikeTh);
    
    // PUT side column headers (9 columns) - Update order based on screenshot
    const putColumns = [
        {id: 'putVolumeHeader', text: 'Volume'},
        {id: 'putOIHeader', text: 'OI'},
        {id: 'putOIChangeHeader', text: 'OI Change'},
        {id: '', text: 'LTP'},
        {id: '', text: 'Vega'},
        {id: '', text: 'Theta'},
        {id: '', text: 'Gamma'},
        {id: '', text: 'Delta'},
        {id: '', text: 'IV'}
    ];
    
    putColumns.forEach(col => {
        const th = document.createElement('th');
        if (col.id) {
            th.id = col.id;
            th.innerHTML = `<span style="float: left !important; margin-right: 5px !important; display: inline-block !important; width: 20px; height: 18px; position: relative;"><i class="fas fa-arrow-up fixed-arrow-up"></i><i class="fas fa-arrow-down fixed-arrow-down"></i></span>${col.text}`;
        } else {
            th.textContent = col.text;
        }
        headerRow2.appendChild(th);
    });
    
    thead.appendChild(headerRow2);
    
    // Create tbody if it doesn't exist
    if (!optionsChainTable.querySelector('tbody')) {
        const tbody = document.createElement('tbody');
        tbody.id = 'optionsChainBody';
        optionsChainTable.appendChild(tbody);
    }
    
    console.log("Table headers setup completed!");
}

// Function to initialize mock data
function initMockData() {
    console.log("Initializing mock data...");
    
    // Define mock data structure for Nifty and BankNifty
    mockOptionChainData = {
        NIFTY: {
            spotPrice: 22445.65,
            change: '+125.30',
            percentChange: '+0.56%',
            expiryDates: ['27-Jun-2024', '4-Jul-2024', '11-Jul-2024', '18-Jul-2024'],
            strikes: generateMockStrikes(22445.65, 150)
        },
        BANKNIFTY: {
            spotPrice: 48756.25,
            change: '+320.45',
            percentChange: '+0.66%',
            expiryDates: ['27-Jun-2024', '4-Jul-2024', '11-Jul-2024', '18-Jul-2024'],
            strikes: generateMockStrikes(48756.25, 150)
        }
    };
    
    console.log("Mock data initialized successfully!");
    console.log("NIFTY strikes count:", mockOptionChainData.NIFTY.strikes.length);
    console.log("Sample strike data:", mockOptionChainData.NIFTY.strikes[0]);
}

// Generate mock strikes around a center point
function generateMockStrikes(center, count) {
    console.log(`Generating mock strikes around ${center} with count ${count}`);
    
    const strikes = [];
    const interval = 50; // 50 point interval
    
    // Find the nearest multiple of 50 below the center
    const baseStrike = Math.floor(center / 50) * 50;
    
    // Calculate how many strikes we need on each side to get balanced display
    const strikesPerSide = Math.ceil(count / 2);
    
    // Generate strikes starting from lower bound
    let currentStrike = baseStrike - (strikesPerSide * interval);
    
    // Create all strikes in sequence
    for (let i = 0; i < count; i++) {
        strikes.push({
            strike: currentStrike,
            call: generateMockOption(center, currentStrike, 'call'),
            put: generateMockOption(center, currentStrike, 'put')
        });
        
        currentStrike += interval;
    }
    
    // Safety check: ensure volume values are significantly different from strike prices
    strikes.forEach(strikeObj => {
        // Regenerate call volume if it's too close to strike price
        if (Math.abs(strikeObj.call.volume - strikeObj.strike) < 100) {
            strikeObj.call.volume = strikeObj.strike + 500 + Math.floor(Math.random() * 10000);
        }
        
        // Regenerate put volume if it's too close to strike price
        if (Math.abs(strikeObj.put.volume - strikeObj.strike) < 100) {
            strikeObj.put.volume = strikeObj.strike + 500 + Math.floor(Math.random() * 10000);
        }
    });
    
    console.log(`Generated ${strikes.length} strikes with interval of ${interval}`);
    return strikes;
}

// Generate mock option data
function generateMockOption(spotPrice, strikePrice, type) {
    const distanceFromSpot = Math.abs(spotPrice - strikePrice);
    const isITM = (type === 'call' && spotPrice > strikePrice) || 
                  (type === 'put' && spotPrice < strikePrice);
    
    // Generate option prices and greeks
    const iv = isITM ? 20 + Math.random() * 10 : 25 + Math.random() * 15;
    const ltp = Math.max(0.05, Math.random() * 500 * Math.exp(-distanceFromSpot / 500));
    const delta = type === 'call' ? Math.max(0, Math.min(1, 0.5 + (spotPrice - strikePrice) / 500)) :
                                    Math.min(0, Math.max(-1, -0.5 + (spotPrice - strikePrice) / 500));
    
    // Generate bid and ask prices
    const spread = Math.max(0.1, ltp * 0.02); // 2% spread or minimum 0.1
    const bid = Math.max(0, ltp - spread/2);
    const ask = ltp + spread/2;
    
    // Generate volumes and OI
    const volume = Math.round(10000 + Math.random() * 100000);
    const oi = Math.round(50000 + Math.random() * 200000);
    const changeOI = Math.round((Math.random() * 2 - 1) * 20000);
    const changeLtp = Math.round((Math.random() * 2 - 1) * 5 * 10) / 10; // -5.0 to +5.0
    
    return {
        ltp: ltp.toFixed(2),
        iv: iv.toFixed(1),
        delta: delta.toFixed(3),
        gamma: (Math.random() * 0.05).toFixed(4),
        theta: (Math.random() * -2).toFixed(2),
        vega: (Math.random() * 10).toFixed(2),
        volume: volume,
        oi: oi,
        changeOI: changeOI,
        changeLtp: changeLtp,
        bid: bid.toFixed(2),
        ask: ask.toFixed(2)
    };
}

// Simulate live data updates
function startLiveDataSimulation() {
    console.log("Starting live data simulation...");
    
    // Add a refresh indicator in the UI
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'refresh-indicator';
        refreshIndicator.innerHTML = '<i class="fas fa-sync-alt"></i> <span>Live</span>';
        headerRight.prepend(refreshIndicator);
    }
    
    // Ensure we clear any existing intervals to avoid duplicate updates
    if (window.liveUpdateInterval) {
        clearInterval(window.liveUpdateInterval);
    }
    
    // Store interval ID to allow stopping/clearing later
    window.liveUpdateInterval = setInterval(() => {
        if (isLiveMode) {
            console.log("Updating live data...");
            
            // Show animation for refresh indicator
            const refreshIndicator = document.querySelector('.refresh-indicator');
            if (refreshIndicator) {
                refreshIndicator.classList.add('refreshing');
                
                // Remove the class after animation completes
                setTimeout(() => {
                    refreshIndicator.classList.remove('refreshing');
                }, 750);
            }
            
            // Update data with small changes
            const data = mockOptionChainData[currentIndex];
            if (!data) {
                console.error("No data available for current index:", currentIndex);
                // Try to recover by initializing mock data again
                initMockData();
                return;
            }
            
            // Update spot price with random small changes
            const spotChange = (Math.random() * 2 - 1) * 5; // Random change between -5 and +5
            data.spotPrice = Math.max(data.spotPrice + spotChange, 1);
            
            // Update change percentage 
            data.change = (data.spotPrice - (currentIndex === 'NIFTY' ? 22445.65 : 48756.25)).toFixed(2);
            const changeValue = parseFloat(data.change);
            const sign = changeValue >= 0 ? '+' : '';
            data.change = sign + changeValue.toFixed(2);
            
            const percentChange = (changeValue / (currentIndex === 'NIFTY' ? 22445.65 : 48756.25) * 100).toFixed(2);
            data.percentChange = `(${sign}${percentChange}%)`;
            
            // Update all option data with random changes
            data.strikes.forEach((strike) => {
                // Update CALL option data
                strike.call.ltp = (parseFloat(strike.call.ltp) + (Math.random() * 2 - 1) * 2).toFixed(2);
                strike.call.iv = Math.min(Math.max((parseFloat(strike.call.iv) + (Math.random() * 2 - 1) * 0.5), 5), 95).toFixed(1);
                strike.call.delta = Math.min(Math.max((parseFloat(strike.call.delta) + (Math.random() * 2 - 1) * 0.01), 0), 1).toFixed(3);
                strike.call.gamma = (parseFloat(strike.call.gamma) + (Math.random() * 2 - 1) * 0.001).toFixed(4);
                strike.call.theta = (parseFloat(strike.call.theta) + (Math.random() * 2 - 1) * 0.1).toFixed(2);
                strike.call.vega = (parseFloat(strike.call.vega) + (Math.random() * 2 - 1) * 0.1).toFixed(2);
                strike.call.oi = Math.max(strike.call.oi + Math.round((Math.random() * 2 - 1) * 500), 0);
                strike.call.changeOI = Math.round((Math.random() * 2 - 1) * 1000);
                strike.call.volume = Math.max(strike.call.volume + Math.round((Math.random() * 2 - 1) * 200), 0);
                
                // Update PUT option data
                strike.put.ltp = (parseFloat(strike.put.ltp) + (Math.random() * 2 - 1) * 2).toFixed(2);
                strike.put.iv = Math.min(Math.max((parseFloat(strike.put.iv) + (Math.random() * 2 - 1) * 0.5), 5), 95).toFixed(1);
                strike.put.delta = Math.min(Math.max((parseFloat(strike.put.delta) + (Math.random() * 2 - 1) * 0.01), -1), 0).toFixed(3);
                strike.put.gamma = (parseFloat(strike.put.gamma) + (Math.random() * 2 - 1) * 0.001).toFixed(4);
                strike.put.theta = (parseFloat(strike.put.theta) + (Math.random() * 2 - 1) * 0.1).toFixed(2);
                strike.put.vega = (parseFloat(strike.put.vega) + (Math.random() * 2 - 1) * 0.1).toFixed(2);
                strike.put.oi = Math.max(strike.put.oi + Math.round((Math.random() * 2 - 1) * 500), 0);
                strike.put.changeOI = Math.round((Math.random() * 2 - 1) * 1000);
                strike.put.volume = Math.max(strike.put.volume + Math.round((Math.random() * 2 - 1) * 200), 0);
            });
            
            // We'll no longer randomly toggle trend indicators
            // Instead, they'll be determined by the data processing function
            // Remove the random toggle code:
            /*
            if (Math.random() > 0.8) {
                trendData.callVolumeTrend = Math.random() > 0.5 ? 'up' : 'down';
                trendData.putOITrend = Math.random() > 0.5 ? 'up' : 'down';
                trendData.callOIChangeTrend = Math.random() > 0.5 ? 'up' : 'down';
                trendData.putOIChangeTrend = Math.random() > 0.5 ? 'up' : 'down';
            }
            */
            
            try {
                // Update UI
                updateSymbolInfo(currentIndex, data.spotPrice);
                renderOptionsChain(data);
                
                // Add highlighting for volume and OI cells
                // This will also determine trends based on the data movement
                highlightVolumeAndOIChange();
                
                // Now update column headers with the trends determined by data analysis
                updateColumnHeaders();
                
                console.log("Data refresh complete");
            } catch (error) {
                console.error("Error updating UI:", error);
            }
        }
    }, 1500); // Update every 1.5 seconds
    
    console.log("Live data simulation started");
}

// Setup all event listeners
function setupEventListeners() {
    console.log("Setting up event listeners");
    
    // Add scroll optimization
    optimizeScrolling();
    
    // Index selector change event
    const indexSelector = document.getElementById('indexSelector');
    if (indexSelector) {
        indexSelector.addEventListener('change', (e) => {
            currentIndex = e.target.value;
            console.log(`Index changed to ${currentIndex}`);
            
            // Update the UI with the new index data
            updateSymbolInfo(currentIndex, mockOptionChainData[currentIndex].spotPrice);
            renderOptionsChain(mockOptionChainData[currentIndex]);
        });
    }
    
    // Theme toggle event
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Scroll to ATM button event
    const scrollToATMBtn = document.getElementById('scrollToATMBtn');
    if (scrollToATMBtn) {
        scrollToATMBtn.addEventListener('click', () => {
            // Set a flag that user explicitly requested scrolling to ATM
            scrollToATMBtn.dataset.userRequested = 'true';
            scrollToATM();
        });
        
        // Initialize the userRequested flag
        scrollToATMBtn.dataset.userRequested = 'false';
    }
    
    // Historical data drawer events
    const historicalDataBtn = document.getElementById('historicalDataBtn');
    const closeDrawer = document.getElementById('closeDrawer');
    const historicalDataDrawer = document.getElementById('historicalDataDrawer');
    
    if (historicalDataBtn && closeDrawer && historicalDataDrawer) {
        historicalDataBtn.addEventListener('click', () => {
            historicalDataDrawer.classList.add('open');
            isLiveMode = false; // Pause live updates when viewing historical data
        });
        
        closeDrawer.addEventListener('click', () => {
            historicalDataDrawer.classList.remove('open');
            isLiveMode = true; // Resume live updates when closing historical drawer
        });
    }
    
    // Playback controls
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (playBtn && pauseBtn && stopBtn) {
        playBtn.addEventListener('click', startPlayback);
        pauseBtn.addEventListener('click', pausePlayback);
        stopBtn.addEventListener('click', stopPlayback);
    }
    
    // Set up zoom controls
    initZoomControls();
    
    // Close graph button event
    const closeGraph = document.getElementById('closeGraph');
    if (closeGraph) {
        closeGraph.addEventListener('click', () => {
            const graphContainer = document.getElementById('graphContainer');
            graphContainer.style.display = 'none';
            graphContainer.classList.add('hidden');
        });
    }
}

// Playback control functions (stubs for now)
function startPlayback() {
    console.log("Starting historical data playback");
    
    isLiveMode = false;
    
    // Clear existing interval if any
    if (playbackInterval) {
        clearInterval(playbackInterval);
    }
    
    // Generate historical data if it doesn't exist yet
    if (!historicalData || !historicalData[currentIndex] || !historicalData[currentIndex].minuteData) {
        console.log("Generating historical data before playback");
        generateMockHistoricalData();
    }
    
    // Get playback speed
    const speedSelector = document.getElementById('speedSelector');
    const speedMultiplier = speedSelector ? parseInt(speedSelector.value) : 1;
    
    // Get time slider
    const timeSlider = document.getElementById('timeSlider');
    if (!timeSlider) {
        console.error("Time slider not found");
        return;
    }
    
    // Start playback from current position
    playbackInterval = setInterval(() => {
        currentPlaybackMinute++;
        
        // Check if we've reached the end of the day
        if (currentPlaybackMinute >= 390) {
            stopPlayback();
            return;
        }
        
        // Update slider position
        timeSlider.value = currentPlaybackMinute;
        
        // Trigger slider change to update display
        handleTimeSliderChange();
    }, 1000 / speedMultiplier); // Adjust interval based on speed
    
    console.log("Playback started at speed", speedMultiplier, "x");
}

function pausePlayback() {
    console.log("Pausing historical data playback");
    
    // Clear the playback interval
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
}

function stopPlayback() {
    console.log("Stopping historical data playback");
    
    // Clear the playback interval
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
    
    // Reset to beginning of day
    currentPlaybackMinute = 0;
    
    // Update slider position
    const timeSlider = document.getElementById('timeSlider');
    if (timeSlider) {
        timeSlider.value = currentPlaybackMinute;
        handleTimeSliderChange();
    }
}

// Function to scroll to ATM strike price
function scrollToATM() {
    console.log("Scrolling to ATM strike price");
    
    // No scrolling if we're already refreshing data
    const container = document.querySelector('.options-chain-container');
    if (container && container.classList.contains('is-scrolling')) {
        console.log("Skipping scroll to ATM during data refresh");
        return;
    }
    
    // Find the row with the ATM class
    const atmRow = document.querySelector('.atm-row');
    
    if (atmRow && container) {
        // Add highlight effect
        atmRow.classList.add('highlight-atm');
        
        // Use scrollIntoView which is more reliable and causes less layout shifts
        atmRow.scrollIntoView({
            block: 'center', 
            behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent jumps during data refresh
        });
        
        // Flash effect
        setTimeout(() => {
            atmRow.classList.remove('highlight-atm');
        }, 2000);
        
        return;
    }
    
    // Fallback to the old method if ATM row is not found
    const data = mockOptionChainData[currentIndex];
    const spotPrice = data.spotPrice;
    
    // Find ATM strike price cell (closest to spot price)
    const strikeElements = document.querySelectorAll('.strike-price');
    let closestElement = null;
    let minDiff = Number.MAX_VALUE;
    
    strikeElements.forEach(element => {
        const strike = parseFloat(element.textContent);
        const diff = Math.abs(strike - spotPrice);
        
        if (diff < minDiff) {
            minDiff = diff;
            closestElement = element;
        }
    });
    
    // Scroll to the element if found
    if (closestElement && container) {
        // Add highlight effect
        const parentRow = closestElement.closest('tr');
        if (parentRow) {
            parentRow.classList.add('highlight-atm');
            
            // Use the row for scrolling, not the cell
            parentRow.scrollIntoView({
                block: 'center',
                behavior: 'auto'
            });
        } else {
            // Fallback to direct scroll if parent row not found
            closestElement.scrollIntoView({
                block: 'center',
                behavior: 'auto'
            });
        }
        
        closestElement.classList.add('highlight-atm');
        
        // Flash effect
        setTimeout(() => {
            closestElement.classList.remove('highlight-atm');
            if (parentRow) {
                parentRow.classList.remove('highlight-atm');
            }
        }, 2000);
    }
}

// Populate historical dates in dropdown
function populateHistoricalDates() {
    console.log("Populating historical dates dropdown");
    
    // Get the date input element
    const dateInput = document.getElementById('historicalDate');
    if (!dateInput) {
        console.error("Historical date input not found");
        return;
    }
    
    // Set the date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    dateInput.value = formattedDate;
    
    // Generate mock historical data
    generateMockHistoricalData();
}

// Generate mock historical data
function generateMockHistoricalData() {
    console.log("Generating mock historical data");
    
    // Create a deep copy of current data
    historicalData = JSON.parse(JSON.stringify(mockOptionChainData));
    
    // Generate price series for the day
    const minutesInDay = 390; // 9:15 AM to 3:30 PM
    
    // Generate price series for Nifty and BankNifty
    const niftyStart = historicalData.NIFTY.spotPrice;
    const bankNiftyStart = historicalData.BANKNIFTY.spotPrice;
    
    historicalData.NIFTY.priceSeries = [];
    historicalData.BANKNIFTY.priceSeries = [];
    
    // Generate random price movement for the day
    for (let i = 0; i < minutesInDay; i++) {
        // Calculate time
        const hour = Math.floor(i / 60) + 9;
        const minute = i % 60 + 15;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Generate Nifty price
        const niftyChange = (Math.random() * 2 - 1) * 5;
        const niftyPrice = i === 0 ? niftyStart : historicalData.NIFTY.priceSeries[i-1].price + niftyChange;
        
        historicalData.NIFTY.priceSeries.push({
            time: timeString,
            price: niftyPrice,
            volume: Math.floor(Math.random() * 1000000) + 500000
        });
        
        // Generate BankNifty price
        const bankNiftyChange = (Math.random() * 2 - 1) * 15;
        const bankNiftyPrice = i === 0 ? bankNiftyStart : historicalData.BANKNIFTY.priceSeries[i-1].price + bankNiftyChange;
        
        historicalData.BANKNIFTY.priceSeries.push({
            time: timeString,
            price: bankNiftyPrice,
            volume: Math.floor(Math.random() * 500000) + 200000
        });
    }
    
    // Generate option chain data for each minute
    historicalData.NIFTY.minuteData = [];
    historicalData.BANKNIFTY.minuteData = [];
    
    for (let i = 0; i < minutesInDay; i++) {
        // Deep copy of current strikes with price variations
        const niftyStrikes = JSON.parse(JSON.stringify(historicalData.NIFTY.strikes));
        const bankNiftyStrikes = JSON.parse(JSON.stringify(historicalData.BANKNIFTY.strikes));
        
        // Update option prices based on spot price
        const niftySpot = historicalData.NIFTY.priceSeries[i].price;
        const bankNiftySpot = historicalData.BANKNIFTY.priceSeries[i].price;
        
        // Update Nifty option data
        niftyStrikes.forEach(strike => {
            updateHistoricalOptionData(strike.call, niftySpot, strike.strike, 'call');
            updateHistoricalOptionData(strike.put, niftySpot, strike.strike, 'put');
        });
        
        // Update BankNifty option data
        bankNiftyStrikes.forEach(strike => {
            updateHistoricalOptionData(strike.call, bankNiftySpot, strike.strike, 'call');
            updateHistoricalOptionData(strike.put, bankNiftySpot, strike.strike, 'put');
        });
        
        // Store minute data
        historicalData.NIFTY.minuteData.push({
            spotPrice: niftySpot,
            time: historicalData.NIFTY.priceSeries[i].time,
            strikes: niftyStrikes
        });
        
        historicalData.BANKNIFTY.minuteData.push({
            spotPrice: bankNiftySpot,
            time: historicalData.BANKNIFTY.priceSeries[i].time,
            strikes: bankNiftyStrikes
        });
    }
    
    console.log("Mock historical data generated successfully");
}

// Update option data for historical time series
function updateHistoricalOptionData(option, spotPrice, strikePrice, type) {
    const distanceFromSpot = Math.abs(spotPrice - strikePrice);
    const isITM = (type === 'call' && spotPrice > strikePrice) || 
                 (type === 'put' && spotPrice < strikePrice);
    
    // Update option prices and greeks based on spot movement
    option.iv = Math.max(5, Math.min(95, parseFloat(option.iv) + (Math.random() * 2 - 1) * 0.2)).toFixed(1);
    
    // Update premium based on spot-strike relationship
    if (type === 'call') {
        option.ltp = Math.max(0.05, Math.random() * 0.1 + Math.max(0, spotPrice - strikePrice) * 0.8 + Math.random() * 5).toFixed(2);
    } else {
        option.ltp = Math.max(0.05, Math.random() * 0.1 + Math.max(0, strikePrice - spotPrice) * 0.8 + Math.random() * 5).toFixed(2);
    }
    
    // Update greeks
    option.delta = type === 'call' 
        ? Math.max(0, Math.min(1, 0.5 + (spotPrice - strikePrice) / 500)).toFixed(3)
        : Math.min(0, Math.max(-1, -0.5 + (spotPrice - strikePrice) / 500)).toFixed(3);
    
    // Update other metrics with small random changes
    option.oi = Math.max(0, parseInt(option.oi) + Math.floor((Math.random() * 2 - 1) * 200));
    option.changeOI = Math.floor((Math.random() * 2 - 1) * 500);
    option.volume = Math.max(0, parseInt(option.volume) + Math.floor((Math.random() * 2 - 1) * 100));
}

// Function to handle time slider change
function handleTimeSliderChange() {
    const slider = document.getElementById('timeSlider');
    const timeDisplay = document.getElementById('timeDisplay');
    
    if (!slider || !timeDisplay) {
        console.error("Time slider or display not found");
        return;
    }
    
    // Get current minute index
    const minuteIndex = parseInt(slider.value);
    currentPlaybackMinute = minuteIndex;
    
    // Update time display
    const hour = Math.floor(minuteIndex / 60) + 9;
    const minute = minuteIndex % 60 + 15;
    const amPm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : hour;
    const timeString = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${amPm}`;
    
    timeDisplay.textContent = timeString;
    
    // Update the option chain with historical data
    if (historicalData && historicalData[currentIndex] && historicalData[currentIndex].minuteData) {
        const data = historicalData[currentIndex].minuteData[minuteIndex];
        if (data) {
            console.log("Rendering historical data for minute:", minuteIndex, "with data:", data);
            
            // Update spot price display
            updateSymbolInfo(currentIndex, data.spotPrice);
            
            // Set isLiveMode to false to prevent live updates during historical playback
            const wasLiveMode = isLiveMode;
            isLiveMode = false;
            
            // Render options chain with historical data
            renderOptionsChain(data);
            
            // Restore isLiveMode state
            isLiveMode = wasLiveMode;
            
            // Also highlight volume and OI cells after rendering
            setTimeout(() => {
                highlightVolumeAndOIChange();
                highlightITM(data.spotPrice);
            }, 100);
        } else {
            console.error("No historical data available for minute:", minuteIndex);
        }
    } else {
        console.error("No historical data available for current index:", currentIndex);
    }
}

/**
 * Arrow Fixer Script
 * This script ensures that arrow indicators in column headers are displayed correctly
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Arrow fixer script loaded');
    
    // Function to check and update arrow visibility
    function checkArrows() {
        // Get all fixed arrows
        const upArrows = document.querySelectorAll('.fixed-arrow-up');
        const downArrows = document.querySelectorAll('.fixed-arrow-down');
        
        // First hide all arrows that should be hidden
        upArrows.forEach(arrow => {
            if (arrow.style.display !== 'inline-block') {
                arrow.style.display = 'none';
            }
        });
        
        downArrows.forEach(arrow => {
            if (arrow.style.display !== 'inline-block') {
                arrow.style.display = 'none';
            }
        });
        
        // Ensure parent elements have position relative for proper arrow positioning
        document.querySelectorAll('th').forEach(th => {
            if (th.querySelector('.fixed-arrow-up, .fixed-arrow-down')) {
                if (window.getComputedStyle(th).position === 'static') {
                    th.style.position = 'relative';
                }
                
                // Make sure the span containing arrows is at the left
                const span = th.querySelector('span');
                if (span) {
                    span.style.float = 'left';
                    span.style.marginRight = '5px';
                    span.style.display = 'inline-block';
                    span.style.verticalAlign = 'middle';
                }
            }
        });
    }
    
    // Run initially
    checkArrows();
    
    // Set up a mutation observer to watch for changes to the DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                checkArrows();
            }
        });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { 
        attributes: true,
        subtree: true,
        attributeFilter: ['style', 'class']
    });
    
    // Also run on window resize as table layout might change
    window.addEventListener('resize', checkArrows);
    
    // Force run after a small delay to make sure styles are applied
    setTimeout(checkArrows, 100);
    
    console.log('Arrow fixer initialization complete');
});