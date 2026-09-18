const cleanText = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeNumber = (value) => {
  return Number(String(value).replace(/,/g, ""));
};

const valueExistsInText = (text, value) => {
  const targetValue = normalizeNumber(value);

  const numbers = text.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || [];

  return numbers.some((number) => {
    return normalizeNumber(number) === targetValue;
  });
};

const levenshteinDistance = (a, b) => {
  const matrix = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[a.length][b.length];
};

const similarity = (a, b) => {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - distance / maxLength;
};

const nameExistsInOCR = (ocrText, testName) => {
  const input = cleanText(ocrText);
  const name = cleanText(testName);

  // Exact match
  if (input.includes(name)) {
    return true;
  }

  // Compare individual words to handle OCR mistakes
  const inputWords = input.split(" ");
  const nameWords = name.split(" ");

  let matchedWords = 0;

  for (const nameWord of nameWords) {
    if (
      inputWords.some((inputWord) => {
        return similarity(nameWord, inputWord) >= 0.85;
      })
    ) {
      matchedWords++;
    }
  }

  const matchPercentage = matchedWords / nameWords.length;

  return matchPercentage >= 0.8;
};

export const validateTestsAgainstInput = (inputText, tests) => {
  for (const test of tests) {
    const nameExists = nameExistsInOCR(
      inputText,
      test.name
    );

    const valueExists = valueExistsInText(
      inputText,
      test.value
    );

    if (!nameExists) {
      return {
        valid: false,
        reason: `Hallucinated test not present in input: ${test.name}`
      };
    }

    if (!valueExists) {
      return {
        valid: false,
        reason: `Test value not present in input: ${test.name}`
      };
    }
  }

  return {
    valid: true
  };
};