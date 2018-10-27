"use strict";

/**
* @this {ITPA.Core.ServiceList}
*/
ITPA.Core.ServiceList = function (settings) {

    var theThis = null;
    var core = null;
    var keyedListsTimedRefresh = null;
    var keyedList = null;
    var updateWhenValueChanges = undefined;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }

    this.SetUpdateWhenValueChanges = function (setBool) { updateWhenValueChanges = !!setBool; }
    this.GetUpdateWhenValueChanges = function () { return updateWhenValueChanges; }

    function getKeyFromItemData(itemData) {
        return !!itemData ? itemData.name : null;
    }

    function needsUpdateItemData(updateObj) {
        return true;
    }

    function filterAddItem(itemData) {
        return true;
    }

    function preProcessServiceData(data) {
        data = core.GetDataFromArray(data);
        return data;
    }

    function initialize() {
        core = settings.core;
        updateWhenValueChanges = false;
        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetServerServicesServiceURL('services/list'),
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 1000 * 10,
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
