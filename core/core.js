"use strict";

ITPA.Core = {};

ITPA.Core.RouteListName = "route";
ITPA.Core.PlatformListName = "platform";
ITPA.Core.BusListName = "bus";
ITPA.Core.MessageListName = "message";
ITPA.Core.IncidentListName = "incident";
ITPA.Core.GarageListName = "garage";
ITPA.Core.OccupancyListName = "occupancy";
ITPA.Core.DeviceListName = "device";
ITPA.Core.UserListName = "user";

ITPA.Core.ETAListName = "eta";
ITPA.Core.ServiceListName = "service";
ITPA.Core.NotificationListName = "notification";
ITPA.Core.BusFeedListName = "busfeed";
ITPA.Core.PkRecommendationListName = "pkrecommendation";
ITPA.Core.PkLastEventListName = "pklastevent";
ITPA.Core.StreetSmartGraphListName = "streetsmartgraph";

ITPA.Core.AllListNames = [
    ITPA.Core.GarageListName,
    ITPA.Core.RouteListName,
    ITPA.Core.PlatformListName,
    ITPA.Core.BusListName,
    ITPA.Core.MessageListName,
    ITPA.Core.IncidentListName,
    ITPA.Core.ETAListName,
    ITPA.Core.OccupancyListName,
    ITPA.Core.NotificationListName,
    ITPA.Core.BusFeedListName,
    ITPA.Core.PkRecommendationListName,
    ITPA.Core.PkLastEventListName,
    ITPA.Core.StreetSmartGraphListName
];

ITPA.Core.AllFeatureListNames = [
    ITPA.Core.GarageListName,
    ITPA.Core.RouteListName,
    ITPA.Core.PlatformListName,
    ITPA.Core.BusListName,
    ITPA.Core.MessageListName,
    ITPA.Core.IncidentListName,
    ITPA.Core.OccupancyListName,
    ITPA.Core.StreetSmartGraphListName
];

ITPA.Core.APIVersion = 5;

ITPA.Core.GetJSONFromXMLServiceWithRedirect = function (then, url, optionalScope) {
    if (!!(then = tf.js.GetFunctionOrNull(then))) {
        new tf.ajax.GetRequest({
            onDataLoaded: function (notification) {
                var httpRequest = notification.httpRequest;
                if (httpRequest.status == 200 && !!httpRequest.responseXML) {
                    var data = tf.helpers.XML2Object(httpRequest.responseXML.documentElement);
                    if (!!data) { then.call(optionalScope, data, url); }
                }
            },
            optionalScope: optionalScope, url: url, autoSend: true, useRedirect: true
        });
    }
}

ITPA.Core.GetOccupancyPercentage01 = function(bus_number_of_occupants) {
    var ocp;

    if (bus_number_of_occupants != undefined && bus_number_of_occupants != 0) {
        if (bus_number_of_occupants > 1000) {
            var occupants = bus_number_of_occupants % 1000;
            var capacity = Math.floor(bus_number_of_occupants / 1000);
            if (capacity > 0) { ocp = occupants / capacity; }
        }
        else { ocp = bus_number_of_occupants / 1000; }
    }
    return ocp;
}

ITPA.Core.MakeLineDirectionAbreviations = function () {
    var order = 0, lineDirections = {};
    lineDirections["eastbound"] = { ab: "EB", order: ++order };
    lineDirections["westbound"] = { ab: "WB", order: ++order };
    lineDirections["northbound"] = { ab: "NB", order: ++order };
    lineDirections["southbound"] = { ab: "SB", order: ++order };
    lineDirections["clockwise"] = { ab: "CW", order: ++order };
    lineDirections["cntrclockwise"] = { ab: "CC", order: ++order };
    lineDirections["loop"] = { ab: "LP", order: ++order };
    return lineDirections;
}

ITPA.Core.MakeAuthForm = function (email, password) { return { apiversion: ITPA.Core.APIVersion, email: email, password: password }; }

ITPA.Core.GetBusLineLabel = function(lineIdentifier) {
    if (tf.js.GetIsNonEmptyString(lineIdentifier)) {
        var firstChar = lineIdentifier[0];
        if (firstChar >= '0' && firstChar <= '9') {
            lineIdentifier = lineIdentifier.split(' ')[0];
        }
        else {
            if (lineIdentifier[0] == 'C') { lineIdentifier = "CATS"; }
            else {
                var split = lineIdentifier.split(' ');
                lineIdentifier = split[0] + split[1][0];
            }
        }
    }
    return lineIdentifier;
}

ITPA.Core.GetAMPMHour = function (itpaDateStamp) {
    if (tf.js.GetIsStringWithMinLength(itpaDateStamp, 21)) {
        var str = itpaDateStamp.substring(11, 11 + 5);
        var hourStr = str.substring(0, 2);
        var hour = parseInt(hourStr, 10);
        var minStr = str.substring(3, 5);
        var ispm = hour > 12;
        var ampm = ispm ? ' pm' : ' am';
        hourStr = ispm ? hour - 12 : hour;
        return hourStr + ':' + minStr + ampm;
    }
    return '??:??';
}

/**
* @this {ITPA.Core.Core}
*/
ITPA.Core.Core = function (settings) {

    var theThis, debug, authForm;
    var defaultServerURL, defaultServerServicesURL;
    var mapExtent;
    var lists, serverURL, serverServicesURL, mapLayerSourceURL, initCallback;
    var allListTypes, secondTierCreate, nListsCreated, nListsToCreate;
    var hasServices, isFeatureListByName, canAdmin;

    this.GetParkingRequestHeaders = function () {
        return { "Authorization": "Token 1f691ebd8e5932dc6b925ed0c80430588b7d3fac", "Accept": "application/json" };
    }

    this.GetCanAdmin = function() { return canAdmin; }

    this.GetLayerNameForListName = function(listName) {
        var layerName;

        switch (listName) {
            case ITPA.Core.StreetSmartGraphListName:
                layerName = theThis.GetStreetSmartGraphLayerName();
                break;
            case ITPA.Core.GarageListName:
                layerName = theThis.GetGarageLayerName();
                break;
            case ITPA.Core.IncidentListName:
                layerName = theThis.GetIncidentLayerName();
                break;
            case ITPA.Core.MessageListName:
                layerName = theThis.GetMessageLayerName();
                break;
            case ITPA.Core.PlatformListName:
                layerName = theThis.GetPlatformLayerName();
                break;
            case ITPA.Core.OccupancyListName:
                layerName = theThis.GetOccupancyLayerName();
                break;
            case ITPA.Core.DeviceListName:
                layerName = theThis.GetDevicesLayerName();
                break;
            case ITPA.Core.BusListName:
                layerName = theThis.GetBusLayerName();
                break;
            case ITPA.Core.RouteListName:
                layerName = theThis.GetRouteLayerName();
                break;
            default:
                layerName = listName;
                break;
        }
        return layerName;
    }

    this.GetDevicesLayerName = function () { return "devices"; }
    this.GetBusLayerName = function () { return "buses"; }
    this.GetRouteLayerName = function () { return "bus routes"; }
    this.GetGarageLayerName = function () { return "parking sites"; }
    this.GetIncidentLayerName = function () { return "FHP incidents"; }
    this.GetMessageLayerName = function () { return "FL511 messages"; }
    this.GetPlatformLayerName = function () { return "bus stops"; }

    this.GetOccupancyLayerName = function () { return "parking site names"; }
    this.GetStreetSmartGraphLayerName = function () { return "on street parking";}

    this.Log = function (logStr) { return log(logStr); }

    this.GetServerURL = function () { return serverURL; }
    this.GetServiceURL = function (serviceName) { return theThis.GetServerURL() + serviceName; }
    this.GetMVideoServerURL = function () { return settings.mvideoServerURL; }
    this.GetGaragesAddServiceName = function () { return "garages/add"; }
    this.GetRouteStopsUpdateServiceName = function () { return "routes/updatestops"; }
    this.GetRouteLinesUpdateServiceName = function () { return "routes/updatelines"; }

    this.GetBusesServiceName = function () { return 'buses'; }
    this.GetFullBusesServiceName = function () { return theThis.GetServiceURL(theThis.GetBusesServiceName()); }

    this.GetRoutesServiceName = function () { return 'routes'; }
    this.GetFullRoutesServiceName = function () { return theThis.GetServiceURL(theThis.GetRoutesServiceName()); }

    this.GetRoutesLargeServiceName = function() { return 'routes/large'; }
    this.GetFullRoutesLargeServiceName = function () { return theThis.GetServiceURL(theThis.GetRoutesLargeServiceName()); }

    this.GetRoutesLargeCompressedServiceName = function () { return 'routes/largec'; }
    this.GetFullRoutesLargeCompressedServiceName = function () { return theThis.GetServiceURL(theThis.GetRoutesLargeCompressedServiceName()); }

    this.GetRoutesAllShapesCompressedServiceName = function () { return 'routes/allshapes'; }
    this.GetFullRoutesAllShapesCompressedServiceName = function () { return theThis.GetServiceURL(theThis.GetRoutesAllShapesCompressedServiceName()); }

    this.GetListRoutesServiceName = function () { return canAdmin ? theThis.GetRoutesAllShapesCompressedServiceName() : theThis.GetRoutesServiceName(); }
    this.GetListFullRoutesServiceName = function () { return theThis.GetServiceURL(theThis.GetListRoutesServiceName()); }

    this.GetPlatformsServiceName = function () { return 'platforms'; }
    this.GetFullPlatformsServiceName = function () { return theThis.GetServiceURL(theThis.GetPlatformsServiceName()); }

    this.GetGaragesServiceName = function () { return canAdmin ? 'garages/all' : 'garages'; }
    this.GetFullGaragesServiceName = function () { return theThis.GetServiceURL(theThis.GetGaragesServiceName()); }

    this.GetBusesEtasServiceName = function () { return 'buses/etas'; }
    this.GetFullBusesEtasServiceName = function () { return theThis.GetServiceURL(theThis.GetBusesEtasServiceName()); }

    this.GetMessagesServiceName = function () { return 'messages'; }
    this.GetFullMessagesServiceName = function () { return theThis.GetServiceURL(theThis.GetMessagesServiceName()); }

    this.GetIncidentsServiceName = function () { return 'incidents'; }
    this.GetFullIncidentsServiceName = function () { return theThis.GetServiceURL(theThis.GetIncidentsServiceName()); }

    this.GetHasServices = function () { return hasServices; }

    this.GetAuthForm = function () { return authForm; }
    this.SetAuthForm = function (email, password) { authForm.email = email; authForm.password = password; }

    this.GetServerServicesURL = function () { return serverServicesURL; }
    this.GetServerServicesServiceURL = function (serviceName) { return theThis.GetServerServicesURL() + serviceName; }

    this.GetMapLayerSourceURL = function () { return mapLayerSourceURL; }

    this.GetMapExtent = function () { return mapExtent; }

    this.GetList = function (listName) { return getList(listName); }

    this.GetRouteList = function () { return getList(ITPA.Core.RouteListName); }
    this.GetBusList = function () { return getList(ITPA.Core.BusListName); }
    this.GetPlatformList = function () { return getList(ITPA.Core.PlatformListName); }
    this.GetMessageList = function () { return getList(ITPA.Core.MessageListName); }
    this.GetIncidentList = function () { return getList(ITPA.Core.IncidentListName); }
    this.GetGarageList = function () { return getList(ITPA.Core.GarageListName); }
    this.GetOccupancyList = function () { return getList(ITPA.Core.OccupancyListName); }
    this.GetDeviceList = function () { return getList(ITPA.Core.DeviceListName); }
    this.GetUserList = function () { return getList(ITPA.Core.UserListName); }
    this.GetNotificationList = function () { return getList(ITPA.Core.NotificationListName); }
    this.GetBusFeedList = function () { return getList(ITPA.Core.BusFeedListName); }
    this.GetPkRecommendationList = function () { return getList(ITPA.Core.PkRecommendationListName); }
    this.GetPkLastEventList = function () { return getList(ITPA.Core.PkLastEventListName); }

    this.GetETAList = function () { return getList(ITPA.Core.ETAListName); }
    this.GetServiceList = function () { return getList(ITPA.Core.ServiceListName); }

    this.GetStreetSmartGraphList = function () { return getList(ITPA.Core.StreetSmartGraphListName); }

    this.GetIsFeatureListName = function (name) { return tf.js.GetIsNonEmptyString(name) && isFeatureListByName[name]; }

    this.IsCoordInsideExtent = function (coords) { return tf.js.GetExtentContainsCoord(mapExtent, coords); }

    this.IsPointFeatureInsideExtent = function (data) {
        var isInside = false;

        try {
            var geometry = !!data ? data.geometry : null;

            if (!!geometry) {
                if (geometry.type.toLowerCase() === "point") {
                    isInside = theThis.IsCoordInsideExtent(geometry.coordinates);
                }
            }
        }
        catch (e) { isInside = false; }

        return isInside;
    }

    this.GetDataFromArray = function (data) { return tf.js.GetIsArray(data) ? data : null; }
    this.GetFeatureListFromData = function (data) { return !!data ? !!data.features ? data.features : tf.js.GetIsArray(data) ? theThis.GetFeatureListFromData(data[0]) : null : null; }
    this.GetKeyFromItemDataProperties = function (itemData, keyName) { return tf.js.GetIsValidObject(itemData) ? tf.js.GetObjProperty(itemData.properties, keyName) : null; }

    function getList(listName) { return !!lists[listName] ? lists[listName].list : null; }
    function setList(listName, list) { lists[listName] = { list: list } }

    function createCoreList(listName, listType, onCreated) { return setList(listName, new listType({ core: theThis, listName: listName, onCreated: onCreated })); }

    function notifyInitDone() { if (!!initCallback) { var savedInitCallBack = initCallback; initCallback = null; savedInitCallBack(theThis); } }

    function setNotifyDoneTimeout() { setTimeout(notifyInitDone, 10); }

    function checkAllSecondTierListsCreated() { if (nListsCreated == nListsToCreate) { setNotifyDoneTimeout(); } }
    function onSecondTierListCreated(theList) { ++nListsCreated; checkAllSecondTierListsCreated(); }

    function createSecondTierLists() {
        if (!!(nListsToCreate = secondTierCreate.length)) {
            nListsCreated = 0;

            for (var i in secondTierCreate) {
                var listName = secondTierCreate[i]; var listType = allListTypes[listName];  createCoreList(listName, listType.type, onSecondTierListCreated);
            }
        }
        else { setNotifyDoneTimeout(); }
    }

    function checkAllFirstTierListsCreated() { if (nListsCreated == nListsToCreate) { createSecondTierLists(); } }
    function onFirstTierListCreated(theList) { ++nListsCreated; checkAllFirstTierListsCreated(); }

    function initListTypes() {
        allListTypes = {};
        allListTypes[ITPA.Core.RouteListName] = { type: ITPA.Core.RouteList };
        allListTypes[ITPA.Core.BusListName] = { type: ITPA.Core.BusList };
        allListTypes[ITPA.Core.PlatformListName] = { type: ITPA.Core.PlatformList };
        allListTypes[ITPA.Core.MessageListName] = { type: ITPA.Core.MessageList };
        allListTypes[ITPA.Core.IncidentListName] = { type: ITPA.Core.IncidentList };
        allListTypes[ITPA.Core.GarageListName] = { type: ITPA.Core.GarageList };
        allListTypes[ITPA.Core.OccupancyListName] = { type: ITPA.Core.OccupancyList };
        allListTypes[ITPA.Core.DeviceListName] = { type: ITPA.Core.DeviceList };
        allListTypes[ITPA.Core.UserListName] = { type: ITPA.Core.UserList };
        allListTypes[ITPA.Core.NotificationListName] = { type: ITPA.Core.NotificationList };
        allListTypes[ITPA.Core.BusFeedListName] = { type: ITPA.Core.BusFeedList };
        allListTypes[ITPA.Core.PkRecommendationListName] = { type: ITPA.Core.PkRecommendationList };
        allListTypes[ITPA.Core.PkLastEventListName] = { type: ITPA.Core.PkLastEventList };
        allListTypes[ITPA.Core.ETAListName] = { type: ITPA.Core.ETAList };
        allListTypes[ITPA.Core.StreetSmartGraphListName] = { type: ITPA.Core.StreetSmartList };

        if (hasServices) { allListTypes[ITPA.Core.ServiceListName] = { type: ITPA.Core.ServiceList }; }
    }

    function createLists() {
        var listNames = typeof settings.listNames === "object" ? settings.listNames : ITPA.Core.AllListNames;
        var secondTierCreateNames = {};

        initListTypes();
        secondTierCreate = [];
        lists = [];

        secondTierCreateNames[ITPA.Core.ETAListName] = true;

        if (!!(nListsToCreate = listNames.length)) {
            nListsCreated = 0;

            for (var i in listNames) {
                var listName = listNames[i];
                var listType = allListTypes[listName];
                var listCreated = false;

                if (!!listType) {
                    if (secondTierCreateNames[listName]) { secondTierCreate.push(listName); }
                    else { listCreated = true; createCoreList(listName, listType.type, onFirstTierListCreated); }
                }
                if (!listCreated) { --nListsToCreate; checkAllFirstTierListsCreated(); }
            }
            checkAllFirstTierListsCreated();
        }
        else { setNotifyDoneTimeout(); }
    }

    function getValidServerURL(serverURL, defaultServerURL) { return typeof serverURL === "string" && serverURL.length > 0 ? serverURL : defaultServerURL; }

    function initServerURL(serverURLSet, serverServicesURLSet) {
        serverURL = getValidServerURL(serverURLSet);
        if (hasServices = !!(serverServicesURL = !!serverServicesURLSet ? getValidServerURL(serverServicesURLSet, defaultServerServicesURL) : null)) {
            ITPA.Core.AllListNames.push(ITPA.Core.ServiceListName);
        }
    }

    function log(logStr) { if (!!debug) { debug.LogIfTest(logStr); } }

    function afterCheckLogin() {

        if (canAdmin) {
            ITPA.Core.AllListNames.push(ITPA.Core.DeviceListName);
            ITPA.Core.AllListNames.push(ITPA.Core.UserListName);
            ITPA.Core.AllFeatureListNames.push(ITPA.Core.DeviceListName);
        }
        //else { return; }

        isFeatureListByName = {};

        for (var i in ITPA.Core.AllFeatureListNames) {
            isFeatureListByName[ITPA.Core.AllFeatureListNames[i]] = true;
        }

        initCallback = tf.js.GetFunctionOrNull(settings.initCallBack);

        if (tf.js.GetFunctionOrNull(settings.onCanAdminCallBack)) { setTimeout(function () { settings.onCanAdminCallBack(theThis); }, 10); }

        createLists();
    }

    function checkLogin() {
        try {
            var url = theThis.GetServiceURL('users/ca');
            var payloadStr = JSON.stringify(authForm);
            new tf.ajax.JSONGet().Request(url, function (notification) {
                canAdmin = tf.js.GetIsValidObject(notification) && tf.js.GetIsValidObject(notification.data) && notification.data.status == true;
                afterCheckLogin();
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
        catch (Exception) { canAdmin = false; afterCheckLogin(); }
    }

    function initialize() {
        //debug = tf.GetDebug();

        authForm = ITPA.Core.MakeAuthForm(settings.email, settings.password);

        defaultServerURL = 'http://utma-api.cs.fiu.edu/api/v1/';
        defaultServerServicesURL = defaultServerURL;

        initServerURL(settings.serverURL, settings.serverServicesURL);

        //mapExtent = [-80.497512, 25.634097, -80.047760, 26.072819];
        mapExtent = [-80.6, 25.2, -80.0, 26.2];

        nListsCreated = nListsToCreate = 0;

        checkLogin();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
