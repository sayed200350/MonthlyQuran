// Storage layer for LocalStorage operations

const STORAGE_KEYS = {
  CONFIG: 'quran_memorization_config',
  ITEMS: 'quran_memorization_items',
  CURRENT_VIEW: 'quran_memorization_current_view',
  INSTALL_PROMPT_SHOWN: 'quran_memorization_install_prompt_shown'
};

// User Configuration Management
const Storage = {
  // Save user configuration
  saveConfig(config) {
    try {
      const configData = {
        unit_type: config.unit_type || 'page',
        total_units: config.total_units !== undefined ? config.total_units : 30,
        start_date: config.start_date,
        progression_name: config.progression_name || '',
        language: config.language || 'en',
        theme: config.theme || 'light',
        morning_hour: config.morning_hour !== undefined ? config.morning_hour : 6,
        evening_hour: config.evening_hour !== undefined ? config.evening_hour : 20,
        updated_at: new Date().toISOString() // Keep ISO for timestamp, not date comparison
      };
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configData));
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  },

  // Get user configuration
  getConfig() {
    try {
      const configStr = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (!configStr) return null;
      return JSON.parse(configStr);
    } catch (error) {
      console.error('Error getting config:', error);
      return null;
    }
  },

  // Save or update a memorized item
  saveItem(item) {
    try {
      const items = this.getAllItems();
      // First check by ID
      let existingIndex = items.findIndex(i => i.id === item.id);
      
      // If not found by ID, check by date_memorized and stable ID pattern to prevent duplicates
      // This handles cases where content_reference changes with language
      // Note: We don't check by content_reference since it's language-dependent
      if (existingIndex < 0 && item.date_memorized && item.id && item.id.startsWith('item-')) {
        // Extract unit type and number from stable ID pattern: item-{unitType}-{number}-{date}
        // Date format is YYYY-MM-DD, so split by '-' gives: ['item', unitType, number, YYYY, MM, DD]
        const idParts = item.id.split('-');
        if (idParts.length >= 6) {
          const unitType = idParts[1];
          const itemNumber = idParts[2];
          
          // Check if an item exists with same date_memorized and matches the pattern
          existingIndex = items.findIndex(i => 
            i.date_memorized === item.date_memorized &&
            i.status === 'active' &&
            i.id.startsWith(`item-${unitType}-${itemNumber}-`)
          );
        }
      }
      
      if (existingIndex >= 0) {
        // Merge existing item with new item data, but use the new item's reviews (they contain the latest updates)
        const existingItem = items[existingIndex];
        items[existingIndex] = { 
          ...existingItem, 
          ...item,
          // Use the new item's reviews_completed and reviews_missed (they contain the latest updates)
          reviews_completed: item.reviews_completed || existingItem.reviews_completed || [],
          reviews_missed: item.reviews_missed || existingItem.reviews_missed || []
        };
      } else {
        items.push(item);
      }
      
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      return true;
    } catch (error) {
      console.error('Error saving item:', error);
      return false;
    }
  },

  // Get all active items
  getAllItems() {
    try {
      const itemsStr = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (!itemsStr) return [];
      return JSON.parse(itemsStr);
    } catch (error) {
      console.error('Error getting items:', error);
      return [];
    }
  },

  // Get active items only
  getActiveItems() {
    return this.getAllItems().filter(item => item.status === 'active');
  },

  // Get item by ID
  getItemById(id) {
    const items = this.getAllItems();
    return items.find(item => item.id === id) || null;
  },

  // Mark a review as complete
  markReviewComplete(itemId, stationNumber, date) {
    try {
      const item = this.getItemById(itemId);
      if (!item) return false;

      const reviewDate = date || (DateUtils ? DateUtils.getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]);
      
      // Initialize arrays if they don't exist
      if (!item.reviews_completed) {
        item.reviews_completed = [];
      }
      if (!item.reviews_missed) {
        item.reviews_missed = [];
      }

      // Add review if not already completed
      const reviewKey = `${stationNumber}-${reviewDate}`;
      if (!item.reviews_completed.includes(reviewKey)) {
        item.reviews_completed.push(reviewKey);
      }

      // Remove from missed if it was there
      item.reviews_missed = item.reviews_missed.filter(
        missed => missed !== reviewKey
      );

      return this.saveItem(item);
    } catch (error) {
      console.error('Error marking review complete:', error);
      return false;
    }
  },

  // Unmark a review as complete
  unmarkReviewComplete(itemId, stationNumber, date) {
    try {
      const item = this.getItemById(itemId);
      if (!item) return false;

      const reviewDate = date || (DateUtils ? DateUtils.getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]);
      const reviewKey = `${stationNumber}-${reviewDate}`;
      
      // Initialize arrays if they don't exist
      if (!item.reviews_completed) {
        item.reviews_completed = [];
      }

      // Remove the review from completed
      item.reviews_completed = item.reviews_completed.filter(
        completed => completed !== reviewKey
      );

      return this.saveItem(item);
    } catch (error) {
      console.error('Error unmarking review complete:', error);
      return false;
    }
  },

  // Mark a review as missed
  markReviewMissed(itemId, stationNumber, date) {
    try {
      const item = this.getItemById(itemId);
      if (!item) return false;

      const reviewDate = date || (DateUtils ? DateUtils.getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]);
      
      // Initialize arrays if they don't exist
      if (!item.reviews_completed) {
        item.reviews_completed = [];
      }
      if (!item.reviews_missed) {
        item.reviews_missed = [];
      }

      // Add to missed if not already there
      const reviewKey = `${stationNumber}-${reviewDate}`;
      if (!item.reviews_missed.includes(reviewKey)) {
        item.reviews_missed.push(reviewKey);
      }

      return this.saveItem(item);
    } catch (error) {
      console.error('Error marking review missed:', error);
      return false;
    }
  },

  // Check if a review is completed
  isReviewCompleted(itemId, stationNumber, date) {
    const item = this.getItemById(itemId);
    if (!item || !item.reviews_completed) return false;
    
    const reviewDate = date || new Date().toISOString().split('T')[0];
    const reviewKey = `${stationNumber}-${reviewDate}`;
    return item.reviews_completed.includes(reviewKey);
  },

  // Archive an item
  archiveItem(itemId) {
    try {
      const item = this.getItemById(itemId);
      if (!item) return false;

      item.status = 'archived';
      item.archived_at = new Date().toISOString(); // Keep ISO for timestamp
      return this.saveItem(item);
    } catch (error) {
      console.error('Error archiving item:', error);
      return false;
    }
  },

  // Delete an item
  deleteItem(itemId) {
    try {
      const items = this.getAllItems();
      const filtered = items.filter(item => item.id !== itemId);
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      return false;
    }
  },

  // Delete all items
  deleteAllItems() {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error deleting all items:', error);
      return false;
    }
  },

  // Clear all data
  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
      localStorage.removeItem(STORAGE_KEYS.ITEMS);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  },

  // Export all data
  exportData() {
    try {
      const data = {
        config: this.getConfig(),
        items: this.getAllItems(),
        exported_at: new Date().toISOString() // Keep ISO for timestamp
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  },

  // Import data
  importData(dataString) {
    try {
      const data = JSON.parse(dataString);
      
      if (data.config) {
        this.saveConfig(data.config);
      }
      
      if (data.items && Array.isArray(data.items)) {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(data.items));
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  },

  // Save current view
  saveCurrentView(viewId) {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_VIEW, viewId);
      return true;
    } catch (error) {
      console.error('Error saving current view:', error);
      return false;
    }
  },

  // Get current view
  getCurrentView() {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_VIEW);
    } catch (error) {
      console.error('Error getting current view:', error);
      return null;
    }
  },

  // Check if install prompt has been shown
  hasInstallPromptBeenShown() {
    try {
      return localStorage.getItem(STORAGE_KEYS.INSTALL_PROMPT_SHOWN) === 'true';
    } catch (error) {
      console.error('Error checking install prompt status:', error);
      return false;
    }
  },

  // Mark install prompt as shown
  markInstallPromptShown() {
    try {
      localStorage.setItem(STORAGE_KEYS.INSTALL_PROMPT_SHOWN, 'true');
      return true;
    } catch (error) {
      console.error('Error marking install prompt as shown:', error);
      return false;
    }
  }
};

