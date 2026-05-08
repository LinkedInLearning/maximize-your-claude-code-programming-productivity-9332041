# Typing Game — User Flow

Two diagrams below: a high-level happy-path overview, and a comprehensive state diagram covering every user interaction.

## 1. High-Level Flow

```mermaid
flowchart TD
    Boot([App boot]) --> Idle[Passage loaded<br/>Idle]
    Idle -->|First keystroke| Typing[Typing in progress]
    Typing -->|Finishes passage| Results[Results modal<br/>WPM / Accuracy / Time]
    Results -->|Next passage| Idle
    Results -->|Close| Finished[Finished passage<br/>modal hidden]
    Finished -->|Next passage| Idle
    Finished -->|Restart| Idle
```

## 2. All User Interactions

```mermaid
stateDiagram-v2
    [*] --> Idle: App boot, loadPassage(0)

    Unfocused --> Idle: Click viewport (focus)
    Idle --> Unfocused: Blur (click outside)

    Idle --> Typing: First printable key<br/>(startTimeMs set)

    Typing --> Typing: Printable key (correct → done)
    Typing --> Typing: Printable key (wrong → err)
    Typing --> Typing: Backspace (revert caret)

    Typing --> ResultsModal: caretIndex >= passage.length<br/>finishPassage() saves to localStorage

    ResultsModal --> Idle: Click "Next passage" (modal)
    ResultsModal --> Finished: Click "Close"

    Finished --> Idle: Click "Next passage" (main)
    Finished --> Idle: Click "Restart"

    Idle --> Idle: Click "Restart" (reload passage)
    Idle --> Idle: Click "Next passage" (advance)
    Typing --> Idle: Click "Restart" (reset)
    Typing --> Idle: Click "Next passage" (skip)

    note right of ResultsModal
        Export results (TSV download)
        is available from any state
        and does not change state.
    end note
```

## Interaction Reference

| Action | Trigger | Effect |
|--------|---------|--------|
| Type character | Printable keydown | Marks char `done`/`err`; advances caret; starts timer on first key |
| Backspace | `Backspace` keydown | Reverts caret; clears `done`/`err` on prior char |
| Click viewport | Mouse click on typing area | Focuses viewport; dismisses blur hint |
| Restart | "Restart" button | Reloads same passage from index 0 |
| Next passage (main) | "Next passage" button | Cycles to next of 10 passages |
| Next passage (modal) | Modal "Next passage" | Dismisses modal + advances |
| Close modal | Modal "Close" | Hides modal; stays on finished passage |
| Export results | "Export results" button | Downloads TSV of all historical runs |

Source: `game.js` (handlers ~line 294+, `finishPassage` 224–244, `loadPassage` 68–104, export 269–292) and `index.html`.
