/**
 * CareFlow Adapter
 * Adapts Heidi Health EMR UI to TemporalOS
 */

export class CareFlowAdapter {
  /**
   * Detect the current reasoning mode from the DOM
   */
  static detectMode(): 'past' | 'present' | 'future' | 'auto' {
    // Multi-signal detection
    const url = window.location.href.toLowerCase();
    const pageText = document.body?.innerText?.toLowerCase() || '';
    
    // Check active navigation or tabs
    const activeNavElements = document.querySelectorAll('[class*="active"], [class*="selected"], [aria-selected="true"]');
    let navText = '';
    activeNavElements.forEach(el => {
      navText += ' ' + (el.textContent || '').toLowerCase();
    });
    
    // Check for input focus (indicates current work)
    const activeElement = document.activeElement;
    const isTyping = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' ||
                      activeElement?.getAttribute('contenteditable') === 'true';
    
    // PAST mode detection
    const pastIndicators = [
      url.includes('history'),
      url.includes('past'),
      url.includes('previous'),
      url.includes('encounters'),
      pageText.includes('past visits'),
      pageText.includes('previous encounters'),
      pageText.includes('medical history'),
      pageText.includes('historical'),
      navText.includes('history'),
      navText.includes('past'),
      document.querySelector('[class*="history"]') !== null
    ];
    
    // FUTURE mode detection
    const futureIndicators = [
      url.includes('order'),
      url.includes('prescribe'),
      url.includes('prescription'),
      url.includes('plan'),
      url.includes('treatment'),
      pageText.includes('new prescription'),
      pageText.includes('add medication'),
      pageText.includes('treatment plan'),
      pageText.includes('order'),
      navText.includes('orders'),
      navText.includes('prescription'),
      navText.includes('plan'),
      document.querySelector('[class*="prescription"], [class*="order"]') !== null
    ];
    
    // PRESENT mode detection (assessment, documenting)
    const presentIndicators = [
      url.includes('note'),
      url.includes('documentation'),
      url.includes('assessment'),
      url.includes('scribe'),
      isTyping,
      pageText.includes('assessment'),
      pageText.includes('current visit'),
      pageText.includes('today'),
      navText.includes('note'),
      navText.includes('scribe')
    ];
    
    const pastScore = pastIndicators.filter(Boolean).length;
    const futureScore = futureIndicators.filter(Boolean).length;
    const presentScore = presentIndicators.filter(Boolean).length;
    
    console.log('[CareFlowAdapter] Mode detection scores:', { past: pastScore, present: presentScore, future: futureScore });
    
    // Return mode with highest score (minimum 2 indicators)
    if (pastScore >= 2 && pastScore > futureScore && pastScore > presentScore) {
      return 'past';
    }
    if (futureScore >= 2 && futureScore > pastScore && futureScore > presentScore) {
      return 'future';
    }
    if (presentScore >= 2) {
      return 'present';
    }
    
    // Default to present if scores are low or tied
    return 'present';
  }

  /**
   * Get real data from the page for a given mode
   */
  static getRealData(mode: 'past' | 'present' | 'future'): { title: string; items: any[] } {
    // Return empty data for now - can be enhanced to scrape actual page data
    return {
      title: mode === 'past' ? 'Historical Context' : mode === 'future' ? 'Future Planning' : 'Current Evaluation',
      items: []
    };
  }
}

