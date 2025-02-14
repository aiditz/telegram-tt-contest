const GREEDY_TAGS = ['`', '```'];

class Node {
  constructor(type, content = '') {
    this.type = type;
    this.content = content;
    this.parsedChars = 0;
    this.children = [];
  }

  toString() {
    switch (this.type) {
      case 'text':
        return this.content;
      case 'bold':
        return `<b>${this.children.map(child => child.toString())
          .join('')}</b>`;
      case 'italic':
        return `<i>${this.children.map(child => child.toString())
          .join('')}</i>`;
      case 'strike':
        return `<s>${this.children.map(child => child.toString())
          .join('')}</s>`;
      case 'code':
        return `<code>${this.content}</code>`;
      case 'pre':
        return this.content.startsWith('language:')
          ? `<pre data-language="${this.content.slice(9)}">${this.children.map(child => child.toString()).join('')}</pre>`
          : `<pre>${this.children
            .map(child => child.toString())
            .join('')}</pre>`;
      case 'newline':
        return '<br>';
      case 'link':
        return `<a href="${this.content}">${this.children.map(child => child.toString())
          .join('')}</a>`;
      case 'root':
        return this.children.map(child => child.toString())
          .join('');
    }
  }
}

function parseMarkdownToHtml(text, { replaceNewlinesToBr } = {}) {
  let pos = 0;

  // if (typeof replaceNewlinesToBr === 'undefined') {
  //   replaceNewlinesToBr = !/<br *\/?>/i.test(text);
  // }

  // Защита от бесконечного цикла
  const MAX_ITERATIONS = 1000000;
  const PROGRESS_CHECK_INTERVAL = 1000;
  let iterationCount = 0;
  let lastPosition = -1;
  let stuckCount = 0;

  function checkProgress() {
    iterationCount++;

    if (iterationCount > MAX_ITERATIONS) {
      throw new Error(
        'Maximum iteration count exceeded. Possible infinite loop detected.',
      );
    }

    if (iterationCount % PROGRESS_CHECK_INTERVAL === 0) {
      if (pos === lastPosition) {
        stuckCount++;
        // Если парсер застрял в одной позиции слишком долго
        if (stuckCount > 3) {
          throw new Error(
            `Parser stuck at position ${pos}. Input text: "${text.slice(
              Math.max(0, pos - 10),
              pos,
            )}[!]${text.slice(pos, pos + 10)}"`,
          );
        }
      } else {
        lastPosition = pos;
        stuckCount = 0;
      }
    }
  }

  function parseInline(startPos, delimiter) {
    const delimLength = delimiter.length;
    let searchPos = startPos + delimLength;
    let depth = 1;
    let greedyTagOpened = '';

    while (searchPos < text.length) {
      try {
        checkProgress();
      } catch (err) {
        searchPos++;
        continue;
      }
      for (const greedyTag of GREEDY_TAGS) {
        if (text.startsWith(greedyTag, searchPos)) {
          greedyTagOpened = greedyTagOpened ? '' : greedyTag;
        }
      }

      if (greedyTagOpened) {
        searchPos += greedyTagOpened.length;
        continue;
      }

      const prevSymbol = startPos > 0 ? text.charAt(searchPos - 1) : '';
      if (text.startsWith(delimiter, searchPos) && !/[\s\n\r ]/.test(prevSymbol)) {
        depth--;
        if (depth === 0) {
          return searchPos;
        }
        searchPos += delimLength;
      } else {
        searchPos++;
      }
    }
    return -1;
  }

  function parseText(endPos = null) {
    if (endPos === null) {
      endPos = text?.length || 0;
    }
    const node = new Node('root');
    let textBuffer = '';

    function flushTextBuffer() {
      if (textBuffer) {
        node.children.push(new Node('text', textBuffer));
        textBuffer = '';
      }
    }

    let isCodeTagOpened = false;

    while (pos < endPos) {
      try {
        checkProgress();
      } catch (err) {
        pos++;
        continue;
      }

      const nextSymbolIsSpace = /\s/.test(text.charAt(pos + 1));

      if (text.startsWith('```', pos)) {
        flushTextBuffer();
        const start = pos + 3;
        const endCodePos = text.indexOf('```', start);

        if (endCodePos === -1) {
          textBuffer += text[pos];
          pos++;
          continue;
        }

        let content = text
          .slice(start, endCodePos)
          .split('\n')
          .join('<br>');

        let firstNewline = content.indexOf('<br>');
        let language = '';

        if (firstNewline !== -1) {
          const possibleLang = content.slice(0, firstNewline).trim();
          if (possibleLang) {
            language = possibleLang;
            content = content.slice(firstNewline + 4);
          }
        }

        const preNode = new Node('pre', language ? `language:${language}` : '');
        content = content.trim();
        preNode.children.push(new Node('text', content));
        node.children.push(preNode);
        pos = endCodePos + 3;
      } else if (text.startsWith('`', pos)) {
        flushTextBuffer();
        const start = pos + 1;
        let endCodePos = -1;

        for (let i = start; i < text.length; i++) {
          try {
            checkProgress();
          } catch (err) {
            i++;
            continue;
          }
          if (text[i] === '`') {
            endCodePos = i;
            break;
          }
        }

        if (endCodePos === -1) {
          textBuffer += text[pos];
          pos++;
          continue;
        }
        const codeNode = new Node('code', text.slice(start, endCodePos));
        node.children.push(codeNode);
        pos = endCodePos + 1;
      } else if (!nextSymbolIsSpace && text.startsWith('**', pos)) {
        const endBoldPos = parseInline(pos, '**');
        if (endBoldPos === -1) {
          textBuffer += text[pos];
          pos++;
          continue;
        }
        flushTextBuffer();
        pos += 2;
        const boldNode = new Node('bold');
        const innerNode = parseText(endBoldPos);
        boldNode.children = innerNode.children;
        node.children.push(boldNode);
        pos = endBoldPos + 2;
      } else if (!nextSymbolIsSpace && text.startsWith('*', pos)) {
        const nextSymbolIsSame = text.slice(pos + 1, 1) === '*';

        const endItalicPos = parseInline(pos, '*');
        if (endItalicPos === -1 || nextSymbolIsSame) {
          textBuffer += text[pos];
          pos++;
          continue;
        }
        flushTextBuffer();
        pos += 1;
        const italicNode = new Node('italic');
        const innerNode = parseText(endItalicPos);
        italicNode.children = innerNode.children;
        node.children.push(italicNode);
        pos = endItalicPos + 1;
      } else if (!nextSymbolIsSpace && text.startsWith('~~', pos)) {
        const endStrikePos = parseInline(pos, '~~');
        if (endStrikePos === -1) {
          textBuffer += text[pos];
          pos++;
          continue;
        }
        flushTextBuffer();
        pos += 2;
        const strikeNode = new Node('strike');
        const innerNode = parseText(endStrikePos);
        strikeNode.children = innerNode.children;
        node.children.push(strikeNode);
        pos = endStrikePos + 2;
      } else if (!nextSymbolIsSpace && text.startsWith('[', pos)) {
        const endTextPos = parseInline(pos, ']');
        if (endTextPos === -1 || text[endTextPos + 1] !== '(') {
          textBuffer += text[pos];
          pos++;
          continue;
        }
        const endUrlPost = parseInline(endTextPos + 1, ')');
        if (endUrlPost === -1) {
          textBuffer += text[pos];
          pos++;
          continue;
        }
        flushTextBuffer();
        pos++;
        const url = text.slice(endTextPos + 2, endUrlPost);
        const linkNode = new Node('link', url);
        const innerNode = parseText(endTextPos);
        linkNode.children = innerNode.children;
        node.children.push(linkNode);
        pos = endUrlPost + 1;
      } else if (text[pos] === '\n' && replaceNewlinesToBr) {
        flushTextBuffer();
        node.children.push(new Node('newline'));
        pos++;
      } else {
        textBuffer += text[pos];
        pos++;
      }
    }

    flushTextBuffer();
    return node;
  }

  return parseText().toString();
}

export default parseMarkdownToHtml;
