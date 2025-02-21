
export function saveCursorPosition(container) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(container);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return {
    endContainer: range.endContainer,
    startOffset: preCaretRange.toString().length,
    endOffset: preCaretRange.toString().length + range.toString().length,
  };
}

export function saveCursorPosition2(container) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const nodePathStart = getNodePath(container, range.startContainer);
  const nodePathEnd = getNodePath(container, range.endContainer);

  if (!nodePathStart) {
    return {
      isTextNode: true,
      startOffset: 0,
      endOffset: 0,
      startContainer: container,
      endContainer: container,
      nodePathStart: [],
      nodePathEnd: [],
    };
  }

  if (range.endContainer.nodeType === Node.TEXT_NODE) {
    return {
      isTextNode: true,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      endContainer: range.endContainer,
      nodePathStart,
      nodePathEnd,
    };
  } else {
    return {
      isTextNode: false,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      endContainer: range.endContainer,
      nodePathStart,
      nodePathEnd,
    };
  }
}

export function restoreCursorPosition2(root, posObj) {
  if (!posObj) return;

  const selection = window.getSelection();

  const elStart = getNodeAtPath(root, posObj.nodePathStart);
  const elEnd = getNodeAtPath(root, posObj.nodePathEnd);
  if (!elStart) return;
  if (!elEnd) return;

  const range = document.createRange();
  try {
    range.setStart(elStart, posObj.startOffset);
    range.setEnd(elEnd, posObj.endOffset);
  } catch (e) {
    range.setStartAfter(elStart);
    range.setEndBefore(elEnd);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

export function restoreCursorPosition(container, {
  caret,
  startOffset,
  endOffset,
}) {
  const selection = window.getSelection();
  const range = document.createRange();

  let charCount = 0;
  let foundStart = false;
  let startNode,
    startNodeOffset;
  let endNode,
    endNodeOffset;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nextCharCount = charCount + node.length;

    if (!foundStart && startOffset <= nextCharCount) {
      startNode = node;
      startNodeOffset = startOffset - charCount;
      foundStart = true;
    }

    if (endOffset <= nextCharCount) {
      endNode = node;
      endNodeOffset = endOffset - charCount;
      break;
    }

    charCount = nextCharCount;
  }

  try {
    range.setStart(startNode || container, startNodeOffset || 0);
    range.setEnd(endNode || container, endNodeOffset || 0);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (e) {
    range.selectNodeContents(container);
    range.collapse(false);
    selection.addRange(range);
  }
}

export function getNodeIndex(parent, child) {
  if (parent === child) {
    return -1;
  }

  let directChild = child;

  while (directChild.parentElement !== parent) {
    directChild = directChild.parentElement;

    if (!directChild) {
      return -1;
    }
  }

  for (let i = 0; i < parent.childNodes.length; i++) {
    if (parent.childNodes[i] === directChild) {
      return i;
    }
  }

  return -1;
}

export function setCaretAfter(element) {
  const range = document.createRange();

  range.setStartAfter(element);
  range.setEndAfter(element);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

export function setCaretAfterNodeIndex(root, index) {
  const range = document.createRange();

  range.setStart(root, index);
  range.setEnd(root, index);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

export function setCaretBefore(element) {
  if (!element.parentNode) return;

  const range = document.createRange();
  range.setStartBefore(element);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function getLastChildDeep(node) {
  if (node.childNodes.length === 0) return node;

  let lastChild = node.lastChild;

  if (lastChild.tagName === 'BR' && node.childNodes.length >= 2) {
    lastChild = node.childNodes[node.childNodes.length - 2];
  }

  return getLastChildDeep(lastChild);
}

export function getClosestParentFromCursor(parentSelector, stopSelector = '') {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  //if (!range.collapsed) return;

  let parentElement = range.startContainer;

  while (true) {
    if (parentElement instanceof Element) {
      if (stopSelector && parentElement.matches(stopSelector)) {
        return;
      }

      if (parentElement.matches(parentSelector)) {
        return parentElement;
      }
    }

    parentElement = parentElement.parentElement;

    if (!parentElement) break;
  }
}

export function removeCopiedGarbage(s) {
  if (s.startsWith('<html>') && s.indexOf('<!--StartFragment-->') !== -1 && s.indexOf('<!--EndFragment-->') !== -1) {
    return s.slice(s.indexOf('<!--StartFragment-->') + 20, s.indexOf('<!--EndFragment-->') );
  }

  return s;
}

export function arraysIntersection(array1, array2) {
  if (!array1) {
    return array2;
  }
  if (!array2) {
    return array1;
  }
  return array1.filter(value => array2.includes(value));
}

export function getChildTextNodes(el) {
  return Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
}

export function getNodePath(root, node) {
  if (!root || !node || !node.parentElement) {
    return;
  }

  if (root === node) {
    return [];
  }

  for (let i = 0; i < node.parentElement.childNodes.length; i++) {
    const child = node.parentElement.childNodes[i];
    if (child === node) {
      const prevPath = getNodePath(root, node.parentElement);

      if (!prevPath) return;

      return [...prevPath, i];
    }
  }
}

export function getNodeAtPath(root, path) {
  if (!root || !path) return;

  if (path.length === 0) return root;

  return getNodeAtPath(root.childNodes[path[0]], path.slice(1));
}

export function styleStringToObject(styleString) {
  const styleObject = {};

  function tokenizeDeclarations(str) {
    let tokens = [];
    let currentToken = '';
    let inQuote = null;
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (inQuote) {
        currentToken += char;
        if (char === inQuote) {
          inQuote = null;
        }
      } else {
        if (char === "'" || char === '"') {
          inQuote = char;
          currentToken += char;
        } else if (char === '(') {
          parenDepth++;
          currentToken += char;
        } else if (char === ')') {
          parenDepth = Math.max(parenDepth - 1, 0);
          currentToken += char;
        } else if (char === ';' && parenDepth === 0) {
          if (currentToken.trim().length > 0) {
            tokens.push(currentToken.trim());
          }
          currentToken = '';
        } else {
          currentToken += char;
        }
      }
    }

    if (currentToken.trim().length > 0) {
      tokens.push(currentToken.trim());
    }

    return tokens;
  }

  function splitDeclaration(decl) {
    let property = '';
    let value = '';
    let inQuote = null;
    let parenDepth = 0;
    let colonIndex = -1;

    for (let i = 0; i < decl.length; i++) {
      const char = decl[i];
      if (inQuote) {
        if (char === inQuote) {
          inQuote = null;
        }
      } else {
        if (char === '"' || char === "'") {
          inQuote = char;
        } else if (char === '(') {
          parenDepth++;
        } else if (char === ')') {
          parenDepth = Math.max(parenDepth - 1, 0);
        } else if (char === ':' && parenDepth === 0) {
          colonIndex = i;
          break;
        }
      }
    }

    if (colonIndex !== -1) {
      property = decl.slice(0, colonIndex).trim();
      value = decl.slice(colonIndex + 1).trim();
    }

    return { property, value };
  }

  const declarations = tokenizeDeclarations(styleString);

  declarations.forEach(decl => {
    const { property, value } = splitDeclaration(decl);
    if (property) {
      styleObject[property] = value;
    }
  });

  return styleObject;
}

export function regIndexOf(reg, s, startPos) {
  const match = s.slice(startPos).match(reg);

  if (!match) return -1;

  return match.index + startPos;
}
