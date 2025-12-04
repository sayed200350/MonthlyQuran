// shadcn-inspired UI Components
// Note: This is a standard object, not deprecated. Any deprecation warnings
// are likely false positives from browser dev tools or extensions.

const Components = {
  // Create a button element
  createButton(text, variant = 'default', size = 'default', onClick = null) {
    const button = document.createElement('button');
    button.className = `btn btn-${variant} btn-${size}`;
    button.textContent = text;
    
    if (onClick) {
      button.addEventListener('click', onClick);
    }
    
    return button;
  },

  // Create a card element
  createCard(content, className = '') {
    const card = document.createElement('div');
    card.className = `card ${className}`;
    
    if (typeof content === 'string') {
      // Use textContent for plain text, create element for HTML
      // Note: If HTML is truly needed, consider using DOMParser
      card.textContent = content;
    } else if (content instanceof HTMLElement) {
      card.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        if (item instanceof HTMLElement) {
          card.appendChild(item);
        }
      });
    }
    
    return card;
  },

  // Create an input element
  createInput(type, placeholder = '', value = '', className = '') {
    const input = document.createElement('input');
    input.type = type;
    input.className = `input ${className}`;
    input.placeholder = placeholder;
    input.value = value;
    return input;
  },

  // Create a label element
  createLabel(text, forId = '') {
    const label = document.createElement('label');
    label.textContent = text;
    if (forId) {
      label.setAttribute('for', forId);
    }
    return label;
  },

  // Create a form group
  createFormGroup(labelText, inputElement, labelId = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = this.createLabel(labelText, labelId);
    group.appendChild(label);
    
    if (inputElement) {
      if (labelId && inputElement.id !== labelId) {
        inputElement.id = labelId;
      }
      group.appendChild(inputElement);
    }
    
    return group;
  },

  // Create a task card with priority badge
  createTaskCard(item, stationNumber = null, priority = 1) {
    const card = document.createElement('div');
    card.className = 'schedule-item';
    card.dataset.itemId = item.id;
    
    // Get current date from UI context (using local date)
    const currentDate = window.UI && window.UI.currentDate 
      ? (DateUtils ? DateUtils.getLocalDateString(window.UI.currentDate) : window.UI.currentDate.toISOString().split('T')[0])
      : (DateUtils ? DateUtils.getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]);
    
    // Use stationNumber or default to 1 for checking completion
    const station = stationNumber || 1;
    const isCompleted = Storage.isReviewCompleted(item.id, station, currentDate);
    
    if (isCompleted) {
      card.classList.add('completed');
    }
    
    const content = document.createElement('div');
    content.className = 'schedule-item-content';
    
    const left = document.createElement('div');
    left.className = 'schedule-item-left';
    
    const meta = document.createElement('div');
    meta.className = 'schedule-item-meta';
    
    const title = document.createElement('h3');
    title.className = 'schedule-item-title';
    title.textContent = item.content_reference;
    meta.appendChild(title);
    
    if (stationNumber) {
      const station = document.createElement('span');
      station.className = 'schedule-item-station';
      station.textContent = i18n.t(`stations.${stationNumber}`);
      meta.appendChild(station);
    }
    
    // Priority badge
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-priority-${priority} schedule-item-priority`;
    if (priority === 1) {
      priorityBadge.textContent = i18n.t('today.priorityNew', 'New');
    } else if (priority === 2) {
      priorityBadge.textContent = i18n.t('today.priorityYesterday', 'Yesterday');
    } else {
      priorityBadge.textContent = i18n.t('today.prioritySpaced', 'Review');
    }
    meta.appendChild(priorityBadge);
    
    left.appendChild(meta);
    content.appendChild(left);
    
    const actions = document.createElement('div');
    actions.className = 'schedule-item-actions';
    
    // Checkbox
    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = `checkbox ${isCompleted ? 'checked' : ''}`;
    checkbox.disabled = false;
    checkbox.tabIndex = 0;
    const ariaLabel = isCompleted ? i18n.t('aria.markIncomplete') : i18n.t('aria.markComplete');
    checkbox.setAttribute('aria-label', ariaLabel);
    // Use SVG utils instead of innerHTML
    const svgIcon = isCompleted ? SVGUtils.createCheckboxChecked() : SVGUtils.createCheckboxUnchecked();
    checkbox.appendChild(svgIcon);
    
    // Use arrow function to preserve context
    checkbox.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Ensure Storage is available and has the method
      if (!Storage || typeof Storage.isReviewCompleted !== 'function') {
        Logger.error('Storage not available or missing method');
        return;
      }
      
      // Get the current date from UI context, preserving the selected date
      const uiDate = window.UI && window.UI.currentDate ? window.UI.currentDate : new Date();
      const currentDate = (typeof DateUtils !== 'undefined' && DateUtils.getLocalDateString) 
        ? DateUtils.getLocalDateString(uiDate) 
        : uiDate.toISOString().split('T')[0];
      
      const station = stationNumber || 1;
      
      // Check current completion status, not the captured value
      const currentlyCompleted = Storage.isReviewCompleted(item.id, station, currentDate);
      
      if (currentlyCompleted) {
        Storage.unmarkReviewComplete(item.id, station, currentDate);
      } else {
        Storage.markReviewComplete(item.id, station, currentDate);
      }
      
      // Re-render the view, preserving the current date context
      if (window.UI && window.UI.renderTodayView) {
        window.UI.renderTodayView(uiDate);
      }
    });
    
    // Add checkbox first
    actions.appendChild(checkbox);
    
    // Read icon button (if online and unit type is page) - placed on opposite side from checkbox
    if (navigator.onLine && typeof Storage !== 'undefined') {
      const config = Storage.getConfig();
      if (config && config.unit_type === 'page') {
        // Extract page number from content_reference
        const pageMatch = item.content_reference.match(/\d+/);
        if (pageMatch) {
          const pageNumber = parseInt(pageMatch[0]);
          const readIconBtn = document.createElement('button');
          readIconBtn.type = 'button';
          readIconBtn.className = 'btn-icon';
          readIconBtn.setAttribute('aria-label', i18n.t('today.readText'));
          readIconBtn.style.cssText = 'margin-left: 0.5rem;';
          readIconBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            Components.showReadingModal(pageNumber, 'page');
          });
          
          // Add book icon
          const bookIcon = SVGUtils.createBookIcon();
          bookIcon.style.cssText = 'width: 1.25rem; height: 1.25rem;';
          readIconBtn.appendChild(bookIcon);
          
          // Insert before checkbox (so it appears on the left in LTR, right in RTL)
          actions.insertBefore(readIconBtn, checkbox);
        }
      }
    }
    content.appendChild(actions);
    card.appendChild(content);
    
    return card;
  },
  
  // Create quick stats component
  createQuickStats(total, completed) {
    const stats = document.createElement('div');
    stats.className = 'quick-stats';
    
    const content = document.createElement('div');
    content.className = 'quick-stats-content';
    
    const text = document.createElement('div');
    text.className = 'quick-stats-text';
    const statsText = i18n.t('today.stats', { total, completed });
    // Use textContent instead of innerHTML for safety
    text.textContent = statsText.replace(/\{\{total\}\}/g, total).replace(/\{\{completed\}\}/g, completed);
    
    content.appendChild(text);
    stats.appendChild(content);
    
    return stats;
  },
  
  // Create progress timeline item
  createProgressTimelineItem(item) {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    timelineItem.dataset.itemId = item.id;
    
    const header = document.createElement('div');
    header.className = 'timeline-item-header';
    
    const title = document.createElement('h3');
    title.className = 'timeline-item-title';
    title.textContent = item.content_reference;
    header.appendChild(title);
    
    // Calculate current station and next review date
    const memDate = DateUtils ? DateUtils.normalizeDate(item.date_memorized) : new Date(item.date_memorized);
    const today = DateUtils ? DateUtils.normalizeDate(new Date()) : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
    const daysPassed = DateUtils ? DateUtils.daysDifference(today, memDate) : Math.floor((today - memDate) / (1000 * 60 * 60 * 24));
    
    const reviewDates = Algorithm.calculateReviewDates(item.date_memorized);
    let currentStation = 0;
    let nextReviewDate = null;
    
    // Find current station
    for (let i = reviewDates.length - 1; i >= 0; i--) {
      const reviewDate = DateUtils ? DateUtils.normalizeDate(reviewDates[i].date) : (() => { const d = new Date(reviewDates[i].date); d.setHours(0, 0, 0, 0); return d; })();
      const reviewKey = `${reviewDates[i].station}-${reviewDates[i].date}`;
      const isCompleted = item.reviews_completed && item.reviews_completed.includes(reviewKey);
      
      if (reviewDate <= today && isCompleted) {
        currentStation = reviewDates[i].station;
        // Find next review
        if (i < reviewDates.length - 1) {
          nextReviewDate = reviewDates[i + 1];
        }
        break;
      } else if (reviewDate <= today && !isCompleted) {
        currentStation = reviewDates[i].station;
        nextReviewDate = reviewDates[i];
        break;
      }
    }
    
    // If no current station, it's new (station 0)
    if (currentStation === 0 && daysPassed >= 0) {
      currentStation = 1;
      nextReviewDate = reviewDates[0];
    }
    
    const meta = document.createElement('div');
    meta.className = 'timeline-item-meta';
    if (nextReviewDate) {
      const nextReview = document.createElement('div');
      const nextReviewText = i18n.t('progress.nextReview', { date: new Date(nextReviewDate.date).toLocaleDateString() });
      nextReview.textContent = nextReviewText.replace(/\{\{date\}\}/g, new Date(nextReviewDate.date).toLocaleDateString());
      meta.appendChild(nextReview);
    }
    const currentStationText = document.createElement('div');
    const stationText = i18n.t('progress.currentStation', { station: currentStation });
    currentStationText.textContent = stationText.replace(/\{\{station\}\}/g, currentStation);
    meta.appendChild(currentStationText);
    
    // Station indicators
    const stationsContainer = document.createElement('div');
    stationsContainer.className = 'timeline-item-stations';
    
    for (let i = 1; i <= 7; i++) {
      const reviewDate = reviewDates[i - 1];
      const reviewKey = `${reviewDate.station}-${reviewDate.date}`;
      const isCompleted = item.reviews_completed && item.reviews_completed.includes(reviewKey);
      const reviewDateObj = DateUtils ? DateUtils.normalizeDate(reviewDate.date) : (() => { const d = new Date(reviewDate.date); d.setHours(0, 0, 0, 0); return d; })();
      const isPast = reviewDateObj <= today;
      
      const indicator = this.createStationIndicator(i, isCompleted, i === currentStation, !isPast && i > currentStation);
      
      if (i > 1) {
        const line = document.createElement('div');
        line.className = `station-progress-line ${isCompleted ? 'completed' : ''}`;
        stationsContainer.appendChild(line);
      }
      
      stationsContainer.appendChild(indicator);
    }
    
    timelineItem.appendChild(header);
    timelineItem.appendChild(meta);
    timelineItem.appendChild(stationsContainer);
    
    return timelineItem;
  },
  
  // Create station indicator
  createStationIndicator(stationNumber, completed, isCurrent, isUpcoming) {
    const indicator = document.createElement('div');
    indicator.className = 'station-indicator';
    
    if (completed) {
      indicator.classList.add('completed');
    } else if (isCurrent) {
      indicator.classList.add('current');
    } else if (isUpcoming) {
      indicator.classList.add('upcoming');
    }
    
    indicator.textContent = stationNumber;
    indicator.setAttribute('title', i18n.t(`stations.${stationNumber}`));
    
    return indicator;
  },
  
  // Create a schedule item card (legacy, for backward compatibility)
  createScheduleItem(item, stationNumber = null) {
    const card = document.createElement('div');
    card.className = 'schedule-item';
    card.dataset.itemId = item.id;
    
    // Get current date from the date input (using local date)
    const dateInput = document.getElementById('current-date');
    const currentDate = dateInput ? dateInput.value : (DateUtils ? DateUtils.getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]);
    
    const isCompleted = stationNumber 
      ? Storage.isReviewCompleted(item.id, stationNumber, currentDate)
      : false;
    
    if (isCompleted) {
      card.classList.add('completed');
    }
    
    const content = document.createElement('div');
    content.className = 'schedule-item-content';
    
    const title = document.createElement('h3');
    title.className = 'schedule-item-title';
    title.textContent = item.content_reference;
    content.appendChild(title);
    
    if (stationNumber) {
      const station = document.createElement('span');
      station.className = 'schedule-item-station';
      station.textContent = i18n.t(`stations.${stationNumber}`);
      content.appendChild(station);
    }
    
    const actions = document.createElement('div');
    actions.className = 'schedule-item-actions';
    
    // Checkbox
    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = `checkbox ${isCompleted ? 'checked' : ''}`;
    const ariaLabel = isCompleted ? i18n.t('aria.markIncomplete') : i18n.t('aria.markComplete');
    checkbox.setAttribute('aria-label', ariaLabel);
    checkbox.innerHTML = isCompleted 
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>';
    
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Get current date from the date input
      const dateInput = document.getElementById('current-date');
      const currentDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
      
      // For new memorization items, use station 1 (morning review)
      const station = stationNumber || 1;
      
      // Check current completion status, not the captured value
      const currentlyCompleted = Storage.isReviewCompleted(item.id, station, currentDate);
      
      if (currentlyCompleted) {
        // Uncheck - remove from completed
        Storage.unmarkReviewComplete(item.id, station, currentDate);
      } else {
        // Mark as complete
        Storage.markReviewComplete(item.id, station, currentDate);
      }
      
      // Re-render the schedule
      if (window.UI && window.UI.renderDailySchedule) {
        const dateInput = document.getElementById('current-date');
        const date = dateInput ? new Date(dateInput.value) : new Date();
        window.UI.renderDailySchedule(date);
      }
    });
    
    actions.appendChild(checkbox);
    content.appendChild(actions);
    card.appendChild(content);
    
    return card;
  },

  // Create an empty state message
  createEmptyState(message) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = message;
    return empty;
  },

  // Create a badge/chip
  createBadge(text, variant = 'default') {
    const badge = document.createElement('span');
    badge.className = `badge badge-${variant}`;
    badge.textContent = text;
    return badge;
  },
  
  // Show reading modal
  async showReadingModal(unitNumber, unitType = 'page') {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      overflow-y: auto;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.style.cssText = `
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.5rem;
      max-width: 90%;
      max-height: 90vh;
      width: 100%;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.className = 'dialog-title';
    title.style.cssText = 'font-size: 1.25rem; font-weight: 600; margin: 0 0 1rem 0; color: var(--fg);';
    title.textContent = i18n.t('reading.title');
    dialog.appendChild(title);

    const content = document.createElement('div');
    content.id = 'reading-content';
    content.style.cssText = `
      font-family: 'Scheherazade New', 'IBM Plex Sans Arabic', serif;
      font-size: 1.5rem;
      line-height: 2.5;
      text-align: right;
      direction: rtl;
      color: var(--fg);
      margin: 1rem 0;
      min-height: 100px;
    `;
    const loadingText = document.createElement('div');
    loadingText.textContent = i18n.t('reading.loading');
    content.appendChild(loadingText);
    dialog.appendChild(content);

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 1.5rem;';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-ghost';
    closeBtn.textContent = i18n.t('reading.close');
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    buttons.appendChild(closeBtn);

    dialog.appendChild(buttons);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
    closeBtn.focus();

    // Fetch text
    try {
      let textData = null;
      if (unitType === 'page') {
        textData = await QuranAPI.fetchPageText(unitNumber);
      }
      
      if (textData && textData.data && textData.data.ayahs) {
        const ayahs = textData.data.ayahs;
        
        // Clear loading text
        content.innerHTML = '';
        
        // Create container for ayahs
        ayahs.forEach((ayah, index) => {
          // Create ayah container
          const ayahContainer = document.createElement('div');
          ayahContainer.style.cssText = `
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
          `;
          
          // Create ayah number badge
          const ayahNumber = document.createElement('span');
          ayahNumber.style.cssText = `
            display: inline-block;
            background-color: var(--muted-bg);
            color: var(--muted-fg);
            font-size: 0.875rem;
            font-weight: 600;
            padding: 0.25rem 0.5rem;
            border-radius: 50%;
            margin-left: 0.5rem;
            min-width: 2rem;
            text-align: center;
            font-family: 'IBM Plex Sans Arabic', sans-serif;
          `;
          ayahNumber.textContent = ayah.numberInSurah || (index + 1);
          ayahContainer.appendChild(ayahNumber);
          
          // Create ayah text
          const ayahText = document.createElement('span');
          ayahText.style.cssText = `
            font-family: 'Scheherazade New', 'IBM Plex Sans Arabic', serif;
            font-size: 1.5rem;
            line-height: 2.5;
          `;
          ayahText.textContent = ayah.text;
          ayahContainer.appendChild(ayahText);
          
          content.appendChild(ayahContainer);
        });
        
        // Remove border from last ayah
        if (ayahs.length > 0) {
          const lastAyah = content.lastElementChild;
          if (lastAyah) {
            lastAyah.style.borderBottom = 'none';
            lastAyah.style.marginBottom = '0';
            lastAyah.style.paddingBottom = '0';
          }
        }
      } else {
        content.innerHTML = '';
        const errorText = document.createElement('div');
        errorText.textContent = i18n.t('reading.error');
        content.appendChild(errorText);
      }
    } catch (error) {
      Logger.error('Error fetching reading text:', error);
      content.innerHTML = '';
      const errorText = document.createElement('div');
      errorText.textContent = i18n.t('reading.error');
      content.appendChild(errorText);
    }
  }
};

