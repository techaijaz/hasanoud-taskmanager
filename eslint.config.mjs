import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
    eslint.configs.recommended,
    eslintConfigPrettier,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-console': 'error',
            'no-useless-catch': 0,
            quotes: [
                'error',
                'single',
                {
                    allowTemplateLiterals: true
                }
            ]
        }
    }
]
