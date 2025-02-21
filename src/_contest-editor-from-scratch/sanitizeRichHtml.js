import { arraysIntersection } from './helpers.js';
import markdownToHtml from './markdownToHtml.js';

const BLOCK_TAGS = ['pre', 'div', 'blockquote'];

export function sanitizeRichHtml(html, tagsConfig, { processMarkdown = false } = {}) {
  const parser = new DOMParser();
  const node = parser.parseFromString(html, 'text/html');

  if (!node || !node.body) {
    return '';
  }

  sanitizeRichDOM(node.body, tagsConfig, { processMarkdown });

  return node.body.innerHTML;
}

export function sanitizeRichDOM(rootNode, tagsConfig, { includeRoot = false, processMarkdown = false } = {}) {
  let isDomModified = false;

  function replaceNodeWithChildren(node, parentAllowedChildTags) {
    const parent = node.parentNode;
    if (!parent) {
      node.remove();
      return;
    }

    const fragment = document.createDocumentFragment();

    const childNodes = Array.from(node.childNodes);
    childNodes.forEach((child) => {
      fragment.appendChild(child);
      processNode(child, parentAllowedChildTags);
    });

    if (BLOCK_TAGS.includes(node.tagName.toLowerCase())) {
      fragment.appendChild(document.createElement('BR'));
    }

    parent.insertBefore(fragment, node);
    node.remove();
  }

  function processNode(node, parentAllowedChildTags) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const config = tagsConfig[tagName];
      const allowedChildTags = arraysIntersection(
        config?.allowedChildTags,
        parentAllowedChildTags,
      );

      if (!config) {
        isDomModified = true;
        replaceNodeWithChildren(node, allowedChildTags);
        return;
      }

      if (parentAllowedChildTags && !parentAllowedChildTags.includes(tagName)) {
        isDomModified = true;
        replaceNodeWithChildren(node, allowedChildTags);
        return;
      }

      if (config.removeIfEmpty && node.textContent === '') {
        node.remove();
        return;
      }

      if (config.allowedAttributes) {
        Array.from(node.attributes).forEach((attr) => {
          const attrName = attr.name.toLowerCase();

          if (!config.allowedAttributes.includes(attrName)) {
            isDomModified = true;
            node.removeAttribute(attr.name);
            return;
          }

          const validator = config.validateAttribute?.[attrName];
          if (validator && !validator(attr.value)) {
            isDomModified = true;
            node.removeAttribute(attr.name);
          }
        });
      }

      const hasAllRequired = !config.requiredAttributes
        || config.requiredAttributes.every((attr) => node.hasAttribute(attr));

      if (!hasAllRequired) {
        isDomModified = true;
        replaceNodeWithChildren(node, allowedChildTags);
        return;
      }

      Array.from(node.childNodes)
        .forEach((child) => processNode(child, allowedChildTags));

      if (config.replaceFunction) {
        const parent = node.parentElement;
        const newNode = config.replaceFunction(node);
        if (!newNode) {
          node.remove();
        } else if (node !== newNode) {
          try {
            node.replaceWith(newNode);
          } catch (e) {
            parent.insertBefore(newNode, node);
            node.remove();
          }
          node = newNode;
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      if (processMarkdown && node.parentElement?.tagName !== 'PRE') {
        const MARKDOWN_INLINE_TAGS = ['**', '*', '~~', '`', '['];
        const md = markdownToHtml(node.textContent, { processOnlyTags: MARKDOWN_INLINE_TAGS });
        if (md !== node.textContent) {
          const div = document.createElement('DIV');
          div.innerHTML = md;
          const fragment = document.createDocumentFragment();
          const childNodes = Array.from(div.childNodes);
          childNodes.forEach((child) => {
            fragment.appendChild(child);
          });
          node.replaceWith(fragment);
        }
      }
    } else {
      isDomModified = true;
      node.remove();
    }
  }

  if (includeRoot) {
    processNode(rootNode);
  } else {
    Array.from(rootNode.childNodes)
      .forEach((child) => processNode(child));
  }

  return {
    node: rootNode,
    isDomModified,
  };
}
