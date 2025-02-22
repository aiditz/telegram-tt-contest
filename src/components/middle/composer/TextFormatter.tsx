import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useRef, useState,
} from '../../../lib/teact/teact';

import type { IAnchorPosition } from '../../../types';
import { ApiMessageEntityTypes } from '../../../api/types';

import { EDITABLE_INPUT_ID } from '../../../config';
import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import { ensureProtocol } from '../../../util/ensureProtocol';
import getKeyFromEvent from '../../../util/getKeyFromEvent';
import stopEvent from '../../../util/stopEvent';
import { INPUT_CUSTOM_EMOJI_SELECTOR } from './helpers/customEmoji';

import useFlag from '../../../hooks/useFlag';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useShowTransitionDeprecated from '../../../hooks/useShowTransitionDeprecated';
import useVirtualBackdrop from '../../../hooks/useVirtualBackdrop';

import Icon from '../../common/icons/Icon';
import Button from '../../ui/Button';

import './TextFormatter.scss';
import { getClosestParentFromCursor } from '../../../_contest-editor-from-scratch/helpers';
import { requestMutation } from '../../../lib/fasterdom/fasterdom';

export interface ISelectedTextFormats {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  monospace?: boolean;
  spoiler?: boolean;
  quote?: boolean;
  link?: boolean;
}

export type OwnProps = {
  isOpen: boolean;
  anchorPosition?: IAnchorPosition;
  selectedRange?: Range;
  setSelectedRange: (range: Range) => void;
  selectedTextFormats: ISelectedTextFormats;
  onClose: () => void;
};

const TEXT_FORMAT_BY_TAG_NAME: Record<string, keyof ISelectedTextFormats> = {
  A: 'link',
  B: 'bold',
  STRONG: 'bold',
  I: 'italic',
  EM: 'italic',
  U: 'underline',
  DEL: 'strikethrough',
  CODE: 'monospace',
  PRE: 'monospace',
  SPAN: 'spoiler',
  BLOCKQUOTE: 'quote',
};
const fragmentEl = document.createElement('div');

const TextFormatter: FC<OwnProps> = ({
  isOpen,
  anchorPosition,
  selectedRange,
  setSelectedRange,
  selectedTextFormats,
  onClose,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const linkUrlInputRef = useRef<HTMLInputElement>(null);
  const { shouldRender, transitionClassNames } = useShowTransitionDeprecated(isOpen);
  const [isLinkControlOpen, openLinkControl, closeLinkControl] = useFlag();
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [inputClassName, setInputClassName] = useState<string | undefined>();
  //const [selectedTextFormats, setSelectedTextFormats] = useState<ISelectedTextFormats>({});

  const getSelectedElement = useLastCallback(() => {
    if (!selectedRange) {
      return undefined;
    }

    // This fixes a bug when user selects text in a quote, but the button "unquote" is not active
    return selectedRange.commonAncestorContainer instanceof Element
      ? selectedRange.commonAncestorContainer
      : selectedRange.commonAncestorContainer.parentElement;
  });

  useEffect(() => (isOpen ? captureEscKeyListener(onClose) : undefined), [isOpen, onClose]);
  useVirtualBackdrop(
    isOpen,
    containerRef,
    onClose,
    true,
  );

  useEffect(() => {
    if (isLinkControlOpen) {
      linkUrlInputRef.current!.focus();
    } else {
      setLinkUrl('');
      setIsEditingLink(false);
    }
  }, [isLinkControlOpen]);

  useEffect(() => {
    if (!shouldRender) {
      closeLinkControl();
      setInputClassName(undefined);
    }
  }, [closeLinkControl, shouldRender]);

  useEffect(() => {
    if (!isOpen || !selectedRange) {
      return;
    }

    const selectedFormats: ISelectedTextFormats = {};

    let parentElement = getSelectedElement();

    while (parentElement && parentElement.id !== EDITABLE_INPUT_ID) {
      const textFormat = TEXT_FORMAT_BY_TAG_NAME[parentElement.tagName];
      if (textFormat) {
        selectedFormats[textFormat] = true;
      }

      parentElement = parentElement.parentElement;
    }
  }, [isOpen, selectedRange, openLinkControl]);

  const restoreSelection = useLastCallback(() => {
    if (!selectedRange) {
      return;
    }

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
  });

  const updateSelectedRange = useLastCallback(() => {
    const selection = window.getSelection();
    if (selection) {
      setSelectedRange(selection.getRangeAt(0));
    }
  });

  const getSelectedFragment = useLastCallback((shouldDropCustomEmoji?: boolean, actual?: boolean) => {
    let range = selectedRange;

    if (actual) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return undefined;
      }

      range = selection.getRangeAt(0);
    }

    if (!range) {
      return undefined;
    }
    fragmentEl.replaceChildren(range.cloneContents());
    if (shouldDropCustomEmoji) {
      fragmentEl.querySelectorAll(INPUT_CUSTOM_EMOJI_SELECTOR).forEach((el) => {
        el.replaceWith(el.getAttribute('alt')!);
      });
    }
    return fragmentEl;
  });

  const getActualSelectedText = useLastCallback((shouldDropCustomEmoji?: boolean) => {
    return getSelectedFragment(shouldDropCustomEmoji, true)?.innerHTML || '';
  });

  const getSelectedText = useLastCallback((shouldDropCustomEmoji?: boolean) => {
    return getSelectedFragment(shouldDropCustomEmoji)?.innerHTML || '';
  });

  function updateInputStyles() {
    const input = linkUrlInputRef.current;
    if (!input) {
      return;
    }

    const { offsetWidth, scrollWidth, scrollLeft } = input;
    if (scrollWidth <= offsetWidth) {
      setInputClassName(undefined);
      return;
    }

    let className = '';
    if (scrollLeft < scrollWidth - offsetWidth) {
      className = 'mask-right';
    }
    if (scrollLeft > 0) {
      className += ' mask-left';
    }

    setInputClassName(className);
  }

  function handleLinkUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLinkUrl(e.target.value);
    updateInputStyles();
  }

  function getFormatButtonClassName(key: keyof ISelectedTextFormats) {
    if (selectedTextFormats[key]) {
      return 'active';
    }

    if (key === 'monospace') {
      if (Object.keys(selectedTextFormats).some(
        (fKey) => fKey !== key && Boolean(selectedTextFormats[fKey as keyof ISelectedTextFormats]),
      )) {
        return 'disabled';
      }
    } else if (selectedTextFormats.monospace) {
      return 'disabled';
    }

    return undefined;
  }

  const handleSpoilerText = useLastCallback(() => {
    if (selectedTextFormats.spoiler) {
      const element = getSelectedElement();
      if (
        !selectedRange
        || !element
        || element.dataset?.entityType !== ApiMessageEntityTypes.Spoiler
        || !element.textContent
      ) {
        return;
      }

      element.replaceWith(...element.childNodes);
      return;
    }

    const text = getActualSelectedText();
    document.execCommand(
      'insertHTML', false, `<span class="spoiler" data-entity-type="${ApiMessageEntityTypes.Spoiler}">${text}</span>`,
    );
    onClose();
  });

  const handleBoldText = useLastCallback(() => {
    if (selectedTextFormats.bold) {
      document.execCommand('removeFormat');
      updateSelectedRange();
      Object.keys(selectedTextFormats).forEach((key) => {
        if ((key === 'italic' || key === 'underline') && Boolean(selectedTextFormats[key])) {
          document.execCommand(key);
        }
      });
    } else {
      document.execCommand('bold');
    }

    updateSelectedRange();
  });

  const handleItalicText = useLastCallback(() => {
    document.execCommand('italic');
    updateSelectedRange();
  });

  const handleUnderlineText = useLastCallback(() => {
    document.execCommand('underline');
    updateSelectedRange();
  });

  const handleStrikethroughText = useLastCallback(() => {
    document.execCommand('strikeThrough');
    updateSelectedRange();
  });

  const insertHTML = useLastCallback((html) => {
    const selection = window.getSelection();

    if (!selection || !selection.focusNode) return;
    if (selection.rangeCount === 0) return;

    selection.getRangeAt(0).deleteContents();
    const tempDiv = document.createElement('DIV');
    tempDiv.innerHTML = html;
    const tempFragment = document.createDocumentFragment();
    tempFragment.append(...tempDiv.childNodes);
    selection.getRangeAt(0).insertNode(tempFragment);

    selection.focusNode.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  });

  const handleMonospaceText = useLastCallback(() => {
    if (selectedTextFormats.monospace) {
      const element = getSelectedElement();
      if (
        !selectedRange
        || !element
        || !['CODE', 'PRE'].includes(element.tagName)
        || !element.textContent
      ) {
        return;
      }

      if (element.tagName === 'PRE' && element.parentElement?.classList.contains('CodeBlock')) {
        element.parentElement.replaceWith(...element.childNodes);
      } else {
        element.replaceWith(...element.childNodes);
      }

      return;
    }

    document.execCommand('removeFormat');
    updateSelectedRange();
    const text = getActualSelectedText(true);
    if (/(<br *\/?>|\n\r?)/i.test(text)) {
      insertHTML(`<pre class="code-block">${text}</pre>`);
    } else {
      insertHTML(`<code class="text-entity-code" dir="auto">${text}</code>`);
    }
    onClose();
  });

  const handleQuoteText = useLastCallback(() => {
    if (selectedTextFormats.quote) {
      const element = getClosestParentFromCursor('blockquote', 'from-scratch');
      if (
        !selectedRange
        || !element
        || element.tagName !== 'BLOCKQUOTE'
        || !element.textContent
      ) {
        return;
      }

      element.replaceWith(...element.childNodes);

      return;
    }

    document.execCommand('removeFormat');
    updateSelectedRange();
    const text = getActualSelectedText();
    insertHTML(`<blockquote class="blockquote">${text}</blockquote>`);
    onClose();
  });

  const handleLinkText = useLastCallback(() => {
    const formattedLinkUrl = (ensureProtocol(linkUrl) || '').split('%').map(encodeURI).join('%');

    if (selectedTextFormats.link) {
      const element = getSelectedElement();
      if (
        !selectedRange
        || !element
        || element.tagName !== 'A'
        || !element.textContent
      ) {
        return;
      }

      element.replaceWith(...element.childNodes);
      return;
    }

    openLinkControl();
  });

  const handleLinkUrlConfirm = useLastCallback(() => {
    const formattedLinkUrl = (ensureProtocol(linkUrl) || '').split('%').map(encodeURI).join('%');

    if (isEditingLink) {
      const element = getSelectedElement();
      if (!element || element.tagName !== 'A') {
        return;
      }

      if (formattedLinkUrl.trim() === '') {
        element.replaceWith(...element.childNodes);
      } else {
        (element as HTMLAnchorElement).href = formattedLinkUrl;
      }
      onClose();

      return;
    }

    document.execCommand('removeFormat');
    updateSelectedRange();
    const text = getSelectedText(true);
    restoreSelection();
    document.execCommand(
      'insertHTML',
      false,
      `<a href=${formattedLinkUrl} class="text-entity-link" dir="auto">${text}</a>`,
    );
    onClose();
  });

  const handleKeyDown = useLastCallback((e: KeyboardEvent) => {
    const HANDLERS_BY_KEY: Record<string, AnyToVoidFunction> = {
      k: openLinkControl,
      b: handleBoldText,
      u: handleUnderlineText,
      i: handleItalicText,
      m: handleMonospaceText,
      s: handleStrikethroughText,
      p: handleSpoilerText,
    };

    const handler = HANDLERS_BY_KEY[getKeyFromEvent(e)];

    if (
      e.altKey
      || !(e.ctrlKey || e.metaKey)
      || !handler
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    handler();
  });

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const lang = useOldLang();

  function handleContainerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && isLinkControlOpen) {
      handleLinkUrlConfirm();
      e.preventDefault();
    }
  }

  if (!shouldRender) {
    return undefined;
  }

  const className = buildClassName(
    'TextFormatter',
    transitionClassNames,
    isLinkControlOpen && 'link-control-shown',
  );

  const linkUrlConfirmClassName = buildClassName(
    'TextFormatter-link-url-confirm',
    Boolean(linkUrl.length) && 'shown',
  );

  const style = anchorPosition
    ? `left: ${anchorPosition.x}px; top: ${anchorPosition.y}px;--text-formatter-left: ${anchorPosition.x}px;`
    : '';

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onKeyDown={handleContainerKeyDown}
      // Prevents focus loss when clicking on the toolbar
      onMouseDown={stopEvent}
    >
      <div className="TextFormatter-buttons">
        <Button
          color="translucent"
          ariaLabel="Spoiler text"
          className={getFormatButtonClassName('spoiler')}
          onClick={handleSpoilerText}
        >
          <Icon name="eye-closed" />
        </Button>
        <div className="TextFormatter-divider" />
        <Button
          color="translucent"
          ariaLabel="Bold text"
          className={getFormatButtonClassName('bold')}
          onClick={handleBoldText}
        >
          <Icon name="bold" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Italic text"
          className={getFormatButtonClassName('italic')}
          onClick={handleItalicText}
        >
          <Icon name="italic" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Underlined text"
          className={getFormatButtonClassName('underline')}
          onClick={handleUnderlineText}
        >
          <Icon name="underlined" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Strikethrough text"
          className={getFormatButtonClassName('strikethrough')}
          onClick={handleStrikethroughText}
        >
          <Icon name="strikethrough" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Monospace text"
          className={getFormatButtonClassName('monospace')}
          onClick={handleMonospaceText}
        >
          <Icon name="monospace" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Quote"
          className={getFormatButtonClassName('quote')}
          onClick={handleQuoteText}
        >
          <Icon name="quote" />
        </Button>
        <div className="TextFormatter-divider" />
        <Button
          color="translucent"
          ariaLabel={lang('TextFormat.AddLinkTitle')}
          className={getFormatButtonClassName('link')}
          onClick={handleLinkText}
        >
          <Icon name="link" />
        </Button>
      </div>

      <div className="TextFormatter-link-control">
        <div className="TextFormatter-buttons">
          <Button color="translucent" ariaLabel={lang('Cancel')} onClick={closeLinkControl}>
            <Icon name="arrow-left" />
          </Button>
          <div className="TextFormatter-divider" />

          <div
            className={buildClassName('TextFormatter-link-url-input-wrapper', inputClassName)}
          >
            <input
              ref={linkUrlInputRef}
              className="TextFormatter-link-url-input"
              type="text"
              value={linkUrl}
              placeholder="Enter URL..."
              autoComplete="off"
              inputMode="url"
              dir="auto"
              onChange={handleLinkUrlChange}
              onScroll={updateInputStyles}
            />
          </div>

          <div className={linkUrlConfirmClassName}>
            <div className="TextFormatter-divider" />
            <Button
              color="translucent"
              ariaLabel={lang('Save')}
              className="color-primary"
              onClick={handleLinkUrlConfirm}
            >
              <Icon name="check" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TextFormatter);
