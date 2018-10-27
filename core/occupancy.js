"use strict";

/**
* @this {ITPA.Core.OccupancyList}
*/
ITPA.Core.OccupancyList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }
    this.GetAvailability01ForKey = function (occupancyKey) { return getAvailability01ForKey(occupancyKey); }

    function getAvailability01ForKey(occupancyKey) {
        var keyedItem = keyedList.GetItem(occupancyKey);
        return !!keyedItem ? keyedItem.GetData().properties.available_01 : undefined;
    }

    function getKeyFromItemData(itemData) {
        return core.GetKeyFromItemDataProperties(itemData, 'parking_site_id');
    }

    function needsUpdateItemData(updateObj) {
        return true;
    }

    function filterAddItem(itemData) { return true }

    function getPercentStrFrom01(occ01) { return Math.round(100 * occ01) + '%'; }

    var debugData = [{ "site_id": 35, "decalgroup": "Student", "total": 560, "available": -1, "created": "2017-03-07T19:38:29.319092" }, { "site_id": 35, "decalgroup": "Staff", "total": 211, "available": 0, "created": "2017-03-07T19:38:29.335201" }, { "site_id": 36, "decalgroup": "Student", "total": 604, "available": 0, "created": "2017-03-07T19:38:29.369629" }, { "site_id": 36, "decalgroup": "Staff", "total": 275, "available": 0, "created": "2017-03-07T19:38:29.391818" }, { "site_id": 37, "decalgroup": "Student", "total": 1255, "available": -1, "created": "2017-03-07T19:38:29.454795" }, { "site_id": 37, "decalgroup": "Staff", "total": 100, "available": 0, "created": "2017-03-07T19:38:29.478443" }, { "site_id": 38, "decalgroup": "Student", "total": 945, "available": 0, "created": "2017-03-07T19:38:29.534384" }, { "site_id": 38, "decalgroup": "Staff", "total": 330, "available": 0, "created": "2017-03-07T19:38:29.554428" }, { "site_id": 39, "decalgroup": "Student", "total": 1559, "available": -1, "created": "2017-03-07T19:38:29.639628" }, { "site_id": 39, "decalgroup": "Staff", "total": 157, "available": -1, "created": "2017-03-07T19:38:29.658061" }, { "site_id": 40, "decalgroup": "Student", "total": 2500, "available": 2500, "created": "2017-03-07T19:38:29.664754" }, { "site_id": 40, "decalgroup": "Staff", "total": 0, "available": 0, "created": "2017-03-07T19:38:29.670462" }]

    function preProcessServiceData(data) {
        //console.log(JSON.stringify(data));

        var newData = [], newDataById = {};
        var garList = core.GetGarageList();

        if (!!garList) {
            garList = garList.GetKeyedList();
            var garItems = garList.GetKeyedItemList();
            for (var i in garItems) {
                var garItem = garItems[i], gard = garItem.GetData(), garg = gard.geometry, garp = gard.properties;
                var occItem = {
                    properties: {
                        garageItem: garItem,
                        parking_site_id: garp.parking_site_id,
                        identifier: garp.identifier,
                        available_01: undefined,
                        available_percentage_str: undefined,
                        available: 0,
                        total: 0,
                        items: []
                    },
                    geometry: {
                        type: 'point',
                        coordinates: garp.centroid
                    }
                }
                newDataById['' + occItem.properties.parking_site_id] = occItem;
                newData.push(occItem);
            }
        }

        var garItemsToUpdate = {}, ngarItemsToUpdate = 0;

        for (var i in data) {
            var d = data[i], id = d.site_id, idk = '' + id;
            var occData = newDataById[idk];
            if (!!occData) {
                var occp = occData.properties;
                occp.total += d.total;
                occp.available += d.available;
                occp.available_01 = occp.total > 0 ? occp.available / occp.total : 0;
                //occp.available_01 = Math.random();
                occp.available_percentage_str = getPercentStrFrom01(occp.available_01);
                var group_available_01 = d.total > 0 ? d.available / d.total : 0;
                occp.items.push({ decalGroup: d.decalgroup, total: d.total, available: d.available, available_01: group_available_01, available_percentage_str: getPercentStrFrom01(group_available_01) });
                var garKey = '' + occp.parking_site_id;
                if (garItemsToUpdate[garKey] == undefined) {
                    garItemsToUpdate[garKey] = occp.garageItem;
                    ++ngarItemsToUpdate;
                }
            }
        }

        if (ngarItemsToUpdate > 0) {
            setTimeout(function () {
                for (var i in garItemsToUpdate) {
                    garItemsToUpdate[i].NotifyUpdated();
                }
            }, 200);
        }

        return newData;
    }

    function initialize() {

        core = settings.core;

        //var serviceName = core.GetCanAdmin() ? 'garages/occupancyall' : 'garages/occupancy';

        var requestHeaders = core.GetParkingRequestHeaders();
        //var serviceName = 'http://xpect-itpa.cs.fiu.edu/sites/availabilities/';

        //var serviceName = 'http://xpect.cs.fiu.edu/sites/availabilities/';

        //var serviceName = 'http://xpect.cs.fiu.edu/itpaparkingsites/availabilities/';

        //serviceName = "http://localhost/oc/occupancy.txt";

        var serviceName = "http://xpect-itpa.cs.fiu.edu/sites/availabilities/";

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            //useRedirect: true,
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
