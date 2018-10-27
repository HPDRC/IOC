"use strict";

/**
* @this {ITPA.Core.BusList}
*/
ITPA.Core.BusList = function (settings) {

    var theThis = null;
    var core = null;
    var keyedListsTimedRefresh = null;
    var keyedList = null;
    var routeCoreList = null;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }

    this.GetPlatformsForBus = function (busKey) {
        var platforms;

        if (!routeCoreList) { routeCoreList = core.GetRouteList(); }

        if (!!routeCoreList) {
            var keyedItem = keyedList.GetItem(busKey);
            if (!!keyedItem) { platforms = routeCoreList.GetPlatformsForRoute(keyedItem.GetData().properties.platform_ids); }
        }
        else { platforms = []; }
        return platforms;
    }

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'public_transport_vehicle_id'); }

    var specialBusKey = "4011159";

    function getSpecialBusGeometryCoords() {
        return [TFConsts.defaultLongitude, TFConsts.defaultLatitude]
    }

    function needsUpdateItemData(updateObj) {
        var geomCoords = updateObj.itemData.geometry.coordinates;
        var newGeomCoords = updateObj.itemDataSet.geometry.coordinates;

        if (getKeyFromItemData(updateObj.itemDataSet) == specialBusKey) {
            updateObj.itemDataSet.geometry.coordinates = newGeomCoords = getSpecialBusGeometryCoords();
        }

        return newGeomCoords[0] != geomCoords[0] || newGeomCoords[1] != geomCoords[1];
        //return true;
    }

    function filterAddItem(itemData) {
        if (getKeyFromItemData(itemData) == specialBusKey) {
            itemData.geometry.coordinates = getSpecialBusGeometryCoords();
        }
        return true;
    }

    function initialize() {
        core = settings.core;

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetServiceURL('bus/getlocation'),
            preProcessServiceData: core.GetFeatureListFromData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 1000 * 10,
            keyedLists: [{
                name: settings.listName,
                getKeyFromItemData: getKeyFromItemData,
                filterAddItem: filterAddItem,
                needsUpdateItemData: needsUpdateItemData
            }]
        })).GetKeyedList(settings.listName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
