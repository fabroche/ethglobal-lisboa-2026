// Flat config (ESLint 9). Ver https://eslint.org/docs/latest/use/configure/
import storybook from "eslint-plugin-storybook";

import next from "eslint-config-next";

// eslint-config-next@16 exporta un flat config array nativo (core-web-vitals +
// typescript + ignores). Se usa directo, sin FlatCompat.
const eslintConfig = [{ ignores: [".next/**", "node_modules/**", "worker/dist/**", "storybook-static/**"] }, ...next, {
  rules: {
    // Sin console.log crudos (solo warn/error).
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
}, ...storybook.configs["flat/recommended"]];

export default eslintConfig;
