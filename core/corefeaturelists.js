"use strict";

ITPA.Map = {};

/**
* @this {ITPA.Map.CoreFeatureLists}
*/
ITPA.Map.CoreFeatureLists = function (settings) {

    var theThis = null;

    var lists = null;
    var core = null;
    var nListsCreated = 0, nListsToCreate = 0;

    this.GetCore = function () { return core ; }
    this.GetFeatureList = function (listName) { return getFeatureList(listName); }

    this.GetRouteList = function () { return getFeatureList(ITPA.Core.RouteListName); }
    this.GetBusList = function () { return getFeatureList(ITPA.Core.BusListName); }
    this.GetPlatformList = function () { return getFeatureList(ITPA.Core.PlatformListName); }
    this.GetMessageList = function () { return getFeatureList(ITPA.Core.MessageListName); }
    this.GetIncidentList = function () { return getFeatureList(ITPA.Core.IncidentListName); }
    this.GetGarageList = function () { return getFeatureList(ITPA.Core.GarageListName); }
    this.GetOccupancyList = function () { return getFeatureList(ITPA.Core.OccupancyListName); }
    this.GetDeviceList = function () { return getFeatureList(ITPA.Core.DeviceListName); }
    this.GetStreetSmartGraphList = function () { return getFeatureList(ITPA.Core.StreetSmartGraphListName); }

    this.ShowAllOnMap = function (map, showOrHideBool, styleName) { return showAllOnMap(map, showOrHideBool, styleName); }

    function getFeatureList(listName) { return !!lists[listName] ? lists[listName].list : null; }
    function setFeatureList(listName, list) { lists[listName] = { list: list } }

    function showAllOnMap(map, showOrHideBool, styleName) { for (var i in lists) { lists[i].list().ShowAllOnMap(map, showOrHideBool, styleName); } }

    /*function countRoutePoints() {
        var routeList = getFeatureList(ITPA.Core.RouteListName);
        var features = routeList.GetFeatures();
        var total = 0;

        for (var i in features) {
            var kf = features[i], mf = kf.GetMapFeature(), g = mf.GetGeom(), apiG = g.getAPIGeom();
            total += apiG.flatCoordinates.length;
        }

        tf.GetDebug().LogIfTest('Route points total: ' + total);
    }*/

    function onCreated() {
        var onCreated = tf.js.GetFunctionOrNull(settings.onCreated);

        //if (tf.platform.GetIsTest()) { countRoutePoints();  }

        if (!!onCreated) { onCreated(theThis); }
    }

    function checkAllListsCreated() { if (nListsCreated == nListsToCreate) { setTimeout(onCreated, 10); } }

    function onListCreated(theList) { ++nListsCreated; checkAllListsCreated(); }

    function createFeatureList(name, coreList, featureStyleSettings) {
        var layerName = core.GetLayerNameForListName(name);
        setFeatureList(name, new tf.map.KeyedFeatureList({
            layerName: layerName,
            keyedList: coreList.GetKeyedList(),
            featureStyleSettings: featureStyleSettings,
            onCreated: onListCreated
        }));
        if (tf.js.GetIsValidObject(settings.listeners)) {
            var featureList = getFeatureList(name);
            featureList.AddListeners(settings.listeners);
            if (tf.js.GetFunctionOrNull(settings.listeners[tf.consts.keyedFeaturesAddedEvent])) {
                featureList.NotifyFeaturesAdded(settings.listeners[tf.consts.keyedFeaturesAddedEvent]);
            }
        }
    }

    function initialize() {
        var featureListStyleSettings = typeof settings.featureListStyleSettings === "object" ? settings.featureListStyleSettings : {};

        core = settings.core;
        lists = [];

        var listNames = typeof settings.listNames === "object" ? settings.listNames : ITPA.Core.AllFeatureListNames;

        nListsCreated = 0;
        nListsToCreate = listNames.length;

        for (var i in listNames) {
            var thisListName = listNames[i];
            var createdList = false;

            if (core.GetIsFeatureListName(thisListName)) {
                var coreList = core.GetList(thisListName);

                if (!!coreList) {
                    createFeatureList(thisListName, coreList, featureListStyleSettings[thisListName]);
                    createdList = true;
                }
            }
            if (! createdList) { --nListsToCreate; checkAllListsCreated(); }
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
