module.exports = {
  // TypeScript files - ESLint with Prettier via prettier/prettier rule
  // Matches VS Code's source.fixAll.eslint behavior
  '*.ts': (filenames) => [`eslint --fix ${filenames.join(' ')}`],

  // JavaScript files - ESLint with Prettier via prettier/prettier rule
  '*.js': (filenames) => [`eslint --fix ${filenames.join(' ')}`],

  // JSON files - Use Prettier directly (ESLint doesn't handle JSON)
  '*.json': ['prettier --write'],

  // Markdown files
  '*.md': ['prettier --write'],

  // YAML files
  '*.{yml,yaml}': ['prettier --write'],
};
