"use strict";

var ITPA = { OC: {} };

/**
* @this {ITPA.OC.OC}
*/
ITPA.OC.OC = function (settings) {

    var theThis, appStyles, appLayout, mapEventHandler, coreEventHandler, maps, core, smallMap, largeMap, coreFeatureLists;
    var busFeatureStyles, platformFeatureStyles, garageFeatureStyles, occupancyFeatureStyles,
        routeFeatureStyles, messageFeatureStyles, incidentFeatureStyles, deviceFeatureStyles, streetSmartGraphFeatureStyles;
    var mapsCreated, imagesPreLoaded, allCreated, featureTables;
    var mapBusBOImagePreloaded, mapBusGOImagePreloaded, mapBusROImagePreloaded, mapBusDirImagePreloaded, mapIncidentImagePreloaded, mapMessageImagePreloaded;
    var loginDiv, emailInput, passwordInput, email, password, wantsVideo;
    var adHocBuses;

    this.GetAdHocBuses = function () { return adHocBuses; }

    this.GetKeyedFeatureFromKeyedItem = function (keyedItem, replaceGarageWithOccupancyBool) {
        var keyedFeature;
        if (!!keyedItem) {
            var itemKey = keyedItem.GetKey();
            var keyedList = keyedItem.GetList();
            var listName = keyedList.GetName();
            if ((!!replaceGarageWithOccupancyBool) && (listName == ITPA.Core.GarageListName)) { listName = ITPA.Core.OccupancyListName; }
            var featureList = coreFeatureLists.GetFeatureList(listName);
            if (!!featureList) { keyedFeature = featureList.GetFeature(itemKey); }
        }
        return keyedFeature;
    }

    this.GetMapBusBlueOutlineImg = function () { return mapBusBOImagePreloaded; }
    this.GetMapBusGreenOutlineImg = function () { return mapBusGOImagePreloaded; }
    this.GetMapBusRedOutlineImg = function () { return mapBusROImagePreloaded; }
    this.GetMapBusDirectionImg = function () { return mapBusDirImagePreloaded; }
    this.GetMapIncidentImg = function () { return mapIncidentImagePreloaded; }
    this.GetMapMessageImg = function () { return mapMessageImagePreloaded; }

    this.GetFeatureTables = function () { return featureTables; }
    this.GetMapEventHandler = function () { return mapEventHandler; }

    this.GetCore = function () { return core; }
    this.GetAppLayout = function () { return appLayout; }
    this.GetCoreFeatureLists = function () { return coreFeatureLists; }
    this.GetMaps = function () { return maps; }
    this.GetAppStyles = function () { return appStyles; }
    this.GetGarageFeatureStyles = function () { return garageFeatureStyles; }
    this.GetOccupancyFeatureStyles = function () { return occupancyFeatureStyles; }
    this.GetPlatformFeatureStyles = function () { return platformFeatureStyles; }
    this.GetRouteFeatureStyles = function () { return routeFeatureStyles; }
    this.GetBusFeatureStyles = function () { return busFeatureStyles; }
    this.GetDeviceFeatureStyles = function () { return deviceFeatureStyles; }
    this.GetStreetSmartGraphFeatureStyles = function () { return streetSmartGraphFeatureStyles; }

    function onCoreFeatureListsCreated() { coreEventHandler = new ITPA.OC.CoreEventHandler({ oc: theThis }); }

    function createFeatureStyleObject(type) { return new type({ oc: theThis }); }

    function onFeaturesAddedOrRemoved(featureList, keys, addedBool) {
        featureList.ShowSomeOnMap(smallMap, keys, addedBool, appStyles.SmallMapFeatureStyleName);
        featureList.ShowSomeOnMap(largeMap, keys, addedBool, appStyles.LargeMapFeatureStyleName);
        //if (!addedBool) { mapEventHandler.OnFeaturesDeleted(featureList, keys); }
    }

    var currentAnimation = null;

    function checkFlash(featureList, keys, isAdd, isRemove) {
        if (!!coreFeatureLists) {
            var flashStyle, flashDuration;
            var isUpdate = !(isAdd || isRemove);

            switch (featureList.GetKeyedListName()) {
                case ITPA.Core.MessageListName:
                    if ((isAdd && appStyles.FlashMessageOnAdd) ||
                        (isUpdate && appStyles.FlashMessageOnUpdate) ||
                        (isRemove && appStyles.FlashMessageOnRemove)) {
                        flashMessages(keys);
                    }
                    break;
                case ITPA.Core.IncidentListName:
                    if ((isAdd && appStyles.FlashIncidentOnAdd) ||
                        (isUpdate && appStyles.FlashIncidentOnUpdate) ||
                        (isRemove && appStyles.FlashIncidentOnRemove)) {
                        flashIncidents(keys);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    function onFeaturesAdded(notification) {
        var featureList = notification.sender, keys = notification.keys;
        onFeaturesAddedOrRemoved(featureList, keys, true);
        checkFlash(featureList, keys, true, false);
    }

    function onFeaturesUpdated(notification) {
        //var featureList = notification.sender, keys = notification.keys;
        //onFeaturesAddedOrRemoved(featureList, keys, true);
        checkFlash(notification.sender, notification.keys, false, false);
    }

    function onFeaturesDeleted(notification) {
        var featureList = notification.sender, keys = notification.keys;
        onFeaturesAddedOrRemoved(featureList, keys, false);
        checkFlash(featureList, keys, false, true);
    }

    function flashListLeys(listName, featureStyles, keys) {
        var mapsFlash = [smallMap];
        if (maps.IsLargeMapLayerVisible(listName)) { mapsFlash.push(largeMap); }
        featureStyles.Flash(keys, mapsFlash);
    }

    function flashMessages(keys) { flashListLeys(ITPA.Core.MessageListName, messageFeatureStyles, keys); }

    function flashIncidents(keys) { flashListLeys(ITPA.Core.IncidentListName, incidentFeatureStyles, keys); }

    function createMapFeatures() {

        var featureListStyleSettings = {};

        featureListStyleSettings[ITPA.Core.BusListName] = (busFeatureStyles = createFeatureStyleObject(ITPA.OC.BusFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.PlatformListName] = (platformFeatureStyles = createFeatureStyleObject(ITPA.OC.PlatformFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.GarageListName] = (garageFeatureStyles = createFeatureStyleObject(ITPA.OC.GarageFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.OccupancyListName] = (occupancyFeatureStyles = createFeatureStyleObject(ITPA.OC.OccupancyFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.RouteListName] = (routeFeatureStyles = createFeatureStyleObject(ITPA.OC.RouteFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.MessageListName] = (messageFeatureStyles = createFeatureStyleObject(ITPA.OC.MessageFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.IncidentListName] = (incidentFeatureStyles = createFeatureStyleObject(ITPA.OC.IncidentFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.DeviceListName] = (deviceFeatureStyles = createFeatureStyleObject(ITPA.OC.DeviceFeatureStyles)).GetFeatureStyles();
        featureListStyleSettings[ITPA.Core.StreetSmartGraphListName] = (streetSmartGraphFeatureStyles = createFeatureStyleObject(ITPA.OC.StreetSmartGraphFeatureStyles)).GetFeatureStyles();

        var listeners = {};
        listeners[tf.consts.keyedFeaturesAddedEvent] = onFeaturesAdded;
        listeners[tf.consts.keyedFeaturesUpdatedEvent] = onFeaturesUpdated;
        listeners[tf.consts.keyedFeaturesDeletedEvent] = onFeaturesDeleted;

        var settings = { core: core, onCreated: onCoreFeatureListsCreated, listeners: listeners, featureListStyleSettings: featureListStyleSettings };

        //coreFeatureLists can be created with a subset of all core feature lists by passing an array of list names
        var listNames;//= [/*"bus",*/ "platform", "route", "garage"];

        if (!!listNames) { settings.listNames = listNames; }

        coreFeatureLists = new ITPA.Map.CoreFeatureLists(settings);

        //setInterval(flashMessages, appStyles.FlashMessageDuration * 2);
        //setInterval(flashIncidents, appStyles.FlashIncidentDuration * 2);
    }

    function onAllCreated() {
        createMapFeatures();
        mapEventHandler.OnMapsCreated();
        appLayout.OnMapsCreated();
        featureTables = new ITPA.OC.FeatureTables({ oc: theThis });
        adHocBuses = new ITPA.OC.AdHocBuses(tf.js.ShallowMerge(settings, { oc: theThis }));
    }

    function checkAllCreated() {
        if (mapsCreated && imagesPreLoaded && !allCreated) {
            allCreated = true;
            onAllCreated();
        }
    }

    function createMaps() {
        var minZoom = appStyles.MapMinZoom, maxZoom = appStyles.MapMaxZoom;
        var extent = core.GetMapExtent();
        var viewSettings = { minZoom: minZoom, maxZoom: maxZoom, extent: extent };

        mapEventHandler = new ITPA.OC.MapEventHandler({ oc: theThis });

        var mapEventSettings = mapEventHandler.GetMapEventSettings();
        var baseMapSettings = { viewSettings: viewSettings };

        var largeMapSettings = tf.js.ShallowMerge(baseMapSettings, {
            level: appStyles.LargeMapStartZoom,
            showMapCenter: true,
            showScale: true,
            showLayers: true,
            goDBOnDoubleClick: false,
            center: appStyles.LargeMapCenterCoords,
            container: appLayout.GetCenterPanel()
        });

        var smallMapSettings = tf.js.ShallowMerge(baseMapSettings, {
            level: appStyles.SmallMapStartZoom,
            center: appStyles.SmallMapCenterCoords,
            goDBOnDoubleClick: false,
            container: appLayout.GetLeftBotPanel()
        });

        maps = new ITPA.OC.Maps({ oc: theThis, largeMapSettings: largeMapSettings, smallMapSettings: smallMapSettings, mapEventSettings: mapEventSettings });

        smallMap = maps.GetSmallMap();
        largeMap = maps.GetLargeMap();

        mapsCreated = true;
        checkAllCreated();
    }

    function preloadImages() {
        new tf.dom.ImgsPreLoader({
            imgSrcs: [
                "./images/busBlueOsm.png",
                "./images/busGreenOsm.png",
                "./images/busRedOsm.png",
                "./images/directionsm.png",
                "./images/incidentMarker.png",
                "./images/messageMarker.png"
            ],
            onAllLoaded: function (ipl) {
                var imgs = ipl.GetImgs();
                var index = 0;
                mapBusBOImagePreloaded = imgs[index++];
                mapBusGOImagePreloaded = imgs[index++];
                mapBusROImagePreloaded = imgs[index++];
                mapBusDirImagePreloaded = imgs[index++];
                mapIncidentImagePreloaded = imgs[index++];
                mapMessageImagePreloaded = imgs[index++];
                imagesPreLoaded = true;
                checkAllCreated();
            }
        });
    }

    function onCanAdmin() {
        appLayout = new ITPA.OC.AppLayout({ oc: theThis, showLiveVideoFeeds: wantsVideo /*&& core.GetCanAdmin()*/ });
    }

    function afterLogin() {
        preloadImages();
        appStyles = new ITPA.OC.AppStyles();
        core = new ITPA.Core.Core({
            serverURL: settings.serverURL, serverServicesURL: settings.serverServicesURL, mvideoServerURL: settings.mvideoServerURL, initCallBack: createMaps, onCanAdminCallBack: onCanAdmin,
            email: email, password: password
        });
    }

    function createButton(className, eventListener, title, tooltip) {
        var button = document.createElement('button');
        button.className = className;
        button.style.pointerEvents = "all";
        button.addEventListener('click', eventListener);
        if (tf.js.GetIsNonEmptyString(title)) { button.innerHTML = title; }
        if (tf.js.GetIsNonEmptyString(tooltip)) { button.title = tooltip; }
        return button;
    }

    function createInput(className, label, tooltip, placeholder) {
        var input = document.createElement('input');
        input.className = className != undefined ? className : "";
        input.title = tooltip;
        input.placeholder = placeholder;
        return input;
    }

    function onLogin() {
        email = emailInput.value;
        password = passwordInput.value;
        document.body.removeChild(loginDiv.GetHTMLElement());
        afterLogin();
    }

    function doLogin() {

        loginDiv = new tf.dom.Div({ cssClass: "loginDiv" });
        var loginDivES = loginDiv.GetHTMLElement().style;
        var button = createButton("loginButton", onLogin, "Login", "Login");
        emailInput = createInput("emailInput", 'email: ', 'email', 'email');
        passwordInput = createInput("passwordInput ", 'password: ', 'password', 'password');
        passwordInput.type = 'password';

        loginDivES.textAlign = 'center';
        loginDiv.AddContent(emailInput, passwordInput, button);
        document.body.appendChild(loginDiv.GetHTMLElement());
    }

    function initialize() {

        /*var header = { "Authorization": "Token 1f691ebd8e5932dc6b925ed0c80430588b7d3fac", "Accept": "application/json" };
        new tf.ajax.JSONGet().Request('http://xpect.cs.fiu.edu/itpaparkingsites/availabilities/', function (notification) {
            console.log(JSON.stringify(notification));
        }, theThis, undefined, false, undefined, undefined, undefined, header);*/

        var defaultParams;
        var params = tf.urlapi.ParseURLParameters(window.location.href, defaultParams);
        mapsCreated = imagesPreLoaded = allCreated = false;
        wantsVideo = !!params.video;
        if (!!params.admin) { doLogin(); } else { afterLogin(); }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
