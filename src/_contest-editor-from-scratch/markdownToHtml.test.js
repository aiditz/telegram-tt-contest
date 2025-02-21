/**
 *
 * Just run this file with Node.js
 *
 */

import parseMarkdownToHtml from './markdownToHtml.js';

const testCases = [
  {
    description: 'bold text',
    inputText: '**bold**',
    expectedText: '<b>bold</b>',
  },
  {
    description: 'italic text',
    inputText: '*italic*',
    expectedText: '<i>italic</i>',
  },
  {
    description: 'strikethrough text',
    inputText: '~~strikethrough~~',
    expectedText: '<s>strikethrough</s>',
  },
  {
    description: 'monospace text',
    inputText: '`monospace`',
    expectedText: '<code>monospace</code>',
  },
  {
    description: 'multiline',
    inputText: '111\n222',
    expectedText: '111\n222',
  },
  {
    description: 'bold multiline',
    inputText: '**bold\nmultiline**',
    expectedText: '<b>bold\nmultiline</b>',
  },
  {
    description: 'italic multiline',
    inputText: '*italic\nmultiline*',
    expectedText: '<i>italic\nmultiline</i>',
  },
  {
    description: 'multiple multilines',
    inputText: '111\n\n\n222',
    expectedText: '111\n\n\n222',
  },
  {
    description: 'single-line code snippet',
    inputText: '`code`',
    expectedText: '<code>code</code>',
  },
  {
    description: 'multiline code snippet with starting newline',
    inputText: '```\nmultiline\ncode\n```',
    expectedText: '<pre>multiline\ncode</pre>',
  },
  {
    description: 'multiline code snippet with invalid ending',
    inputText: '```\nmultiline\ncode```123',
    expectedText: '<pre>multiline\ncode```123</pre>',
  },
  {
    description: 'multiline code snippet with starting/ending newlines',
    inputText: '```\nmultiline\ncode\n```',
    expectedText: '<pre>multiline\ncode</pre>',
  },
  {
    description: 'code snippet with language',
    inputText: '```javascript\nmultiline\ncode\n```',
    expectedText: '<pre language="javascript">multiline\ncode</pre>',
  },
  {
    description: 'bold tag inside of monospace',
    inputText: '`monospace **non-bold monospace`',
    expectedText: '<code>monospace **non-bold monospace</code>',
  },
  {
    description: 'bold tag inside of code',
    inputText: '```code **no**n-bold **code```',
    expectedText: '<code>code **no**n-bold **code</code>',
  },
  {
    description: 'bold tag inside of multiline code',
    inputText: '```\ncode **non-bold** code\n```',
    expectedText: '<pre>code **non-bold** code</pre>',
  },
  // more complex cases
  {
    description: 'nested tags',
    inputText: '**bold *bold+italic* bold**',
    expectedText: '<b>bold <i>bold+italic</i> bold</b>',
  },
  {
    description: 'nested deeper tags',
    inputText: '**bold *italic ~~strikethrough~~ italic* bold**',
    expectedText: '<b>bold <i>italic <s>strikethrough</s> italic</i> bold</b>',
  },
  {
    description: 'non-closed tag',
    inputText: '**non-bold',
    expectedText: '**non-bold',
  },
  {
    description: 'non-closed nested tag',
    inputText: '**bold ~~non-strikethrough bold**',
    expectedText: '<b>bold ~~non-strikethrough bold</b>',
  },
  {
    description: 'mess non-closed bold and italic',
    inputText: '**non-bold italic* text',
    expectedText: '*<i>non-bold italic</i> text',
  },
  {
    //only: true,
    description: 'multiple nested tags with code (<s>)',
    inputText: '~~bold *italic `code inside *italic* **bold**` end of italic* end of bold~~',
    expectedText: '<s>bold <i>italic <code>code inside *italic* **bold**</code> end of italic</i> end of bold</s>',
  },
  {
    //only: true,
    description: 'multiple nested tags with code (<b>)',
    inputText: '**bold *italic `code inside *italic* **bold**` end of italic* end of bold**',
    expectedText: '<b>bold <i>italic <code>code inside *italic* **bold**</code> end of italic</i> end of bold</b>',
  },
  {
    description: 'incomplete nested tags',
    inputText: '**bold *italic ~~strike* bold**',
    expectedText: '<b>bold <i>italic ~~strike</i> bold</b>',
  },
  {
    description: 'multiple incomplete tags 1',
    inputText: '~~222 *333~~',
    expectedText: '<s>222 *333</s>',
  },
  {
    description: 'multiple incomplete tags 2',
    inputText: '**1 *2 3**',
    expectedText: '<b>1 *2 3</b>',
  },
  {
    description: 'multiple incomplete tags 3',
    inputText: '**111 ~~222 *333~~ 444**',
    expectedText: '<b>111 <s>222 *333</s> 444</b>',
  },
  {
    description: 'alternating bold and italic',
    inputText: '**bold** *italic* **bold** *italic*',
    expectedText: '<b>bold</b> <i>italic</i> <b>bold</b> <i>italic</i>',
  },
  {
    description: 'complex nested structure',
    inputText: '**bold *italic ~~strike `code` strike~~ italic* bold**',
    expectedText: '<b>bold <i>italic <s>strike <code>code</code> strike</s> italic</i> bold</b>',
  },
  {
    description: 'code block with markdown inside',
    inputText: '```\n**bold** *italic*\n~~strike~~\n```',
    expectedText: '<pre>**bold** *italic*\n~~strike~~</pre>',
  },
  {
    description: 'mixed incomplete and complete tags',
    inputText: '**bold *italic ~~strike~~ *more italic* bold**',
    expectedText: '<b>bold <i>italic <s>strike</s> *more italic</i> bold</b>',
  },
  {
    description: 'multiple code blocks with language',
    inputText: '```javascript\ncode1\n```\ntext\n```python\ncode2\n```',
    expectedText: '<pre language="javascript">code1</pre>\ntext\n<pre language="python">code2</pre>',
  },
  {
    description: 'nested tags with multiple line breaks',
    inputText: '**bold\n*italic\n~~strike~~\nx*\nbold**',
    expectedText: '<b>bold\n<i>italic\n<s>strike</s>\nx</i>\nbold</b>',
  },
  {
    description: 'incomplete code blocks',
    inputText: '```javascript\ncode1\n`` text `code2` ```',
    expectedText: '<pre language="javascript">code1\n`` text `code2` ```</pre>',
  },
  {
    description: 'mixed code and pre blocks',
    inputText: '`code` ```pre``` `more code` ```more pre```',
    expectedText: '<code>code</code> <code>pre</code> <code>more code</code> <code>more pre</code>',
  },
  {
    description: 'deeply nested tags with incomplete sections',
    inputText: '**bold *italic ~~strike *more italic~~* bold**',
    expectedText: '<b>bold <i>italic <s>strike *more italic</s></i> bold</b>',
  },
  {
    description: 'code blocks with nested markers',
    inputText: '`code **bold** *italic*` **bold `code *italic*` bold**',
    expectedText: '<code>code **bold** *italic*</code> <b>bold <code>code *italic*</code> bold</b>',
  },
  {
    description: 'complex mixed incomplete tags',
    inputText: '**bold *italic ~~strike** text* ~~more text',
    expectedText: '<b>bold *italic ~~strike</b> text* ~~more text',
  },
  {
    description: 'multiple language code blocks with nested tags',
    inputText: '```javascript\n**bold**\n```\n*italic*\n```python\n*italic*\n```',
    expectedText: '<pre language="javascript">**bold**</pre>\n<i>italic</i>\n<pre language="python">*italic*</pre>',
  },
  {
    description: 'multiple nested tags with line breaks',
    inputText: '**bold\n*italic\n~~strike~~\nx*\nbold**\n*italic*',
    expectedText: '<b>bold\n<i>italic\n<s>strike</s>\nx</i>\nbold</b>\n<i>italic</i>',
  },
  {
    description: 'extremely nested structure with incomplete tags',
    inputText: '**bold *italic ~~strike `code *italic* ~~strike~~` strike~~ italic* bold**',
    expectedText: '<b>bold <i>italic <s>strike <code>code *italic* ~~strike~~</code> strike</s> italic</i> bold</b>',
  },
  {
    description: 'trying to get infinite loop',
    inputText: '*~*~*~*~*~*~~*~*~**~***~***~**~*~~~~*~~*~``**``**``**``*************`````````****~~~~~~~~***',
    expectedText: 'should not hang out',
  },
];

let passed = 0;
let failed = 0;

const only = testCases.find(t => t.only);

const testsFiltered = only
  ? testCases.filter(t => t.only)
  : testCases;

testsFiltered.forEach((testCase, i) => {
  const html = parseMarkdownToHtml(testCase.inputText);

  let expected = testCase.expectedText;

  if (html !== expected) {
    console.log('');
    console.warn(`Error in test ${i} (${testCase.description})`);
    console.log('');
    console.warn('  Input:', testCase.inputText);
    console.warn('  Expected:', expected);
    console.warn('  Actual  :', html);
    console.log('');
    failed++;
  } else {
    console.warn(`Passed test ${i} (${testCase.description})`);
    passed++;
  }
});

console.log('');
console.log('Passed:', passed);
console.log('Failed:', failed);
