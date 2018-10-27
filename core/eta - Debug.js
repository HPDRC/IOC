"use strict";

/**
* @this {ITPA.Core.ETAList}
*/
ITPA.Core.ETAList = function (settings) {

    var theThis, core, lists, keyedListsTimedRefresh, coreBusList, corePlatformList;

    this.GetCore = function () { return core; }

    this.GetBusList = function () { return getBusList(); }
    this.GetPlatformList = function () { return getPlatformList(); }
    this.GetList = function (listName) { return getList(listName); }

    this.GetBusKeysForPlatformKey = function (platformKey) { return getKeysFromList(getPlatformETAs(platformKey), getBusKeyFromItemData); }
    this.GetPlatformKeysForBusKey = function (busKey) { return getKeysFromList(getBusETAs(busKey), getPlatformKeyFromItemData); }

    this.GetBusETAs = function (busKey) { return getETAs(getBusList(), busKey); }
    this.GetPlatformETAs = function (platformKey) { return getETAs(getPlatformList(), platformKey); }

    function getKeysFromList(theList, getKeyFunction) {
        var keyes = [];

        if (!!theList) {
            var keyedItemList = keyedList.GetKeyedItemList();

            for (var i in keyedItemList) {
                var keyedItem = keyedItemList[i];
                var itemData = keyedItem.GetData();
                var key = getKeyFunction(itemData);

                if (!!key) { keyes.push(key); }
            }
        }
        return keyes;
    }

    function getBusETAs(busKey) { return getETAs(getBusList(), busKey); }
    function getPlatformETAs(platformKey) { return getETAs(getPlatformList(), platformKey); }

    function getList(listName) { return lists[listName]; }

    function getPlatformList() { return getList(ITPA.Core.PlatformListName); }
    function getBusList() { return getList(ITPA.Core.BusListName); }

    function getETAs(etaList, itemKey) { var keyedItem = etaList.GetItem(itemKey); return !!keyedItem ? keyedItem.GetKeyedItemList() : null; }

    function getBusKeyFromItemData(itemData) {
        return (typeof itemData === "object" && !!itemData.public_transport_vehicle_id) ? itemData.public_transport_vehicle_id : null;
    }

    function getPlatformKeyFromItemData(itemData) {
        return (typeof itemData === "object" && !!itemData.platform_id) ? itemData.platform_id : null;
    }

    function getETAKeyFromItemData(itemData) {
        return (typeof itemData === "object" && !!itemData.eta) ? itemData.eta : null;
    }

    function getETAPlatformKeyFromItemData(itemData) {
        var etaKey = getETAKeyFromItemData(itemData), platKey = getPlatformKeyFromItemData(itemData);
        return !!etaKey && !!platKey ? etaKey + '|' + platKey : null;
    }

    function getETABusKeyFromItemData(itemData) {
        var etaKey = getETAKeyFromItemData(itemData), busKey = getBusKeyFromItemData(itemData);
        return !!etaKey && !!busKey ? etaKey + '|' + busKey : null;
    }

    function needsUpdateItemData(updateObj) { return updateObj.itemData.eta != updateObj.itemDataSet.eta; }

    function filterAddItem(itemData) {
        if (!coreBusList) { coreBusList = core.GetBusList(); }
        if (!corePlatformList) { corePlatformList = core.GetPlatformList(); }

        var accept = (!corePlatformList || corePlatformList.GetKeyedList().HasKey(itemData.platform_id)) && (!coreBusList || coreBusList.GetKeyedList().HasKey(itemData.public_transport_vehicle_id));
        if (!accept) { core.Log('ETA with invalid bus or platform rejected "' + itemData.identifier); }
        return accept;
    }

    var oddTurn = false;

    function preProcessServiceData(data) {
        if (tf.js.GetIsArrayWithLength(data, 0)) {
            if (oddTurn = !oddTurn) {
                /*data = [
                    { platform_id: 50, eta: "foo", public_transport_vehicle_id: 4013169 }
                ];*/
            }
            else {
                data = [
                    { platform_id: 50, eta: "foo", public_transport_vehicle_id: 4013169 },
                    { platform_id: 56, eta: "foo", public_transport_vehicle_id: 4013169 },
                    { platform_id: 55, eta: "foo", public_transport_vehicle_id: 4013169 }
                ];
            }
        }
        return core.GetDataFromArray(data);
    }

    function initialize() {
        core = settings.core;

        var baseETAListSettings = {
            needsUpdateItemData: needsUpdateItemData,
            filterAddItem: filterAddItem
        };

        var busETAListSettings = tf.js.ShallowMerge(baseETAListSettings, { name: ITPA.Core.BusListName, getKeyFromItemData: [getBusKeyFromItemData, getETAPlatformKeyFromItemData] });
        var platformETAListSettings = tf.js.ShallowMerge(baseETAListSettings, { name: ITPA.Core.PlatformListName, getKeyFromItemData: [getPlatformKeyFromItemData, getETABusKeyFromItemData] });

        keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetServiceURL('bus/geteta'),
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            refreshMillis: 1000 * 3,
            keepNotUpdated: false,
            keyedLists: [busETAListSettings, platformETAListSettings]
        });

        lists = {};

        lists[ITPA.Core.BusListName] = keyedListsTimedRefresh.GetKeyedList(ITPA.Core.BusListName);
        lists[ITPA.Core.PlatformListName] = keyedListsTimedRefresh.GetKeyedList(ITPA.Core.PlatformListName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
