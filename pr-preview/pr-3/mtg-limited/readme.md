# MTG Limited Simulator

A client-side web application for practicing Magic: The Gathering limited formats (Sealed Deck, Booster Draft logic) securely and natively in the browser without a backend.

## Architecture

This project strictly adheres to modular ES6 class design to eliminate global variables. Core state is driven through `AppController`, `BoosterApp`, and `SealedApp` classes. 

*   **`js/scryfall.js`**: Centralized API abstraction. Manages polling, request shaping, and merging for base sets and subset variants.
*   **`js/booster-logic.js`**: Maintains the pack formulas, variant drop rates, and mathematical generation logic.
*   **`js/sealed.js`**: Drives the virtual sandbox drag-and-drop interface.
*   **`js/set-utils.js`**: Helper methods for calculating release dates and filtering eligible formats natively without relying on heavy frontend frameworks.

## Data Source (Scryfall API Interaction)

All card data is sourced asynchronously in real-time from the [Scryfall REST API](https://scryfall.com/docs/api).

1.  **Set Navigation**: Scryfall `/sets` is queried to populate the dropdowns. Sets are filtered by configuration types securely natively.
2.  **Card Fetching**: `Scryfall.fetchCards("set:[setCode]")` pulls comprehensive printing metrics for the sets seamlessly. Results are automatically paginated and aggregated.
3.  **Special Guests (SPG) Integration**: `BoosterLogic` initiates concurrent fetches for both a given set's primary card pool (`set:ecl`) and its matching Special Guests payload (`set:spg date:[set release date]`). The SPG integration operates as a 12.5% appearance chance on the "List/Common Slot", mathematically mimicking "The List" pull rates for Play Boosters.

## Verifying the Implementation Locally

To see how the logic is requesting from the Scryfall API, you can directly query these sample endpoints in your browser:

### 1. Set List Loading
Fetching the complete list of Magic: The Gathering sets:
*   [https://api.scryfall.com/sets/](https://api.scryfall.com/sets/)

### 2. Main Set Card Loading (ECL)
Fetching all available printings for the **Edge of the Coin (ECL)** set:
*   [https://api.scryfall.com/cards/search?q=set%3Aecl+unique%3Aprints](https://api.scryfall.com/cards/search?q=set%3Aecl+unique%3Aprints)

### 3. Special Guests (SPG) Alignment
To fetch matching SPG cards, the application first fetches the set's release date:
*   Release Date Fetch: [https://api.scryfall.com/sets/ecl](https://api.scryfall.com/sets/ecl)
    *(Extract `released_at: "2026-01-23"`)*
*   Sub-Set Fetch: [https://api.scryfall.com/cards/search?q=set%3Aspg+date%3A2026-01-23+unique%3Aprints](https://api.scryfall.com/cards/search?q=set%3Aspg+date%3A2026-01-23+unique%3Aprints)
