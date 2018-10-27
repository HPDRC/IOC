"use strict";

ITPA.Core.PkRecommendationList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList, decalMap;

    this.GetDecalMap = function () { return decalMap; }
    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }

    function loadDecalMap() {
        var url = "http://xpect-itpa.cs.fiu.edu/decals/";

        var requestHeaders = core.GetParkingRequestHeaders();

        new tf.ajax.JSONGet().Request(url, function (notification) {
            if (!!notification && !!notification.data && tf.js.GetIsNonEmptyArray(notification.data.results)) {
                var data = notification.data.results;
                decalMap = {};
                for (var i in data) {
                    var d = data[i];
                    if (typeof (d.id) == "number" && tf.js.GetIsNonEmptyString(d.name) && tf.js.GetIsNonEmptyString(d.description)) {
                        decalMap['' + d.id] = d;
                    }
                }
            }
        }, theThis, undefined, false, undefined, undefined, undefined, requestHeaders);
    }

    function getKeyFromItemData(itemData) { return itemData.key; }

    function needsUpdateItemData(updateObj) { return true; }

    function filterAddItem(itemData) { return true }

    function preProcessServiceData(data) {
        //console.log(JSON.stringify(data));

        var newData = [], newDataById = {};

        var garList = core.GetGarageList();

        if (!!garList) {

            garList = garList.GetKeyedList();

            var garItems = garList.GetKeyedItemList();
            for (var i in garItems) { garItems[i].GetData().pkRecommendations = undefined; }

            if (tf.js.GetIsNonEmptyArray(data)) {
                for (var i in data) {
                    var d = data[i];
                    var site = d.site;
                    var siteId = site.id;
                    var decal = d.decal;
                    var decalId = decal.id;
                    var area = d.area;
                    var key = siteId + '';
                    var decalKey = decalId + '';
                    var existingItem = newDataById[key];

                    if (existingItem == undefined) {
                        var garItem = garList.GetItem(siteId);
                        if (!!garItem) {
                            newDataById[key] = existingItem = {
                                garItem: garItem,
                                key: key,
                                siteId: siteId,
                                decals: {}
                            };
                        }
                        //else { console.log('recommendation for unknown parking site id: ' + siteId); }
                    }
                    if (!!existingItem) {
                        existingItem.decals[decalKey] = {
                            key: decalKey,
                            id: decalId,
                            area: area
                        };
                    }
                }
                for (var i in newDataById) {
                    var nd = newDataById[i];
                    var garItemData = nd.garItem.GetData();
                    garItemData.pkRecommendations = nd;
                    newData.push(nd);
                }
            }
        }

        //console.log(JSON.stringify(newData));

        return newData;
    }

    function initialize() {

        core = settings.core;

        var requestHeaders = core.GetParkingRequestHeaders();

        var serviceName = 'http://xpect-itpa.cs.fiu.edu/sites/all_parking/';

        //serviceName = "http://localhost/oc/pkr.txt";

        loadDecalMap();

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            //serviceURL: core.GetServiceURL(serviceName),
            serviceURL: serviceName,
            //preProcessServiceData: core.GetFeatureListFromData,
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            //refreshMillis: 0,
            refreshMillis: 1000 * 30,
            //refreshMillis: 1000 * 5,
            requestHeaders: requestHeaders,
            //refreshMillis: 0,
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
