# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drawsh is a Manifest V3 Chrome browser extension that allows users to draw annotations on any webpage. It's built with vanilla JavaScript (no build process or dependencies).

## Architecture

### Core Components

**content.js** - Main application logic
- Contains the `Drawsh` class that manages the entire drawing lifecycle
- Injected into all pages via manifest.json content_scripts
- Creates and manages the canvas overlay and toolbar UI
- Handles all drawing operations, undo/redo, and clipboard operations
- Stores strokes in memory as an array of stroke objects
- Each stroke contains: type, points/start/end, color, alpha, size, autoContrast flag

**background.js** - Service worker
- Handles keyboard shortcut commands (Alt+Shift+X) via chrome.commands API
- Sends messages to content script to toggle drawing mode

**popup.js/popup.html** - Extension popup
- Simple UI to toggle drawing mode on/off
- Checks if extension can run on current page (disabled on chrome:// URLs)
- Syncs state with content script via chrome.storage.local

**styles.css** - Styling
- Canvas overlay positioned with z-index 2147483646 (pointer-events: none when inactive)
- Toolbar positioned at z-index 2147483647 with dark theme
- Text input styling

### Drawing System Architecture

**Canvas Management**
- Full-viewport overlay canvas with device pixel ratio (DPR) scaling
- Canvas is scaled by DPR for crisp rendering on retina displays
- Window resize triggers redraw of all strokes

**Stroke Storage**
- All strokes stored in `this.strokes` array
- Each stroke is an object with properties: `type`, `color`, `alpha`, `size`
- Pen strokes: `{type: 'pen', points: [...], ...}`
- Shape strokes: `{type: 'line'|'arrow'|'rect'|'circle', start: {x,y}, end: {x,y}, ...}`
- Text strokes: `{type: 'text', text: string, point: {x,y}, ...}`
- Undo/redo uses separate stacks that store removed/restored strokes

**Natural Pen Strokes**
- Variable width based on velocity and simulated pressure
- Tapered ends (thinner at start/end of stroke)
- Smoothing applied via exponential moving average
- Rendered as series of circles connected by tapered quads (not simple lines)

**Smart Color Detection**
- Analyzes page background color on initialization
- Calculates brightness using relative luminance formula (0.299*R + 0.587*G + 0.114*B)
- Automatically defaults to black on light backgrounds (>128 brightness)
- Automatically defaults to white on dark backgrounds (≤128 brightness)
- Ensures optimal contrast without manual color selection

**Stroke Eraser**
- Removes entire strokes (not pixel-based erasing)
- Hit detection checks if point is near any stroke geometry
- Different hit detection for each stroke type (path, line, rect, ellipse, text bbox)
- Erased strokes pushed to redo stack for potential restoration

### State Management

**Drawing State**
- `isActive` - whether drawing mode is enabled (persisted to chrome.storage.local)
- `isDrawing` - whether user is currently drawing a stroke
- `currentTool`, `currentColor`, `currentSize` - active tool settings
- `points` - temporary array for current stroke being drawn
- `strokes` - all completed strokes
- `redoStack` - strokes that can be redone

**Keyboard Shortcuts**
- Tool selection: P, L, A, R, C, T, E
- Color selection: 1-8 (black, white, red, blue, green, yellow, orange, purple)
- Undo: Ctrl+Z, Redo: Ctrl+Shift+Z
- Screenshot: S
- Toggle: Alt+Shift+X (via background.js), Esc (closes drawing mode)

## Development Workflow

### Testing the Extension

1. Make changes to source files
2. Go to `chrome://extensions`
3. Click the refresh icon on the Drawsh extension card
4. Reload any open webpage tabs where you want to test
5. Click the extension icon or press Alt+Shift+X to toggle drawing mode

### Debugging

- Use browser DevTools console for content script errors (content.js)
- Use extension service worker inspector for background script errors (background.js)
- Check `chrome.storage.local` in DevTools Application tab for persisted state

## Code Patterns

### Adding New Tools

1. Add tool name to `this.tools` array in constructor
2. Add button in `createToolbar()` with icon and keyboard shortcut
3. Handle tool in keyboard shortcuts (`toolShortcuts` object)
4. Implement drawing in `draw()` and `stopDrawing()` methods
5. Add shape rendering in `drawShape()` and `drawShapeOn()` methods
6. Implement stroke storage format in `stopDrawing()`
7. Add redraw logic in `redraw()` method

### Canvas Rendering Pattern

All drawing operations follow this pattern:
1. Set canvas context properties (lineWidth, strokeStyle, globalAlpha, etc.)
2. Draw stroke with selected color and alpha
3. Always reset globalAlpha to 1 after drawing

### Message Passing

- **Background → Content**: `chrome.tabs.sendMessage(tabId, {action: 'toggle'})`
- **Content → Background**: Handled via `chrome.runtime.onMessage.addListener()`
- **Popup ↔ Content**: Via `chrome.tabs.sendMessage()` and `chrome.storage.local`

## Key Implementation Details

- Shift key modifiers are tracked globally to support snapping (15° for lines/arrows, 1:1 for shapes)
- Text input is a temporary DOM input element positioned at click point
- Screenshot creates temporary canvas, redraws all strokes, converts to blob, copies to clipboard
- Clear all is undoable by storing all cleared strokes in a special clearAll redo action
- Pointer events (not mouse events) are used to support touch devices
- Canvas prevents default touch behavior to avoid scrolling while drawing
