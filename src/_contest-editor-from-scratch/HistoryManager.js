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

  get length() {
    return this.history.length;
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
    log('reset');
    this.history = [];
    this.historyIndex = -1;
  }

  updateCursor() {
    this.logHistory('before updateCursor');

    if (!this.current) return;

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
    function trim(s) {
      if (/^<br *\/?>$/i.test(s)) return '';

      return s;
    }

    return {
      cursor: saveCursorPosition2(this.el),
      nodes: Array.from(this.el.childNodes).map(node => node.cloneNode(true)),
      html: trim(this.el.innerHTML),
      textContent: this.el.textContent,
    };
  }

  get currentHtml() {
    return this.current?.html || '';
  }

  updateCurrent() {
    this.logHistory('updateCurrent');

    if (this.historyIndex === -1) {
      this.saveState();
      return;
    }

    this.modified = this.currentHtml !== this.el.innerHTML;
    this.history[this.historyIndex] = this.generateHistoryItem();

    if (this.historyIndex < this.history.length - 1) {
      //this.history = this.history.slice(0, this.historyIndex + 1);
    }
  }

  saveState() {
    this.logHistory('before saveState');

    const historyObject = this.generateHistoryItem();
    this.history = this.history.slice(0, this.historyIndex + 1);
    if (historyObject.html === this.currentHtml && this.length > 0) {
      this.history[this.historyIndex] = historyObject;
    } else {
      this.history.push(historyObject);
      this.historyIndex++;
    }
    this.modified = false;
    this.logHistory('after saveState');
  }

  restoreState() {
    this.logHistory('before restoreState');

    if (!this.current) {
      return;
    }

    const { cursor, nodes } = this.current;

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

    // if (this.modified) {
    //   this.restoreState();
    //   return;
    // }

    if (this.currentHtml !== this.el.innerHTML) {
      this.saveState();
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
