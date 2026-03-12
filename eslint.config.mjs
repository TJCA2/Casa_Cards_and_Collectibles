import nextConfig from "eslint-config-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  ...nextConfig,
  // Rules for all JS/TS files
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
    },
  },
  // TypeScript-specific rules — only apply to .ts/.tsx files
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];

export default eslintConfig;
