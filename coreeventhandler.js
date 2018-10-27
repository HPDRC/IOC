"use strict";

/**
* @this {ITPA.OC.CoreEventHandler}
*/
ITPA.OC.CoreEventHandler = function (settings) {

    var theThis, oc, core, coreFeatureLists, appStyles, appLayout, maps, smallMap, largeMap, mapEventHandler;
    var deviceFeatureStyles, busFeatureStyles, platformFeatureStyles, garageFeatureStyles, occupancyFeatureStyles;
    var coreOccupancyList, coreETAList, coreServiceList, coreDeviceList, coreBusList, corePlatList, coreBusFeedList;
    var coreDeviceService, coreBusService, corePlatService, coreOccupancyService, busETAService, platformETAService, coreETAService, coreServiceService;
    var coreBusFeedService;

    function onCoreOccupancyItemsUpdated(notification) {
        var garageFeatureList = coreFeatureLists.GetGarageList();
        var occupancyFeatureList = coreFeatureLists.GetOccupancyList();
        var keys = notification.keys;

        if (!!garageFeatureList) { garageFeatureList.RefreshStyle(keys, appStyles.MapFeatureStyleNames); }
        if (!!occupancyFeatureList) { occupancyFeatureList.RefreshStyle(keys, appStyles.MapFeatureStyleNames); }
    }

    //repurposed
    function updateBusOfPlatformETAFeatures(listName, busOrPlatformFeatureList, featureStyles, keys) {
        if (!!busOrPlatformFeatureList) {
            if (keys.length) {
                var mapsFlash = [smallMap];
                if (maps.IsLargeMapLayerVisible(listName)) { mapsFlash.push(largeMap); }
                featureStyles.FlashETAChanged(keys, mapsFlash);
                busOrPlatformFeatureList.RefreshStyle(keys, appStyles.MapFeatureStyleNames);
                /*var itemCoreList = core.GetList(listName);
                if (itemCoreList) {
                    itemCoreList.GetKeyedList().NotifyItemsUpdatedByKeys(keys);
                }*/
            }
        }
    }

    //deprecated
    var onBusOrPlatformETAItemsUpdatedTimer;
    function onBusOrPlatformETAItemsUpdated(listName, busOrPlatformFeatureList, featureStyles, keys) {
        if (!onBusOrPlatformETAItemsUpdatedTimer) {
            var updateFunction = function (listName, list, styles, keys) {
                return function () {
                    updateBusOfPlatformETAFeatures(listName, list, styles, keys);
                    onBusOrPlatformETAItemsUpdatedTimer = undefined;
                }
            }(listName, busOrPlatformFeatureList, featureStyles, keys);
            onBusOrPlatformETAItemsUpdatedTimer = setTimeout(updateFunction, 100);
        }
    }

    //deprecated
    var onBusETAItemsUpdatedTimer;
    function onBusETAItemsUpdated(notification) {
        if (!onBusETAItemsUpdatedTimer) {
            onBusETAItemsUpdatedTimer = setTimeout(function () {
                var featureTables = oc.GetFeatureTables();
                if (!!featureTables) { featureTables.OnBusETAItemsUpdated(notification); }
                if (appStyles.FlashBusesOnETAChange) { onBusOrPlatformETAItemsUpdated(ITPA.Core.BusListName, coreFeatureLists.GetBusList(), busFeatureStyles, notification.keys); }
                mapEventHandler.OnBusETAItemsUpdated(notification);
                onBusETAItemsUpdatedTimer = undefined;
            }, 100);
        }
    }

    //deprecated
    var onPlatformETAItemsUpdated;
    function onPlatformETAItemsUpdated(notification) {
        //console.log('etadebug onPlatformETAItemsUpdated');
        if (appStyles.FlashPlatformsOnETAChange) {
            onBusOrPlatformETAItemsUpdated(ITPA.Core.PlatformListName, coreFeatureLists.GetPlatformList(), platformFeatureStyles, notification.keys);
        }
        if (!onPlatformETAItemsUpdated) {
            onPlatformETAItemsUpdated = setTimeout(function () {
                mapEventHandler.OnStopETAItemsUpdated(notification);
                onPlatformETAItemsUpdated = undefined;
            }, 100);
        }
    }

    function onCoreServiceItemsUpdated(notification) {
        var items = notification.items;
        appLayout.UpdateServices(items);
    }

    // single refresh point for eta changes
    function onCoreETAItemsUpdated(notification) {
        var nETAs = coreETAList.GetNETAs(), nStopETAs = coreETAList.GetNStopETAs();
        appLayout.SetStopsCounter(nStopETAs);
        appLayout.SetETAsCounter(nETAs);

        if (appStyles.FlashBusesOnETAChange) {
            var busList = coreFeatureLists.GetBusList();
            updateBusOfPlatformETAFeatures(ITPA.Core.BusListName, busList, busFeatureStyles, notification.addBusIds);
            updateBusOfPlatformETAFeatures(ITPA.Core.BusListName, busList, busFeatureStyles, notification.updateBusIds);
            updateBusOfPlatformETAFeatures(ITPA.Core.BusListName, busList, busFeatureStyles, notification.delBusIds);
        }

        if (appStyles.FlashPlatformsOnETAChange) {
            var stopsList = coreFeatureLists.GetPlatformList()
            updateBusOfPlatformETAFeatures(ITPA.Core.PlatformListName, stopsList, platformFeatureStyles, notification.addStopIds);
            updateBusOfPlatformETAFeatures(ITPA.Core.PlatformListName, stopsList, platformFeatureStyles, notification.updateStopIds);
            updateBusOfPlatformETAFeatures(ITPA.Core.PlatformListName, stopsList, platformFeatureStyles, notification.delStopIds);
        }

        mapEventHandler.OnETAItemsUpdated(notification);
    }

    function updateStopsCounter() {
        var keyedList = corePlatList.GetKeyedList();
        var keyedItemList = keyedList.GetKeyedItemList();
        var nPlat = 0;
        for (var i in keyedItemList) { ++nPlat; }
        appLayout.SetStopsCounter(nPlat);
    }

    function onCorePlatItemsUpdated() { updateStopsCounter(); }

    function updateBusCounters() {
        var keyedList = coreBusList.GetKeyedList();
        var keyedItemList = keyedList.GetKeyedItemList();
        var nMDT = 0, nFIU = 0;
        for (var i in keyedItemList) {
            var item = keyedItemList[i], d = item.GetData(), p = d.properties;
            if (p.fleet == 'fiu') { ++nFIU; }
            else { ++nMDT; }
        }
        appLayout.SetFIUBusCounter(nFIU);
        appLayout.SetMDTBusCounter(nMDT);
    }

    function flashFunction(listName, featureStyles, keys) {
        var mapsFlash = [smallMap];
        if (maps.IsLargeMapLayerVisible(listName)) { mapsFlash.push(largeMap); }
        featureStyles.FlashOnMove(keys, mapsFlash);
    }

    function getFlashFunction(listName, featureStyles, keys) { return function () { return flashFunction(listName, featureStyles, keys); }; }

    function onCoreBusItemsAddUpdateDel(notification, isDeleted) {
        updateBusCounters();
        if (appStyles.FlashBusesOnMove) { setTimeout(getFlashFunction(ITPA.Core.BusListName, busFeatureStyles, notification.keys), 100); }
        mapEventHandler.OnBusItemsUpdated(notification, isDeleted);
    }

    function onCoreDeviceItemsUpdated(notification) {
        coreFeatureLists.GetDeviceList().RefreshStyle(notification.keys);
        if (appStyles.FlashDevicesOnMove) { setTimeout(getFlashFunction(ITPA.Core.DeviceListName, deviceFeatureStyles, notification.keys), 100); }
    }

    function initialize() {
        oc = settings.oc;
        core = oc.GetCore();
        maps = oc.GetMaps();
        mapEventHandler = oc.GetMapEventHandler();
        coreFeatureLists = oc.GetCoreFeatureLists();
        smallMap = maps.GetSmallMap();
        largeMap = maps.GetLargeMap();

        appStyles = oc.GetAppStyles();
        appLayout = oc.GetAppLayout();

        garageFeatureStyles = oc.GetGarageFeatureStyles();
        occupancyFeatureStyles = oc.GetOccupancyFeatureStyles();
        platformFeatureStyles = oc.GetPlatformFeatureStyles();
        busFeatureStyles = oc.GetBusFeatureStyles();
        deviceFeatureStyles = oc.GetDeviceFeatureStyles();

        coreOccupancyList = core.GetOccupancyList();
        coreETAList = core.GetETAList();
        coreServiceList = core.GetServiceList();
        coreBusList = core.GetBusList();
        corePlatList = core.GetPlatformList();
        coreDeviceList = core.GetDeviceList();

        if (!!coreOccupancyList) {
            coreOccupancyService = coreOccupancyList.GetKeyedList().AddListener(tf.consts.keyedListUpdatedItemsEvent, onCoreOccupancyItemsUpdated);
        }

        if (!!coreETAList) {
            coreETAList.AddListener(onCoreETAItemsUpdated);
        }

        if (!!coreServiceList) {
            var listeners = {};
            listeners[tf.consts.keyedListAddedItemsEvent] = onCoreServiceItemsUpdated;
            listeners[tf.consts.keyedListUpdatedItemsEvent] = onCoreServiceItemsUpdated;
            coreServiceService = coreServiceList.GetKeyedList().AddListeners(listeners);
        }

        if (!!coreBusList) {
            var listeners = {};
            listeners[tf.consts.keyedListAddedItemsEvent] = onCoreBusItemsAddUpdateDel;
            listeners[tf.consts.keyedListUpdatedItemsEvent] = onCoreBusItemsAddUpdateDel;
            listeners[tf.consts.keyedListDeletedItemsEvent] = function (notification) { return onCoreBusItemsAddUpdateDel(notification, true); } ;
            var keyedList = coreBusList.GetKeyedList();
            coreBusService = keyedList.AddListeners(listeners);
            keyedList.NotifyItemsAdded(onCoreBusItemsAddUpdateDel);
        }

        if (!!coreDeviceList) {
            var listeners = {};
            listeners[tf.consts.keyedListAddedItemsEvent] = onCoreDeviceItemsUpdated;
            listeners[tf.consts.keyedListUpdatedItemsEvent] = onCoreDeviceItemsUpdated;
            listeners[tf.consts.keyedListDeletedItemsEvent] = onCoreDeviceItemsUpdated;
            var dkeyedList = coreDeviceList.GetKeyedList();
            coreDeviceService = dkeyedList.AddListeners(listeners);
            dkeyedList.NotifyItemsAdded(onCoreDeviceItemsUpdated);

            //setInterval(function () { dkeyedList.NotifyItemsAdded(onCoreDeviceItemsUpdated); }, 5000);
        }

        if (!!corePlatList) {
            var keyedList = corePlatList.GetKeyedList();
            corePlatService = keyedList.AddListener(tf.consts.keyedListUpdatedItemsEvent, onCorePlatItemsUpdated);
            keyedList.NotifyItemsAdded(onCorePlatItemsUpdated);
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
