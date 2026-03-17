var path = require('path');

function buildEsLintCommand(files) {
  var relativeFiles = files.map(function (f) {
    return path.relative(process.cwd(), f);
  });
  return 'eslint --fix ' + relativeFiles.join(' ');
}

module.exports = {
  '*.{js,ts}': [buildEsLintCommand],
  // Run a full type-check and test suite once per commit (no file args appended)
  // Coverage threshold is enforced by prepublishOnly, not on every commit
  '*': () => ['npx tsc --noEmit', 'npm test'],
};
