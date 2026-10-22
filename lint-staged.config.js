const quote = (files) => files.map((f) => `"${f}"`).join(' ')

export default {
    '*.{js,mjs}': 'eslint --fix --no-warn-ignored',
    // oxlint is installed in client/, not at the root
    'client/**/*.{js,jsx}': (files) => `npm exec --prefix client -- oxlint -c client/.oxlintrc.json --deny-warnings ${quote(files)}`,
    '*.{js,mjs,jsx,json,md,yml,yaml,css,html}': 'prettier --write'
}
