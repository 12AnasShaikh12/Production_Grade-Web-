import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".data/**",
    "test-results/**",
    "playwright-report/**",
    // Pre-existing Python virtualenv in the repository root.
    "Include/**",
    "Lib/**",
    "Scripts/**",
  ]),
]);

export default eslintConfig;
