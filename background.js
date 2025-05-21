let timer = {
  isRunning: false,
  startTime: null,
  elapsedSeconds: 0,
  lastUpdateTime: null,

  start() {
    if (!this.isRunning) {
      this.startTime = Date.now();
      this.isRunning = true;
      this.updateBadge();
    }
  },

  stop() {
    if (this.isRunning) {
      this.elapsedSeconds += Math.floor((Date.now() - this.startTime) / 1000);
      this.isRunning = false;
      chrome.action.setBadgeText({ text: '' });
      return this.elapsedSeconds;
    }
    return 0;
  },

  reset() {
    this.isRunning = false;
    this.startTime = null;
    this.elapsedSeconds = 0;
    chrome.action.setBadgeText({ text: '' });
  },

  getCurrentTime() {
    if (!this.isRunning) return this.elapsedSeconds;
    return this.elapsedSeconds + Math.floor((Date.now() - this.startTime) / 1000);
  },

  updateBadge() {
    if (!this.isRunning) return;
    
    const totalSeconds = this.getCurrentTime();
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let badgeText = '';
    if (hours > 0) badgeText = `${hours}h`;
    else if (minutes > 0) badgeText = `${minutes}m`;
    else badgeText = `${seconds}s`;
    
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: '#4361ee' });
    
    // Schedule next update
    setTimeout(() => this.updateBadge(), 1000);
  }
};

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'start':
      timer.start();
      break;
    case 'stop':
      const elapsed = timer.stop();
      sendResponse({ elapsed });
      break;
    case 'reset':
      timer.reset();
      break;
    case 'getTime':
      sendResponse({
        elapsedSeconds: timer.getCurrentTime(),
        isRunning: timer.isRunning
      });
      break;
  }
});

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(() => {});