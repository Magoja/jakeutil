# Project Coding Guidelines

This file contains the coding standards, architectural patterns, and general rules for this project. 
When instructed, the AI assistant should strictly adhere to these guidelines.

## 1. UI & Styling
- **Aesthetics First:** Prioritize clear, clean, and modern aesthetics.
- **Frameworks:** Use standard CSS/HTML unless specified otherwise.
- **Responsiveness:** All new UI components must be mobile-friendly and responsive.

## 2. JavaScript / Logic
- **Modern Syntax:** Use ES6+ features (arrow functions, const/let, destructuring).
- **Modularity:** Keep functions small and focused on a single responsibility.
- **State Management:** Document complex state changes. Prefer data attributes or localized state classes over sprawling global variables when possible.

## 3. Formatting & Naming
- **Naming:** Use `camelCase` for variables and functions, `PascalCase` for classes, and `kebab-case` for file names and CSS classes.
- **Comments:** Comment "why" something is done, not "what" is being done (unless the logic is highly complex).

## 4. Specific Patterns for MTG Limited Tool
- [Add any specific rules about how MtG objects should be handled here]
- [Add rules about the DeckSerializer or UI utility patterns here]
