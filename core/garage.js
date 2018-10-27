"use strict";

/**
* @this {ITPA.Core.GarageList}
*/
ITPA.Core.GarageList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList, authForm;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }
    this.GetLastTimeUpdated = function () { return keyedList.GetLastTimeUpdated();}

    this.Add = function (garageRecord, then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetServiceURL(core.GetGaragesAddServiceName());
            var payload = { authForm: authForm, garageRecord: garageRecord };
            var payloadStr = JSON.stringify(payload);
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = notification.data; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'parking_site_id'); }

    function needsUpdateItemData(updateObj) {
        var p = updateObj.itemData.properties;
        var newP = updateObj.itemDataSet.properties;
        if (p.is_active != newP.is_active || p.identifier != newP.identifier || p.total_level != newP.total_level || p.capacity != newP.capacity ||
            p.parking_site_type_id != newP.parking_site_type_id) {
            return true;
        }
        var g = updateObj.itemData.geometry;
        var newG = updateObj.itemDataSet.geometry;
        if ((g.coordinates == undefined && newG.coordinates != undefined) || (g.coordinates != undefined && newG.coordinates == undefined)) {
            return true;
        }
        if (g.coordinates != undefined && newG.coordinates != undefined) {
            var l = g.coordinates.length;
            var nl = newG.coordinates.length;
            if (l != nl) { return true; }
            if (l == nl && l == 1) {
                var c = g.coordinates[0], nc = newG.coordinates[0];
                if (c != undefined && nc != undefined) {
                    l = c.length;
                    nl = nc.length;
                    if (l != nl) { return true; }
                    for (var i = 0 ; i < l ; ++i) {
                        var cc = c[i];
                        var ncc = nc[i];
                        if (cc != undefined && ncc != undefined) {
                            if (cc.length == 2 && ncc.length == 2) {
                                if (cc[0] != ncc[0] || cc[1] != ncc[1]) {
                                    return true;
                                }
                            } else { break; }
                        } else { break; }
                    }
                }
            }
        }
        return false;
    }

    function filterAddItem(itemData) {
        /*var accept = false;

        if (!!itemData) {
            try { accept = itemData.geometry.coordinates[0][0][0]!=0; } catch (e) { accept = false; }
            try { if (!accept) { core.Log('garage with invalid coordinates rejected "' + itemData.properties.parking_site_id + '" ' + itemData.properties.description); } } catch(e) {}
        }

        if (accept) { itemData.properties.center = tf.helpers.CalcAverageCoordinates(itemData.geometry.coordinates[0], true); }

        return accept;*/
        return true;
    }

    function preProcessServiceData(data) {
        data = core.GetFeatureListFromData(data);
        if (!!data) {
            data.sort(function (a, b) {
                var pa = a.properties;
                var pb = b.properties;
                return pa.identifier < pb.identifier ? -1 : (pa.identifier == pb.identifier ? 0 : 1);
            });
        }
        return data;
    }

    function initialize() {
        core = settings.core;
        authForm = core.GetAuthForm();

        //var serviceName = core.GetCanAdmin() ? 'garages/all' : 'garages';

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetFullGaragesServiceName(),//core.GetServiceURL(serviceName),
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 0,
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

