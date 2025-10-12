// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
	{ ignores: [".next/**", "node_modules/**", "dist/**"] },
	js.configs.recommended,
	...compat.extends("plugin:@next/next/core-web-vitals"),
	// Base rules/plugins for all files
	{
		plugins: {
			"react-hooks": reactHooks,
			import: importPlugin,
			boundaries,
		},
		rules: {
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"import/order": [
				"warn",
				{ "newlines-between": "always", alphabetize: { order: "asc", caseInsensitive: true } }
			],
			"import/no-duplicates": "warn",
			"import/no-cycle": "warn",
			"boundaries/element-types": [
				"error",
				{
					default: "allow",
					rules: [
						{ from: ["components"], allow: ["lib", "types"] },
						{ from: ["app"], allow: ["components", "lib", "types", "i18n"] },
						{ from: ["lib"], allow: ["lib", "types"] }
					]
				}
			]
		},
		settings: {
			"boundaries/elements": [
				{ type: "app", pattern: "app/**" },
				{ type: "components", pattern: "components/**" },
				{ type: "lib", pattern: "lib/**" },
				{ type: "types", pattern: "types/**" },
				{ type: "i18n", pattern: "i18n/**" }
			]
		}
	},
	// TypeScript-specific, type-aware rules
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parser,
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {
				project: ["./tsconfig.json"],
				tsconfigRootDir: import.meta.dirname,
			},
			globals: { ...globals.browser, ...globals.node },
		},
		plugins: { "@typescript-eslint": tsPlugin },
		rules: {
			"no-undef": "off",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports", disallowTypeAnnotations: false }]
		}
	},
	// Node JS config files (CommonJS)
	{
		files: ["**/*config.js", "next.config.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs",
			globals: { ...globals.node }
		},
		rules: {
			"no-undef": "off"
		}
	}
];
