const tseslint = require('typescript-eslint');
const angularESLint = require('@angular-eslint/eslint-plugin');
const angularESLintTemplate = require('@angular-eslint/eslint-plugin-template');
const angularESLintTemplateParser = require('@angular-eslint/template-parser');

module.exports = tseslint.config(
  { ignores: ['dist/', 'node_modules/', '.angular/', 'eslint.config.js'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['tsconfig.json', 'tsconfig.app.json'],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@angular-eslint': angularESLint,
    },
    rules: {
      ...angularESLint.configs.recommended.rules,
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
    },
  },
  {
    // The shell owns the gateway URL, the authentication and the HTTP client of every portal (numeral 5.3.x,
    // csp-front): inside the shell this portal injects the shell's HttpClient and never builds its own, so
    // nothing here may provide a client, add interceptors or read an environment value. Specs are exempt:
    // they have to provide a client to test the service.
    files: ['src/app/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@angular/common/http',
          importNames: [
            'provideHttpClient', 'HttpClientModule', 'HttpClientXsrfModule', 'HttpClientJsonpModule',
            'withInterceptors', 'withInterceptorsFromDi', 'withFetch', 'withXsrfConfiguration', 'withJsonpSupport',
            'withRequestsMadeViaParent', 'withNoXsrfProtection', 'HTTP_INTERCEPTORS', 'HttpBackend', 'HttpXhrBackend',
            'FetchBackend', 'JsonpClientBackend',
          ],
          message: 'The HTTP client belongs to the shell (csp-front): inject HttpClient, never provide a client, an interceptor or a backend here.',
        }],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'A portal has no configuration of its own: the shell (csp-front) owns the gateway URL and the environment.',
        },
        {
          selector: "MetaProperty[meta.name='import'][property.name='meta']",
          message: 'A portal has no configuration of its own: the shell (csp-front) owns the gateway URL and the environment.',
        },
        {
          selector: "Identifier[name=/^(GATEWAY_URL|gatewayUrl)$/], Literal[value=/^(GATEWAY_URL|gatewayUrl)$/]",
          message: 'The gateway URL is owned by the shell (csp-front): this portal only writes the path of its API.',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularESLintTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularESLintTemplate,
    },
    rules: {
      ...angularESLintTemplate.configs.recommended.rules,
    },
  }
);