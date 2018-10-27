"use strict";

/**
* @this {ITPA.Core.RouteList}
*/
ITPA.Core.RouteList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList, settingsRefreshCallback, routesByLineNumber, authForm;
    var refreshEventName = "refresh", preRefreshEventName = "prerefresh";
    var eventDispatcher, canAdmin;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }

    this.AddRefreshListener = function (callBack) { return eventDispatcher.AddListener(refreshEventName, callBack); }
    this.AddPreRefreshListener = function (callBack) { return eventDispatcher.AddListener(preRefreshEventName, callBack); }

    this.UpdateLines = function (updateRecord, then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetServiceURL(core.GetRouteLinesUpdateServiceName());
            var payload = { authForm: authForm, update_record: updateRecord };
            var payloadStr = JSON.stringify(payload);
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = notification.data; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    this.UpdateStops = function (updateRecord, then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetServiceURL(core.GetRouteStopsUpdateServiceName());
            var payload = { authForm: authForm, update_record: updateRecord };
            var payloadStr = JSON.stringify(payload);
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = notification.data; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    this.LoadRoutes = function (then) {
        if (tf.js.GetFunctionOrNull(then)) {
            var url = core.GetFullRoutesServiceName();
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification) { data = notification.data; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, undefined);
        }
    }

    function notify(eventName) { eventDispatcher.Notify(eventName, { sender: theThis }); }

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'line_id'); }

    function refreshCallback(theList) {
        notify(refreshEventName);
        if (!!settingsRefreshCallback) { settingsRefreshCallback(theThis); }
    }

    function needsUpdateItemData(updateObj) { return true; }

    function preProcessServiceData(data) {
        //data = core.GetFeatureListFromData(data);
        notify(preRefreshEventName);
        if (canAdmin) {
            data = core.GetDataFromArray(data);
            if (!!data) {
                var polyCode = new tf.map.PolyCode();
                for (var i in data) {
                    var d = data[i]; d.properties = d;
                    d.geometry = polyCode.ToGeoJSONMultiLineString(JSON.parse(d.shape_sm_c), 7);
                    d.largeGeometry = polyCode.ToGeoJSONMultiLineString(JSON.parse(d.shape_c), 7);
                    d.nPointsGeometry = tf.js.CountMLSPoints(d.geometry);
                    d.nPointsLargeGeometry = tf.js.CountMLSPoints(d.largeGeometry);
                    d.nPointsSmallToLarge = d.nPointsLargeGeometry > 0 ? d.nPointsGeometry / d.nPointsLargeGeometry : 1;
                }
            }
        }
        else {
            data = core.GetFeatureListFromData(data);
        }
        return data;
    }

    function initialize() {

        core = settings.core;

        authForm = core.GetAuthForm();

        canAdmin = core.GetCanAdmin();

        settingsRefreshCallback = tf.js.GetFunctionOrNull(settings.refreshCallback);

        eventDispatcher = new tf.events.MultiEventNotifier({ eventNames: [refreshEventName, preRefreshEventName] });

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetListFullRoutesServiceName(),
            preProcessServiceData: preProcessServiceData,
            refreshCallback: refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 0,
            keyedLists: [{
                name: settings.listName,
                getKeyFromItemData: getKeyFromItemData,
                needsUpdateItemData: needsUpdateItemData
            }]
        })).GetKeyedList(settings.listName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
