#!/usr/bin/env node

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

/**
 * Master script to run all real RAG tests
 */

class RealTestRunner {
  constructor() {
    this.results = {
      phase1: null,
      phase2: null,
      phase3: null,
      total: {
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Run readiness check first
   */
  async checkReadiness() {
    console.log('🔍 Checking readiness for real testing...\n');
    
    try {
      const ReadinessChecker = require('./check-readiness');
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
      
      await checker.runChecks();
      
      if (checker.results.failed > 0) {
        throw new Error(`${checker.results.failed} critical checks failed. Please fix issues before running tests.`);
      }
      
      console.log('✅ Readiness check passed!\n');
      return true;
      
    } catch (error) {
      console.error('❌ Readiness check failed:', error.message);
      return false;
    }
  }

  /**
   * Prepare test data
   */
  async prepareTestData() {
    console.log('📊 Preparing test data...\n');
    
    try {
      const TestDataPreparer = require('./prepare-test-data');
      const preparer = new TestDataPreparer();
      
      await preparer.saveTestData();
      console.log('✅ Test data prepared successfully!\n');
      return true;
      
    } catch (error) {
      console.error('❌ Test data preparation failed:', error.message);
      return false;
    }
  }

  /**
   * Index test events
   */
  async indexTestEvents() {
    console.log('📈 Indexing test events...\n');
    
    try {
      const TestEventIndexer = require('./index-test-events');
      const indexer = new TestEventIndexer();
      
      const indexingResult = await indexer.indexTestEvents();
      const retrievalResults = await indexer.testRetrieval();
      
      console.log('✅ Test events indexed successfully!\n');
      return { indexingResult, retrievalResults };
      
    } catch (error) {
      console.error('❌ Test event indexing failed:', error.message);
      return null;
    }
  }

  /**
   * Run Phase 1 tests
   */
  async runPhase1Tests() {
    console.log('🚀 Running Phase 1 Tests (Core Improvements)...\n');
    
    try {
      const testScript = require('./test-phase1-improvements');
      const result = await testScript.runTests();
      
      this.results.phase1 = result;
      console.log('✅ Phase 1 tests completed!\n');
      return true;
      
    } catch (error) {
      console.error('❌ Phase 1 tests failed:', error.message);
      this.results.phase1 = { error: error.message };
      return false;
    }
  }

  /**
   * Run Phase 2 tests
   */
  async runPhase2Tests() {
    console.log('🚀 Running Phase 2 Tests (Advanced Features)...\n');
    
    try {
      const testScript = require('./test-phase2-improvements');
      const result = await testScript.runTests();
      
      this.results.phase2 = result;
      console.log('✅ Phase 2 tests completed!\n');
      return true;
      
    } catch (error) {
      console.error('❌ Phase 2 tests failed:', error.message);
      this.results.phase2 = { error: error.message };
      return false;
    }
  }

  /**
   * Run Phase 3 tests
   */
  async runPhase3Tests() {
    console.log('🚀 Running Phase 3 Tests (Production Optimization)...\n');
    
    try {
      const testScript = require('./test-phase3-improvements');
      const result = await testScript.runTests();
      
      this.results.phase3 = result;
      console.log('✅ Phase 3 tests completed!\n');
      return true;
      
    } catch (error) {
      console.error('❌ Phase 3 tests failed:', error.message);
      this.results.phase3 = { error: error.message };
      return false;
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    console.log('\n📊 Real RAG Testing Report');
    console.log('==========================');
    
    const totalDuration = this.endTime - this.startTime;
    const durationMinutes = Math.floor(totalDuration / 60000);
    const durationSeconds = Math.floor((totalDuration % 60000) / 1000);
    
    console.log(`\n⏱️ Total Test Duration: ${durationMinutes}m ${durationSeconds}s`);
    
    // Phase 1 Results
    console.log('\n📋 Phase 1 Results (Core Improvements):');
    if (this.results.phase1 && !this.results.phase1.error) {
      console.log(`   ✅ Status: PASSED`);
      if (this.results.phase1.metrics) {
        console.log(`   📈 Embedding Quality: ${this.results.phase1.metrics.embeddingQuality || 'N/A'}`);
        console.log(`   🎯 Citation Accuracy: ${this.results.phase1.metrics.citationAccuracy || 'N/A'}`);
        console.log(`   🚫 Hallucination Rate: ${this.results.phase1.metrics.hallucinationRate || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ Status: FAILED`);
      console.log(`   💥 Error: ${this.results.phase1?.error || 'Unknown error'}`);
      this.results.total.failed++;
    }
    
    // Phase 2 Results
    console.log('\n📋 Phase 2 Results (Advanced Features):');
    if (this.results.phase2 && !this.results.phase2.error) {
      console.log(`   ✅ Status: PASSED`);
      if (this.results.phase2.metrics) {
        console.log(`   🔧 Chunking Performance: ${this.results.phase2.metrics.chunkingPerformance || 'N/A'}`);
        console.log(`   📊 Reranking Quality: ${this.results.phase2.metrics.rerankingQuality || 'N/A'}`);
        console.log(`   🧪 Synthetic Dataset: ${this.results.phase2.metrics.syntheticDataset || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ Status: FAILED`);
      console.log(`   💥 Error: ${this.results.phase2?.error || 'Unknown error'}`);
      this.results.total.failed++;
    }
    
    // Phase 3 Results
    console.log('\n📋 Phase 3 Results (Production Optimization):');
    if (this.results.phase3 && !this.results.phase3.error) {
      console.log(`   ✅ Status: PASSED`);
      if (this.results.phase3.metrics) {
        console.log(`   📊 Monitoring Metrics: ${this.results.phase3.metrics.monitoringMetrics || 'N/A'}`);
        console.log(`   ⚡ Performance Optimization: ${this.results.phase3.metrics.performanceOptimization || 'N/A'}`);
        console.log(`   🚨 Alerting System: ${this.results.phase3.metrics.alertingSystem || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ Status: FAILED`);
      console.log(`   💥 Error: ${this.results.phase3?.error || 'Unknown error'}`);
      this.results.total.failed++;
    }
    
    // Overall Results
    console.log('\n📈 Overall Results:');
    const totalPhases = 3;
    const passedPhases = totalPhases - this.results.total.failed;
    const passRate = (passedPhases / totalPhases) * 100;
    
    console.log(`   - Phases Passed: ${passedPhases}/${totalPhases}`);
    console.log(`   - Pass Rate: ${passRate.toFixed(1)}%`);
    
    if (passRate === 100) {
      console.log(`\n🎉 All phases passed! RAG system is production-ready!`);
    } else if (passRate >= 66) {
      console.log(`\n⚠️ Most phases passed. Review failed phases before production deployment.`);
    } else {
      console.log(`\n❌ Multiple phases failed. Significant issues need to be addressed.`);
    }
    
    // Cost Analysis
    console.log('\n💰 Estimated Cost Analysis:');
    console.log(`   - OpenAI API: ~$5-15 (embeddings + GPT-4 calls)`);
    console.log(`   - Pinecone: ~$2-5 (vector storage + queries)`);
    console.log(`   - Total: ~$7-20 per complete test run`);
    
    // Recommendations
    console.log('\n📝 Recommendations:');
    if (passRate === 100) {
      console.log(`   ✅ System is ready for production deployment`);
      console.log(`   📊 Continue monitoring performance metrics`);
      console.log(`   🔄 Schedule regular re-evaluation`);
    } else {
      console.log(`   🔧 Fix issues in failed phases`);
      console.log(`   🧪 Re-run specific phase tests`);
      console.log(`   📋 Review error logs for details`);
    }
    
    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Save detailed report to file
   */
  async saveDetailedReport() {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        duration: this.endTime - this.startTime,
        results: this.results,
        environment: {
          embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
          useReranking: process.env.USE_RERANKING || 'false',
          enableMonitoring: process.env.ENABLE_MONITORING || 'false',
          enableAlerting: process.env.ENABLE_ALERTING || 'false'
        }
      };
      
      const reportFile = path.join(__dirname, '../logs/real-test-report.json');
      await fs.writeFile(reportFile, JSON.stringify(reportData, null, 2));
      
      console.log(`\n📄 Detailed report saved to: ${reportFile}`);
      
    } catch (error) {
      console.error('⚠️ Could not save detailed report:', error.message);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.startTime = Date.now();
    
    console.log('🚀 Starting Real RAG System Testing');
    console.log('===================================\n');
    
    try {
      // Step 1: Check readiness
      const ready = await this.checkReadiness();
      if (!ready) {
        throw new Error('Readiness check failed');
      }
      
      // Step 2: Prepare test data
      const dataPrepared = await this.prepareTestData();
      if (!dataPrepared) {
        throw new Error('Test data preparation failed');
      }
      
      // Step 3: Index test events
      const indexingResult = await this.indexTestEvents();
      if (!indexingResult) {
        throw new Error('Test event indexing failed');
      }
      
      // Step 4: Run Phase 1 tests
      const phase1Success = await this.runPhase1Tests();
      
      // Step 5: Run Phase 2 tests
      const phase2Success = await this.runPhase2Tests();
      
      // Step 6: Run Phase 3 tests
      const phase3Success = await this.runPhase3Tests();
      
      this.endTime = Date.now();
      
      // Generate final report
      this.generateTestReport();
      
      // Return overall success
      return phase1Success && phase2Success && phase3Success;
      
    } catch (error) {
      this.endTime = Date.now();
      console.error('\n💥 Real testing failed:', error.message);
      this.generateTestReport();
      return false;
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const runner = new RealTestRunner();
  
  runner.runAllTests()
    .then((success) => {
      if (success) {
        console.log('\n🎉 All real tests completed successfully!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Some tests failed. Review the report above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = RealTestRunner; 