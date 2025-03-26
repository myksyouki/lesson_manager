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
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    
    // 一時的に無効化するルール
    "valid-jsdoc": "off",
    "require-jsdoc": "off",
    "max-len": "off",
    "no-trailing-spaces": "off",
    "no-useless-escape": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "indent": "off",
    "import/no-named-as-default-member": "off",
  },
};
