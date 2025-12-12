const wordFilter = require("./utils/wordFilter");

const testCases = ["👻😂 nIGĞᵃ 👺☠", "nIGĞᵃ", "n!GĞᵃ", "nigga"];

console.log("Testing Word Filter Normalization:\n");

for (const test of testCases) {
  const normalized = wordFilter.normalizeText(test);
  const result = wordFilter.checkText(test);
  console.log(`Input: "${test}"`);
  console.log(`Normalized: "${normalized}"`);
  console.log(
    `Detected: ${result.detected}, Word: ${result.word}, Method: ${result.method}`
  );
  console.log("---");
}
