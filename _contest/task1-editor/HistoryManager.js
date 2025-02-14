import {
  restoreCursorPosition2,
  saveCursorPosition2,
} from './helpers.js';

function log(...args) {
  console.log('--- [HistoryManager]', ...args);
}

export default class HistoryManager {
  history = [];

  historyIndex = -1;

  modified = false;

  constructor(editableElement) {
    this.el = editableElement;
  }

  logHistory(s) {
    log(s, '| index/length/items =', this.historyIndex, this.history.length, this.history);
  }

  get last() {
    return this.history[this.history.length - 1];
  }

  get current() {
    return this.history[this.historyIndex];
  }

  reset() {
    this.history = [];
    this.historyIndex = -1;
  }

  updateCursor() {
    this.logHistory('before updateCursor');
    this.current.cursor = saveCursorPosition2(this.el);

    // if (this.historyIndex >= 0 && this.el.textContent === this.textContent) {
    //   this.history = this.history.slice(0, this.historyIndex + 1);
    //   this.history[this.historyIndex].cursor = saveCursorPosition(this.el) || {
    //     startOffset: Number.MAX_SAFE_INTEGER,
    //     endOffset: Number.MAX_SAFE_INTEGER,
    //   };
    // }
    this.logHistory('after updateCursor');
  }

  generateHistoryItem() {
    return {
      cursor: saveCursorPosition2(this.el),
      nodes: Array.from(this.el.childNodes).map(node => node.cloneNode(true)),
      html: this.el.innerHTML,
      textContent: this.el.textContent,
    };
  }

  updateCurrent() {
    this.logHistory('updateCurrent');

    if (this.historyIndex === -1) {
      this.saveState();
      return;
    }

    this.history[this.historyIndex] = this.generateHistoryItem();

    this.modified = this.current.html !== this.el.innerHTML;

    if (this.historyIndex < this.history.length - 1) {
      //this.history = this.history.slice(0, this.historyIndex + 1);
    }
  }

  saveState() {
    this.logHistory('before saveState');

    const historyObject = this.generateHistoryItem();

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(historyObject);
    this.historyIndex++;
    this.modified = false;
    this.logHistory('after saveState');
  }

  restoreState() {
    this.logHistory('before restoreState');

    if (!this.current) {
      return;
    }

    const { cursor, caret, html, nodes } = this.current;

    this.el.disableObserver = true;
    this.el.replaceChildren(...Array.from(nodes).map(node => node.cloneNode(true)));

    restoreCursorPosition2(this.el, cursor);
    this.modified = false;
    setTimeout(() => {
      this.el.disableObserver = false;
      this.logHistory('after restoreState - disableObserver = false');
    }, 10);
    this.logHistory('after restoreState');
  }

  undo() {
    log('undo', 'index:', this.historyIndex, ', history.length:', this.history.length);

    if (this.modified) {
      this.restoreState();
      return;
    }

    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState();
    }
  }

  redo() {
    log('redo', 'index:', this.historyIndex, ', history.length:', this.history.length);
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState();
    }
  }
}
