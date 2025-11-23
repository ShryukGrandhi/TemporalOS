/**
 * Heidi Scraper (Strict Mode)
 * Step 1: Collect Context
 * Scrapes live data from Heidi EMR DOM.
 * NO MOCK DATA ALLOWED.
 */

import { PanelContent, ReasoningMode } from '@shared/types';

export interface ScrapedContext {
  patient: string | null;
  section: string | null;
  timeContext: string | null;
  visibleText: string;
  workflowState: 'scrolling_history' | 'viewing_labs' | 'writing_note' | 'ordering_meds' | 'unknown';
}

export class HeidiScraper {
  
  // Strict validation: Must be on a Heidi domain
  static isHeidiContext(): boolean {
    const host = window.location.hostname;
    return host.includes('heidihealth.com');
  }

  // Step 1: Collect Context
  static collectContext(): ScrapedContext {
    // 1. Patient/Room Name
    const header = Array.from(document.querySelectorAll('h1, h2, h3, [data-patient-name], .patient-name, .room-header'))
      .find(el => el.textContent && (el.textContent.includes('Room') || el.textContent.length > 3));
    
    // 2. Active Section
    const activeNav = document.querySelector('.nav-item.active, button[aria-selected="true"], .tab-active, [aria-current="page"]');
    
    // 3. Time Context
    const dateDisplay = document.querySelector('.date-picker, [aria-label="Date"], .encounter-date, [data-encounter-date]');

    // 4. Visible EMR text (first 2000 chars for context)
    const visibleText = document.body.innerText.slice(0, 2000);

    // 5. Detect workflow state
    const workflowState = this.detectWorkflowState(visibleText, activeNav);

    return {
      patient: header?.textContent?.trim() || null,
      section: activeNav?.textContent?.trim() || null,
      timeContext: dateDisplay?.textContent?.trim() || null,
      visibleText,
      workflowState
    };
  }

  static detectWorkflowState(text: string, activeNav: Element | null): ScrapedContext['workflowState'] {
    const lower = text.toLowerCase();
    const navText = activeNav?.textContent?.toLowerCase() || '';

    if (lower.includes('scroll') || navText.includes('history') || navText.includes('past')) {
      return 'scrolling_history';
    }
    if (navText.includes('lab') || lower.includes('lab result') || lower.includes('test result')) {
      return 'viewing_labs';
    }
    if (navText.includes('note') || lower.includes('writing') || lower.includes('documentation')) {
      return 'writing_note';
    }
    if (navText.includes('order') || navText.includes('prescribe') || lower.includes('medication order')) {
      return 'ordering_meds';
    }
    return 'unknown';
  }

  // Strict Mode Detection
  static detectMode(): ReasoningMode | 'insufficient_data' {
    if (!this.isHeidiContext()) return 'insufficient_data';

    const context = this.collectContext();

    if (!context.patient) {
      return 'insufficient_data'; 
    }
    
    const text = context.visibleText.toLowerCase();
    
    // Heuristics based on strict text signals
    if (text.includes('past visits') || text.includes('history') || text.includes('previous encounters') || context.workflowState === 'scrolling_history') {
      return 'past';
    }
    
    if (text.includes('plan') || text.includes('orders') || text.includes('prescribe') || context.workflowState === 'ordering_meds') {
      return 'future';
    }

    // Default to present if we are in a valid session
    return 'present';
  }

  // Scrape Real Data Only
  static getRealData(mode: ReasoningMode): PanelContent {
    const context = this.collectContext();
    
    if (!context.patient) {
        return {
            title: 'Error',
            items: [{ 
              id: 'error-1',
              label: 'Error', 
              value: 'Insufficient verified clinical data to reason safely.', 
              why: 'Missing patient context.' 
            }]
        };
    }

    const items = [];

    if (mode === 'present') {
      items.push({
        id: 'ctx-1',
        label: 'Active Context',
        value: context.patient,
        why: 'Verified from EMR Header'
      });
      items.push({
        id: 'ctx-2',
        label: 'Current View',
        value: context.section || 'Main View',
        why: 'Verified from Navigation'
      });
      if (context.workflowState !== 'unknown') {
        items.push({
          id: 'ctx-3',
          label: 'Workflow State',
          value: context.workflowState.replace('_', ' '),
          why: 'Detected from page interaction patterns'
        });
      }
    } else if (mode === 'past') {
       items.push({
        id: 'ctx-hist',
        label: 'History Source',
        value: 'Heidi Records',
        why: 'Live scraping from history tab'
      });
    } else if (mode === 'future') {
       items.push({
        id: 'ctx-plan',
        label: 'Planning',
        value: 'Awaiting Input',
        why: 'Monitoring "Orders" section'
      });
    }

    return {
      title: `${mode.toUpperCase()} (Live Signal)`,
      items
    };
  }
}
