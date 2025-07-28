const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Continuous monitoring service for RAG system
 * Tracks performance metrics, detects degradation, and generates alerts
 */
class MonitoringService {
  constructor() {
    this.metrics = {
      retrieval: {
        precision: [],
        recall: [],
        responseTime: [],
        errorRate: []
      },
      generation: {
        faithfulness: [],
        relevance: [],
        hallucinationRate: [],
        responseTime: []
      },
      system: {
        apiLatency: [],
        errorRate: [],
        throughput: [],
        costPerRequest: []
      }
    };
    this.alerts = [];
    this.thresholds = {
      precision: 0.7,
      recall: 0.6,
      faithfulness: 0.8,
      responseTime: 5.0, // seconds
      errorRate: 0.05,
      hallucinationRate: 0.1
    };
    this.metricsFile = path.join(__dirname, '../../logs/rag_metrics.json');
    this.alertsFile = path.join(__dirname, '../../logs/rag_alerts.json');
  }

  /**
   * Records retrieval metrics
   * @param {Object} metrics - Retrieval metrics
   */
  recordRetrievalMetrics(metrics) {
    const timestamp = new Date().toISOString();
    
    this.metrics.retrieval.precision.push({
      timestamp,
      value: metrics.precision || 0,
      query: metrics.query,
      userPrefs: metrics.userPrefs
    });

    this.metrics.retrieval.recall.push({
      timestamp,
      value: metrics.recall || 0,
      query: metrics.query,
      userPrefs: metrics.userPrefs
    });

    this.metrics.retrieval.responseTime.push({
      timestamp,
      value: metrics.responseTime || 0,
      query: metrics.query
    });

    if (metrics.error) {
      this.metrics.retrieval.errorRate.push({
        timestamp,
        error: metrics.error,
        query: metrics.query
      });
    }

    this.checkThresholds('retrieval', metrics);
    this.saveMetrics();
  }

  /**
   * Records generation metrics
   * @param {Object} metrics - Generation metrics
   */
  recordGenerationMetrics(metrics) {
    const timestamp = new Date().toISOString();
    
    this.metrics.generation.faithfulness.push({
      timestamp,
      value: metrics.faithfulness || 0,
      response: metrics.response,
      retrievedEvents: metrics.retrievedEvents
    });

    this.metrics.generation.relevance.push({
      timestamp,
      value: metrics.relevance || 0,
      response: metrics.response,
      userPrefs: metrics.userPrefs
    });

    this.metrics.generation.hallucinationRate.push({
      timestamp,
      value: metrics.hallucinationRate || 0,
      response: metrics.response
    });

    this.metrics.generation.responseTime.push({
      timestamp,
      value: metrics.responseTime || 0,
      response: metrics.response
    });

    this.checkThresholds('generation', metrics);
    this.saveMetrics();
  }

  /**
   * Records system metrics
   * @param {Object} metrics - System metrics
   */
  recordSystemMetrics(metrics) {
    const timestamp = new Date().toISOString();
    
    this.metrics.system.apiLatency.push({
      timestamp,
      value: metrics.apiLatency || 0,
      endpoint: metrics.endpoint
    });

    this.metrics.system.throughput.push({
      timestamp,
      value: metrics.throughput || 0,
      requestsPerMinute: metrics.requestsPerMinute
    });

    this.metrics.system.costPerRequest.push({
      timestamp,
      value: metrics.costPerRequest || 0,
      tokensUsed: metrics.tokensUsed
    });

    if (metrics.error) {
      this.metrics.system.errorRate.push({
        timestamp,
        error: metrics.error,
        endpoint: metrics.endpoint
      });
    }

    this.checkThresholds('system', metrics);
    this.saveMetrics();
  }

  /**
   * Checks if metrics exceed thresholds and generates alerts
   * @param {string} category - Metric category
   * @param {Object} metrics - Current metrics
   */
  checkThresholds(category, metrics) {
    const alerts = [];

    switch (category) {
      case 'retrieval':
        if (metrics.precision < this.thresholds.precision) {
          alerts.push({
            type: 'LOW_PRECISION',
            severity: 'WARNING',
            message: `Retrieval precision (${metrics.precision.toFixed(3)}) below threshold (${this.thresholds.precision})`,
            timestamp: new Date().toISOString(),
            category: 'retrieval'
          });
        }

        if (metrics.recall < this.thresholds.recall) {
          alerts.push({
            type: 'LOW_RECALL',
            severity: 'WARNING',
            message: `Retrieval recall (${metrics.recall.toFixed(3)}) below threshold (${this.thresholds.recall})`,
            timestamp: new Date().toISOString(),
            category: 'retrieval'
          });
        }

        if (metrics.responseTime > this.thresholds.responseTime) {
          alerts.push({
            type: 'HIGH_RESPONSE_TIME',
            severity: 'ERROR',
            message: `Retrieval response time (${metrics.responseTime.toFixed(2)}s) above threshold (${this.thresholds.responseTime}s)`,
            timestamp: new Date().toISOString(),
            category: 'retrieval'
          });
        }
        break;

      case 'generation':
        if (metrics.faithfulness < this.thresholds.faithfulness) {
          alerts.push({
            type: 'LOW_FAITHFULNESS',
            severity: 'WARNING',
            message: `Generation faithfulness (${metrics.faithfulness.toFixed(3)}) below threshold (${this.thresholds.faithfulness})`,
            timestamp: new Date().toISOString(),
            category: 'generation'
          });
        }

        if (metrics.hallucinationRate > this.thresholds.hallucinationRate) {
          alerts.push({
            type: 'HIGH_HALLUCINATION_RATE',
            severity: 'ERROR',
            message: `Hallucination rate (${metrics.hallucinationRate.toFixed(3)}) above threshold (${this.thresholds.hallucinationRate})`,
            timestamp: new Date().toISOString(),
            category: 'generation'
          });
        }
        break;

      case 'system':
        if (metrics.errorRate > this.thresholds.errorRate) {
          alerts.push({
            type: 'HIGH_ERROR_RATE',
            severity: 'ERROR',
            message: `System error rate (${metrics.errorRate.toFixed(3)}) above threshold (${this.thresholds.errorRate})`,
            timestamp: new Date().toISOString(),
            category: 'system'
          });
        }
        break;
    }

    // Add alerts to the list
    this.alerts.push(...alerts);

    // Log alerts
    alerts.forEach(alert => {
      logger.warn(`ALERT: ${alert.message}`, {
        type: alert.type,
        severity: alert.severity,
        category: alert.category
      });
    });

    this.saveAlerts();
  }

  /**
   * Calculates rolling averages for metrics
   * @param {string} category - Metric category
   * @param {string} metric - Metric name
   * @param {number} window - Time window in minutes
   * @returns {number} Rolling average
   */
  calculateRollingAverage(category, metric, window = 60) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - window * 60 * 1000);
    
    const recentMetrics = this.metrics[category][metric].filter(m => 
      new Date(m.timestamp) > cutoff
    );

    if (recentMetrics.length === 0) return 0;

    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  /**
   * Detects performance degradation
   * @returns {Object} Degradation analysis
   */
  detectDegradation() {
    const analysis = {
      retrieval: {
        precision: this.calculateRollingAverage('retrieval', 'precision'),
        recall: this.calculateRollingAverage('retrieval', 'recall'),
        responseTime: this.calculateRollingAverage('retrieval', 'responseTime'),
        degraded: false,
        issues: []
      },
      generation: {
        faithfulness: this.calculateRollingAverage('generation', 'faithfulness'),
        relevance: this.calculateRollingAverage('generation', 'relevance'),
        hallucinationRate: this.calculateRollingAverage('generation', 'hallucinationRate'),
        degraded: false,
        issues: []
      },
      system: {
        errorRate: this.calculateRollingAverage('system', 'errorRate'),
        apiLatency: this.calculateRollingAverage('system', 'apiLatency'),
        degraded: false,
        issues: []
      }
    };

    // Check for degradation
    if (analysis.retrieval.precision < this.thresholds.precision) {
      analysis.retrieval.degraded = true;
      analysis.retrieval.issues.push('Low precision');
    }

    if (analysis.retrieval.recall < this.thresholds.recall) {
      analysis.retrieval.degraded = true;
      analysis.retrieval.issues.push('Low recall');
    }

    if (analysis.generation.faithfulness < this.thresholds.faithfulness) {
      analysis.generation.degraded = true;
      analysis.generation.issues.push('Low faithfulness');
    }

    if (analysis.generation.hallucinationRate > this.thresholds.hallucinationRate) {
      analysis.generation.degraded = true;
      analysis.generation.issues.push('High hallucination rate');
    }

    if (analysis.system.errorRate > this.thresholds.errorRate) {
      analysis.system.degraded = true;
      analysis.system.issues.push('High error rate');
    }

    return analysis;
  }

  /**
   * Generates performance report
   * @returns {Object} Performance report
   */
  generatePerformanceReport() {
    const degradation = this.detectDegradation();
    const recentAlerts = this.alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return alertTime > oneHourAgo;
    });

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overallHealth: this.calculateOverallHealth(degradation),
        activeAlerts: recentAlerts.length,
        systemStatus: this.getSystemStatus(degradation)
      },
      metrics: {
        retrieval: {
          precision: degradation.retrieval.precision,
          recall: degradation.retrieval.recall,
          responseTime: degradation.retrieval.responseTime,
          status: degradation.retrieval.degraded ? 'DEGRADED' : 'HEALTHY'
        },
        generation: {
          faithfulness: degradation.generation.faithfulness,
          relevance: degradation.generation.relevance,
          hallucinationRate: degradation.generation.hallucinationRate,
          status: degradation.generation.degraded ? 'DEGRADED' : 'HEALTHY'
        },
        system: {
          errorRate: degradation.system.errorRate,
          apiLatency: degradation.system.apiLatency,
          status: degradation.system.degraded ? 'DEGRADED' : 'HEALTHY'
        }
      },
      alerts: recentAlerts,
      recommendations: this.generateRecommendations(degradation)
    };

    return report;
  }

  /**
   * Calculates overall system health
   * @param {Object} degradation - Degradation analysis
   * @returns {string} Health status
   */
  calculateOverallHealth(degradation) {
    const degradedComponents = [
      degradation.retrieval.degraded,
      degradation.generation.degraded,
      degradation.system.degraded
    ].filter(Boolean).length;

    if (degradedComponents === 0) return 'HEALTHY';
    if (degradedComponents === 1) return 'WARNING';
    return 'CRITICAL';
  }

  /**
   * Gets system status
   * @param {Object} degradation - Degradation analysis
   * @returns {string} System status
   */
  getSystemStatus(degradation) {
    const health = this.calculateOverallHealth(degradation);
    
    switch (health) {
      case 'HEALTHY':
        return 'All systems operational';
      case 'WARNING':
        return 'Some components showing degradation';
      case 'CRITICAL':
        return 'Multiple components degraded - immediate attention required';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Generates recommendations based on degradation
   * @param {Object} degradation - Degradation analysis
   * @returns {Array} Recommendations
   */
  generateRecommendations(degradation) {
    const recommendations = [];

    if (degradation.retrieval.degraded) {
      if (degradation.retrieval.precision < this.thresholds.precision) {
        recommendations.push({
          priority: 'HIGH',
          category: 'retrieval',
          action: 'Review and update embedding model or chunking strategy',
          description: 'Low precision indicates poor retrieval quality'
        });
      }

      if (degradation.retrieval.recall < this.thresholds.recall) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'retrieval',
          action: 'Increase top-k retrieval or improve query expansion',
          description: 'Low recall indicates missing relevant documents'
        });
      }
    }

    if (degradation.generation.degraded) {
      if (degradation.generation.faithfulness < this.thresholds.faithfulness) {
        recommendations.push({
          priority: 'HIGH',
          category: 'generation',
          action: 'Strengthen citation requirements and validation',
          description: 'Low faithfulness indicates hallucination issues'
        });
      }

      if (degradation.generation.hallucinationRate > this.thresholds.hallucinationRate) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'generation',
          action: 'Implement stricter hallucination detection and filtering',
          description: 'High hallucination rate requires immediate attention'
        });
      }
    }

    if (degradation.system.degraded) {
      if (degradation.system.errorRate > this.thresholds.errorRate) {
        recommendations.push({
          priority: 'HIGH',
          category: 'system',
          action: 'Investigate error sources and implement retry logic',
          description: 'High error rate indicates system instability'
        });
      }
    }

    return recommendations;
  }

  /**
   * Saves metrics to file
   */
  async saveMetrics() {
    try {
      await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      logger.error('Error saving metrics:', error);
    }
  }

  /**
   * Saves alerts to file
   */
  async saveAlerts() {
    try {
      await fs.writeFile(this.alertsFile, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      logger.error('Error saving alerts:', error);
    }
  }

  /**
   * Loads metrics from file
   */
  async loadMetrics() {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      this.metrics = JSON.parse(data);
    } catch (error) {
      logger.warn('No existing metrics file found, starting fresh');
    }
  }

  /**
   * Loads alerts from file
   */
  async loadAlerts() {
    try {
      const data = await fs.readFile(this.alertsFile, 'utf8');
      this.alerts = JSON.parse(data);
    } catch (error) {
      logger.warn('No existing alerts file found, starting fresh');
    }
  }

  /**
   * Cleans up old metrics and alerts
   * @param {number} daysToKeep - Number of days to keep data
   */
  cleanupOldData(daysToKeep = 30) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // Clean up metrics
    Object.keys(this.metrics).forEach(category => {
      Object.keys(this.metrics[category]).forEach(metric => {
        this.metrics[category][metric] = this.metrics[category][metric].filter(m => 
          new Date(m.timestamp) > cutoff
        );
      });
    });

    // Clean up alerts
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > cutoff
    );

    this.saveMetrics();
    this.saveAlerts();
  }
}

module.exports = MonitoringService; 