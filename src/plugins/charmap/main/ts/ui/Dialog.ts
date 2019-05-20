/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Types } from '@ephox/bridge';
import { Arr, Throttler } from '@ephox/katamari';
import Editor from 'tinymce/core/api/Editor';
import Actions from '../core/Actions';
import { CharMap } from '../core/CharMap';
import Scan from '../core/Scan';

const patternName = 'pattern';

const open = function (editor: Editor, charMap: CharMap[]) {
  const makeGroupItems = (): Types.Dialog.BodyComponentApi[] => [
    {
      label: 'Search',
      type: 'input',
      name: patternName
    },
    {
      type: 'collection',
      name: 'results',
      // TODO TINY-3229 implement collection columns properly
      // columns: 'auto'
    }
  ];

  const makeTabs = () => {
    return Arr.map(charMap, (charGroup) => {
      return {
        title: charGroup.name,
        name: charGroup.name,
        items: makeGroupItems()
      };
    });
  };

  const makePanel = (): Types.Dialog.PanelApi => ({ type: 'panel', items: makeGroupItems() });

  const makeTabPanel = (): Types.Dialog.TabPanelApi => ({ type: 'tabpanel', tabs: makeTabs() });

  const scanAndSet = (dialogApi: Types.Dialog.DialogInstanceApi<typeof initialData>, tabChangeDetails, pattern: string) => {
    Arr.find(charMap, (group) => group.name === tabChangeDetails.newTabName).each((f) => {
      const items = Scan.scan(f, pattern);
      dialogApi.setData({
        results: items
      });
    });
  };

  const SEARCH_DELAY = 40;

  const updateFilter = Throttler.last((dialogApi: Types.Dialog.DialogInstanceApi<typeof initialData>, tabChangeDetails) => {
    const pattern = dialogApi.getData().pattern;
    scanAndSet(dialogApi, tabChangeDetails, pattern);
  }, SEARCH_DELAY);

  const body = charMap.length === 1 ? makePanel() : makeTabPanel();

  const initialData = {
    pattern: '',
    results: Scan.scan(charMap[0], '')
  };

  const bridgeSpec: Types.Dialog.DialogApi<typeof initialData> = {
    title: 'Special Character',
    size: 'normal',
    body,
    buttons: [
      {
        type: 'cancel',
        name: 'close',
        text: 'Close',
        primary: true
      }
    ],
    initialData,
    onAction(api, details) {
      if (details.name === 'results') {
        Actions.insertChar(editor, details.value);
        api.close();
      }
    },

    onTabChange: (dialogApi, details) => {
      updateFilter.throttle(dialogApi, details);
    },

    onChange: (dialogApi, changeData) => {
      if (changeData.name === patternName) {
        updateFilter.throttle(dialogApi);
      }
    }
  };
  editor.windowManager.open(bridgeSpec);
};

export default {
  open
};