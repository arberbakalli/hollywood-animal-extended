// The one test-side statement of the starting deck (GAME_RULES "Starting Tags").
// Production derives the counts from GAME_DATA.starterWhitelist; tests pin the
// expected value here, once. Owner confirmed 58 in a new game, 2026-10-08.
export const TOTAL_ELEMENTS = 250;
export const STARTING_DECK_SIZE = 58;
export const STARTING_BAN_COUNT = TOTAL_ELEMENTS - STARTING_DECK_SIZE;
