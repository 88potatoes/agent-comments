# Architecture

## TUI Layer

```
UI Components (pure Ink, no store/queryClient access)
    │
    ├── useCommentCommands  ←── single entry point for ALL actions
    │       │                    (mutations, navigation, help, filter, edit, quit)
    │       └── zustand store  ←── internal, never accessed directly by UI
    │
    └── useCommentListViewModel  ←── single entry point for ALL data
            │                        (derived view models for rendering)
            └── logic.ts  ←── pure functions: filter + toCommentRowViewModel + toCommentListViewModel
                    │
                    ├── zustand store (client state)
                    └── useQueryComments (server state via react-query)
```

## Rules

1. **UI components** (AppInner, CommentList, CommentRow, FilterBar, HelpScreen) must NOT import `useTuiStore`, `useQueryClient`, or `useQueryComments`. They only import:
   - `useCommentCommands` (for actions)
   - `useCommentListViewModel` (for data)
   - Props passed from parent

2. **`useCommentCommands`** is the single entry point for ALL actions. Every mutation, navigation, mode switch, filter operation, help interaction, refresh, edit, and quit goes through it. It exposes:
   - State reads: `inputMode`, `filter`, `hoveredCommentIndex`, `hoveredHelpIndex`, `showResolved`, `hasFilter`, `hasComments`
   - Commands: `moveUp/Down`, `openFilter`, `clearFilter`, `toggleResolved`, `filterType/Backspace/Apply/Cancel`, `openHelp`, `closeHelp`, `helpMoveUp/Down`, `helpActivate`, `refresh`, `editComment`, `quit`

3. **`useCommentListViewModel`** is the single entry point for ALL display data. It returns `{ vm: CommentListViewModel }`. The view model is pure — no side effects, no mutation. **Never expose `CommentEntity` to the UI layer.** Domain entities stay in the service/data layer.

4. **Keyboard input** is handled by `useHandleInput.ts`. It maps Ink key events to command calls via a deps object. The handler functions (`handleListInput`, etc.) are exported and testable as pure functions that take mock deps.

5. **`logic.ts`** is pure functions only. Input: domain entities + store state. Output: view models. No React, no mutations, no side effects.

6. **Layer boundaries**: Domain types (`CommentEntity`, `CommentStatus`, etc.) must NOT leak into hooks that UI consumes (`useCommentCommands`, `useCommentListViewModel`) or into UI components. Only view model types (`CommentListViewModel`, `CommentRowViewModel`) cross the boundary. Files like `logic.ts` and query hooks are the translation layer — they take domain entities in and output view models.

## Why?

- UI components are testable without store setup (pass mock commands/viewmodel).
- Command logic is testable via store integration tests (no React, no Ink).
- Handler functions are testable as pure functions (mock deps, assert calls).
- `buildLocalKeymaps` in HelpScreen is a pure function tested directly.
- Clear separation: UI renders data and calls actions. All logic lives in commands/logic.

## File map

| Layer | Files |
|-------|-------|
| Store | `store.ts`, `store.test.ts` |
| Commands | `comments/hooks/useCommentCommands.ts` |
| ViewModel | `comments/view-model.ts`, `comments/logic.ts`, `comments/hooks/useCommentListViewModel.ts` |
| Handlers | `useHandleInput.ts` |
| Help | `HelpScreen.tsx` (pure `buildLocalKeymaps`, UI receives props) |
| UI | `app.tsx`, `comments/components/CommentList.tsx`, `comments/components/CommentRow.tsx`, `comments/components/FilterBar.tsx` |

## Testing

- **Handler tests** (`store.test.ts` § handleListInput/handleListFilterInput/handleHelpInput): Pure functions, mock deps with `vi.fn()`, assert which dep was called.
- **Logic tests** (`store.test.ts` § clampIndex, buildLocalKeymaps): Pure functions, input→output.
- **Store integration tests** (`store.test.ts` § useCommentCommands): Set store state via `useTuiStore.setState()`, call equivalent store actions, assert resulting state.
- **Rendering test** (`app.test.tsx`): Smoke test via `renderToString`.