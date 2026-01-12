import axios from '../api/axios';

/**
 * SCORM 1.2 API Implementation
 * 
 * This class implements the SCORM 1.2 API standard that SCORM content expects.
 * It bridges communication between SCORM content and our backend LMS.
 * 
 * SCORM 1.2 API Methods:
 * 1. LMSInitialize() - Initialize communication
 * 2. LMSFinish() - Close communication
 * 3. LMSGetValue(element) - Get data from LMS
 * 4. LMSSetValue(element, value) - Send data to LMS
 * 5. LMSCommit() - Save data
 * 6. LMSGetLastError() - Get error code
 * 7. LMSGetErrorString(errorCode) - Get error message
 * 8. LMSGetDiagnostic(errorCode) - Get diagnostic info
 */
class SCORMAPI {
  constructor(contentId, contentType, userId) {
    this.contentId = contentId;
    this.contentType = contentType;
    this.userId = userId;
    this.initialized = false;
    this.data = {};
    this.errorCode = 0;
    this.errorString = '';
    this.diagnostic = '';
    
    // Debounce timer for auto-commit
    this.commitTimer = null;
    
    // Track if data has changed (for auto-commit)
    this.hasUncommittedChanges = false;
  }

  /**
   * Initialize communication with LMS
   * @param {string} parameter - Reserved for future use
   * @returns {string} "true" on success, "false" on error
   */
  LMSInitialize(parameter = '') {
    if (this.initialized) {
      this.errorCode = 101; // Already initialized
      this.errorString = 'Already initialized';
      return 'false';
    }

    try {
      // Load existing progress from backend
      this.loadProgress()
        .then(() => {
          this.initialized = true;
          this.errorCode = 0;
        })
        .catch((error) => {
          console.error('Failed to load SCORM progress:', error);
          // Continue anyway - will use defaults
          this.initialized = true;
          this.errorCode = 0;
        });

      // Note: We return immediately and load progress async
      // SCORM spec allows this, but we should ideally wait
      // For now, we'll set initialized after a short delay
      setTimeout(() => {
        if (!this.initialized) {
          this.initialized = true;
        }
      }, 100);

      this.errorCode = 0;
      return 'true';
    } catch (error) {
      this.errorCode = 101; // General exception
      this.errorString = error.message || 'General exception';
      return 'false';
    }
  }

  /**
   * Get value from LMS
   * @param {string} element - SCORM data model element (e.g., "cmi.core.lesson_status")
   * @returns {string} Element value or empty string
   */
  LMSGetValue(element) {
    if (!this.initialized) {
      this.errorCode = 301; // Not initialized
      return '';
    }

    if (!element || typeof element !== 'string') {
      this.errorCode = 201; // Invalid argument error
      return '';
    }

    try {
      // Map SCORM elements to our data
      const value = this.data[element] || this.getDefaultValue(element);
      this.errorCode = 0;
      this.errorString = '';
      return value;
    } catch (error) {
      this.errorCode = 101; // General exception
      this.errorString = error.message || 'General exception';
      return '';
    }
  }

  /**
   * Set value in LMS
   * @param {string} element - SCORM data model element
   * @param {string} value - Value to set
   * @returns {string} "true" on success, "false" on error
   */
  LMSSetValue(element, value) {
    if (!this.initialized) {
      this.errorCode = 301; // Not initialized
      return 'false';
    }

    if (!element || typeof element !== 'string') {
      this.errorCode = 201; // Invalid argument error
      return 'false';
    }

    // Check if element is read-only
    if (this.isReadOnly(element)) {
      this.errorCode = 401; // Element is read only
      this.errorString = `${element} is read only`;
      return 'false';
    }

    try {
      // Validate value
      if (!this.validateValue(element, value)) {
        this.errorCode = 351; // Invalid set value
        this.errorString = `Invalid value for ${element}`;
        return 'false';
      }

      // Store value
      this.data[element] = value;
      this.hasUncommittedChanges = true;

      // Auto-commit critical values immediately
      if (this.isCriticalElement(element)) {
        this.LMSCommit('');
      } else {
        // Auto-commit other changes after 2 seconds of inactivity
        this.scheduleAutoCommit();
      }

      this.errorCode = 0;
      this.errorString = '';
      return 'true';
    } catch (error) {
      this.errorCode = 101; // General exception
      this.errorString = error.message || 'General exception';
      return 'false';
    }
  }

  /**
   * Commit data to LMS
   * @param {string} parameter - Reserved for future use
   * @returns {string} "true" on success, "false" on error
   */
  LMSCommit(parameter = '') {
    if (!this.initialized) {
      this.errorCode = 301; // Not initialized
      return 'false';
    }

    if (!this.hasUncommittedChanges) {
      // No changes to save
      this.errorCode = 0;
      return 'true';
    }

    try {
      // Save to backend
      this.saveProgress()
        .then(() => {
          this.hasUncommittedChanges = false;
          this.errorCode = 0;
        })
        .catch((error) => {
          console.error('Failed to save SCORM progress:', error);
          this.errorCode = 101; // General exception
          this.errorString = error.message || 'Failed to save progress';
        });

      // Clear auto-commit timer
      if (this.commitTimer) {
        clearTimeout(this.commitTimer);
        this.commitTimer = null;
      }

      // Return immediately (async save)
      this.errorCode = 0;
      return 'true';
    } catch (error) {
      this.errorCode = 101; // General exception
      this.errorString = error.message || 'General exception';
      return 'false';
    }
  }

  /**
   * Finish communication
   * @param {string} parameter - Reserved for future use
   * @returns {string} "true" on success, "false" on error
   */
  LMSFinish(parameter = '') {
    if (!this.initialized) {
      this.errorCode = 301; // Not initialized
      return 'false';
    }

    try {
      // Final save
      this.LMSCommit('');

      // Clear timer
      if (this.commitTimer) {
        clearTimeout(this.commitTimer);
        this.commitTimer = null;
      }

      // Mark as not initialized
      this.initialized = false;
      this.errorCode = 0;
      this.errorString = '';
      return 'true';
    } catch (error) {
      this.errorCode = 101; // General exception
      this.errorString = error.message || 'General exception';
      return 'false';
    }
  }

  /**
   * Get last error code
   * @returns {string} Error code as string
   */
  LMSGetLastError() {
    return this.errorCode.toString();
  }

  /**
   * Get error string
   * @param {string} errorCode - Error code (optional, uses last error if not provided)
   * @returns {string} Error message
   */
  LMSGetErrorString(errorCode) {
    const code = errorCode ? parseInt(errorCode, 10) : this.errorCode;
    
    const errorStrings = {
      0: 'No error',
      101: 'General exception',
      102: 'General initialization failure',
      103: 'Already initialized',
      104: 'Content instance terminated',
      111: 'General termination failure',
      112: 'Termination before initialization',
      113: 'Termination after termination',
      122: 'Retrieve data before initialization',
      123: 'Store data before initialization',
      132: 'Commit before initialization',
      133: 'Commit after termination',
      142: 'GetValue before initialization',
      143: 'GetValue after termination',
      152: 'SetValue before initialization',
      153: 'SetValue after termination',
      201: 'Invalid argument error',
      301: 'Not initialized',
      351: 'Invalid set value, element is a keyword',
      391: 'Element cannot have children',
      392: 'Element not an element - cannot have value',
      401: 'Element is read only',
      402: 'Element is write only',
      403: 'Element is initialized in a required state and can only be set to "initialized" or "terminated"',
      404: 'Element value is not unique',
      405: 'Element is invalid for vendor',
    };

    return errorStrings[code] || this.errorString || 'Unknown error';
  }

  /**
   * Get diagnostic
   * @param {string} errorCode - Error code (optional)
   * @returns {string} Diagnostic information
   */
  LMSGetDiagnostic(errorCode) {
    const code = errorCode ? parseInt(errorCode, 10) : this.errorCode;
    return this.diagnostic || `Error code: ${code}`;
  }

  // ==================== Helper Methods ====================

  /**
   * Load progress from backend
   * @returns {Promise<void>}
   */
  async loadProgress() {
    try {
      const response = await axios.get(
        `/scorm/${this.contentId}/progress?contentType=${this.contentType}`
      );
      
      if (response.data.success && response.data.data) {
        const progressData = response.data.data;
        
        // Map backend progress data to SCORM data model
        if (progressData.lessonStatus) {
          this.data['cmi.core.lesson_status'] = progressData.lessonStatus;
        }
        
        if (progressData.score) {
          this.data['cmi.core.score.raw'] = progressData.score.raw?.toString() || '';
          this.data['cmi.core.score.max'] = progressData.score.max?.toString() || '100';
          this.data['cmi.core.score.min'] = progressData.score.min?.toString() || '0';
        }
        
        if (progressData.timeSpent) {
          this.data['cmi.core.total_time'] = progressData.timeSpent;
        }
        
        if (progressData.suspendData) {
          this.data['cmi.suspend_data'] = progressData.suspendData;
        }
        
        if (progressData.entry) {
          this.data['cmi.core.entry'] = progressData.entry;
        } else {
          // Determine entry type based on suspend data
          this.data['cmi.core.entry'] = progressData.suspendData ? 'resume' : 'ab-initio';
        }
        
        if (progressData.exit) {
          this.data['cmi.core.exit'] = progressData.exit;
        }
      }
    } catch (error) {
      console.error('Failed to load SCORM progress:', error);
      // Don't throw - use defaults
    }
  }

  /**
   * Save progress to backend
   * @returns {Promise<void>}
   */
  async saveProgress() {
    try {
      const progressData = {
        lessonStatus: this.data['cmi.core.lesson_status'] || 'incomplete',
        score: {
          raw: this.data['cmi.core.score.raw'] ? parseFloat(this.data['cmi.core.score.raw']) : null,
          max: this.data['cmi.core.score.max'] ? parseFloat(this.data['cmi.core.score.max']) : 100,
          min: this.data['cmi.core.score.min'] ? parseFloat(this.data['cmi.core.score.min']) : 0,
        },
        timeSpent: this.data['cmi.core.total_time'] || '00:00:00.00',
        suspendData: this.data['cmi.suspend_data'] || '',
        entry: this.data['cmi.core.entry'] || 'ab-initio',
        exit: this.data['cmi.core.exit'] || '',
      };

      await axios.post(`/scorm/${this.contentId}/progress`, {
        contentType: this.contentType,
        progressData,
      });
    } catch (error) {
      console.error('Failed to save SCORM progress:', error);
      throw error;
    }
  }

  /**
   * Get default value for SCORM element
   * @param {string} element - SCORM element name
   * @returns {string} Default value
   */
  getDefaultValue(element) {
    const defaults = {
      'cmi.core.student_name': 'Student',
      'cmi.core.student_id': this.userId || '',
      'cmi.core.lesson_location': '',
      'cmi.core.credit': 'credit',
      'cmi.core.lesson_status': 'not attempted',
      'cmi.core.lesson_mode': 'normal',
      'cmi.core.score.raw': '',
      'cmi.core.score.max': '100',
      'cmi.core.score.min': '0',
      'cmi.core.total_time': '00:00:00.00',
      'cmi.core.lesson_mode': 'normal',
      'cmi.core.entry': 'ab-initio',
      'cmi.core.exit': '',
      'cmi.suspend_data': '',
      'cmi.launch_data': '',
      'cmi.comments': '',
      'cmi.comments_from_lms': '',
      'cmi.student_data.mastery_score': '',
      'cmi.student_data.max_time_allowed': '',
      'cmi.student_data.time_limit_action': '',
      'cmi.student_data.tries.count': '0',
      'cmi.interactions._count': '0',
      'cmi.objectives._count': '0',
      'cmi.student_preference.audio': '0',
      'cmi.student_preference.language': '',
      'cmi.student_preference.speed': '0',
      'cmi.student_preference.text': '0',
      'nav.event': '',
    };

    return defaults[element] || '';
  }

  /**
   * Validate value for element
   * @param {string} element - SCORM element name
   * @param {string} value - Value to validate
   * @returns {boolean} True if valid
   */
  validateValue(element, value) {
    // Validate lesson_status
    if (element === 'cmi.core.lesson_status') {
      const validStatuses = [
        'passed',
        'failed',
        'completed',
        'incomplete',
        'browsed',
        'not attempted',
      ];
      return validStatuses.includes(value);
    }

    // Validate score values
    if (element === 'cmi.core.score.raw' || element === 'cmi.core.score.max' || element === 'cmi.core.score.min') {
      if (value === '') return true; // Empty is valid
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    }

    // Validate time format (HH:MM:SS.SS)
    if (element === 'cmi.core.total_time') {
      if (value === '00:00:00.00') return true;
      const timeRegex = /^\d{2,}:\d{2}:\d{2}(\.\d{2})?$/;
      return timeRegex.test(value);
    }

    // Validate suspend_data length (max 4096 chars)
    if (element === 'cmi.suspend_data') {
      return value.length <= 4096;
    }

    // Validate entry/exit
    if (element === 'cmi.core.entry') {
      return ['ab-initio', 'resume', ''].includes(value);
    }

    if (element === 'cmi.core.exit') {
      return ['time-out', 'suspend', 'logout', 'normal', ''].includes(value);
    }

    // Default: accept all other values
    return true;
  }

  /**
   * Check if element is read-only
   * @param {string} element - SCORM element name
   * @returns {boolean} True if read-only
   */
  isReadOnly(element) {
    const readOnlyElements = [
      'cmi.core.student_name',
      'cmi.core.student_id',
      'cmi.core.credit',
      'cmi.core.lesson_mode',
      'cmi.core.score.max',
      'cmi.core.score.min',
      'cmi.launch_data',
      'cmi.comments_from_lms',
    ];

    return readOnlyElements.includes(element);
  }

  /**
   * Check if element is critical (should auto-commit)
   * @param {string} element - SCORM element name
   * @returns {boolean} True if critical
   */
  isCriticalElement(element) {
    const critical = [
      'cmi.core.lesson_status',
      'cmi.core.score.raw',
      'cmi.core.total_time',
      'cmi.core.exit',
    ];
    return critical.includes(element);
  }

  /**
   * Schedule auto-commit after inactivity
   */
  scheduleAutoCommit() {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
    }

    this.commitTimer = setTimeout(() => {
      if (this.hasUncommittedChanges) {
        this.LMSCommit('');
      }
    }, 2000); // 2 seconds delay
  }
}

// Export for use in SCORM player component
export default SCORMAPI;
