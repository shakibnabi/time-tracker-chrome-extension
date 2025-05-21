// Developement by Shakib Nabi
// GitHub: https://github.com/shakibnabi
// Email: skbdevbd@gmail.com
// This is a simple timer extension for Chrome that tracks the time spent on a webpage.


document.addEventListener('DOMContentLoaded', function() {
  const startStopBtn = document.getElementById('startStopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const currentTimeDisplay = document.getElementById('currentTime');
  const totalTimeDisplay = document.getElementById('totalTime');
  const buttonText = document.getElementById('buttonText');
  const buttonIcon = document.getElementById('buttonIcon');
  const recordsBody = document.getElementById('recordsBody');
  
  let elapsedTime = 0;
  let uiUpdateInterval = null;

  // Load saved data
  chrome.storage.local.get(['totalTime', 'records'], function(data) {
    if (data.totalTime) {
      elapsedTime = data.totalTime;
      updateTotalTimeDisplay();
    }
    
    if (data.records) {
      renderRecords(data.records);
    }

    // Get current timer state from background
    chrome.runtime.sendMessage({ action: 'getTime' }, (response) => {
      if (response.isRunning) {
        startUIUpdates();
        buttonText.textContent = 'Stop';
        buttonIcon.className = 'ri-pause-fill button-icon';
        startStopBtn.classList.add('is-running');
      }
    });
  });

  // Start/Stop button click handler
  startStopBtn.addEventListener('click', function() {
    if (startStopBtn.classList.contains('is-running')) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  // Reset button click handler
  resetBtn.addEventListener('click', function() {
    resetTimer();
  });

  function startTimer() {
    chrome.runtime.sendMessage({ action: 'start' });
    startUIUpdates();
    buttonText.textContent = 'Stop';
    buttonIcon.className = 'ri-pause-fill button-icon';
    startStopBtn.classList.add('is-running');
  }

  function stopTimer() {
    chrome.runtime.sendMessage({ action: 'stop' }, (response) => {
      elapsedTime += response.elapsed;
      stopUIUpdates();
      
      buttonText.textContent = 'Start';
      buttonIcon.className = 'ri-play-fill button-icon';
      startStopBtn.classList.remove('is-running');
      
      saveTime();
      updateTotalTimeDisplay();
      addRecord(response.elapsed);
      currentTimeDisplay.textContent = '0s';
    });
  }

  function resetTimer() {
    chrome.runtime.sendMessage({ action: 'reset' });
    stopUIUpdates();
    
    elapsedTime = 0;
    chrome.storage.local.set({ totalTime: 0, records: [] }, function() {
      updateTotalTimeDisplay();
      renderRecords([]);
    });
    currentTimeDisplay.textContent = '0s';
    
    buttonText.textContent = 'Start';
    buttonIcon.className = 'ri-play-fill button-icon';
    startStopBtn.classList.remove('is-running');
  }

  function startUIUpdates() {
    stopUIUpdates();
    uiUpdateInterval = setInterval(() => {
      chrome.runtime.sendMessage({ action: 'getTime' }, (response) => {
        currentTimeDisplay.textContent = formatCompactTime(response.elapsedSeconds);
      });
    }, 200);
  }

  function stopUIUpdates() {
    if (uiUpdateInterval) {
      clearInterval(uiUpdateInterval);
      uiUpdateInterval = null;
    }
  }

  function updateTotalTimeDisplay() {
    totalTimeDisplay.textContent = `Total: ${formatCompactTime(elapsedTime)}`;
  }

  function formatCompactTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    if (secs > 0 || (hours === 0 && minutes === 0)) parts.push(`${secs}s`);
    
    return parts.join(' ') || '0s';
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month}, ${year} ${hours}:${minutes} ${ampm}`;
  }

  function saveTime() {
    chrome.storage.local.set({ totalTime: elapsedTime });
  }

  function addRecord(duration) {
    chrome.storage.local.get(['records'], function(data) {
      const records = data.records || [];
      const now = new Date();
      const record = {
        date: now.getTime(),
        duration: duration,
        timestamp: now.getTime()
      };
      
      records.unshift(record);
      
      if (records.length > 5) {
        records.pop();
      }
      
      chrome.storage.local.set({ records: records }, function() {
        renderRecords(records);
      });
    });
  }

  function renderRecords(records) {
    recordsBody.innerHTML = '';
    
    if (records.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="3" class="empty-state">No records yet</td>
      `;
      recordsBody.appendChild(row);
      return;
    }
    
    records.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="record-date">${formatDate(record.date)}</td>
        <td class="record-duration">${formatCompactTime(record.duration)}</td>
        <td style="text-align: right;">
          <button class="delete-btn" data-timestamp="${record.timestamp}">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      `;
      
      recordsBody.appendChild(row);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const timestamp = parseInt(this.getAttribute('data-timestamp'));
        deleteRecord(timestamp);
      });
    });
  }

  function deleteRecord(timestamp) {
    chrome.storage.local.get(['records', 'totalTime'], function(data) {
      const records = data.records || [];
      const totalTime = data.totalTime || 0;
      
      const recordIndex = records.findIndex(r => r.timestamp === timestamp);
      if (recordIndex !== -1) {
        const deletedRecord = records[recordIndex];
        const newTotalTime = totalTime - deletedRecord.duration;
        
        records.splice(recordIndex, 1);
        chrome.storage.local.set({
          records: records,
          totalTime: newTotalTime
        }, function() {
          elapsedTime = newTotalTime;
          updateTotalTimeDisplay();
          renderRecords(records);
        });
      }
    });
  }
});