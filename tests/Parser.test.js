import React from 'react';
import { expect } from 'chai';
import { TOKEN_LOCATIONS } from './mocks';
import Interweave from '../lib/Interweave';
import Cleaner from '../lib/Cleaner';
import Matcher from '../lib/Matcher';
import Parser from '../lib/Parser';
import Element from '../lib/components/Element';
import {
  TAGS,
  ATTRIBUTES,
  ATTRIBUTES_TO_REACT,
  FILTER_ALLOW,
  FILTER_DENY,
  FILTER_PASS_THROUGH,
  FILTER_CAST_BOOL,
  FILTER_CAST_NUMBER,
} from '../lib/constants';

function createChild(tag, text) {
  const child = document.createElement(tag);
  child.appendChild(document.createTextNode(text));

  return child;
}

class HrefCleaner extends Cleaner {
  clean(value) {
    return value.replace('foo.com', 'bar.net');
  }
}

class BBCodeMatcher extends Matcher {
  factory(match, props = {}) {
    const { children } = props;

    return (
      <Element tagName={children} {...props}>
        {children}
      </Element>
    );
  }

  match(string) {
    const matches = string.match(/\[(\w+)\]/);

    if (!matches) {
      return null;
    }

    return {
      match: matches[0],
      children: matches[1],
      customProp: 'foo',
    };
  }
}

Interweave.addCleaner('href', new HrefCleaner());
Interweave.addMatcher('bbcode', new BBCodeMatcher());

describe('Parser', () => {
  const instance = new Parser('');
  let element;

  describe('applyCleaners()', () => {
    it('applies filters for the attribute name', () => {
      expect(instance.applyCleaners('src', 'foo.com')).to.equal('foo.com');
      expect(instance.applyCleaners('href', 'foo.com')).to.equal('bar.net');
    });
  });

  describe('applyMatchers()', () => {
    const createElement = () => <Element tagName="a" customProp="foo">a</Element>;
    const expectedTokenMatches = [
      'no tokens',
      [createElement()],
      [' ', createElement(), ' '],
      [createElement(), ' pattern at beginning'],
      ['pattern at end ', createElement()],
      ['pattern in ', createElement(), ' middle'],
      [createElement(), ' pattern at beginning and end ', createElement()],
      [createElement(), ' pattern on ', createElement(), ' all sides ', createElement()],
      ['pattern ', createElement(), ' used ', createElement(), ' multiple ', createElement(), ' times'],
      ['tokens next ', createElement(), ' ', createElement(), ' ', createElement(), ' to each other'],
      ['tokens without ', createElement(), createElement(), createElement(), ' spaces'],
    ];

    TOKEN_LOCATIONS.forEach((location, i) => {
      it(`applies matcher to: ${location}`, () => {
        const tokenString = location.replace(/\{token\}/g, '[a]');
        const actual = instance.applyMatchers(tokenString);

        if (i === 0) {
          expect(actual).to.equal(expectedTokenMatches[0]);
        } else {
          expect(actual).to.deep.equal(expectedTokenMatches[i]);
        }
      });
    });

    it('ignores matcher if the inverse prop is enabled', () => {
      instance.props.noBbcode = true;

      TOKEN_LOCATIONS.forEach((location, i) => {
        it(`applies matcher to: ${location}`, () => {
          const tokenString = location.replace(/\{token\}/g, '[a]');
          const actual = instance.applyMatchers(tokenString);

          expect(actual).to.equal(TOKEN_LOCATIONS[i]);
        });
      });

      instance.props = {};
    });

    // TODO
    it('handles no matches or tokens correctly');

    it('allows for multiple matchers');
  });

  describe('createDocument()', () => {
    it('injects the markup into the body', () => {
      const doc = instance.createDocument('<div>Foo<section>Bar</section><aside>Baz</aside></div>');

      expect(doc.body.outerHTML).to
        .equal('<body><div>Foo<section>Bar</section><aside>Baz</aside></div></body>');
    });

    it('injects the document and overrides', () => {
      const doc = instance.createDocument('<!DOCTYPE><html>' +
        '<head><title>Wat</title></head>' +
        '<body><main>Foo<div>Bar<span>Baz</span></div></main></body>' +
        '</html>'
      );

      expect(doc.head.childNodes[0].textContent).to.equal('Wat');
      expect(doc.body.outerHTML).to
        .equal('<body><main>Foo<div>Bar<span>Baz</span></div></main></body>');
    });
  });

  describe('extractAttributes()', () => {
    beforeEach(() => {
      element = document.createElement('div');
    });

    Object.keys(ATTRIBUTES).forEach((name) => {
      const attrName = ATTRIBUTES_TO_REACT[name] || name;

      switch (ATTRIBUTES[name]) {
        case FILTER_ALLOW:
          it(`allows the "${name}" attribute and casts to a string`, () => {
            element.setAttribute(name, 'Foo');

            expect(instance.extractAttributes(element)).to.deep.equal({
              [attrName]: 'Foo',
            });
          });
          break;

        case FILTER_CAST_BOOL:
          it(`allows the "${name}" attribute and casts to a boolean`, () => {
            element.setAttribute(name, true);

            expect(instance.extractAttributes(element)).to.deep.equal({
              [attrName]: true,
            });

            element.setAttribute(name, false);

            expect(instance.extractAttributes(element)).to.deep.equal({
              [attrName]: false,
            });
          });

          it(`allows the "${name}" attribute and casts to a boolean when setting value equal to name`, () => {
            element.setAttribute(name, name);

            expect(instance.extractAttributes(element)).to.deep.equal({
              [attrName]: true,
            });

            element.setAttribute(name, '');

            expect(instance.extractAttributes(element)).to.deep.equal({
              [attrName]: false,
            });
          });
          break;

        case FILTER_CAST_NUMBER:
          it(`allows the "${name}" attribute and casts to a number`, () => {
            element.setAttribute(name, '100');

            expect(instance.extractAttributes(element)).to.deep.equal({
              [attrName]: 100,
            });
          });
          break;

        default:
          break;
      }
    });

    it('allows aria attributes', () => {
      element.setAttribute('aria-live', 'off');

      expect(instance.extractAttributes(element)).to.deep.equal({
        'aria-live': 'off',
      });
    });

    it('denies data attributes', () => {
      element.setAttribute('data-foo', 'bar');

      expect(instance.extractAttributes(element)).to.deep.equal({});
    });

    it('denies attributes that are not whitelisted', () => {
      element.setAttribute('readonly', 'true');

      expect(instance.extractAttributes(element)).to.deep.equal({});
    });

    it('denies attributes that start with on', () => {
      element.setAttribute('onload', 'hackServers();');
      element.setAttribute('onclick', 'doSomething();');
      element.onmouseenter = function () {};

      expect(instance.extractAttributes(element)).to.deep.equal({});
    });

    it('denies sources that have injections', () => {
      /* eslint-disable no-script-url */
      element.setAttribute('href', 'javascript:alert();');
      element.setAttribute('src', 'javaScript:void(0);');
      element.setAttribute('source', 'xss:confirm();');
      /* eslint-enable no-script-url */

      expect(instance.extractAttributes(element)).to.deep.equal({});
    });

    it('camel cases specific attribute names to React attribute names', () => {
      element.setAttribute('datetime', '2016-01-01');
      element.setAttribute('colspan', '3');
      element.setAttribute('rowspan', 6);
      element.setAttribute('class', 'foo-bar');
      element.setAttribute('alt', 'Foo');
      element.setAttribute('disabled', 'disabled');

      expect(instance.extractAttributes(element)).to.deep.equal({
        dateTime: '2016-01-01',
        colSpan: 3,
        rowSpan: 6,
        className: 'foo-bar',
        alt: 'Foo',
        disabled: true,
      });
    });

    it('applies cleaners to attributes', () => {
      element.setAttribute('href', 'http://foo.com/hello/world');

      expect(instance.extractAttributes(element)).to.deep.equal({
        href: 'http://bar.net/hello/world',
      });
    });
  });

  describe('parse()', () => {
    // TODO
  });

  describe('parseNode()', () => {
    beforeEach(() => {
      element = document.createElement('div');
    });

    it('returns an empty array when no child nodes present', () => {
      expect(instance.parseNode(element)).to.deep.equal([]);
    });

    it('returns text nodes as strings', () => {
      element.appendChild(document.createTextNode('Foo'));
      element.appendChild(document.createTextNode('Bar'));

      expect(instance.parseNode(element)).to.deep.equal([
        'FooBar',
      ]);
    });

    Object.keys(TAGS).forEach((tag, i) => {
      switch (TAGS[tag]) {
        case FILTER_ALLOW:
          it(`renders <${tag}> elements that are allowed`, () => {
            element.appendChild(createChild(tag, i));

            expect(instance.parseNode(element)).to.deep.equal([
              <Element tagName={tag} attributes={{}}>{[`${i}`]}</Element>,
            ]);
          });
          break;

        case FILTER_DENY:
          it(`removes <${tag}> elements that are denied`, () => {
            element.appendChild(createChild(tag, i));

            expect(instance.parseNode(element)).to.deep.equal([]);
          });
          break;

        case FILTER_PASS_THROUGH:
          it(`removes <${tag}> elements as they are pass-through but renders its children`, () => {
            element.appendChild(createChild(tag, i));

            expect(instance.parseNode(element)).to.deep.equal([
              `${i}`,
            ]);
          });
          break;

        default:
          break;
      }
    });

    it('ignores unknown elements', () => {
      element.appendChild(document.createElement('foo'));

      expect(instance.parseNode(element)).to.deep.equal([]);
    });

    it('returns text and element nodes in order', () => {
      element.appendChild(document.createTextNode('Foo'));
      element.appendChild(createChild('div', 'Bar'));
      element.appendChild(document.createTextNode('Baz'));

      expect(instance.parseNode(element)).to.deep.equal([
        'Foo',
        <Element tagName="div" attributes={{}}>{['Bar']}</Element>,
        'Baz',
      ]);
    });

    it('combines multiple strings together', () => {
      element.appendChild(document.createTextNode('Foo'));
      element.appendChild(createChild('div', 'Bar'));
      element.appendChild(document.createTextNode('Baz'));
      element.appendChild(document.createTextNode('Qux'));
      element.appendChild(createChild('div', 'Bar'));

      expect(instance.parseNode(element)).to.deep.equal([
        'Foo',
        <Element tagName="div" attributes={{}}>{['Bar']}</Element>,
        'BazQux',
        <Element tagName="div" attributes={{}}>{['Bar']}</Element>,
      ]);
    });

    it('ignores comment nodes', () => {
      element.appendChild(document.createComment('Comment'));

      expect(instance.parseNode(element)).to.deep.equal([]);
    });

    it('ignores document nodes', () => {
      element.appendChild(document);

      expect(instance.parseNode(element)).to.deep.equal([]);
    });

    it('ignores document fragment nodes', () => {
      element.appendChild(document.createDocumentFragment());

      expect(instance.parseNode(element)).to.deep.equal([]);
    });
  });
});