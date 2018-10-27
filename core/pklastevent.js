"use strict";

ITPA.Core.PkLastEventList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }

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
            for (var i in garItems) { garItems[i].GetData().pkEvents = undefined; }


            if (tf.js.GetIsNonEmptyArray(data)) {
                for (var i in data) {
                    var d = data[i];
                    try {
                        if (!!d.sensor && !!d.sensor.site && !!d.vehicle && typeof (d.action) == "number") {
                            var action = d.action;
                            var vehicleD = d.vehicle;
                            var isEntry = action == 1;
                            var isExit = action == -1;
                            if (isEntry || isExit) {
                                var siteId = d.sensor.site.id;
                                var key = siteId + '';
                                var existingItem = newDataById[key];

                                if (existingItem == undefined) {
                                    var garItem = garList.GetItem(siteId);
                                    if (!!garItem) {
                                        newDataById[key] = existingItem = {
                                            garItem: garItem,
                                            key: key,
                                            siteId: siteId
                                        };
                                    }
                                    else { console.log('entry or exit event for unknown parking site id: ' + siteId); }
                                }
                                if (!!existingItem) {
                                    var attrName = isEntry ? "entryEvent" : "exitEvent";
                                    var eventDetails = {
                                        isEntry: isEntry,
                                        isExit: isExit,
                                        laneDesc: d.sensor.lane.description,
                                        vehicleId: vehicleD.id,
                                        decalId: vehicleD.decal.id,
                                        date: new Date(d.utc_datetime),
                                        area: !!vehicleD.zone ? vehicleD.zone.area : undefined
                                    };
                                    existingItem[attrName] = eventDetails;
                                }
                            }
                            else { console.log('unknown action'); }
                        } else { console.log('invalid item'); }
                    }
                    catch (e) {}
                }

                for (var i in newDataById) {
                    var nd = newDataById[i];
                    var garItemData = nd.garItem.GetData();
                    garItemData.pkEvents = nd;
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

        var serviceName = 'http://xpect-itpa.cs.fiu.edu/sites/all_lastevents/';

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            //serviceURL: core.GetServiceURL(serviceName),
            serviceURL: serviceName,
            //preProcessServiceData: core.GetFeatureListFromData,
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            //refreshMillis: 0,
            //refreshMillis: 1000 * 30,
            refreshMillis: 1000 * 5,
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
