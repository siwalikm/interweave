import React from 'react';
import { shallow } from 'enzyme';
import Interweave from '../../interweave/src/Interweave';
import Matcher from '../../interweave/src/Matcher';
import Emoji from '../src/EmojiComponent';
import EmojiData from '../src/EmojiData';
import EmojiMatcher from '../src/EmojiMatcher';
import { DATA_PROP } from './mocks';

describe('Interweave (with emoji)', () => {
  let SHORTCODE_TO_UNICODE = {};

  const extraProps = {
    disableWhitelist: false,
    disableLineBreaks: false,
    emojiData: DATA_PROP,
    noHtml: false,
    noHtmlExceptMatchers: false,
  };

  beforeEach(() => {
    ({ SHORTCODE_TO_UNICODE } = EmojiData.getInstance('en'));
  });

  it('renders emoji shortcode as unicode', () => {
    const wrapper = shallow((
      <Interweave
        tagName="div"
        matchers={[
          new EmojiMatcher('emoji', { convertShortcode: true, renderUnicode: true }),
        ]}
        content="This has :cat: and :dog: shortcodes."
        emojiData={DATA_PROP}
      />
    )).shallow();

    expect(wrapper.prop('children')).toEqual([
      'This has ',
      SHORTCODE_TO_UNICODE[':cat:'],
      ' and ',
      SHORTCODE_TO_UNICODE[':dog:'],
      ' shortcodes.',
    ]);
  });

  it('renders emoji unicode (literals) as unicode', () => {
    const wrapper = shallow((
      <Interweave
        tagName="div"
        matchers={[
          new EmojiMatcher('emoji', { convertUnicode: true, renderUnicode: true }),
        ]}
        content="This has 🐈️ and 🐕️ shortcodes."
        emojiData={DATA_PROP}
      />
    )).shallow();

    expect(wrapper.prop('children')).toEqual([
      'This has ',
      SHORTCODE_TO_UNICODE[':cat:'],
      ' and ',
      SHORTCODE_TO_UNICODE[':dog:'],
      ' shortcodes.',
    ]);
  });

  it('renders emoji unicode (escapes) as unicode', () => {
    const wrapper = shallow((
      <Interweave
        tagName="div"
        matchers={[
          new EmojiMatcher('emoji', { convertUnicode: true, renderUnicode: true }),
        ]}
        content={'This has \uD83D\uDC31 and \uD83D\uDC36 shortcodes.'}
        emojiData={DATA_PROP}
      />
    )).shallow();

    expect(wrapper.prop('children')).toEqual([
      'This has ',
      SHORTCODE_TO_UNICODE[':cat_face:'],
      ' and ',
      SHORTCODE_TO_UNICODE[':dog_face:'],
      ' shortcodes.',
    ]);
  });

  it('renders a single emoji enlarged', () => {
    const wrapper = shallow((
      <Interweave
        tagName="div"
        matchers={[
          new EmojiMatcher('emoji', { convertUnicode: true, convertShortcode: true }),
        ]}
        content=":cat:"
        emojiData={DATA_PROP}
      />
    )).shallow();

    expect(wrapper.prop('children')).toEqual([
      <Emoji {...extraProps} key={0} shortcode=":cat:" unicode="🐈️" enlargeEmoji />,
    ]);
  });
});