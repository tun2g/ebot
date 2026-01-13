module.exports = {
  // TypeScript files
  '*.ts': ['eslint --fix', 'prettier --write', () => 'tsc --noEmit --pretty'],

  // JavaScript files
  '*.js': ['eslint --fix', 'prettier --write'],

  // JSON files
  '*.json': ['prettier --write'],

  // Markdown files
  '*.md': ['prettier --write'],

  // YAML files
  '*.{yml,yaml}': ['prettier --write'],
};
