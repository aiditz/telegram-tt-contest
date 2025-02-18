import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useMemo, useRef,
} from '../../../lib/teact/teact';
import { getActions, getGlobal, withGlobal } from '../../../global';

import type { ApiChatFolder, ApiChatlistExportedInvite, ApiSession } from '../../../api/types';
import type { GlobalState } from '../../../global/types';
import type { FolderEditDispatch } from '../../../hooks/reducers/useFoldersReducer';
import type { ISettings, LeftColumnContent, SettingsScreens } from '../../../types';
import type { MenuItemContextAction } from '../../ui/ListItem';
import type { TabWithProperties } from '../../ui/TabList';

import { ALL_FOLDER_ID } from '../../../config';
import { selectCanShareFolder, selectTabState } from '../../../global/selectors';
import { selectCurrentLimit } from '../../../global/selectors/limits';
import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import { captureEvents, SwipeDirection } from '../../../util/captureEvents';
import { MEMO_EMPTY_ARRAY } from '../../../util/memo';
import { IS_TOUCH_ENV } from '../../../util/windowEnvironment';
import { renderTextWithEntities } from '../../common/helpers/renderTextWithEntities';

import useDerivedState from '../../../hooks/useDerivedState';
import { useDisplayedFolders, useFolderManagerForUnreadCounters } from '../../../hooks/useFolderManager';
import useHistoryBack from '../../../hooks/useHistoryBack';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import useShowTransition from '../../../hooks/useShowTransition';

import StoryRibbon from '../../story/StoryRibbon';
import TabList from '../../ui/TabList';
import Transition from '../../ui/Transition';
import ChatList from './ChatList';
import renderText from '../../common/helpers/renderText';
import FolderIcon from '../../ui/FolderIcon';
import Chat from './Chat';
import ChatFoldersTabs from './ChatFoldersTabs';
import useAppLayout from '../../../hooks/useAppLayout';

type OwnProps = {
  onSettingsScreenSelect: (screen: SettingsScreens) => void;
  foldersDispatch: FolderEditDispatch;
  onLeftColumnContentChange: (content: LeftColumnContent) => void;
  shouldHideFolderTabs?: boolean;
  isForumPanelOpen?: boolean;
};

type StateProps = {
  chatFoldersById: Record<number, ApiChatFolder>;
  folderInvitesById: Record<number, ApiChatlistExportedInvite[]>;
  activeChatFolder: number;
  shouldSkipHistoryAnimations?: boolean;
  hasArchivedChats?: boolean;
  hasArchivedStories?: boolean;
  archiveSettings: GlobalState['archiveSettings'];
  isStoryRibbonShown?: boolean;
  sessions?: Record<string, ApiSession>;
};

const SAVED_MESSAGES_HOTKEY = '0';
const FIRST_FOLDER_INDEX = 0;

const ChatFolders: FC<OwnProps & StateProps> = ({
  foldersDispatch,
  onSettingsScreenSelect,
  onLeftColumnContentChange,
  chatFoldersById,
  activeChatFolder,
  isForumPanelOpen,
  shouldSkipHistoryAnimations,
  shouldHideFolderTabs,
  hasArchivedChats,
  hasArchivedStories,
  archiveSettings,
  isStoryRibbonShown,
  sessions,
}) => {
  const {
    loadChatFolders,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  const transitionRef = useRef<HTMLDivElement>();

  const lang = useLang();

  useEffect(() => {
    loadChatFolders();
  }, []);

  const {
    ref,
    shouldRender: shouldRenderStoryRibbon,
    getIsClosing: getIsStoryRibbonClosing,
  } = useShowTransition({
    isOpen: isStoryRibbonShown,
    className: false,
    withShouldRender: true,
  });
  const isStoryRibbonClosing = useDerivedState(getIsStoryRibbonClosing);

  const displayedFolders = useDisplayedFolders();

  const allChatsFolderIndex = displayedFolders?.findIndex((folder) => folder.id === ALL_FOLDER_ID);
  const isInAllChatsFolder = allChatsFolderIndex === activeChatFolder;
  const isInFirstFolder = FIRST_FOLDER_INDEX === activeChatFolder;

  const isNotInFirstFolderRef = useRef();
  isNotInFirstFolderRef.current = !isInFirstFolder;

  function renderCurrentTab(isActive: boolean) {
    const activeFolder = Object.values(chatFoldersById)
      .find(({ id }) => id === displayedFolders![activeChatFolder].id);
    const isFolder = activeFolder && !isInAllChatsFolder;

    return (
      <ChatList
        folderType={isFolder ? 'folder' : 'all'}
        folderId={isFolder ? activeFolder.id : undefined}
        isActive={isActive}
        isForumPanelOpen={isForumPanelOpen}
        foldersDispatch={foldersDispatch}
        onSettingsScreenSelect={onSettingsScreenSelect}
        onLeftColumnContentChange={onLeftColumnContentChange}
        canDisplayArchive={(hasArchivedChats || hasArchivedStories) && !archiveSettings.isHidden}
        archiveSettings={archiveSettings}
        sessions={sessions}
      />
    );
  }

  const shouldRenderFolders = displayedFolders && displayedFolders.length > 1;

  return (
    <div
      ref={ref}
      className={buildClassName(
        'ChatFolders',
        shouldRenderFolders && shouldHideFolderTabs && 'ChatFolders--tabs-hidden',
        shouldRenderStoryRibbon && 'with-story-ribbon',
      )}
    >
      {shouldRenderStoryRibbon && <StoryRibbon isClosing={isStoryRibbonClosing} />}
      <ChatFoldersTabs
        shouldHideFolderTabs={shouldHideFolderTabs}
        isForumPanelOpen={isForumPanelOpen}
        transitionRef={transitionRef}
        foldersTabsView="top"
      />
      <Transition
        ref={transitionRef}
        name={shouldSkipHistoryAnimations ? 'none' : lang.isRtl ? 'slideOptimizedRtl' : 'slideOptimized'}
        activeKey={activeChatFolder}
        renderCount={shouldRenderFolders ? displayedFolders.length : undefined}
      >
        {renderCurrentTab}
      </Transition>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const {
      chatFolders: {
        byId: chatFoldersById,
        invites: folderInvitesById,
      },
      chats: {
        listIds: {
          archived,
        },
      },
      stories: {
        orderedPeerIds: {
          archived: archivedStories,
        },
      },
      activeSessions: {
        byHash: sessions,
      },
      archiveSettings,
    } = global;
    const { shouldSkipHistoryAnimations, activeChatFolder } = selectTabState(global);
    const { storyViewer: { isRibbonShown: isStoryRibbonShown } } = selectTabState(global);

    return {
      chatFoldersById,
      folderInvitesById,
      activeChatFolder,
      shouldSkipHistoryAnimations,
      hasArchivedChats: Boolean(archived?.length),
      hasArchivedStories: Boolean(archivedStories?.length),
      archiveSettings,
      isStoryRibbonShown,
      sessions,
    };
  },
)(ChatFolders));
