

# Plan: Upgrade IA W3 Message Rendering (Claude-style UI)

## Problem
AI responses use raw HTML rendered via `dangerouslySetInnerHTML` with minimal `prose` classes. The result looks unstyled and hard to read — no proper spacing, code blocks, visual hierarchy, or polished typography.

## Approach
Create a dedicated `AiMessage` component with rich CSS styling inspired by Claude's chat UI: clean typography, proper spacing between sections, styled lists with custom bullets, highlighted code blocks, subtle section dividers, and a polished copy button.

## Changes

### 1. New component: `src/components/ia-w3/AiMessage.tsx`
- Wrap sanitized HTML in a container with rich, scoped CSS styles
- Style elements: `h3/h4` with left accent border + semibold, `ul/ol` with custom spacing, `strong` with slight color emphasis, `p` with comfortable line-height, `table` with clean borders, `code` with inline highlight background
- Add smooth copy button (bottom-right, appears on hover)
- Add subtle top separator between diagnostic sections (detect `<h3>` patterns)

### 2. Add scoped CSS in `src/index.css` (new `.ai-message` block)
Styles targeting `.ai-message` descendants:
- `h3`: `font-size: 15px`, `font-weight: 700`, `margin-top: 1.5em`, left `3px` primary-colored border, `padding-left: 10px`
- `h4`: `font-size: 14px`, `font-weight: 600`, `margin-top: 1em`, muted-foreground color
- `p`: `margin: 0.6em 0`, `line-height: 1.7`, `font-size: 14px`
- `ul/ol`: `padding-left: 1.2em`, `margin: 0.5em 0`, custom bullet color matching primary
- `li`: `margin: 0.3em 0`, `line-height: 1.6`
- `strong`: slightly brighter foreground color
- `table`: full-width, subtle border, header with muted background
- Numbered sections (`ol > li`) with primary-colored numbers
- Responsive: tighten spacing on mobile

### 3. Update `src/pages/IAW3.tsx`
- Replace the inline `dangerouslySetInnerHTML` block (lines 353-366) with `<AiMessage content={message.content} onCopy={handleCopyMessage} />`
- The assistant message bubble: remove `bg-muted/50` background, use transparent with subtle bottom border between messages (Claude-style — no bubble, just content with avatar)
- Restyle the loading indicator: use 3 animated dots instead of spinner text

### 4. Visual changes to message layout
- Remove chat bubble background for assistant messages entirely — content flows directly next to the avatar (Claude pattern)
- User messages keep the primary-colored bubble
- Add a thin `border-bottom` separator between message groups
- Copy button repositioned: small ghost button below the message, left-aligned, with "Copiar" text label (not just icon)

## No backend changes needed
The edge function already outputs well-structured HTML. This is purely a frontend rendering improvement.

