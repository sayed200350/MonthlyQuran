// Spaced Repetition Algorithm Implementation

// Review intervals in days from memorization date
// Station 1: Day 0 AM, Station 2: Day 0 PM, Station 3: Day 1, Station 4: Day 4, etc.
const REVIEW_OFFSETS = [0, 0, 1, 4, 11, 25, 55];

// Date utility functions using device local time
const DateUtils = {
  // Normalize a date to local midnight (0,0,0,0)
  normalizeDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  // Get local date string in YYYY-MM-DD format (not UTC)
  getLocalDateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Check if two dates are the same local day
  isSameLocalDay(date1, date2) {
    const d1 = this.normalizeDate(date1);
    const d2 = this.normalizeDate(date2);
    return d1.getTime() === d2.getTime();
  },

  // Calculate days difference between two dates (normalized to local midnight)
  daysDifference(date1, date2) {
    const d1 = this.normalizeDate(date1);
    const d2 = this.normalizeDate(date2);
    return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
  }
};

const Algorithm = {
  // Calculate all 7 review dates for a memorization date
  calculateReviewDates(memorizationDate) {
    const memDate = DateUtils.normalizeDate(memorizationDate);
    const dates = [];
    
    REVIEW_OFFSETS.forEach((offset, index) => {
      const reviewDate = new Date(memDate);
      reviewDate.setDate(reviewDate.getDate() + offset);
      
      // For same-day reviews (Station 1 & 2), we need to distinguish AM/PM
      if (offset === 0) {
        dates.push({
          station: index + 1,
          date: DateUtils.getLocalDateString(reviewDate),
          timeOfDay: index === 0 ? 'morning' : 'evening'
        });
      } else {
        dates.push({
          station: index + 1,
          date: DateUtils.getLocalDateString(reviewDate),
          timeOfDay: 'any'
        });
      }
    });
    
    return dates;
  },

  // Get the review date for a specific station
  getReviewDateForStation(memorizationDate, stationNumber) {
    if (stationNumber < 1 || stationNumber > 7) return null;
    
    const memDate = DateUtils.normalizeDate(memorizationDate);
    const offset = REVIEW_OFFSETS[stationNumber - 1];
    const reviewDate = new Date(memDate);
    reviewDate.setDate(reviewDate.getDate() + offset);
    
    return DateUtils.getLocalDateString(reviewDate);
  },

  // Check if a review is due on a specific date
  isReviewDue(item, targetDate, stationNumber) {
    if (!item || !item.date_memorized) return false;
    
    const daysPassed = DateUtils.daysDifference(targetDate, item.date_memorized);
    
    // Get expected offset for this station
    const expectedOffset = REVIEW_OFFSETS[stationNumber - 1];
    
    // For same-day reviews (Station 1 & 2), check if it's the same day
    if (expectedOffset === 0) {
      return daysPassed === 0;
    }
    
    return daysPassed === expectedOffset;
  },

  // Get all reviews due on a specific date
  getReviewsDueOnDate(item, targetDate) {
    if (!item || !item.date_memorized) return [];
    
    const daysPassed = DateUtils.daysDifference(targetDate, item.date_memorized);
    
    const dueReviews = [];
    
    REVIEW_OFFSETS.forEach((offset, index) => {
      const station = index + 1;
      
      if (offset === 0 && daysPassed === 0) {
        // Same day reviews - both stations are due
        dueReviews.push({
          station: station,
          timeOfDay: station === 1 ? 'morning' : 'evening'
        });
      } else if (daysPassed === offset) {
        dueReviews.push({
          station: station,
          timeOfDay: 'any'
        });
      }
    });
    
    return dueReviews;
  },

  // Generate daily schedule for a target date
  // isSelectedDate: true if viewing a manually selected date (not real-time today)
  getDailySchedule(targetDate, allItems, config, storageCheckFn = null, isSelectedDate = false) {
    const target = DateUtils.normalizeDate(targetDate);
    const targetDateStr = DateUtils.getLocalDateString(target);
    const now = new Date();
    const currentHour = now.getHours();
    const today = DateUtils.normalizeDate(now);
    const todayStr = DateUtils.getLocalDateString(today);
    
    const schedule = {
      new_memorization: [],
      yesterday_review: [],
      spaced_review: []
    };

    if (!config || !config.start_date) {
      return schedule;
    }

    // Get morning and evening hours from config
    const morningHour = config.morning_hour !== undefined ? config.morning_hour : 6;
    const eveningHour = config.evening_hour !== undefined ? config.evening_hour : 20;

    // Use provided storage check function or fallback to global Storage
    const isReviewCompleted = storageCheckFn || 
      (typeof Storage !== 'undefined' && Storage.isReviewCompleted 
        ? (id, station, date) => Storage.isReviewCompleted(id, station, date)
        : () => false);

    const startDate = DateUtils.normalizeDate(config.start_date);
    const daysSinceStart = DateUtils.daysDifference(target, startDate);
    
    // For selected dates, always show tasks regardless of time
    // For real-time today, respect time-based filtering
    const isToday = targetDateStr === todayStr;
    const shouldShowTasks = isSelectedDate || !isToday || (isToday && currentHour >= morningHour);

    // Calculate new memorization items for target date (1 unit per day)
    const totalUnits = config.total_units || 30;
    if (daysSinceStart >= 0 && daysSinceStart < totalUnits) {
      const unitType = config.unit_type || 'page';
      // 1 unit per day, so itemNumber = daysSinceStart + 1
      const itemNumber = daysSinceStart + 1;
      const contentRef = this.formatContentReference(unitType, itemNumber);
      
      // Check if this item already exists by date_memorized and item number pattern
      // Don't check by content_reference as it changes with language
      const existingItem = allItems.find(
        item => item.status === 'active' &&
                item.date_memorized === targetDateStr &&
                (item.id.startsWith(`item-${unitType}-${itemNumber}-`) ||
                 item.id.includes(`-${itemNumber}-${targetDateStr}`))
      );
      
      if (!existingItem) {
        // New item - items should be created in renderTodayView before schedule generation
        // Here we just indicate it should be created, but don't create it
        if (isToday && !isSelectedDate) {
          // For real-time today, show both morning and evening tasks if morning hour has passed
          if (currentHour >= morningHour) {
            schedule.new_memorization.push({
              id: `new-${targetDateStr}-${itemNumber}-morning`,
              content_reference: contentRef,
              date_memorized: targetDateStr,
              status: 'active',
              reviews_completed: [],
              reviews_missed: [],
              timeOfDay: 'morning',
              dueStation: 1
            });
            // Also show evening task (both tasks should be visible on first day)
            schedule.new_memorization.push({
              id: `new-${targetDateStr}-${itemNumber}-evening`,
              content_reference: contentRef,
              date_memorized: targetDateStr,
              status: 'active',
              reviews_completed: [],
              reviews_missed: [],
              timeOfDay: 'evening',
              dueStation: 2
            });
          }
        } else {
          // For selected dates or future dates, always include
          schedule.new_memorization.push({
            id: `new-${targetDateStr}-${itemNumber}`,
            content_reference: contentRef,
            date_memorized: targetDateStr,
            status: 'active',
            reviews_completed: [],
            reviews_missed: []
          });
        }
      } else {
        // Item exists, check if it needs review on target date
        const daysSinceMem = DateUtils.daysDifference(target, existingItem.date_memorized);
        const isMemorizedOnTargetDate = daysSinceMem === 0;
        
        // If item was memorized on target date, show both morning and evening tasks
        if (isMemorizedOnTargetDate && isToday && !isSelectedDate) {
          // For real-time today, respect time filtering
          if (currentHour >= morningHour) {
            schedule.new_memorization.push({
              ...existingItem,
              timeOfDay: 'morning',
              dueStation: 1
            });
            schedule.new_memorization.push({
              ...existingItem,
              timeOfDay: 'evening',
              dueStation: 2
            });
          }
        } else if (isMemorizedOnTargetDate && (isSelectedDate || !isToday)) {
          // For selected dates or past dates, always show both tasks
          schedule.new_memorization.push({
            ...existingItem,
            timeOfDay: 'morning',
            dueStation: 1
          });
          schedule.new_memorization.push({
            ...existingItem,
            timeOfDay: 'evening',
            dueStation: 2
          });
        } else {
          // For other days, check reviews normally
          const reviewsDue = this.getReviewsDueOnDate(existingItem, targetDateStr);
          
          if (reviewsDue.length > 0) {
            // Filter by time of day for stations 1 & 2
            const morningReview = reviewsDue.find(r => r.station === 1 && r.timeOfDay === 'morning');
            const eveningReview = reviewsDue.find(r => r.station === 2 && r.timeOfDay === 'evening');
            
            if (isToday && !isSelectedDate) {
              if (!morningReview && !eveningReview) {
                // Other stations (not 1 or 2) - show after morning hour
                if (currentHour >= morningHour) {
                  schedule.new_memorization.push(existingItem);
                }
              }
            } else {
              // For selected dates or future dates, include all
              schedule.new_memorization.push(existingItem);
            }
          }
        }
      }
    }

    // Check ALL existing items for reviews due on target date
    // This ensures we catch reviews for all units, not just the one being memorized on target date
    
    allItems.forEach(item => {
      if (item.status !== 'active' || !item.date_memorized) return;
      
      const daysPassed = DateUtils.daysDifference(target, item.date_memorized);
      
      // Skip if this item is being handled in the new memorization section above
      // (only skip if it's the item being memorized on target date)
      const isNewItemOnTargetDate = daysPassed === 0 && 
        daysSinceStart >= 0 && 
        daysSinceStart < totalUnits &&
        item.content_reference === this.formatContentReference(config.unit_type || 'page', daysSinceStart + 1);
      
      if (isNewItemOnTargetDate) {
        // This item is already handled in the new memorization section above
        return;
      }
      
      // Check all review stations for this item
      const reviewsDue = this.getReviewsDueOnDate(item, targetDateStr);
      
      if (reviewsDue.length > 0) {
        reviewsDue.forEach(review => {
          const station = review.station;
          const completed = isReviewCompleted(item.id, station, targetDateStr);
          
          // Show all reviews regardless of completion status (like new memorization tasks)
          // Station 1 & 2: Same day (morning/evening)
          if (station === 1 || station === 2) {
            const isMemorizedOnTargetDate = daysPassed === 0;
            if (isMemorizedOnTargetDate) {
              // Show both morning and evening tasks
              if (isSelectedDate || !isToday || (isToday && currentHour >= morningHour)) {
                if (station === 1 && review.timeOfDay === 'morning') {
                  schedule.new_memorization.push({
                    ...item,
                    timeOfDay: 'morning',
                    dueStation: 1
                  });
                } else if (station === 2 && review.timeOfDay === 'evening') {
                  schedule.new_memorization.push({
                    ...item,
                    timeOfDay: 'evening',
                    dueStation: 2
                  });
                }
              }
            }
          }
          // Station 3: +1 day review (show even if completed)
          else if (station === 3 && daysPassed === 1) {
            if (isSelectedDate || !isToday || (isToday && currentHour >= morningHour)) {
              schedule.yesterday_review.push({
                ...item,
                dueStation: 3
              });
            }
          }
          // Stations 4-7: Spaced reviews (show even if completed)
          else if (station >= 4 && station <= 7) {
            const expectedOffsets = [4, 11, 25, 55];
            const expectedStations = [4, 5, 6, 7];
            const stationIndex = expectedStations.indexOf(station);
            
            if (stationIndex >= 0 && daysPassed === expectedOffsets[stationIndex]) {
              if (isSelectedDate || !isToday || (isToday && currentHour >= morningHour)) {
                schedule.spaced_review.push({
                  ...item,
                  dueStation: station
                });
              }
            }
          }
        });
      }
    });

    return schedule;
  },

  // Format content reference based on unit type
  formatContentReference(unitType, number) {
    // Use i18n if available, otherwise fallback to English
    if (typeof i18n !== 'undefined') {
      const unitName = i18n.t(`units.${unitType}`);
      return `${unitName} ${number}`;
    }
    // Fallback to English
    switch (unitType) {
      case 'page':
        return `Page ${number}`;
      case 'verse':
        return `Ayah ${number}`;
      case 'hizb':
        return `Hizb ${number}`;
      case 'juz':
        return `Juz ${number}`;
      default:
        return `Unit ${number}`;
    }
  },

  // Get next page/unit number to memorize
  getNextPageNumber(allItems, config) {
    if (!config || !allItems.length) return 1;
    
    const activeItems = allItems.filter(item => item.status === 'active');
    if (activeItems.length === 0) return 1;
    
    // Extract numbers from content references
    const numbers = activeItems
      .map(item => {
        const match = item.content_reference.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter(num => num > 0);
    
    if (numbers.length === 0) return 1;
    
    return Math.max(...numbers) + 1;
  },

  // Get progress statistics relative to today's date
  getProgressStats(allItems, config) {
    if (!config || !config.start_date) {
      return {
        totalItems: 0,
        totalReviews: 0,
        completedReviews: 0,
        completionRate: 0
      };
    }

    const today = DateUtils.normalizeDate(new Date());
    const startDate = DateUtils.normalizeDate(config.start_date);
    
    // Calculate how many days have passed since start (including today)
    const daysSinceStart = DateUtils.daysDifference(today, startDate);
    
    // If we haven't started yet, return zeros
    if (daysSinceStart < 0) {
      return {
        totalItems: 0,
        totalReviews: 0,
        completedReviews: 0,
        completionRate: 0
      };
    }

    // Calculate expected items up to and including today (1 unit per day)
    const totalUnits = config.total_units || 30;
    const expectedItemsCount = Math.min(daysSinceStart + 1, totalUnits);
    
    // Build a map of expected items by date
    const expectedItemsByDate = {};
    const daysToProcess = Math.min(daysSinceStart + 1, totalUnits);
    for (let day = 0; day < daysToProcess; day++) {
      const itemDate = new Date(startDate);
      itemDate.setDate(itemDate.getDate() + day);
      const dateStr = DateUtils.getLocalDateString(itemDate);
      
      // 1 unit per day, so itemNumber = day + 1
      const itemNumber = day + 1;
      const contentRef = this.formatContentReference(config.unit_type || 'page', itemNumber);
      if (!expectedItemsByDate[dateStr]) {
        expectedItemsByDate[dateStr] = [];
      }
      expectedItemsByDate[dateStr].push({
        content_reference: contentRef,
        date_memorized: dateStr,
        expected_number: itemNumber
      });
    }
    
    // Get actual items that exist
    const activeItems = allItems.filter(item => item.status === 'active');
    const itemsMap = new Map();
    activeItems.forEach(item => {
      itemsMap.set(item.content_reference, item);
    });
    
    // Count items and reviews
    let totalItems = 0;
    let totalReviews = 0;
    let completedReviews = 0;
    
    Object.values(expectedItemsByDate).flat().forEach(expectedItem => {
      const actualItem = itemsMap.get(expectedItem.content_reference);
      const expectedItemDate = DateUtils.normalizeDate(expectedItem.date_memorized);
      
      // Count item if it exists or if it should exist by today
      if (actualItem || expectedItemDate <= today) {
        totalItems++;
      }
      
      // Only process reviews for items that actually exist
      if (actualItem && actualItem.date_memorized) {
        // Calculate which reviews should have been completed by today
        const reviewDates = this.calculateReviewDates(actualItem.date_memorized);
        const reviewsDueByToday = reviewDates.filter(review => {
          const reviewDate = DateUtils.normalizeDate(review.date);
          return reviewDate <= today;
        });
        
        // Count reviews that should be done by today
        totalReviews += reviewsDueByToday.length;
        
        // Count completed reviews that were due by today
        if (actualItem.reviews_completed && actualItem.reviews_completed.length > 0) {
          reviewsDueByToday.forEach(review => {
            // Check if this review was completed
            const reviewKey = `${review.station}-${review.date}`;
            const isCompleted = actualItem.reviews_completed.includes(reviewKey);
            if (isCompleted) {
              completedReviews++;
            }
          });
        }
      }
    });
    
    return {
      totalItems,
      totalReviews,
      completedReviews,
      completionRate: totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0
    };
  }
};

// Expose DateUtils globally for use in other modules
window.DateUtils = DateUtils;

