module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/build/**/*"
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double", { "avoidEscape": true }],
    "import/no-unresolved": 0,
    "valid-jsdoc": 0,
    "new-cap": 0,
    "no-trailing-spaces": 0,
    "comma-dangle": 0,
    "arrow-parens": 0,
    "max-len": 0,
    "require-jsdoc": 0,
    "linebreak-style": 0,
    "indent": ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
  },
};
