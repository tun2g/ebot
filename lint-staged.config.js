// eslint-disable-next-line no-undef
module.exports = {
  '*.{js,cjs,jsx,ts,tsx}': ['eslint --fix', 'eslint'],
  '**/*.ts?(x)': () => 'yarn run check-types',
  '*.{json,yaml}': ['prettier --write'],
};
