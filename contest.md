## Task 1 - Text Editor

> Rework the existing text editor from scratch and eliminate its imperfections

The text editor has been rewritten from scratch, see `src/_contest-editor-from-scratch`.

I decided to build the editor based on Custom Elements. Reasons:

- I believe rich editor functionality should not depend on the framework it is used in
- Reusability across projects, with potential to create an open-source project
- Customizability
- Extensibility
- Native performance
- Granular control over DOM mutations.

Functionality:
- Self-written history management
- Self-written markdown parser, supporting [these entities](https://core.telegram.org/api/entities#allowed-entities) and also links
- Real-time content sanitization
- It doesn't matter what external reason the data changed -
  the rendering will always correspond to the specified set of rules (allowed tags, attributes, other rules)
- It has some API that allows external code to track text styles at the cursor position, reset history, etc.

Features:
- When pasting markdown, it prompts whether it should parse markdown before pasting - very useful feature, especially for testing
- Ability to move the cursor outside a block using arrow keys (up/down) and backspace
- 2 sets of rules for processing content: for display to the user, and (stricter) for sending data to the server

Changes were also made to the Composer, MessageInput, and TextFormatter and some other components
to integrate the new text editor.
Some of their functionality is now implemented within the editor itself.

The Composer was not rewritten from scratch because the task explicitly stated to rework
only the text editor, with no mention of reworking other functionality handled by the Composer.

## Task 2 - New Chat Folders Appearance

>  Introduce the new Chat Folders appearance based on the provided mockups (https://t.me/contest/398).

Refactoring was performed to enable opening the main menu from both LeftColumn and LeftMainHeader.

A setting was added to choose folder placement (top or left).

The ChatFoldersTabs component designed separately with two display styles.
Tested on mobile, tablet and desktop screen sizes.

In folder settings, user can now select an emoji/custom emoji or a standard folder icon.

Since the Folder object does not support saving custom emoji as icon,
it is stored in the text and the entities property.

Since the [official API](https://core.telegram.org/constructor/dialogFilterChatlist?layer=195) does not support saving emoji to folders (documentId or entities field),
the emoji will be reset when you refresh the page.

The icon selection window is close to the mockup, but not exactly the same.
The reason is that the task does not mention the need to implement features that require a lot of time,
such as searching across all emojis including custom emojis.
I decided to save this time for more thorough debugging of the text editor.

## Bonus Task

> Add support for animated chat backgrounds as in other Telegram apps. For reference, check Telegram Web K (http://web.telegram.org/k) or this. (https://github.com/crashmax-dev/twallpaper-webgl)

Not implemented.

I am unsure if I understood the task’s intention.
The task references a library,
but at the same time, the competition conditions prohibit
using any libraries.
Unfortunately, I didn't have enough strength to write a WebGL background
renderer from scratch in the specified time frame.
