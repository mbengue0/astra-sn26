# Use of AI

## AI tools used by the team

- **Claude (Anthropic), through Claude Code**, was used as a coding and explanation assistant for:
  - the scientific engine (`backend/astra_engine`), the API (`backend/api`), the scripts, the tests and the
    validation scripts (`validation/`);
  - connecting the web app to the engine (`frontend/src/services/engineData.ts`, the data parts of the
    Globe, Celestial Horizon and Local Terrain views);
  - the documentation and the pitch slides.

  Engine files written with AI assistance say so in their header.
- The team chose the method, reviewed the code, ran it, and checked the results against independent NASA
  references (JPL Horizons, NASA LOLA illumination maps, QuickMap); see
  [`../scientific/test_results.md`](../scientific/test_results.md).

## What is not AI

- **Every number shown by the app comes from the deterministic engine** (fixed formulas, NASA data), not from
  an AI model. The same inputs always give the same outputs, and 61 automated tests check them.
- **The in-app "ASTRA Copilot" is not an AI model.** It is a set of pre-written answers
  (`frontend/src/components/workspace/AstraAiCopilot.tsx`) chosen by keywords in the question and filled in
  with the engine's numbers for the selected site. It does not call any AI service. Some of its fixed text is
  not accurate for this project (see [`../scientific/limitations.md`](../scientific/limitations.md#web-app)).
