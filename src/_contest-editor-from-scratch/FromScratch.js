import parseMarkdownToHtml from './markdownToHtml.js';
import * as helpers from './helpers.js';
import {
  getClosestParentFromCursor, getNodeIndex,
  removeCopiedGarbage,
  saveCursorPosition, setCaretAfter, setCaretAfterNodeIndex,
  setCaretBefore,
} from './helpers.js';
import { sanitizeRichDOM, sanitizeRichHtml } from './sanitizeRichHtml.js';
import HistoryManager from './HistoryManager.js';

import TAGS_CONFIG_RENDERING from './TAGS_CONFIG_RENDERING.js';
import TAGS_CONFIG_SENDING from './TAGS_CONFIG_SENDING.js';

function log(...args) {
  console.log('--- [from-scratch]', ...args);
}

log('module load');

export default class FromScratch extends HTMLElement { // Safari does not support extending existing tags but it's ok
  disableObserver = false;

  history = new HistoryManager(this);

  static get observedAttributes() {
    return [''];
  }

  constructor() {
    log('constructor');
    super();
  }

  connectedCallback() {
    log('connectedCallback');
    this.sanitizeMyself();
    this.history.reset();

    this.addEventListener('input', this.handleInput);
    this.addEventListener('paste', this.handlePaste);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('beforeinput', (e) => {
      log('beforeinput', e);
      if (e.inputType.startsWith('insert')) {
        const selection = window.getSelection();
        if (!selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          this.history.saveState();
        }
      }
    });
    this.addEventListener('click', (e) => {
      this.history.saveState();
    });

    let saveStateTimeout;

    const observer = new MutationObserver((mutations) => {
      if (this.disableObserver) {
        log('-----mutation detected but disabled', mutations);
        return;
      }
      log('-----mutation detected', mutations);

      const isDomModified = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes)
          .some((node) => node.nodeType !== Node.TEXT_NODE);
      });

      this.disableObserver = true;
      this.sanitizeMyself();
      log('-----mutation sanitizeMyself');
      this.disableObserver = false;
      if (isDomModified) {
        this.history.saveState();
      }
      if (saveStateTimeout) {
        clearTimeout(saveStateTimeout);
      }
      saveStateTimeout = setTimeout(() => {
        this.dispatchInputEvent();
      }, 0);
    });
    observer.observe(this, {
      childList: true,
      subtree: true,
    });
  }

  disconnectedCallback() {
    log('disconnectedCallback');
    this.removeEventListener('input', this.handleInput);
    this.removeEventListener('paste', this.handlePaste);
    this.removeEventListener('keydown', this.handleKeyDown);
    // this.removeEventListener('blur', this.handleInput);
  }

  adoptedCallback() {
    log('disconnectedCallback');
  }

  attributeChangedCallback(name, oldValue, newValue) {
    log('attributeChangedCallback', name, oldValue, newValue);
  }

  handleKeyDown(e) {
    log('handleKeyDown', e);

    if (e.keyCode === 32) { // Space
      this.history.saveState();
    }

    if (e.keyCode === 13) { // Enter
      this.history.saveState();
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      //this.history.saveState();
    }

    if (e.key === 'ArrowUp' || e.key === 'Backspace') {
      const blockSelector = 'div:has(pre, blockquote), blockquote';
      let parentBlock = getClosestParentFromCursor(blockSelector, 'from-scratch');
      const isFirstChildBlock = this.firstChild?.nodeType === Node.ELEMENT_NODE && this.firstChild.matches(blockSelector);
      const cursorGlobal = saveCursorPosition(this);

      const isNeedInsertNewline = e.key === 'ArrowUp' && cursorGlobal.startOffset === 0 && isFirstChildBlock;

      if (isNeedInsertNewline) {
        const br = document.createElement('br');
        this.disableObserver = true;
        this.prepend(br);
        this.disableObserver = false;
      } else { // if (parentBlock) {
        this.normalize();
        if (!parentBlock) {
          parentBlock = this;
        }
        const cursor = saveCursorPosition(parentBlock);

        if (cursor.startOffset === 0 && cursor.endOffset === 0) {
          if (e.key === 'Backspace') {
            const codeNodeIndex = getNodeIndex(this, parentBlock);
            if (codeNodeIndex === 1 && this.firstChild?.tagName === 'BR') {
              this.firstChild.remove();
              e.preventDefault();
            } else if (codeNodeIndex > 0) {
              const prevNode = parentBlock.previousSibling;

              if (prevNode.nodeType === Node.TEXT_NODE) {
                if (prevNode.textContent.endsWith('\n')) {
                  prevNode.textContent = prevNode.textContent.slice(0, prevNode.textContent.length - 1);
                }
              }

              if (prevNode?.tagName === 'BR' && codeNodeIndex >= 2) {
                setCaretBefore(prevNode);
              } else {
                setCaretBefore(parentBlock);
              }
              e.preventDefault();
            }
          }
        }
      }
    }

    if (e.key === 'ArrowDown') {
      const blockSelector = 'pre, blockquote, div:has(pre, blockquote)';
      const parentBlock = getClosestParentFromCursor(blockSelector, 'from-scratch');

      if (parentBlock) {
        this.normalize();
        const isLastChildBlock = this.lastChild?.nodeType === Node.ELEMENT_NODE && this.lastChild.matches(blockSelector);
        const cursorGlobal = saveCursorPosition(this);
        const isNeedInsertNewline = cursorGlobal.startOffset >= this.textContent.length && isLastChildBlock;

        if (isNeedInsertNewline) {
          this.disableObserver = true;
          this.append(document.createElement('br'));
          this.disableObserver = false;
          this.dispatchInputEvent();
        }
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (!e.shiftKey && e.keyCode === 90) { // Ctrl+Z
        e.preventDefault();
        this.history.undo();
        this.dispatchInputEvent();
        this.sanitizeMyself();
      } else if (e.keyCode === 89 || (e.keyCode === 90 && e.shiftKey)) { // Ctrl+Y or Ctrl+Shift+Z
        e.preventDefault();
        this.history.redo();
        this.dispatchInputEvent();
        this.sanitizeMyself();
      }
    }
  }

  handleInput(e) {
    log('handleInput', e);
    //const isDomModified = this.sanitizeMyself();
    //this.history.updateCurrent();

    //if (isDomModified) {
      //e.stopPropagation();
    //}
  }

  set innerHTML(text) {
    log('set innerHTML', text);
    text = text.replace(/<br *\/?>/gi, '\n');
    text = sanitizeRichHtml(text, TAGS_CONFIG_RENDERING, { processMarkdown: false });
    text = parseMarkdownToHtml(text, { processOnlyTags: ['```'] });
    text = sanitizeRichHtml(text, TAGS_CONFIG_RENDERING, { processMarkdown: true });
    //super.innerHTML = '';
    this.history.updateCurrent();
    super.innerHTML = text;
    //this.history.saveState();
    //this.history.reset();
  }

  get innerHTML() {
    return super.innerHTML;
  }

  handlePaste(e) {
    if (e.clipboardData.files?.length > 0) {

      log('handlePaste');
      return;
    }

    const clipboardData = e.clipboardData || window.clipboardData;
    let html = clipboardData.getData('text/html');

    if (!html) {
      html = clipboardData.getData('text/plain');
    }

    html = html.replace(/<br *\/?>/gi, '\n');
    html = removeCopiedGarbage(html);
    const hasPre = /<pre.*?>/i.test(html);
    const htmlSanitized = sanitizeRichHtml(html, TAGS_CONFIG_RENDERING, { processMarkdown: false });

    let md = '';
    if (!hasPre) {
      md = parseMarkdownToHtml(htmlSanitized, { processOnlyTags: ['```'] });
      md = sanitizeRichHtml(md, TAGS_CONFIG_RENDERING, { processMarkdown: true });
    }

    if (!hasPre && md !== htmlSanitized) {
      if (confirm('Parse markdown before pasting?')) {
        this.insertHtmlAtCursor(md);
      } else {
        this.insertHtmlAtCursor(html);
      }
    } else {
      this.insertHtmlAtCursor(html);
    }

    e.preventDefault();
    e.stopPropagation();

    log('handlePaste', html);
  }

  sanitizeMyself() {
    const cursorPosition = helpers.saveCursorPosition2(this);

    sanitizeRichDOM(this, TAGS_CONFIG_RENDERING);
    log('sanitizeMyself');

    if (cursorPosition) {
      //helpers.restoreCursorPosition2(this, cursorPosition);
    }
  }

  insertHtmlAtCursor(html) {
    log('insertHtmlAtCursor', html);

    // html = html.replace(/(\n\r?)/g, '<br>');
    const selection = window.getSelection();

    if (!selection.rangeCount) return;

    const cleanHTML = sanitizeRichHtml(html, TAGS_CONFIG_RENDERING);
    const range = selection.getRangeAt(0);
    const fragment = range.createContextualFragment(cleanHTML);

    range.deleteContents();

    range.insertNode(fragment);
    range.collapse(false);
    this.sanitizeMyself();
  }

  dispatchInputEvent() {
    log('dispatchInputEvent()');
    this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  }

  getHtmlForSending() {
    return FromScratch.getHtmlForSending(this.innerHTML);
  }

  static getHtmlForSending(text) {
    text = text.replace(/<br *\/?>/gi, '\n');
    text = sanitizeRichHtml(text, TAGS_CONFIG_SENDING, { processMarkdown: false });
    text = parseMarkdownToHtml(text, { processOnlyTags: ['```'] });
    text = sanitizeRichHtml(text, TAGS_CONFIG_SENDING, { processMarkdown: true });
    text = text.trim().replace(/\u200b+/g, '');

    return text;
  }
}

customElements.define('from-scratch', FromScratch);
