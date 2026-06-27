const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.js', 'utf-8');
const lang = 'hi';

// Try the regex with different approaches
const pattern1 = new RegExp(
  `(${lang}: \\{[\\s\\S]*?notifiedOnlyWhen: "[^"]*")(\\n  \\},)`,
  'g'
);

console.log('Pattern 1 test:', pattern1.test(content));

// Reset regex since we tested it
const pattern2 = new RegExp(
  `(${lang}: \\{[\\s\\S]*?notifiedOnlyWhen: "[^"]*")(\\n  \\},)`,
  'g'
);

const matches = content.match(pattern2);
console.log('Matches found:', matches ? matches.length : 0);

// Let's try a simpler approach - find the section and check what it looks like
const sectionMatch = content.match(new RegExp(`${lang}: \\{[\\s\\S]*?notifiedOnlyWhen: "[^"]*"`, 's'));
if (sectionMatch) {
  console.log('Found section, last 150 chars:');
  console.log(JSON.stringify(sectionMatch[0].substring(sectionMatch[0].length - 150)));
}

// Check what comes after notifiedOnlyWhen for hi
const afterMatch = content.match(new RegExp(`hi:[\\s\\S]*?notifiedOnlyWhen: "[^"]*"([\\s\\S]{0,50})`, 's'));
if (afterMatch) {
  console.log('After notifiedOnlyWhen:');
  console.log(JSON.stringify(afterMatch[1]));
}
