"use strict";

ITPA.Core.NotificationList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList, authForm;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }

    this.Add = function (notificationRecord, then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetServiceURL("notifications/add");
            var payload = { authForm: authForm, notificationRecord: notificationRecord };
            var payloadStr = JSON.stringify(payload);
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = notification.data; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    this.GetList = function (then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetServiceURL("notifications/list");
            var payload = authForm;
            var payloadStr = JSON.stringify(payload);
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = core.GetDataFromArray(notification.data); }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    function getKeyFromItemData(itemData) { return !!itemData ? itemData['notification_id'] : undefined; }

    function needsUpdateItemData(updateObj) {
        var p = updateObj.itemData;
        var newP = updateObj.itemDataSet;
        var needsChange = newP.title != p.title || newP.url != p.url || newP.summary != p.summary || newP.icon != p.icon;
        return needsChange;
    }

    function filterAddItem(itemData) {
        //if (!!itemData) { itemData.properties.last_position_on_date = tf.js.GetDateFromTimeStamp(itemData.properties.last_position_on); }
        return true;
    }

    function preProcessServiceData(data) {
        data = core.GetDataFromArray(data);
        if (!!data) { data.sort(function (a, b) { return a.notification_id - b.notification_id; }); }
        return data;
    }

    function initialize() {
        core = settings.core;
        authForm = core.GetAuthForm();

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetServiceURL('notifications/active'),
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
