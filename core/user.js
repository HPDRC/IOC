"use strict";

ITPA.Core.UserList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }

    function getKeyFromItemData(itemData) { return itemData ? itemData.email : undefined; }

    function needsUpdateItemData(updateObj) {
        var oldD = updateObj.itemData;
        var newD = updateObj.itemDataSet;
        return oldD.last_email_code_sent != newD.last_email_code_sent || oldD.userTypeId != newD.userTypeId || oldD.email_confirmed != newD.email_confirmed;
    }

    function filterAddItem(itemData) {
        if (!!itemData) {
            itemData.last_email_code_sent_date = !!itemData.last_email_code_sent ? tf.js.GetDateFromTimeStamp(itemData.last_email_code_sent) : "No record";
            itemData.last_email_code_str = !!itemData.last_email_code_sent ? 'Last confirmation code sent: ' + itemData.last_email_code_sent : 'Confirmation code not requested';
        }
        return true;
    }

    function preProcessServiceData(data) {
        data = core.GetDataFromArray(data);
        //if (!!data) { data.sort(function (a, b) { return a.email < b.email ? -1 : 1; }); }
        return data;
    }

    function initialize() {
        core = settings.core;

        var authForm = core.GetAuthForm();

        var payloadStr = JSON.stringify(authForm);

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            postParams: payloadStr,
            onCreated: settings.onCreated,
            serviceURL: core.GetServiceURL('users/list'),
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 60 * 1000,
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
