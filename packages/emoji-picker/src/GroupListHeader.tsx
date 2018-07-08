/**
 * @copyright   2016-2018, Miles Johnson
 * @license     https://opensource.org/licenses/MIT
 */

import React from 'react';
import PropTypes from 'prop-types';
import camelCase from 'lodash/camelCase';
import withContext, { WithContextProps } from './withContext';
import {
  GROUP_KEY_COMMONLY_USED,
  GROUP_KEY_SEARCH_RESULTS,
  GROUP_KEY_SMILEYS_PEOPLE,
  GROUP_KEY_NONE,
} from './constants';
import { ContextShape } from './shapes';
import { CommonMode, GroupKey } from './types';

export interface GroupListHeaderProps {
  clearIcon?: React.ReactNode;
  commonMode: CommonMode;
  group: GroupKey;
  onClear: () => void;
  skinTonePalette?: React.ReactNode;
  sticky?: boolean;
}

export class GroupListHeader extends React.PureComponent<GroupListHeaderProps & WithContextProps> {
  static propTypes = {
    clearIcon: PropTypes.node,
    commonMode: PropTypes.string.isRequired,
    context: ContextShape.isRequired,
    group: PropTypes.string.isRequired,
    onClear: PropTypes.func.isRequired,
    skinTonePalette: PropTypes.node,
    sticky: PropTypes.bool,
  };

  static defaultProps = {
    clearIcon: null,
    skinTonePalette: null,
    sticky: false,
  };

  private handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    this.props.onClear();
  };

  render() {
    const {
      clearIcon,
      commonMode,
      context: { classNames, messages },
      group,
      skinTonePalette,
      sticky,
    } = this.props;
    const showClear = clearIcon && group === GROUP_KEY_COMMONLY_USED;
    const showPalette =
      skinTonePalette &&
      (group === GROUP_KEY_SMILEYS_PEOPLE ||
        group === GROUP_KEY_SEARCH_RESULTS ||
        group === GROUP_KEY_NONE);
    const className = [classNames.emojisHeader];

    if (sticky) {
      className.push(classNames.emojisHeaderSticky);
    }

    return (
      <header className={className.join(' ')}>
        <span>
          {group === GROUP_KEY_COMMONLY_USED
            ? messages[camelCase(commonMode)]
            : messages[camelCase(group)]}
        </span>

        {showPalette && skinTonePalette}

        {showClear && (
          <button
            type="button"
            title={messages.clearUsed}
            className={classNames.clear}
            onClick={this.handleClear}
          >
            {clearIcon}
          </button>
        )}
      </header>
    );
  }
}

export default withContext(GroupListHeader);