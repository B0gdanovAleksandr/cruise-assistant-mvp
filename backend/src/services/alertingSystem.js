const logger = require('../utils/logger');

/**
 * Alerting system for RAG system monitoring
 * Detects issues and sends alerts based on configurable thresholds
 */
class AlertingSystem {
  constructor() {
    this.alerts = [];
    this.alertHistory = [];
    this.subscribers = new Map();
    this.thresholds = {
      // Performance thresholds
      responseTime: {
        warning: 3000, // 3 seconds
        critical: 10000 // 10 seconds
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.15 // 15%
      },
      
      // Quality thresholds
      precision: {
        warning: 0.7,
        critical: 0.5
      },
      recall: {
        warning: 0.6,
        critical: 0.4
      },
      faithfulness: {
        warning: 0.8,
        critical: 0.6
      },
      hallucinationRate: {
        warning: 0.1,
        critical: 0.25
      },
      
      // System thresholds
      cacheHitRate: {
        warning: 0.6,
        critical: 0.4
      },
      apiLatency: {
        warning: 2000, // 2 seconds
        critical: 5000 // 5 seconds
      }
    };
    
    this.alertTypes = {
      PERFORMANCE_DEGRADATION: 'performance_degradation',
      QUALITY_DEGRADATION: 'quality_degradation',
      SYSTEM_ERROR: 'system_error',
      CACHE_ISSUE: 'cache_issue',
      API_ISSUE: 'api_issue',
      HALLUCINATION_SPIKE: 'hallucination_spike'
    };
  }

  /**
   * Subscribes to alerts
   * @param {string} alertType - Type of alert to subscribe to
   * @param {Function} callback - Callback function
   */
  subscribe(alertType, callback) {
    if (!this.subscribers.has(alertType)) {
      this.subscribers.set(alertType, []);
    }
    this.subscribers.get(alertType).push(callback);
    
    logger.info('Alert subscription added', { alertType });
  }

  /**
   * Unsubscribes from alerts
   * @param {string} alertType - Type of alert
   * @param {Function} callback - Callback function to remove
   */
  unsubscribe(alertType, callback) {
    if (this.subscribers.has(alertType)) {
      const callbacks = this.subscribers.get(alertType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        logger.info('Alert subscription removed', { alertType });
      }
    }
  }

  /**
   * Checks performance metrics and generates alerts
   * @param {Object} metrics - Performance metrics
   */
  checkPerformanceAlerts(metrics) {
    const alerts = [];

    // Response time alerts
    if (metrics.responseTime > this.thresholds.responseTime.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.PERFORMANCE_DEGRADATION,
        'CRITICAL',
        `Response time (${metrics.responseTime}ms) exceeds critical threshold (${this.thresholds.responseTime.critical}ms)`,
        { responseTime: metrics.responseTime, threshold: this.thresholds.responseTime.critical }
      ));
    } else if (metrics.responseTime > this.thresholds.responseTime.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.PERFORMANCE_DEGRADATION,
        'WARNING',
        `Response time (${metrics.responseTime}ms) exceeds warning threshold (${this.thresholds.responseTime.warning}ms)`,
        { responseTime: metrics.responseTime, threshold: this.thresholds.responseTime.warning }
      ));
    }

    // Error rate alerts
    if (metrics.errorRate > this.thresholds.errorRate.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.SYSTEM_ERROR,
        'CRITICAL',
        `Error rate (${(metrics.errorRate * 100).toFixed(1)}%) exceeds critical threshold (${(this.thresholds.errorRate.critical * 100).toFixed(1)}%)`,
        { errorRate: metrics.errorRate, threshold: this.thresholds.errorRate.critical }
      ));
    } else if (metrics.errorRate > this.thresholds.errorRate.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.SYSTEM_ERROR,
        'WARNING',
        `Error rate (${(metrics.errorRate * 100).toFixed(1)}%) exceeds warning threshold (${(this.thresholds.errorRate.warning * 100).toFixed(1)}%)`,
        { errorRate: metrics.errorRate, threshold: this.thresholds.errorRate.warning }
      ));
    }

    // API latency alerts
    if (metrics.apiLatency > this.thresholds.apiLatency.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.API_ISSUE,
        'CRITICAL',
        `API latency (${metrics.apiLatency}ms) exceeds critical threshold (${this.thresholds.apiLatency.critical}ms)`,
        { apiLatency: metrics.apiLatency, threshold: this.thresholds.apiLatency.critical }
      ));
    } else if (metrics.apiLatency > this.thresholds.apiLatency.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.API_ISSUE,
        'WARNING',
        `API latency (${metrics.apiLatency}ms) exceeds warning threshold (${this.thresholds.apiLatency.warning}ms)`,
        { apiLatency: metrics.apiLatency, threshold: this.thresholds.apiLatency.warning }
      ));
    }

    return alerts;
  }

  /**
   * Checks quality metrics and generates alerts
   * @param {Object} metrics - Quality metrics
   */
  checkQualityAlerts(metrics) {
    const alerts = [];

    // Precision alerts
    if (metrics.precision < this.thresholds.precision.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.QUALITY_DEGRADATION,
        'CRITICAL',
        `Precision (${(metrics.precision * 100).toFixed(1)}%) below critical threshold (${(this.thresholds.precision.critical * 100).toFixed(1)}%)`,
        { precision: metrics.precision, threshold: this.thresholds.precision.critical }
      ));
    } else if (metrics.precision < this.thresholds.precision.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.QUALITY_DEGRADATION,
        'WARNING',
        `Precision (${(metrics.precision * 100).toFixed(1)}%) below warning threshold (${(this.thresholds.precision.warning * 100).toFixed(1)}%)`,
        { precision: metrics.precision, threshold: this.thresholds.precision.warning }
      ));
    }

    // Recall alerts
    if (metrics.recall < this.thresholds.recall.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.QUALITY_DEGRADATION,
        'CRITICAL',
        `Recall (${(metrics.recall * 100).toFixed(1)}%) below critical threshold (${(this.thresholds.recall.critical * 100).toFixed(1)}%)`,
        { recall: metrics.recall, threshold: this.thresholds.recall.critical }
      ));
    } else if (metrics.recall < this.thresholds.recall.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.QUALITY_DEGRADATION,
        'WARNING',
        `Recall (${(metrics.recall * 100).toFixed(1)}%) below warning threshold (${(this.thresholds.recall.warning * 100).toFixed(1)}%)`,
        { recall: metrics.recall, threshold: this.thresholds.recall.warning }
      ));
    }

    // Faithfulness alerts
    if (metrics.faithfulness < this.thresholds.faithfulness.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.QUALITY_DEGRADATION,
        'CRITICAL',
        `Faithfulness (${(metrics.faithfulness * 100).toFixed(1)}%) below critical threshold (${(this.thresholds.faithfulness.critical * 100).toFixed(1)}%)`,
        { faithfulness: metrics.faithfulness, threshold: this.thresholds.faithfulness.critical }
      ));
    } else if (metrics.faithfulness < this.thresholds.faithfulness.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.QUALITY_DEGRADATION,
        'WARNING',
        `Faithfulness (${(metrics.faithfulness * 100).toFixed(1)}%) below warning threshold (${(this.thresholds.faithfulness.warning * 100).toFixed(1)}%)`,
        { faithfulness: metrics.faithfulness, threshold: this.thresholds.faithfulness.warning }
      ));
    }

    // Hallucination rate alerts
    if (metrics.hallucinationRate > this.thresholds.hallucinationRate.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.HALLUCINATION_SPIKE,
        'CRITICAL',
        `Hallucination rate (${(metrics.hallucinationRate * 100).toFixed(1)}%) above critical threshold (${(this.thresholds.hallucinationRate.critical * 100).toFixed(1)}%)`,
        { hallucinationRate: metrics.hallucinationRate, threshold: this.thresholds.hallucinationRate.critical }
      ));
    } else if (metrics.hallucinationRate > this.thresholds.hallucinationRate.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.HALLUCINATION_SPIKE,
        'WARNING',
        `Hallucination rate (${(metrics.hallucinationRate * 100).toFixed(1)}%) above warning threshold (${(this.thresholds.hallucinationRate.warning * 100).toFixed(1)}%)`,
        { hallucinationRate: metrics.hallucinationRate, threshold: this.thresholds.hallucinationRate.warning }
      ));
    }

    return alerts;
  }

  /**
   * Checks cache metrics and generates alerts
   * @param {Object} metrics - Cache metrics
   */
  checkCacheAlerts(metrics) {
    const alerts = [];

    // Cache hit rate alerts
    if (metrics.cacheHitRate < this.thresholds.cacheHitRate.critical) {
      alerts.push(this.createAlert(
        this.alertTypes.CACHE_ISSUE,
        'CRITICAL',
        `Cache hit rate (${(metrics.cacheHitRate * 100).toFixed(1)}%) below critical threshold (${(this.thresholds.cacheHitRate.critical * 100).toFixed(1)}%)`,
        { cacheHitRate: metrics.cacheHitRate, threshold: this.thresholds.cacheHitRate.critical }
      ));
    } else if (metrics.cacheHitRate < this.thresholds.cacheHitRate.warning) {
      alerts.push(this.createAlert(
        this.alertTypes.CACHE_ISSUE,
        'WARNING',
        `Cache hit rate (${(metrics.cacheHitRate * 100).toFixed(1)}%) below warning threshold (${(this.thresholds.cacheHitRate.warning * 100).toFixed(1)}%)`,
        { cacheHitRate: metrics.cacheHitRate, threshold: this.thresholds.cacheHitRate.warning }
      ));
    }

    return alerts;
  }

  /**
   * Creates an alert object
   * @param {string} type - Alert type
   * @param {string} severity - Alert severity
   * @param {string} message - Alert message
   * @param {Object} data - Additional data
   * @returns {Object} Alert object
   */
  createAlert(type, severity, message, data = {}) {
    const alert = {
      id: this.generateAlertId(),
      type: type,
      severity: severity,
      message: message,
      timestamp: new Date().toISOString(),
      data: data,
      acknowledged: false,
      resolved: false
    };

    return alert;
  }

  /**
   * Generates unique alert ID
   * @returns {string} Alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Processes and sends alerts
   * @param {Array} alerts - Array of alerts
   */
  processAlerts(alerts) {
    alerts.forEach(alert => {
      // Add to current alerts
      this.alerts.push(alert);
      
      // Add to history
      this.alertHistory.push(alert);
      
      // Send to subscribers
      this.sendAlertToSubscribers(alert);
      
      // Log alert
      logger.warn('Alert generated', {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message
      });
    });

    // Clean up old alerts (keep last 1000)
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }
  }

  /**
   * Sends alert to subscribers
   * @param {Object} alert - Alert object
   */
  sendAlertToSubscribers(alert) {
    // Send to specific type subscribers
    if (this.subscribers.has(alert.type)) {
      this.subscribers.get(alert.type).forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          logger.error('Error in alert callback', { error: error.message, alertId: alert.id });
        }
      });
    }

    // Send to all subscribers
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          logger.error('Error in alert callback', { error: error.message, alertId: alert.id });
        }
      });
    }
  }

  /**
   * Acknowledges an alert
   * @param {string} alertId - Alert ID
   * @param {string} acknowledgedBy - Who acknowledged the alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      
      logger.info('Alert acknowledged', { alertId, acknowledgedBy });
    }
  }

  /**
   * Resolves an alert
   * @param {string} alertId - Alert ID
   * @param {string} resolvedBy - Who resolved the alert
   * @param {string} resolution - Resolution notes
   */
  resolveAlert(alertId, resolvedBy, resolution = '') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date().toISOString();
      alert.resolution = resolution;
      
      // Remove from active alerts
      this.alerts = this.alerts.filter(a => a.id !== alertId);
      
      logger.info('Alert resolved', { alertId, resolvedBy, resolution });
    }
  }

  /**
   * Gets active alerts
   * @param {string} severity - Filter by severity
   * @param {string} type - Filter by type
   * @returns {Array} Active alerts
   */
  getActiveAlerts(severity = null, type = null) {
    let filtered = this.alerts;

    if (severity) {
      filtered = filtered.filter(alert => alert.severity === severity);
    }

    if (type) {
      filtered = filtered.filter(alert => alert.type === type);
    }

    return filtered;
  }

  /**
   * Gets alert statistics
   * @returns {Object} Alert statistics
   */
  getAlertStatistics() {
    const stats = {
      total: this.alertHistory.length,
      active: this.alerts.length,
      acknowledged: this.alerts.filter(a => a.acknowledged).length,
      resolved: this.alertHistory.filter(a => a.resolved).length,
      bySeverity: {
        CRITICAL: 0,
        WARNING: 0
      },
      byType: {}
    };

    // Count by severity
    this.alerts.forEach(alert => {
      stats.bySeverity[alert.severity]++;
    });

    // Count by type
    this.alerts.forEach(alert => {
      if (!stats.byType[alert.type]) {
        stats.byType[alert.type] = 0;
      }
      stats.byType[alert.type]++;
    });

    return stats;
  }

  /**
   * Updates alert thresholds
   * @param {Object} newThresholds - New threshold values
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    
    logger.info('Alert thresholds updated', { newThresholds });
  }

  /**
   * Generates alert report
   * @returns {string} Alert report
   */
  generateAlertReport() {
    const stats = this.getAlertStatistics();
    const activeAlerts = this.getActiveAlerts();
    
    let report = '🚨 Alert System Report\n';
    report += '======================\n\n';

    report += '📊 Statistics:\n';
    report += `- Total Alerts: ${stats.total}\n`;
    report += `- Active Alerts: ${stats.active}\n`;
    report += `- Acknowledged: ${stats.acknowledged}\n`;
    report += `- Resolved: ${stats.resolved}\n\n`;

    report += '⚠️ Severity Breakdown:\n';
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      report += `- ${severity}: ${count}\n`;
    });

    report += '\n📋 Type Breakdown:\n';
    Object.entries(stats.byType).forEach(([type, count]) => {
      report += `- ${type}: ${count}\n`;
    });

    if (activeAlerts.length > 0) {
      report += '\n🚨 Active Alerts:\n';
      activeAlerts.slice(0, 5).forEach(alert => {
        report += `- [${alert.severity}] ${alert.type}: ${alert.message}\n`;
      });
      
      if (activeAlerts.length > 5) {
        report += `- ... and ${activeAlerts.length - 5} more\n`;
      }
    }

    return report;
  }

  /**
   * Clears resolved alerts from history
   * @param {number} daysToKeep - Number of days to keep resolved alerts
   */
  clearResolvedAlerts(daysToKeep = 30) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const initialCount = this.alertHistory.length;
    
    this.alertHistory = this.alertHistory.filter(alert => {
      if (alert.resolved) {
        return new Date(alert.resolvedAt) > cutoff;
      }
      return true; // Keep unresolved alerts
    });

    const removedCount = initialCount - this.alertHistory.length;
    logger.info('Cleared resolved alerts', { removedCount, remainingCount: this.alertHistory.length });
  }
}

module.exports = AlertingSystem; 