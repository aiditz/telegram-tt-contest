import { getChildTextNodes, styleStringToObject } from './helpers.js';
import { getPrettyCodeLanguageName } from '../../src/util/prettyCodeLanguageNames';

export default {
  b: {
    formattingAlias: 'bold',
    allowedChildTags: ['i', 's', 'em', 'strike', 'del', 'u', 'ins', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  strong: {
    formattingAlias: 'bold',
    allowedChildTags: ['i', 's', 'em', 'strike', 'del', 'u', 'ins', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  i: {
    formattingAlias: 'italic',
    allowedChildTags: ['b', 's', 'strong', 'strike', 'del', 'u', 'ins', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  em: {
    formattingAlias: 'italic',
    allowedChildTags: ['b', 's', 'strong', 'strike', 'del', 'u', 'ins', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  s: {
    formattingAlias: 'strikeThrough',
    allowedChildTags: ['b', 'i', 'strong', 'em', 'del', 'u', 'ins', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  strike: {
    formattingAlias: 'strikeThrough',
    allowedChildTags: ['b', 'i', 'strong', 'em', 'del', 'u', 'ins', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  del: {
    formattingAlias: 'strikeThrough',
    allowedChildTags: ['b', 'i', 'strong', 'em', 'del', 'u', 'ins', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  u: {
    formattingAlias: 'underline',
    allowedChildTags: ['b', 'i', 's', 'strong', 'em', 'strike', 'del', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  ins: {
    formattingAlias: 'underline',
    allowedChildTags: ['b', 'i', 's', 'strong', 'em', 'strike', 'del', 'br', 'img', 'span', 'blockquote', 'code'],
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  a: {
    formattingAlias: 'link',
    removeIfEmpty: true,
    //allowedChildTags: [],
    allowedAttributes: ['href', 'class', 'dir', 'data-entity-type'],
    requiredAttributes: ['href'],
    replaceFunction: (node) => {
      node.className = 'text-entity-link';
      node.setAttribute('dir', 'auto');
      return node;
    },
  },
  code: {
    formattingAlias: 'monospace',
    removeIfEmpty: true,
    allowedChildTags: ['img', 'span'],
    allowedAttributes: ['class', 'dir'],
    requiredAttributes: [],
    validateAttribute: {
      //class: (value) => value === 'text-entity-code',
    },
    replaceFunction: (node) => {
      node.className = 'text-entity-code';
      node.setAttribute('dir', 'auto');
      return node;
    },
  },
  pre: {
    formattingAlias: 'monospace',
    allowedChildTags: ['br', 'img', 'span'],
    allowedAttributes: ['language', 'data-language', 'class', 'data-entity-type', 'dir'],
    requiredAttributes: [],
    validateAttribute: {
      //class: (value) => value === 'code-block',
    },
    replaceFunction: (node) => {
      node.className = 'code-block';
      node.dataset.entityType = 'MessageEntityPre';
      node.setAttribute('dir', 'auto');

      if (node.getAttribute('language')) {
        node.dataset.language = node.getAttribute('language');
      }

      if (node.dataset.language) {
        const prettyLanguage = getPrettyCodeLanguageName(node.dataset.language);
        if (node.dataset.language !== prettyLanguage) {
          node.dataset.language = prettyLanguage;
        }
      }

      if (node.parentElement.className === 'CodeBlock') {
        return node;
      }

      const div = document.createElement('div');
      div.className = 'CodeBlock';
      div.appendChild(node.cloneNode(true));

      return div;
    },
  },
  img: {
    requiredAttributes: ['class', 'alt'], // src is not an attribute o_O
    validateAttribute: {
      class: (values) => values.split(/ +/)
        .every((value) => ['emoji', 'emoji-small', 'custom-emoji-placeholder'].includes(value)),
    },
  },
  blockquote: {
    formattingAlias: 'quote',
    removeIfEmpty: true,
    allowedChildTags: ['b', 'i', 's', 'em', 'strong', 'strike', 'del', 'u', 'ins', 'br', 'img', 'span', 'div', 'pre', 'a'],
    allowedAttributes: ['class', 'data-entity-type'],
    requiredAttributes: [],
  },
  div: {
    removeIfEmpty: false,
    allowedAttributes: ['class'],
    requiredAttributes: [],
    replaceFunction: (node) => {
      if (node.className === 'CodeBlock') {
        const textNodes = getChildTextNodes(node);

        const pre = node.querySelector('pre');

        if (textNodes.length && pre) {
          pre.appendChild(...textNodes);
        }

        if (pre) {
          if (pre.innerHTML === '') {
            return null;
          }
        }
      }

      if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.ELEMENT_NODE && node.firstChild.tagName === 'DIV') {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(...node.childNodes);
        return fragment;
      }

      return node;
    },
  },
  canvas: {
    allowedAttributes: ['class'],
    requiredAttributes: [],
  },
  span: {
    formattingAlias: (node) => node.classList.contains('spoiler') ? 'spoiler' : undefined,
    removeIfEmpty: true,
    allowedAttributes: ['class', 'data-type', 'data-entity-type'],
    requiredAttributes: ['class'],
    validateAttribute: {
      class: (values) => values.split(/ +/)
        .every((value) => ['spoiler', 'emoji', 'emoji-small'].includes(value)),
    },
  },
  br: {
    allowedAttributes: [],
    requiredAttributes: [],
  },
  p: {
    allowedAttributes: [],
    requiredAttributes: [],
    replaceFunction: (node) => {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach(child => fragment.appendChild(child));
      const brCount = node.parentElement?.lastChild === node ? 1 : 2;
      for (let i = 0; i < brCount; i++) {
        fragment.appendChild(document.createElement('BR'));
      }
      return fragment;
    },
  },
};
