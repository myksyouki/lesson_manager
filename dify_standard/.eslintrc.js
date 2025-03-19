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
    "quotes": ["off"],
    "object-curly-spacing": ["off"],
    "comma-dangle": ["off"],
    "no-trailing-spaces": ["off"],
    "indent": ["off"],
    "max-len": ["off"],
    "@typescript-eslint/no-explicit-any": ["off"],
    "@typescript-eslint/no-unused-vars": ["off"],
    "import/no-unresolved": ["off"],
    "padded-blocks": ["off"],
    "require-jsdoc": ["off"]
  },
};
