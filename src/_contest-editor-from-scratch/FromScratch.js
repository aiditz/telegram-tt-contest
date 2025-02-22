import parseMarkdownToHtml from './markdownToHtml.js';
import * as helpers from './helpers.js';
import {
  arraysIntersection,
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

  prevActiveFormattingTags = [];

  static get observedAttributes() {
    return [''];
  }

  constructor() {
    log('constructor');
    super();
  }

  applyFormatting(alias) {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return false;
    }
    const range = selection.getRangeAt(0);

    if (!range) {
      return false;
    }


  }

  get activeFormattingTags() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return [];
    }
    const range = selection.getRangeAt(0);

    if (!range) {
      return [];
    }

    const startTags = this.getFormattingTags(range.startContainer);
    const endTags = this.getFormattingTags(range.endContainer);

    const deeper = startTags.length > endTags ? startTags : endTags;
    const upper = startTags.length > endTags ? endTags : startTags;

    for (let i = deeper.length - 1; i >= 0; i--) {
      if (upper.find(tag => tag.element === deeper[i].element)) {
        return deeper.slice(0, i + 1); // common element
      }
    }

    return [];
  }

  checkActiveFormattingTags() {
    const newTags = this.activeFormattingTags;

    if (newTags.map(tag => tag.path).join('-') !== this.prevActiveFormattingTags.map(tag => tag.path).join('-')) {
      this.prevActiveFormattingTags = newTags;
      this.dispatchEvent(new Event('activeFormattingTagsChange', newTags));
    }
  }

  getFormattingTags(element) {
    const result = [];
    let path = '';

    while (element) {
      if (!element.parentElement) {
        return [];
      }

      if (element.nodeType === Node.ELEMENT_NODE) {
        let alias = TAGS_CONFIG_RENDERING[element.tagName.toLowerCase()]?.formattingAlias;

        if (typeof alias === 'function') {
          alias = alias(element);
        }

        if (alias) {
          path = [getNodeIndex(element.parentElement, element).toString(), path].filter(Boolean).join('.');
          result.push({
            path,
            alias,
            element,
          });
        }
      }

      if (element.parentElement === this) {
        break;
      }

      element = element.parentElement;
    }

    return result.reverse();
  }

  connectedCallback() {
    log('connectedCallback');
    this.sanitizeMyself();
    this.history.reset();

    document.addEventListener('selectionchange', this.handleSelectionChange);
    this.addEventListener('input', this.handleInput);
    this.addEventListener('paste', this.handlePaste);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('beforeinput', this.handleBeforeInput);
    this.addEventListener('click', this.handleClick);

    let saveStateTimeout;

    const observer = new MutationObserver((mutations) => {
      if (this.disableObserver) {
        return;
      }

      const isDomModified = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes)
          .some((node) => node.nodeType !== Node.TEXT_NODE);
      });

      this.disableObserver = true;
      this.sanitizeMyself();
      this.disableObserver = false;
      this.checkActiveFormattingTags();
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
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    this.removeEventListener('input', this.handleInput);
    this.removeEventListener('paste', this.handlePaste);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('beforeinput', this.handleBeforeInput);
    this.removeEventListener('click', this.handleClick);
    // this.removeEventListener('blur', this.handleInput);
  }

  // adoptedCallback() {
  //   log('disconnectedCallback');
  // }
  //
  // attributeChangedCallback(name, oldValue, newValue) {
  //   log('attributeChangedCallback', name, oldValue, newValue);
  // }

  handleClick(e) {
    log('handleClick');
    this.history.saveState();
  }

  handleBeforeInput(e) {
    log('handleBeforeInput', e.inputType);
    if (e.inputType.startsWith('insert')) {
      const selection = window.getSelection();
      if (!selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        this.history.saveState();
      }
    }
  }

  handleSelectionChange = (e) => {
    this.checkActiveFormattingTags();
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
