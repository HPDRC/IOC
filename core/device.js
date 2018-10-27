"use strict";

/**
* @this {ITPA.Core.DeviceList}
*/
ITPA.Core.DeviceList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList, authForm;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }

    this.GetDeviceHistory = function (then, device_id, baseDate, timeMultiplier, timeUnit) {
        if (tf.js.GetFunctionOrNull(then) && device_id >= 0) {
            if (!tf.js.GetIsNonEmptyString(baseDate)) {
                var nowDate = new Date();
                baseDate = nowDate.getFullYear() + '-' + (nowDate.getMonth() + 1) + '-' + nowDate.getDate();
            }
            if (timeMultiplier == undefined) { timeMultiplier = 1; }
            if (!tf.js.GetIsNonEmptyString(timeUnit)) { timeUnit = "day"; }
            var url = core.GetServiceURL("devices/history");
            var payload = { authForm: authForm, deviceId: device_id, baseDate: baseDate, timeMultiplier: timeMultiplier, timeUnit: timeUnit };
            var payloadStr = JSON.stringify(payload);

            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = core.GetFeatureListFromData(notification.data); }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    /*this.GetDeviceHistory = function (device_id, then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetServiceURL("devices/history");
            var payload = { authForm: authForm, deviceId: device_id };
            var payloadStr = JSON.stringify(payload);

            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = core.GetFeatureListFromData(notification.data); }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }*/

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'device_id'); }

    function needsUpdateItemData(updateObj) {
        var geomCoords = updateObj.itemData.geometry.coordinates;
        var newGeomCoords = updateObj.itemDataSet.geometry.coordinates;
        var needsChange = false;

        if (!(needsChange = (newGeomCoords[0] != geomCoords[0] || newGeomCoords[1] != geomCoords[1]))) {
            if (!(needsChange = (updateObj.itemData.properties.last_position_on != updateObj.itemDataSet.properties.last_position_on))) {
            }
        }
        return needsChange;
    }

    function filterAddItem(itemData) {
        return true;
    }

    function preProcessServiceData(data) {
        data = core.GetFeatureListFromData(data);
        if (!!data) {
            data.sort(function (a, b) {
                var pa = a.properties;
                var pb = b.properties;
                return pa.device_id - pb.device_id;
            });
            for (var i in data) {
                var itemData = data[i];
                itemData.properties.last_position_on_date = tf.js.GetDateFromTimeStamp(itemData.properties.last_position_on);
            }
        }
        return data;
    }

    function initialize() {
        core = settings.core;
        authForm = core.GetAuthForm();

        var payloadStr = JSON.stringify(authForm);

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            postParams: payloadStr,
            onCreated: settings.onCreated,
            serviceURL: core.GetServiceURL('devices/getactivity'),
            preProcessServiceData: preProcessServiceData,
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
