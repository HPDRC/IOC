"use strict";

/**
* @this {ITPA.Core.PlatformList}
*/
ITPA.Core.PlatformList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }

    this.LoadPlatforms = function (then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetFullPlatformsServiceName();
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = notification.data; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, undefined);
        }
    }

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'platform_id'); }

    function needsUpdateItemData(updateObj) { return true; }

    function filterAddItem(itemData) { return true; }

    function preProcessServiceData(data) {
        data = core.GetFeatureListFromData(data);
        return data;
    }

    function initialize() {
        core = settings.core;

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetFullPlatformsServiceName(),
            //serviceURL: "http://localhost/core/stopsinfo.txt",
            //serviceURL: "http://experiment2.cs.fiu.edu/hterramap/test/stopsinfo.txt",
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 0,
            keyedLists: [{
                name: settings.listName,
                getKeyFromItemData: getKeyFromItemData,
                needsUpdateItemData: needsUpdateItemData,
                filterAddItem: filterAddItem
            }]
        })).GetKeyedList(settings.listName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
