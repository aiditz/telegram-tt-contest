import { getChildTextNodes } from './helpers.js';

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
  code: {
    removeIfEmpty: true,
    allowedChildTags: ['img'],
    allowedAttributes: ['class', 'class', 'data-entity-type'],
    requiredAttributes: [],
    validateAttribute: {
      //class: (value) => value === 'text-entity-code',
    },
  },
  pre: {
    allowedChildTags: ['br', 'img'],
    allowedAttributes: ['language', 'data-language', 'class', 'data-entity-type'],
    requiredAttributes: [],
    validateAttribute: {
      //class: (value) => value === 'code-block',
    },
    replaceFunction: (node) => {
      if (node.dataset.language) {
        node.setAttribute('language', node.dataset.language);
      }

      return node;
    },
  },
  img: {
    allowedAttributes: ['src', 'data-emoji', 'class', 'alt', 'draggable'],
    requiredAttributes: ['class', 'alt'], // src is not an attribute o_O
    validateAttribute: {
      class: (values) => values.split(/ +/)
        .every((value) => ['emoji', 'emoji-small'].includes(value)),
    },
    replaceFunction: (node) => {
      if (node.dataset.documentId) { // Custom Emoji
        node.textContent = node.alt || '';
        return node;
      }
      return document.createTextNode(node.alt || '');
    },
  },
  a: {
    removeIfEmpty: true,
    allowedChildTags: [],
    allowedAttributes: ['href', 'class', 'dir'],
    requiredAttributes: ['href'],
  },
  blockquote: {
    removeIfEmpty: true,
    allowedChildTags: ['b', 'i', 's', 'em', 'strong', 'strike', 'del', 'u', 'br', 'img'],
    allowedAttributes: ['class', 'data-entity-type'],
    requiredAttributes: [],
  },
  canvas: {
    allowedAttributes: ['class'],
    requiredAttributes: [],
  },
  span: {
    //removeIfEmpty: true,
    allowedChildTags: ['b', 'i', 's', 'em', 'strong', 'strike', 'del', 'u', 'br', 'img'],
    allowedAttributes: ['class', 'data-type', 'data-entity-type'],
    requiredAttributes: ['class'],
    // replaceFunction: (node) => {
    //   if (node.className === 'spoiler') {
    //     node.setAttribute('language', node.dataset.language);
    //   }
    //
    //   return node;
    // },
  },
  br: {
    allowedAttributes: [],
    requiredAttributes: [],
    replaceFunction: (node) => {
      return document.createTextNode('\n');
    },
  },
};
