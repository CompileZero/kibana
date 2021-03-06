/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  mockFetchIndexPatterns,
  mockPersistedLog,
  mockPersistedLogFactory,
} from './query_string_input.test.mocks';

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/dom';
import { render } from '@testing-library/react';

import { EuiTextArea, EuiIcon } from '@elastic/eui';

import { QueryLanguageSwitcher } from './language_switcher';
import { QueryStringInput } from './';
import type QueryStringInputUI from './query_string_input';

import { coreMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../mocks';
import { stubIndexPatternWithFields } from '../../stubs';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';

const startMock = coreMock.createStart();

const noop = () => {
  return;
};

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const luceneQuery = {
  query: 'response:200',
  language: 'lucene',
};

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

function wrapQueryStringInputInContext(testProps: any, storage?: any) {
  const defaultOptions = {
    screenTitle: 'Another Screen',
    intl: null as any,
  };

  const services = {
    ...startMock,
    data: dataPluginMock.createStartContract(),
    appName: testProps.appName || 'test',
    storage: storage || createMockStorage(),
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryStringInput {...defaultOptions} {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

// FAILING: https://github.com/elastic/kibana/issues/85715
// FAILING: https://github.com/elastic/kibana/issues/89603
// FAILING: https://github.com/elastic/kibana/issues/89641
describe.skip('QueryStringInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.skip('Should render the given query', async () => {
    const { getByText } = render(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
      })
    );

    await waitFor(() => getByText(kqlQuery.query));
    await waitFor(() => getByText('KQL'));
  });

  it('Should pass the query language to the language switcher', () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
      })
    );
    expect(component.find(QueryLanguageSwitcher).prop('language')).toBe(luceneQuery.language);
  });

  it('Should disable autoFocus on EuiTextArea when disableAutoFocus prop is true', () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
      })
    );
    expect(component.find(EuiTextArea).prop('autoFocus')).toBeFalsy();
  });

  it('Should create a unique PersistedLog based on the appName and query language', () => {
    mockPersistedLogFactory.mockClear();

    mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
        appName: 'discover',
      })
    );
    expect(mockPersistedLogFactory.mock.calls[0][0]).toBe('typeahead:discover-kuery');
  });

  it("On language selection, should store the user's preference in localstorage and reset the query", () => {
    const mockStorage = createMockStorage();
    const mockCallback = jest.fn();
    const component = mount(
      wrapQueryStringInputInContext(
        {
          query: kqlQuery,
          onSubmit: mockCallback,
          indexPatterns: [stubIndexPatternWithFields],
          disableAutoFocus: true,
          appName: 'discover',
        },
        mockStorage
      )
    );

    component.find(QueryLanguageSwitcher).props().onSelectLanguage('lucene');
    expect(mockStorage.set).toHaveBeenCalledWith('kibana.userQueryLanguage', 'lucene');
    expect(mockCallback).toHaveBeenCalledWith({ query: '', language: 'lucene' });
  });

  it('Should not show the language switcher when disabled', () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
        disableLanguageSwitcher: true,
      })
    );
    expect(component.find(QueryLanguageSwitcher).exists()).toBeFalsy();
  });

  it('Should show an icon when an iconType is specified', () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: luceneQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
        iconType: 'search',
      })
    );
    expect(component.find(EuiIcon).exists()).toBeTruthy();
  });

  it('Should call onSubmit when the user hits enter inside the query bar', () => {
    const mockCallback = jest.fn();

    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: mockCallback,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
      })
    );

    const instance = component.find('QueryStringInputUI').instance() as QueryStringInputUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiTextArea).find('textarea');
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ query: 'response:200', language: 'kuery' });
  });

  it('Should fire onBlur callback on input blur', () => {
    const mockCallback = jest.fn();

    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onBlur: mockCallback,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
      })
    );

    const inputWrapper = component.find(EuiTextArea).find('textarea');
    inputWrapper.simulate('blur');

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith();
  });

  it('Should fire onChangeQueryInputFocus callback on input blur', () => {
    const mockCallback = jest.fn();

    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onChangeQueryInputFocus: mockCallback,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
      })
    );

    const inputWrapper = component.find(EuiTextArea).find('textarea');
    inputWrapper.simulate('blur');

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(false);
  });

  it('Should use PersistedLog for recent search suggestions', async () => {
    const component = mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: [stubIndexPatternWithFields],
        disableAutoFocus: true,
        persistedLog: mockPersistedLog,
      })
    );

    const instance = component.find('QueryStringInputUI').instance() as QueryStringInputUI;
    const input = instance.inputRef;
    const inputWrapper = component.find(EuiTextArea).find('textarea');
    inputWrapper.simulate('keyDown', { target: input, keyCode: 13, key: 'Enter', metaKey: true });

    expect(mockPersistedLog.add).toHaveBeenCalledWith('response:200');

    mockPersistedLog.get.mockClear();
    inputWrapper.simulate('change', { target: { value: 'extensi' } });
    expect(mockPersistedLog.get).toHaveBeenCalled();
  });

  it('Should accept index pattern strings and fetch the full object', () => {
    const patternStrings = ['logstash-*'];
    mockFetchIndexPatterns.mockClear();
    mount(
      wrapQueryStringInputInContext({
        query: kqlQuery,
        onSubmit: noop,
        indexPatterns: patternStrings,
        disableAutoFocus: true,
      })
    );
    expect(mockFetchIndexPatterns.mock.calls[0][1]).toStrictEqual(patternStrings);
  });
});
