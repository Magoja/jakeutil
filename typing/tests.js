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

  function testGameDictionary() {
    console.log("--- Group: GameDictionary ---");

    function createMockGameDictionary() {
      const config = new GameConfig();
      config.gameDuration = 60;
      config.levels = {
        1: { cpm: 60, dist: [1, 0, 0, 0, 0, 0], desc: "Test Level 1" },
        2: { cpm: 100, dist: [0.5, 0.5, 0, 0, 0, 0], desc: "Test Level 2" }
      };

      const gd = new GameDictionary(config);
      // Mock dictionaries
      gd.dictionaries = Array(6).fill(null).map((_, i) => ({
        getRandomWord: () => {
          // Return word with length = i+1 for easier checking
          return "x".repeat(i + 1);
        },
        load: async () => true
      }));
      return gd;
    }

    function testPreselectCounts() {
      const gd = createMockGameDictionary();
      // Level 1: CPM 60. Game Duration 60s. Target = 60 chars.
      // Dist: 100% from dict 0 (length 1).
      // Should modify logic slightly? 
      // Dict 0 words are length 1. So we need 60 words.
      const words = gd.preselect(1);

      const totalChars = words.reduce((sum, w) => sum + w.length, 0);

      assertEqual("testPreselectCounts - enough chars", totalChars >= 60, true);
      assertEqual("testPreselectCounts - roughly correct count", words.length >= 60, true);
    }

    function testPreselectDistribution() {
      const gd = createMockGameDictionary();
      // Level 2: CPM 100. Target 100 chars.
      // Dist: 50% dict 0 (len 1), 50% dict 1 (len 2).
      // Avg len = 1.5. Expected words approx 100 / 1.5 = 66 words.

      const words = gd.preselect(2);
      const totalChars = words.reduce((sum, w) => sum + w.length, 0);

      assertEqual("testPreselectDistribution - enough chars", totalChars >= 100, true);

      // Check if we have mix of len 1 and len 2
      const len1 = words.filter(w => w.length === 1).length;
      const len2 = words.filter(w => w.length === 2).length;

      // Allow for randomness, but both should be present with high probability
      assertEqual("testPreselectDistribution - has len 1", len1 > 0, true);
      assertEqual("testPreselectDistribution - has len 2", len2 > 0, true);
    }

    testPreselectCounts();
    testPreselectDistribution();
  }

  // --- Run Groups ---
  try {
    console.log("Starting test groups...");
    testFindTargets();
    console.log("Finished testFindTargets. Calling testGameDictionary...");
    console.log("GameConfig typeof:", typeof GameConfig);
    console.log("GameDictionary typeof:", typeof GameDictionary);
    testGameDictionary();
    console.log("Finished testGameDictionary.");
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
