function runTests(isManual = false) {
  console.log("Running All Tests...");
  let passed = 0;
  let failed = 0;

  function assertEqual(desc, actual, expected) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      console.error(`   Expected: ${expectedStr}`);
      console.error(`   Actual:   ${actualStr}`);
      failed++;
    }
  }

  // --- Test Groups ---
  function testFindTargets() {
    console.log("--- Group: Find Targets ---");

    // Mock Data (moved to individual tests)

    function findNewTargetsStartingWithA() {
      // Setup
      const mockWords = [
        { id: '1', word: 'apple' },
        { id: '2', word: 'apricot' },
        { id: '3', word: 'banana' },
        { id: '4', word: 'berry' }
      ];
      const targetWordIds = [];
      const text = 'a';

      // Execute
      const result = findTargets(mockWords, targetWordIds, text);

      // Verify
      assertEqual(
        "findNewTargetsStartingWithA",
        result,
        { targetIds: ['1', '2'], indices: [0, 1] }
      );
    }

    function findNewTargetsStartingWithB() {
      const mockWords = [
        { id: '1', word: 'apple' },
        { id: '2', word: 'apricot' },
        { id: '3', word: 'banana' },
        { id: '4', word: 'berry' }
      ];
      const targetWordIds = [];
      const text = 'b';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "findNewTargetsStartingWithB",
        result,
        { targetIds: ['3', '4'], indices: [2, 3] }
      );
    }

    function noMatchesForZ() {
      const mockWords = [
        { id: '1', word: 'apple' },
        { id: '2', word: 'apricot' },
        { id: '3', word: 'banana' },
        { id: '4', word: 'berry' }
      ];
      const targetWordIds = [];
      const text = 'z';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "noMatchesForZ",
        result,
        { targetIds: [], indices: [] }
      );
    }

    function refineTargetsWithAp() {
      const mockWords = [
        { id: '1', word: 'apple' },
        { id: '2', word: 'apricot' },
        { id: '3', word: 'banana' },
        { id: '4', word: 'berry' }
      ];
      const targetWordIds = ['1', '2'];
      const text = 'ap';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "refineTargetsWithAp",
        result,
        { targetIds: ['1', '2'], indices: [0, 1] }
      );
    }

    function narrowTargetsWithApp() {
      const mockWords = [
        { id: '1', word: 'apple' },
        { id: '2', word: 'apricot' },
        { id: '3', word: 'banana' },
        { id: '4', word: 'berry' }
      ];
      const targetWordIds = ['1', '2'];
      const text = 'app';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "narrowTargetsWithApp",
        result,
        { targetIds: ['1'], indices: [0] }
      );
    }

    function switchTargetFromBananaToApple() {
      const mockWords = [
        { id: '1', word: 'apple' },
        { id: '2', word: 'apricot' },
        { id: '3', word: 'banana' },
        { id: '4', word: 'berry' }
      ];
      const targetWordIds = ['3'];
      const text = 'a';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "switchTargetFromBananaToApple",
        result,
        { targetIds: ['1', '2'], indices: [0, 1] }
      );
    }

    function typoOnLockedTarget() {
      const mockWords = [
        { id: '1', word: 'apple' },
        { id: '2', word: 'apricot' },
        { id: '3', word: 'banana' },
        { id: '4', word: 'berry' }
      ];
      const targetWordIds = ['3'];
      const text = 'z';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "typoOnLockedTarget",
        result,
        { targetIds: [], indices: [] }
      );
    }

    function typoOnLockedTarget2() {
      const mockWords = [
        { id: '1', word: 'aa' },
        { id: '2', word: 'b' },
      ];
      const targetWordIds = ['1'];
      const text = 'ab';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "typoOnLockedTarget",
        result,
        { targetIds: ['2'], indices: [1] }
      );
    }

    function typoOnLockedTarget3() {
      // Scenario: Locked on 'ac'. User types 'ab'.
      // 'a' matches. 'b' is typo for 'ac', but 'b' matches start of 'abc'.
      // Should switch to 'abc' (id 2). Input should become 'b' (effective).
      const mockWords = [
        { id: '1', word: 'ac' },
        { id: '2', word: 'abc' },
      ];
      const targetWordIds = ['1'];
      const text = 'ab';
      const result = findTargets(mockWords, targetWordIds, text);
      assertEqual(
        "typoOnLockedTarget3",
        result,
        { targetIds: ['2'], indices: [1] }
      );
    }

    // Execute Test Cases
    findNewTargetsStartingWithA();
    findNewTargetsStartingWithB();
    noMatchesForZ();
    refineTargetsWithAp();
    narrowTargetsWithApp();
    switchTargetFromBananaToApple();
    typoOnLockedTarget();
    typoOnLockedTarget2();
    typoOnLockedTarget3();
  }

  // --- Run Groups ---
  try {
    testFindTargets();
  } catch (e) {
    console.error("Test execution error:", e);
    failed++;
  }

  // --- Summary & Popup ---
  console.log(`\n--- Done ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    const msg = `CRITICAL FAILURE: ${failed} unit tests failed! Check console for details.`;
    showPopup("❌ Tests Failed", msg, true);
    // Throw error to stop execution if possible/desired
    throw new Error(msg);
  } else if (isManual) {
    showPopup("✅ Tests Passed", `Success: All ${passed} unit tests passed!`, false);
  }
}

function showPopup(title, message, isError) {
  const popup = document.getElementById('test-popup');
  if (popup) {
    document.getElementById('test-popup-title').innerText = title;
    document.getElementById('test-popup-message').innerText = message;
    popup.style.display = 'block';
    popup.style.borderColor = isError ? '#ff4444' : '#44ff44';
  } else {
    // Fallback if UI not ready/present
    alert(`${title}\n\n${message}`);
  }
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
  // Wait for load to ensure scripts are parsed, then add small delay
  window.addEventListener('load', () => {
    setTimeout(() => {
      runTests();
    }, 500);
  });
}
