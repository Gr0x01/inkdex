// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [{
  ignores: [
    "**/.next/**",
    "**/node_modules/**",
    "**/out/**",
    "**/build/**",
    "**/.vercel/**",
    "**/scripts/**", // Ignore scripts directory for now
    "**/.storybook/main.ts", // Storybook core config
    "**/.storybook/preview.ts", // Storybook preview config
    "**/.storybook/preview-head.html", // Storybook HTML template
    "**/storybook-static/**", // Storybook build output
  ],
}, ...tseslint.configs.recommended, {
  plugins: {
    "@next/next": nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }
    ],
  },
}, ...storybook.configs["flat/recommended"]];
