var path = require('path');

function buildEsLintCommand(files) {
  var relativeFiles = files.map(function (f) {
    return path.relative(process.cwd(), f);
  });
  return 'eslint --fix ' + relativeFiles.join(' ');
}

module.exports = {
  '*.{js,ts}': [buildEsLintCommand],
  // Run a full type-check and coverage check once per commit (no file args appended)
  '*': () => ['npx tsc --noEmit', 'npm run test:coverage'],
};
