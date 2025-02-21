
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
  const nodePath = getNodePath(container, range.endContainer);

  if (!nodePath) {
    return {
      isTextNode: true,
      endOffset: 0,
      endContainer: container,
      nodePath: [],
    };
  }

  if (range.endContainer.nodeType === Node.TEXT_NODE) {
    return {
      isTextNode: true,
      endOffset: range.endOffset,
      endContainer: range.endContainer,
      nodePath,
    };
  } else {
    return {
      isTextNode: false,
      endOffset: range.endOffset,
      endContainer: range.endContainer,
      nodePath,
    };
  }
}

export function restoreCursorPosition2(root, posObj) {
  if (!posObj) return;

  const selection = window.getSelection();

  const el = getNodeAtPath(root, posObj.nodePath);
  if (!el) return;

  const range = document.createRange();
  try {
    range.setStart(el, posObj.endOffset);
  } catch (e) {
    range.setStartAfter(el);
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
    // Fallback to end of content
    range.selectNodeContents(container);
    range.collapse(false);
    selection.addRange(range);
  }
}

function hasTextBefore(parentNode, node) {
  if (!parentNode || !node.parentNode || node === parentNode) {
    return false;
  }

  for (const childNode of node.parentNode.childNodes) {
    if (childNode === node) {
      return false;
    }

    if (childNode.nodeType === Node.TEXT_NODE) {
      return true;
    }

    if (childNode.tagName === 'BR') {
      return true;
    }
  }

  return hasTextBefore(node.parentNode);
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

export function isCursorAtEndOfParentTag(parentTagSelector) {
  // 1. Получаем текущее выделение
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false; // Проверяем, что курсор свёрнут

  // 2. Находим ближайший родительский элемент с указанным тегом
  let parentElement;

  if (range.startContainer instanceof Element) {
    if (range.startContainer.matches(parentTagSelector)) {
      parentElement = range.startContainer;
    }
  }

  if (!parentElement) {
    parentElement = range.startContainer.parentElement.closest(parentTagSelector);
  }

  if (!parentElement) return false;

  const lastChild1 = getLastChildDeep(parentElement);
  const lastChild2 = getLastChildDeep(selection.focusNode);

  return lastChild1 === selection.focusNode || lastChild1 === lastChild2;

  // 3. Создаём временный диапазон для измерения
  const tempRange = document.createRange();
  tempRange.selectNodeContents(parentElement);
  tempRange.setEnd(range.startContainer, range.startOffset);

  // 4. Сравниваем позицию курсора с общей длиной текста
  const cursorPosition = tempRange.toString().length;
  const totalTextLength = parentElement.textContent.length;

  return cursorPosition === totalTextLength;
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

function getCaret(element) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  let chars = 0;
  let found = false;

  function traverse(node) {
    if (found) return;

    // If this is the node where the caret begins…
    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Add only part of the text node.
        chars += range.startOffset;
      } else {
        // Element node: the caret is between childNodes.
        // So we count the full length of all childNodes before the offset.
        for (let i = 0; i < range.startOffset; i++) {
          traverse(node.childNodes[i]);
          if (found) return;
        }
      }
      found = true;
      return;
    }

    // For text nodes, simply add its content’s length.
    if (node.nodeType === Node.TEXT_NODE) {
      chars += node.textContent.length;
    }
    // For element nodes…
    else if (node.nodeType === Node.ELEMENT_NODE) {
      // If it is a BR tag, count it as one char.
      if (node.tagName === "BR") {
        chars += 1;
      } else {
        // Otherwise we iterate over its children.
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
          if (found) return;
        }
      }
    }
  }

  traverse(element);
  return chars;
}

function setCaret(element, caretPosition) {
  const range = document.createRange();
  const sel = window.getSelection();
  let currentChars = 0;
  let found = false;

  function traverse(node) {
    if (found) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const nodeTextLength = node.textContent.length;
      // If the caret should be inside this text node…
      if (currentChars + nodeTextLength >= caretPosition) {
        range.setStart(node, caretPosition - currentChars);
        found = true;
        return;
      } else {
        currentChars += nodeTextLength;
      }
    }
    else if (node.nodeType === Node.ELEMENT_NODE) {
      // If the node is a <br>, count it as a single character.
      if (node.tagName === "BR") {
        if (currentChars + 1 >= caretPosition) {
          // For a <br>, we can’t set the caret “inside” the element,
          // so we place it right after the <br> in its parent.
          const parent = node.parentNode;
          const nodeIndex = Array.prototype.indexOf.call(parent.childNodes, node);
          range.setStart(parent, nodeIndex + 1);
          found = true;
          return;
        } else {
          currentChars += 1;
        }
      } else {
        // For normal element nodes, iterate over children.
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
          if (found) return;
        }
      }
    }
  }

  traverse(element);

  // If we haven’t found a position, put the caret at the very end.
  if (!found) {
    range.selectNodeContents(element);
    range.collapse(false);
  }

  // Finally, update the selection.
  sel.removeAllRanges();
  sel.addRange(range);
}

export function moveCursorToEndOfPreviousLine(editableDiv) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const originalRange = selection.getRangeAt(0).cloneRange();
  const originalRect = originalRange.getBoundingClientRect();

  if (originalRect.top === 0 && originalRect.height === 0) return;

  let currentRange = originalRange.cloneRange();
  let previousLineFound = false;
  let lastGoodPosition = null;

  // Ищем позицию в предыдущей строке
  while (true) {
    const currentRect = currentRange.getBoundingClientRect();

    if (currentRect.top < originalRect.top) {
      previousLineFound = true;
      lastGoodPosition = {
        node: currentRange.endContainer,
        offset: currentRange.endOffset
      };
      break;
    }

    if (!moveCursorBackward(currentRange)) break;
  }

  if (!previousLineFound) return;

  // Ищем конец предыдущей строки
  let maxOffset = lastGoodPosition.offset;
  let maxNode = lastGoodPosition.node;
  const targetTop = currentRange.getBoundingClientRect().top;

  while (true) {
    if (!moveCursorForward(currentRange)) break;

    const rect = currentRange.getBoundingClientRect();
    if (rect.top > targetTop || rect.top === 0) break;

    if (rect.top === targetTop) {
      maxNode = currentRange.endContainer;
      maxOffset = currentRange.endOffset;
    }
  }

  // Устанавливаем курсор в конец предыдущей строки
  const newRange = document.createRange();
  newRange.setStart(maxNode, maxOffset);
  newRange.collapse(true);

  selection.removeAllRanges();
  selection.addRange(newRange);
  editableDiv.focus();


  function moveCursorBackward(range) {
    if (range.endOffset > 0) {
      range.setEnd(range.endContainer, range.endOffset - 1);
      return true;
    }

    let node = range.endContainer;
    while (node) {
      if (node.previousSibling) {
        node = node.previousSibling;
        while (node.lastChild) node = node.lastChild;
        range.setEnd(node, node.textContent.length);
        return true;
      }

      node = node.parentNode;
      if (node === editableDiv) break;
    }
    return false;
  }

  function moveCursorForward(range) {
    const node = range.endContainer;
    if (range.endOffset < node.textContent.length) {
      range.setEnd(node, range.endOffset + 1);
      return true;
    }

    let nextNode = node;
    while (nextNode) {
      if (nextNode.nextSibling) {
        nextNode = nextNode.nextSibling;
        while (nextNode.firstChild) nextNode = nextNode.firstChild;
        range.setEnd(nextNode, 0);
        return true;
      }

      nextNode = nextNode.parentNode;
      if (nextNode === editableDiv) break;
    }
    return false;
  }

}

export function styleStringToObject(styleString) {
  const styleObject = {};

  // Helper function to tokenize the style string by top-level semicolons.
  function tokenizeDeclarations(str) {
    let tokens = [];
    let currentToken = '';
    let inQuote = null; // can be either ' or "
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      // Check for entering or exiting quotes
      if (inQuote) {
        currentToken += char;
        if (char === inQuote) {
          // End of quoted part (not taking escape characters into account)
          inQuote = null;
        }
      } else {
        if (char === "'" || char === '"') {
          // Start of quoted part
          inQuote = char;
          currentToken += char;
        } else if (char === '(') {
          parenDepth++;
          currentToken += char;
        } else if (char === ')') {
          parenDepth = Math.max(parenDepth - 1, 0);
          currentToken += char;
        } else if (char === ';' && parenDepth === 0) {
          // End of a top-level declaration, trim and store it if non-empty.
          if (currentToken.trim().length > 0) {
            tokens.push(currentToken.trim());
          }
          currentToken = '';
        } else {
          currentToken += char;
        }
      }
    }

    // Add last token if there is any
    if (currentToken.trim().length > 0) {
      tokens.push(currentToken.trim());
    }

    return tokens;
  }

  // Helper function to split a declaration into property and value.
  function splitDeclaration(decl) {
    let property = '';
    let value = '';
    let inQuote = null;
    let parenDepth = 0;
    let colonIndex = -1;

    // Find the first colon that is not inside quotes or parentheses.
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

  // Tokenize the declarations (splitting on top-level semicolons)
  const declarations = tokenizeDeclarations(styleString);

  // Process each declaration and add to the result object.
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
