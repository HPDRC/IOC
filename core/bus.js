"use strict";

/**
* @this {ITPA.Core.BusList}
*/
ITPA.Core.BusList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList, routeCoreList, authForm;
    var settingsRefreshCallback;
    var forceUpdate, forceUpdateRequested;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }

    this.SetForceUpdate = function () { forceUpdateRequested = true; }

    this.GetBusHistory = function (then, bus_id, baseDate, timeMultiplier, timeUnit) {
        if (tf.js.GetFunctionOrNull(then) && bus_id >= 0) {
            if (!tf.js.GetIsNonEmptyString(baseDate)) {
                var nowDate = new Date();
                baseDate = nowDate.getFullYear() + '-' + (nowDate.getMonth() + 1) + '-' + nowDate.getDate();
            }
            if (timeMultiplier == undefined) { timeMultiplier = 1; }
            if (!tf.js.GetIsNonEmptyString(timeUnit)) { timeUnit = "day"; }
            var url = core.GetServiceURL("buses/history");
            var payload = { authForm: authForm, busId: bus_id, baseDate: baseDate, timeMultiplier: timeMultiplier, timeUnit: timeUnit };
            var payloadStr = JSON.stringify(payload);

            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = core.GetFeatureListFromData(notification.data); }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

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

    function needsUpdateItemData(updateObj) {
        if (forceUpdate) {
            return true;
        }
        var coordsOld = updateObj.itemData.geometry.coordinates;
        var coordsNew = updateObj.itemDataSet.geometry.coordinates;
        var pOld = updateObj.itemData.properties;
        var pNew = updateObj.itemDataSet.properties;
        return coordsOld[0] != coordsNew[0] ||
            coordsOld[1] != coordsNew[1] ||
            pOld.name != pNew.name ||
            pOld.line_id != pNew.line_id ||
            pOld.datetime != pNew.datetime ||
            pOld.heading != pNew.heading ||
            pOld.number_of_occupants != pNew.number_of_occupants;
    }

    var global_id = undefined;

    function preProcessServiceData(data) {
        forceUpdate = forceUpdateRequested;
        forceUpdateRequested = false;
        data = core.GetFeatureListFromData(data);
        if (!!data) {
            var newData = [];
            for (var i in data) {
                var d = data[i], p = d.properties;
                if (p.public_transport_vehicle_id != global_id) {
                    newData.push(d);
                }
            }
            data = newData;
        }
        return data;
    }

    function refreshCallback(theList) {
        if (!!settingsRefreshCallback) { settingsRefreshCallback(theThis); }
        forceUpdate = false;
    }

    function initialize() {
        core = settings.core;
        authForm = core.GetAuthForm();

        settingsRefreshCallback = tf.js.GetFunctionOrNull(settings.refreshCallback);

        forceUpdateRequested = forceUpdate = false;

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetFullBusesServiceName(),
            preProcessServiceData: preProcessServiceData,
            refreshCallback: refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 500,//1000 * 10,
            keyedLists: [{
                name: settings.listName,
                getKeyFromItemData: getKeyFromItemData,
                needsUpdateItemData: needsUpdateItemData
            }]
        })).GetKeyedList(settings.listName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
