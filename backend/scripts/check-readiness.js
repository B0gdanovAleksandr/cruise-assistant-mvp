#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

/**
 * Script to check readiness for real RAG testing
 */

class ReadinessChecker {
  constructor() {
    this.checks = [];
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0
    };
  }

  /**
   * Add a check to the list
   */
  addCheck(name, checkFunction, critical = true) {
    this.checks.push({
      name,
      check: checkFunction,
      critical
    });
  }

  /**
   * Run all checks
   */
  async runChecks() {
    console.log('🔍 Running readiness checks for real RAG testing...\n');

    for (const check of this.checks) {
      try {
        const result = await check.check();
        this.results.total++;
        
        if (result.status === 'passed') {
          console.log(`✅ ${check.name}: ${result.message}`);
          this.results.passed++;
        } else if (result.status === 'warning') {
          console.log(`⚠️ ${check.name}: ${result.message}`);
          this.results.warnings++;
        } else {
          console.log(`❌ ${check.name}: ${result.message}`);
          this.results.failed++;
          
          if (check.critical) {
            console.log(`   🚨 This is a critical check - must be fixed before testing`);
          }
        }
      } catch (error) {
        console.log(`❌ ${check.name}: Error during check - ${error.message}`);
        this.results.failed++;
        this.results.total++;
      }
    }

    this.generateReport();
  }

  /**
   * Generate readiness report
   */
  generateReport() {
    console.log('\n📊 Readiness Report');
    console.log('==================');
    
    console.log(`\n📈 Check Results:`);
    console.log(`   - Passed: ${this.results.passed}/${this.results.total}`);
    console.log(`   - Failed: ${this.results.failed}/${this.results.total}`);
    console.log(`   - Warnings: ${this.results.warnings}/${this.results.total}`);
    
    const passRate = (this.results.passed / this.results.total) * 100;
    console.log(`   - Pass rate: ${passRate.toFixed(1)}%`);
    
    if (this.results.failed === 0) {
      console.log(`\n🎉 All checks passed! Ready for real testing.`);
      console.log(`\n📝 Next steps:`);
      console.log(`1. Run: node scripts/prepare-test-data.js`);
      console.log(`2. Run: node scripts/index-test-events.js`);
      console.log(`3. Run: node scripts/test-phase1-improvements.js`);
    } else {
      console.log(`\n⚠️ ${this.results.failed} check(s) failed. Please fix issues before testing.`);
    }
  }

  /**
   * Check environment variables
   */
  async checkEnvironmentVariables() {
    const requiredVars = [
      'OPENAI_API_KEY',
      'PINECONE_API_KEY',
      'PINECONE_INDEX_NAME',
      'PINECONE_ENVIRONMENT'
    ];

    const optionalVars = [
      'EMBEDDING_MODEL',
      'USE_RERANKING',
      'RERANKING_TYPE',
      'ENABLE_MONITORING',
      'ENABLE_ALERTING',
      'ENABLE_CACHING'
    ];

    const missing = [];
    const set = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      } else {
        set.push(varName);
      }
    }

    if (missing.length > 0) {
      return {
        status: 'failed',
        message: `Missing required environment variables: ${missing.join(', ')}`
      };
    }

    const optionalSet = optionalVars.filter(varName => process.env[varName]);
    
    return {
      status: 'passed',
      message: `All required variables set (${set.length}/${requiredVars.length}). Optional: ${optionalSet.length}/${optionalVars.length}`
    };
  }

  /**
   * Check API connectivity
   */
  async checkAPIConnectivity() {
    try {
      // Check OpenAI API
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Simple test call
      const response = await openai.models.list();
      
      return {
        status: 'passed',
        message: `OpenAI API accessible (${response.data.length} models available)`
      };
    } catch (error) {
      return {
        status: 'failed',
        message: `OpenAI API error: ${error.message}`
      };
    }
  }

  /**
   * Check Pinecone connectivity
   */
  async checkPineconeConnectivity() {
    try {
      const { Pinecone } = require('@pinecone-database/pinecone');
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });

      const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
      
      // Test index stats
      const stats = await index.describeIndexStats();
      
      return {
        status: 'passed',
        message: `Pinecone index accessible (${stats.totalVectorCount || 0} vectors)`
      };
    } catch (error) {
      return {
        status: 'failed',
        message: `Pinecone error: ${error.message}`
      };
    }
  }

  /**
   * Check test data availability
   */
  async checkTestData() {
    try {
      const eventsFile = path.join(__dirname, '../src/mock/events.json');
      const userPrefsFile = path.join(__dirname, '../src/mock/userPrefs.json');

      const eventsExists = await fs.access(eventsFile).then(() => true).catch(() => false);
      const userPrefsExists = await fs.access(userPrefsFile).then(() => true).catch(() => false);

      if (!eventsExists || !userPrefsExists) {
        return {
          status: 'warning',
          message: `Test data files missing. Run: node scripts/prepare-test-data.js`
        };
      }

      // Check data quality
      const eventsData = await fs.readFile(eventsFile, 'utf8');
      const userPrefsData = await fs.readFile(userPrefsFile, 'utf8');
      
      const events = JSON.parse(eventsData);
      const userPrefs = JSON.parse(userPrefsData);

      if (events.length < 10) {
        return {
          status: 'warning',
          message: `Only ${events.length} test events found. Consider adding more for comprehensive testing.`
        };
      }

      if (userPrefs.length < 5) {
        return {
          status: 'warning',
          message: `Only ${userPrefs.length} user preferences found. Consider adding more for comprehensive testing.`
        };
      }

      return {
        status: 'passed',
        message: `Test data ready (${events.length} events, ${userPrefs.length} user preferences)`
      };
    } catch (error) {
      return {
        status: 'failed',
        message: `Test data error: ${error.message}`
      };
    }
  }

  /**
   * Check dependencies
   */
  async checkDependencies() {
    try {
      const packageJson = require('../package.json');
      const requiredDeps = [
        'openai',
        '@pinecone-database/pinecone',
        'dotenv'
      ];

      const missing = [];
      const installed = [];

      for (const dep of requiredDeps) {
        try {
          require(dep);
          installed.push(dep);
        } catch (error) {
          missing.push(dep);
        }
      }

      if (missing.length > 0) {
        return {
          status: 'failed',
          message: `Missing dependencies: ${missing.join(', ')}. Run: npm install`
        };
      }

      return {
        status: 'passed',
        message: `All required dependencies installed (${installed.length}/${requiredDeps.length})`
      };
    } catch (error) {
      return {
        status: 'failed',
        message: `Dependency check error: ${error.message}`
      };
    }
  }

  /**
   * Check service files
   */
  async checkServiceFiles() {
    const requiredServices = [
      '../src/services/eventIndexer.js',
      '../src/services/eventRetriever.js',
      '../src/services/ragRecommendationService.js',
      '../src/services/vectorStore.js',
      '../src/services/promptGenerator.js',
      '../src/services/hallucinationDetector.js',
      '../src/services/reranker.js',
      '../src/services/monitoringService.js',
      '../src/services/advancedMetrics.js',
      '../src/services/performanceOptimizer.js',
      '../src/services/alertingSystem.js'
    ];

    const missing = [];
    const found = [];

    for (const servicePath of requiredServices) {
      const fullPath = path.join(__dirname, servicePath);
      try {
        await fs.access(fullPath);
        found.push(path.basename(servicePath));
      } catch (error) {
        missing.push(path.basename(servicePath));
      }
    }

    if (missing.length > 0) {
      return {
        status: 'failed',
        message: `Missing service files: ${missing.join(', ')}`
      };
    }

    return {
      status: 'passed',
      message: `All service files present (${found.length}/${requiredServices.length})`
    };
  }

  /**
   * Check directory structure
   */
  async checkDirectoryStructure() {
    const requiredDirs = [
      '../logs',
      '../coverage',
      '../src/mock'
    ];

    const missing = [];
    const found = [];

    for (const dirPath of requiredDirs) {
      const fullPath = path.join(__dirname, dirPath);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          found.push(dirPath.replace('../', ''));
        } else {
          missing.push(dirPath.replace('../', ''));
        }
      } catch (error) {
        missing.push(dirPath.replace('../', ''));
      }
    }

    if (missing.length > 0) {
      return {
        status: 'warning',
        message: `Missing directories: ${missing.join(', ')}. Will be created automatically.`
      };
    }

    return {
      status: 'passed',
      message: `Directory structure ready (${found.length}/${requiredDirs.length})`
    };
  }

  /**
   * Check budget and limits
   */
  async checkBudgetAndLimits() {
    try {
      // Check OpenAI API key format
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey || !openaiKey.startsWith('sk-')) {
        return {
          status: 'failed',
          message: 'Invalid OpenAI API key format'
        };
      }

      // Check Pinecone API key format
      const pineconeKey = process.env.PINECONE_API_KEY;
      if (!pineconeKey || pineconeKey.length < 10) {
        return {
          status: 'failed',
          message: 'Invalid Pinecone API key format'
        };
      }

      return {
        status: 'passed',
        message: 'API keys format valid. Remember to monitor usage costs!'
      };
    } catch (error) {
      return {
        status: 'failed',
        message: `Budget check error: ${error.message}`
      };
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const checker = new ReadinessChecker();
  
  // Add all checks
  checker.addCheck('Environment Variables', () => checker.checkEnvironmentVariables(), true);
  checker.addCheck('Dependencies', () => checker.checkDependencies(), true);
  checker.addCheck('Service Files', () => checker.checkServiceFiles(), true);
  checker.addCheck('Directory Structure', () => checker.checkDirectoryStructure(), false);
  checker.addCheck('Test Data', () => checker.checkTestData(), false);
  checker.addCheck('API Key Format', () => checker.checkBudgetAndLimits(), true);
  checker.addCheck('OpenAI Connectivity', () => checker.checkAPIConnectivity(), true);
  checker.addCheck('Pinecone Connectivity', () => checker.checkPineconeConnectivity(), true);
  
  checker.runChecks()
    .then(() => {
      if (checker.results.failed === 0) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Readiness check failed:', error);
      process.exit(1);
    });
}

module.exports = ReadinessChecker; 