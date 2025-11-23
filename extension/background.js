/**
 * TemporalOS Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TemporalOS] Extension installed');
});

// Listen for tab updates to detect EMR navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a Heidi EMR page
    if (tab.url.includes('heidihealth.com') || tab.url.includes('localhost')) {
      // Initialize temporal reasoning for this tab
      chrome.tabs.sendMessage(tabId, {
        type: 'INIT_TEMPORALOS'
      }).catch(() => {
        // Content script may not be ready yet
      });
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_REASONING') {
    // Forward to backend
    fetch('http://localhost:3000/api/reasoning/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript: message.transcript,
        context: message.context
      })
    })
      .then(res => res.json())
      .then(data => {
        // Broadcast mode update
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'TEMPORAL_MODE_UPDATE',
          mode: data.mode,
          confidence: data.confidence,
          reason: data.reason
        });
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('[TemporalOS] Error analyzing reasoning:', err);
        sendResponse({ success: false, error: err.message });
      });
    
    return true; // Keep channel open for async response
  }
});

