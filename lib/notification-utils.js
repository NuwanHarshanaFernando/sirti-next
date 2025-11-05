"use client";

// Utility functions for managing viewed notifications in localStorage

export const getViewedNotifications = (userEmail) => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`viewedNotifications_${userEmail}`);
  return stored ? JSON.parse(stored) : [];
};

export const markNotificationAsViewed = (notificationId, userEmail) => {
  if (typeof window === 'undefined') return;
  
  const viewedNotifications = getViewedNotifications(userEmail);
  if (!viewedNotifications.includes(notificationId)) {
    viewedNotifications.push(notificationId);
    localStorage.setItem(`viewedNotifications_${userEmail}`, JSON.stringify(viewedNotifications));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('viewedNotificationsChanged', {
      detail: { notificationId, userEmail }
    }));
  }
};

export const clearViewedNotifications = (userEmail) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`viewedNotifications_${userEmail}`);
};

export const isNotificationViewed = (notificationId, userEmail) => {
  const viewedNotifications = getViewedNotifications(userEmail);
  const isViewed = viewedNotifications.includes(notificationId);
  
  
  return isViewed;
};

// Helper function to debug viewed notifications
export const debugViewedNotifications = (userEmail) => {
  if (typeof window === 'undefined') return;
  const viewedNotifications = getViewedNotifications(userEmail);
  return viewedNotifications;
};

// Helper function to generate user-specific notification IDs (for consistency)
export const generateUserSpecificNotificationId = (baseId, userEmail) => {
  if (!userEmail) return baseId;
  // Create a hash of the user email to keep IDs manageable
  const userHash = btoa(userEmail).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  return `${baseId}-user-${userHash}`;
};
