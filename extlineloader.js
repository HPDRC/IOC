"use strict";

tf.js.CapitalizeMethod1 = function (stringToChange) {
    return stringToChange.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

ITPA.OC.ExtLineLoader = function (settings) {
    var theThis, oc, core, extLineKeyedList, onRefreshCB;
    var isRefreshing, newLineDataList, fiuLinesAreLoaded;
    var MDTServiceAPI;
    var errorLoadingFIU, errorLoadingMDT;

    this.GetHasErrors = function () { return theThis.GetHasFIUErrors() || theThis.GetHasMDTErrors(); }
    this.GetHasFIUErrors = function () { return errorLoadingFIU; }
    this.GetHasMDTErrors = function () { return errorLoadingMDT; }

    this.Refresh = function () { return refresh(); }
    this.GetIsRefreshing = function () { return isRefreshing; }

    this.GetExtLineItemForITPALineItem = function (ITPALineItem) { return getExtLineFor(ITPALineItem); }
    this.GetExtLineKeyForITPALineItem = function (ITPALineItem) { return getExtLineKeyFor(ITPALineItem); }

    this.GetExtLineKeyedList = function () { return extLineKeyedList; }

    function getExtLineFor(ITPALineItem) { return extLineKeyedList.GetItem(getExtLineKeyFor(ITPALineItem)) }

    function makeExtLineKey(fleet, fleet_id) { return fleet + '$' + fleet_id; }

    function getExtLineKeyFor(ITPALineItem) { var extLineKey; if (!!ITPALineItem) { var d = ITPALineItem.GetData(), p = d.properties; extLineKey = makeExtLineKey(p.fleet.toLowerCase(), p.fleet_id); } return extLineKey; }

    function loadExtFIULines() {
        var url = "http://feeds.transloc.com/3/routes.json?agencies=571";
        new tf.ajax.JSONGet().Request(url, function (notification) {
            var data = notification.data;
            //console.log(JSON.stringify(data));
            if (!!data && !!data.success && tf.js.GetIsNonEmptyArray(data = data.routes)) {
                /*var sample = {
                    "routes": [{
                        "agency_id": 571, "bounds": [25.752641, -80.37271, 25.769972, -80.368313],
                        "color": "aa6b19", "description": "", "id": 4005562,
                        "is_active": true, "long_name": "CATS Shuttle", "short_name": "CATS",
                        "text_color": "FFFFFF", "type": "bus", "url": ""
                    }],
                    "success": true
                };*/

                /* old identifiers: GPE Palmetto, GPE Dolphin, CATS Shuttle, GPE Turnpike */

                var nData = data.length;
                var shuttleSuffix = ' Shuttle';

                for (var i = 0 ; i < nData ; ++i) {
                    var d = data[i];
                    var fleet = 'fiu', fleet_id = '' + d.id;
                    var color = '#' + d.color;
                    var direction = 'Loop';
                    var extLineKey = makeExtLineKey(fleet, fleet_id);
                    var identifier = tf.js.GetNonEmptyString(d.long_name, "");
                    var extLineData = { fleet: fleet, fleet_id: fleet_id, identifier: identifier, color: color, direction: direction, extLineKey: extLineKey, isFIU: true };
                    newLineDataList.push(extLineData);
                    //console.log(JSON.stringify(extLineData));
                }
            }
            else {
                errorLoadingFIU = true;
                console.log('failed to load data from transloc service');
            }
            fiuLinesAreLoaded = true;
            checkRefreshEnded();
        }, theThis, undefined, false, undefined, undefined, undefined);
    }

    function loadExtMDTLineDirections(extLineData) {
        if (!!extLineData) {
            MDTServiceAPI.GetDirectionsForRouteId(extLineData.fleet_id, function (data) {
                //console.log(JSON.stringify(data));
                data = (!!data && !!data.Record) ? data.Record : undefined;
                if (!!data) {
                    //var sampleArray = { "Record": [{ "RouteID": "7", "Direction": "Eastbound" }, { "RouteID": "7", "Direction": "Westbound" }] };
                    //var sampleSingleObject = {"Record":{"RouteID":"9006","Direction":"Loop"}};
                    if (!tf.js.GetIsNonEmptyArray(data)) { data = [data]; }
                    for (var i in data) {
                        var d = data[i], direction = d.Direction;
                        if (tf.js.GetIsNonEmptyString(direction)) {
                            var newLineData = tf.js.ShallowMerge(extLineData);
                            newLineData.direction = direction;
                            newLineDataList.push(newLineData);
                        }
                    }
                }
                else {
                    errorLoadingMDT = true;
                    console.log('failed to load directions for line ' + extLineData.fleet_id + ' from MDT service');
                }
                checkRefreshEnded();
            });
        }
    }

    function loadExtMDTLines() {
        MDTServiceAPI.GetBusRoutes(function (data) {
            if (!!data && tf.js.GetIsNonEmptyArray(data = data.Record)) {
                /*var sample = {
                    "RouteID": "102", "RouteAlias": "102 Route B",
                    "RouteAliasLong": "B-BRICKELL STATION-KEY BISCAYNE",
                    "RouteDescription": "Brickell Metrorail station, Brickell Business District, Rickenbacker Causeway, Miami Seaquarium, Crandon Park, Village of Key Biscayne, Cape Florida State Park",
                    "RouteColor": "FF0000", "Bike": "T", "Wheelchair": "T", "Metrorail": "T", "Airport": "F", "SortOrder": "102"
                };*/
                for (var i in data) {
                    var d = data[i];
                    var fleet = 'mdt', fleet_id = '' + d.RouteID;
                    var identifier = d.RouteAlias, color = '#' + d.RouteColor;
                    var extLineKey = makeExtLineKey(fleet, fleet_id);

                    /*var spaceIndex = identifier.indexOf(' ');
                    if (spaceIndex < 1) {
                        identifier = fleet_id + ' ' + d.RouteAliasLong;
                    }*/

                    identifier = d.RouteAliasLong;

                    var extLineData = { fleet: fleet, fleet_id: fleet_id, identifier: identifier, color: color, extLineKey: extLineKey, isFIU: false };
                    loadExtMDTLineDirections(extLineData);
                }
            }
            else {
                errorLoadingMDT = true;
                console.log('failed to load bus routes from from MDT service');
            }
            checkRefreshEnded();
        });
    }

    function onRefreshEnd() {
        extLineKeyedList.UpdateFromNewData(newLineDataList);
        newLineDataList = [];
    }

    function checkRefreshEnded() {
        if (isRefreshing && fiuLinesAreLoaded && !MDTServiceAPI.GetHasRequestsPending()) {
            onRefreshEnd();
            isRefreshing = false;
            if (onRefreshCB) { onRefreshCB({ sender: theThis }); }
            //console.log('refresh ended');
        }
        return !isRefreshing;
    }

    function refresh() {
        isRefreshing = true;
        newLineDataList = [];
        errorLoadingFIU = errorLoadingMDT = fiuLinesAreLoaded = false;
        loadExtFIULines();
        loadExtMDTLines();
    }

    function initialize() {
        oc = settings.oc;
        core = oc.GetCore();
        onRefreshCB = tf.js.GetFunctionOrNull(settings.onRefresh);
        MDTServiceAPI = new tf.services.MDTServiceAPI({});
        isRefreshing = false;
        extLineKeyedList = new tf.js.KeyedList({
            name: "extlines",
            getKeyFromItemData: function (data) { return !!data ? data.extLineKey : undefined },
            filterAddItem: function (itemData) { return true; },
            needsUpdateItemData: function (updateObj) { return true; }
        });
        refresh();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
