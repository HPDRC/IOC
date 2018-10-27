"use strict";

/**
* @this {ITPA.Core.MessageList}
*/
ITPA.Core.MessageList = function (settings) {

    var theThis = null;
    var core = null;
    var keyedListsTimedRefresh = null;
    var keyedList = null;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'message_board_id'); }

    function needsUpdateItemData(updateObj) {
        return updateObj.itemData.properties.message != updateObj.itemDataSet.properties.message;
    }

    function filterAddItem(itemData) {
        /*var accept = core.IsPointFeatureInsideExtent(itemData);
        if (!accept) { core.Log('message outside ITPA extent rejected "' + itemData.properties.message_board_id + '" ' + itemData.properties.message_board_location); }
        return accept;*/
        return true;
    }

    function initialize() {

        core = settings.core;

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetFullMessagesServiceName(),
            preProcessServiceData: core.GetFeatureListFromData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 1000 * 40,
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
