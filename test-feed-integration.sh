#!/bin/bash

# Integration test script for feed creation
# Tests all aspects of the feed creation flow

echo "=========================================="
echo "Feed Creation Integration Tests"
echo "=========================================="
echo ""

# Test 1: Regex pattern
echo "Test 1: Regex Pattern Detection"
echo "--------------------------------"
node test-feed-trigger-detection.js
if [ $? -ne 0 ]; then
  echo "❌ Test 1 failed"
  exit 1
fi
echo ""

# Test 2: Message structure
echo "Test 2: Message Structure"
echo "--------------------------------"
node test-feed-message-structure.js
if [ $? -ne 0 ]; then
  echo "❌ Test 2 failed"
  exit 1
fi
echo ""

# Test 3: End-to-end flow
echo "Test 3: End-to-End Flow"
echo "--------------------------------"
node test-feed-end-to-end.js
if [ $? -ne 0 ]; then
  echo "❌ Test 3 failed"
  exit 1
fi
echo ""

# Test 4: Real-world scenarios
echo "Test 4: Real-World Scenarios"
echo "--------------------------------"
node test-feed-real-scenario.js
if [ $? -ne 0 ]; then
  echo "❌ Test 4 failed"
  exit 1
fi
echo ""

echo "=========================================="
echo "✅ All integration tests passed!"
echo "=========================================="

