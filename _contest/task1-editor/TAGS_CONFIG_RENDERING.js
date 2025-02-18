import { getChildTextNodes, styleStringToObject } from './helpers.js';
//import { getPrettyCodeLanguageName } from '../../src/util/prettyCodeLanguageNames';

function getPrettyCodeLanguageName(s) {
  return s;
}

export default {
  b: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  strong: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  i: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  em: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  s: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  strike: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  del: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  u: {
    removeIfEmpty: true,
    allowedAttributes: [],
    requiredAttributes: [],
  },
  // p: {
  //   removeIfEmpty: true,
  //   allowedAttributes: ['class', 'contenteditable'],
  //   requiredAttributes: ['class'],
  //   validateAttribute: {
  //     class: (value) => value === 'code-title',
  //   },
  // },
  code: {
    removeIfEmpty: true,
    allowedChildTags: ['img'],
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
    allowedChildTags: ['br', 'img'],
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
  a: {
    removeIfEmpty: true,
    //allowedChildTags: [],
    allowedAttributes: ['href', 'class', 'dir'],
    requiredAttributes: ['href'],
    replaceFunction: (node) => {
      node.className = 'text-entity-link';
      node.setAttribute('dir', 'auto');
      return node;
    },
  },
  blockquote: {
    removeIfEmpty: true,
    allowedChildTags: ['b', 'i', 's', 'em', 'strong', 'strike', 'del', 'u', 'br', 'img'],
    allowedAttributes: ['class', 'data-entity-type'],
    requiredAttributes: [],
  },
  div: {
    removeIfEmpty: true,
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
};
