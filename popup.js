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
  
  let timer = null;
  let startTime = null;
  let elapsedTime = 0;
  let isRunning = false;
  let currentSessionTime = 0;
  
  // Load saved data
  chrome.storage.local.get(['totalTime', 'records'], function(data) {
    if (data.totalTime) {
      elapsedTime = data.totalTime;
      updateTotalTimeDisplay();
    }
    
    if (data.records) {
      renderRecords(data.records);
    }
  });
  
  // Start/Stop button click handler
  startStopBtn.addEventListener('click', function() {
    if (isRunning) {
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
    if (!isRunning) {
      startTime = new Date().getTime();
      isRunning = true;
      buttonText.textContent = 'Stop';
      buttonIcon.className = 'ri-pause-fill button-icon';
      startStopBtn.classList.add('is-running');
      
      timer = setInterval(updateTimer, 1000);
    }
  }
  
  function stopTimer() {
    if (isRunning) {
      clearInterval(timer);
      isRunning = false;
      buttonText.textContent = 'Start';
      buttonIcon.className = 'ri-play-fill button-icon';
      startStopBtn.classList.remove('is-running');
      
      const endTime = new Date().getTime();
      currentSessionTime = Math.floor((endTime - startTime) / 1000);
      elapsedTime += currentSessionTime;
      
      saveTime();
      updateTotalTimeDisplay();
      addRecord(currentSessionTime);
      currentSessionTime = 0;
      currentTimeDisplay.textContent = '00:00:00';
    }
  }
  
  function updateTimer() {
    const currentTime = new Date().getTime();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    currentSessionTime = elapsedSeconds;
    currentTimeDisplay.textContent = formatTime(elapsedSeconds, true);
  }
  
  function resetTimer() {
    if (isRunning) {
      stopTimer();
    }
    currentSessionTime = 0;
    currentTimeDisplay.textContent = '00:00:00';
  }
  
  function updateTotalTimeDisplay() {
    const totalHours = Math.floor(elapsedTime / 3600);
    const totalMinutes = Math.floor((elapsedTime % 3600) / 60);
    const totalSeconds = elapsedTime % 60;
    totalTimeDisplay.textContent = `Total: ${totalHours}h ${totalMinutes}m ${totalSeconds}s`;
  }
  
  function formatTime(seconds, showSeconds = true) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (showSeconds) {
      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
      ].join(':');
    } else {
      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0')
      ].join(':');
    }
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
    hours = hours ? hours : 12; // the hour '0' should be '12'
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
      const hours = Math.floor(record.duration / 3600);
      const minutes = Math.floor((record.duration % 3600) / 60);
      const seconds = record.duration % 60;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="record-date">${formatDate(record.date)}</td>
        <td class="record-duration">${hours}h ${minutes}m ${seconds}s</td>
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