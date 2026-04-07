import { isDesktop } from '@lobechat/const';
import { Flexbox, Icon } from '@lobehub/ui';
import { createStaticStyles, cssVar } from 'antd-style';
import { CheckIcon, FolderOpenIcon, XIcon } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { electronSystemService } from '@/services/electron/system';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';

const RECENT_DIRS_KEY = 'lobechat-recent-working-directories';
const MAX_RECENT_DIRS = 5;

const getRecentDirs = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_DIRS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentDir = (dir: string): string[] => {
  const dirs = getRecentDirs().filter((d) => d !== dir);
  const updated = [dir, ...dirs].slice(0, MAX_RECENT_DIRS);
  localStorage.setItem(RECENT_DIRS_KEY, JSON.stringify(updated));
  return updated;
};

const removeRecentDir = (dir: string): string[] => {
  const updated = getRecentDirs().filter((d) => d !== dir);
  localStorage.setItem(RECENT_DIRS_KEY, JSON.stringify(updated));
  return updated;
};

const styles = createStaticStyles(({ css }) => ({
  chooseFolderItem: css`
    cursor: pointer;

    padding-block: 8px;
    padding-inline: 8px;
    border-radius: ${cssVar.borderRadius};

    font-size: 13px;
    color: ${cssVar.colorTextSecondary};

    transition: background-color 0.2s;

    &:hover {
      color: ${cssVar.colorText};
      background: ${cssVar.colorFillTertiary};
    }
  `,
  dirItem: css`
    cursor: pointer;

    padding-block: 6px;
    padding-inline: 8px;
    border-radius: ${cssVar.borderRadius};

    transition: background-color 0.2s;

    &:hover {
      background: ${cssVar.colorFillTertiary};
    }
  `,
  dirItemActive: css`
    background: ${cssVar.colorFillTertiary};
  `,
  dirName: css`
    font-size: 13px;
    font-weight: 500;
    color: ${cssVar.colorText};
  `,
  dirPath: css`
    overflow: hidden;

    font-size: 11px;
    color: ${cssVar.colorTextDescription};
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  removeBtn: css`
    cursor: pointer;

    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;

    width: 20px;
    height: 20px;
    border-radius: ${cssVar.borderRadius};

    color: ${cssVar.colorTextQuaternary};

    transition: all 0.2s;

    &:hover {
      color: ${cssVar.colorTextSecondary};
      background: ${cssVar.colorFillSecondary};
    }
  `,
  sectionTitle: css`
    padding-inline: 8px;

    font-size: 11px;
    font-weight: 500;
    color: ${cssVar.colorTextQuaternary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,
}));

interface WorkingDirectoryContentProps {
  agentId: string;
  onClose?: () => void;
}

const WorkingDirectoryContent = memo<WorkingDirectoryContentProps>(({ agentId, onClose }) => {
  const { t } = useTranslation('plugin');

  const agentWorkingDirectory = useAgentStore((s) =>
    agentByIdSelectors.getAgentWorkingDirectoryById(agentId)(s),
  );
  const topicWorkingDirectory = useChatStore(topicSelectors.currentTopicWorkingDirectory);
  const effectiveDir = topicWorkingDirectory || agentWorkingDirectory;

  const updateAgentRuntimeEnvConfig = useAgentStore((s) => s.updateAgentRuntimeEnvConfigById);

  const [recentDirs, setRecentDirs] = useState(getRecentDirs);

  const displayDirs = useMemo(() => {
    const dirs = [...recentDirs];
    if (effectiveDir && !dirs.includes(effectiveDir)) {
      dirs.unshift(effectiveDir);
    }
    return dirs;
  }, [recentDirs, effectiveDir]);

  const selectDir = useCallback(
    async (dir: string) => {
      await updateAgentRuntimeEnvConfig(agentId, { workingDirectory: dir });
      setRecentDirs(addRecentDir(dir));
      onClose?.();
    },
    [agentId, updateAgentRuntimeEnvConfig, onClose],
  );

  const handleChooseFolder = useCallback(async () => {
    if (!isDesktop) return;
    const folder = await electronSystemService.selectFolder({
      defaultPath: effectiveDir || undefined,
      title: t('localSystem.workingDirectory.selectFolder'),
    });
    if (folder) {
      await selectDir(folder);
    }
  }, [effectiveDir, t, selectDir]);

  const handleRemoveRecent = useCallback((e: React.MouseEvent, dir: string) => {
    e.stopPropagation();
    setRecentDirs(removeRecentDir(dir));
  }, []);

  const getDirName = (path: string) => path.split('/').findLast(Boolean) || path;

  return (
    <Flexbox gap={4} style={{ minWidth: 280 }}>
      <div className={styles.sectionTitle}>{t('localSystem.workingDirectory.recent')}</div>
      {displayDirs.length === 0 ? (
        <Flexbox
          align={'center'}
          justify={'center'}
          style={{ color: cssVar.colorTextQuaternary, fontSize: 12, padding: '12px 8px' }}
        >
          {t('localSystem.workingDirectory.noRecent')}
        </Flexbox>
      ) : (
        displayDirs.map((dir) => {
          const isActive = dir === effectiveDir;
          return (
            <Flexbox
              horizontal
              align={'center'}
              className={`${styles.dirItem} ${isActive ? styles.dirItemActive : ''}`}
              gap={8}
              key={dir}
              onClick={() => selectDir(dir)}
            >
              <Flexbox flex={1} style={{ minWidth: 0 }}>
                <div className={styles.dirName}>{getDirName(dir)}</div>
                <div className={styles.dirPath}>{dir}</div>
              </Flexbox>
              {isActive ? (
                <Icon
                  icon={CheckIcon}
                  size={16}
                  style={{ color: cssVar.colorSuccess, flex: 'none' }}
                />
              ) : (
                <div
                  className={styles.removeBtn}
                  title={t('localSystem.workingDirectory.removeRecent')}
                  onClick={(e) => handleRemoveRecent(e, dir)}
                >
                  <Icon icon={XIcon} size={12} />
                </div>
              )}
            </Flexbox>
          );
        })
      )}

      {isDesktop && (
        <Flexbox
          horizontal
          align={'center'}
          className={styles.chooseFolderItem}
          gap={8}
          onClick={handleChooseFolder}
        >
          <Icon icon={FolderOpenIcon} size={14} />
          <span>{t('localSystem.workingDirectory.chooseDifferentFolder')}</span>
        </Flexbox>
      )}
    </Flexbox>
  );
});

WorkingDirectoryContent.displayName = 'WorkingDirectoryContent';

export default WorkingDirectoryContent;
