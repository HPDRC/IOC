"use strict";

/**
* @this {ITPA.OC.MapEventHandler}
*/
ITPA.OC.MapEventHandler = function (settings) {

    var theThis;
    var oc, core, maps, appStyles, appSizer, deviceFeatureStyles, coreDeviceList, coreBusList, corePlatformList, coreGarageList, coreETAList, styles;
    var LargeMapFeatureStyleName;
    var mapEventSettings;
    var smallMap, largeMap, aboveTopLayerZIndex, featureListZIndices, coreFeatureLists;
    var mapHTMLOverlay, mapShowingOverlays, messageOverlayContainer, incidentOverlayContainer, streetSmartGraphOverlayContainer;
    var switchMapAreaControl, autoCycleRadioList, autoCycleCheckList, autoCycleCheckBox;
    var overviewControl;
    var autoCycleTimeout, lastAutoCycleExtension, isAutoCycling;
    var trackBusKeyedItem, trackBusKeyedItemKey, trackBusKeyedItemFeature, preComposeListener;
    var busTrackingControl, ETAControl;
    var toastedItem;
    var mouseMoveClickHandler;

    var etaKeyedItem, etaKeyedItemKey, isEtaKeyedItemBus;
    var etaMarkers, etaItemsDisplaying, ETALayer;


    this.GetMouseMoveClickHandler = function () { return mouseMoveClickHandler; }
    this.SetMouseMoveClickHandler = function (handler) { return setMouseMoveClickHandler(handler); }
    this.ConfirmMouseClickHandler = function () { return confirmMouseClickHandler(); }
    this.CancelMouseClickHandler = function () { return cancelMouseClickHandler(); }

    function notifyMouseMoveClickHandler(mapNotification, isActive, isConfirmed) {
        if (!!mouseMoveClickHandler) {
            isConfirmed = !!isConfirmed;
            isActive = !!isActive && !isConfirmed;
            mouseMoveClickHandler({ sender: theThis, mapNotification: mapNotification, isActive: isActive, isConfirmed: isConfirmed });
            if (!isActive) { mouseMoveClickHandler = undefined; }
        }
    }

    function confirmMouseClickHandler() { notifyMouseMoveClickHandler(undefined, false, true); }

    function cancelMouseMoveClickHandler() { notifyMouseMoveClickHandler(undefined, false, false); }

    function setMouseMoveClickHandler(handler) {
        if (handler == mouseMoveClickHandler) { return; }
        cancelMouseMoveClickHandler();
        if (tf.js.GetFunctionOrNull(handler)) { mouseMoveClickHandler = handler; }
    }

    this.OnBusItemsUpdated = function (notification, isDeleted) {
        var items = notification.items;
        var keys = notification.keys;
        var isShowingETAs = !!etaKeyedItem;
        var isShowingStopETAs = isShowingETAs && !isEtaKeyedItemBus;

        if (isDeleted) {
            if (!!trackBusKeyedItemKey || (isShowingETAs && !isShowingStopETAs)) {
                for (var i in keys) {
                    var thisKey = keys[i];
                    if (thisKey == trackBusKeyedItemKey) {
                        theThis.SetTrackBusKeyedItem(undefined);
                    }
                    else if (isShowingETAs && !isShowingStopETAs) {
                        if (thisKey == etaKeyedItemKey) {
                            stopShowingETAs();
                        }
                    }
                }
            }
        }
        else {
            if (isShowingStopETAs) {
                for (var i in keys) {
                    var thisKey = keys[i];
                    var objKey = tf.js.MakeObjectKey(thisKey);
                    var displayingItem = etaItemsDisplaying != undefined ? etaItemsDisplaying[objKey] : undefined;
                    if (displayingItem != undefined) { updateEtaItemPos(displayingItem); }
                }
            }
        }
    }

    this.OnETAItemsUpdated = function (notification) { return checkRefreshETAMarkers(notification); }

    /*this.OnFeaturesDeleted = function (featureList, keys) {
        var checkETAs = undefined != etaKeyedItem;
        var listName = featureList.GetKeyedListName();

        if (listName == ITPA.Core.BusListName) {
            checkETAs = checkETAs && isEtaKeyedItemBus;
            if (!!trackBusKeyedItemKey) {
                for (var i in keys) {
                    if (keys[i] == trackBusKeyedItemKey) {
                        theThis.SetTrackBusKeyedItem(undefined);
                        break;
                    }
                }
            }
        }
        else if (listName == ITPA.Core.PlatformListName) {
            checkETAs = checkETAs && !isEtaKeyedItemBus;
        }
        if (checkETAs) {
            for (var i in keys) {
                var key = keys[i];
                if (key == etaKeyedItemKey) {
                    theThis.SetETAKeyedItem(undefined);
                    break;
                }
                var objKey = tf.js.MakeObjectKey(key);
                var displayingItem = etaItemsDisplaying != undefined ? etaItemsDisplaying[objKey] : undefined;
                if (displayingItem != undefined) {
                    displayingItem.eta = undefined;
                    if (!!ETALayer && !!displayingItem.etaFeature) { ETALayer.DelMapFeature(displayingItem.etaFeature); }
                    delete etaItemsDisplaying[objKey];
                }
            }
        }
    }*/

    this.GetETAItemIsBus = function () { return isEtaKeyedItemBus; }
    this.GetETAKeyedItem = function () { return etaKeyedItem; }
    this.SetETAKeyedItem = function (keyedItem, isBus) { return setETAKeyedItem(keyedItem, isBus); }

    this.GetTrackBusKeyedItem = function () { return trackBusKeyedItem; }
    this.SetTrackBusKeyedItem = function (busKeyedItem) { return setTrackBusKeyedItem(busKeyedItem); }

    this.CloseToast = function () { return closeToast(); }
    this.GetToastedItem = function () { return toastedItem; }
    this.ToastIncident = function (keyedItem) { return toastIncident(keyedItem); }
    this.ToastMessage = function (keyedItem) { return toastMessage(keyedItem); }

    this.OnMapsCreated = function () { return onMapsCreated(); }
    this.GetMapEventSettings = function () { return tf.js.ShallowMerge(mapEventSettings); }
    this.StopAutoCycle = function () { return stopAutoCycle(); }

    function createHTMLOverlayContainer(containerStyles) {
        var div = new tf.dom.Div(null, appStyles.TFStyles.GetPaddedDivClassNames(false, false));
        appStyles.TFStyles.ApplyStyleProperties(div, containerStyles);
        div.GetHTMLElement().addEventListener('click', closeToast);
        return div;
    }

    function createMapHTMLOverlayElements() {
        streetSmartGraphOverlayContainer = createHTMLOverlayContainer(appStyles.StreetSmartGraphOverlayContainerStyles);
        messageOverlayContainer = createHTMLOverlayContainer(appStyles.MessageOverlayContainerStyles);
        incidentOverlayContainer = createHTMLOverlayContainer(appStyles.IncidentOverlayContainerStyles);
    }

    function onMapsCreated() {
        maps = oc.GetMaps();
        deviceFeatureStyles = oc.GetDeviceFeatureStyles();
        aboveTopLayerZIndex = maps.GetAboveTopLayerZIndex();
        featureListZIndices = maps.GetFeatureListZIndices();
        coreFeatureLists = oc.GetCoreFeatureLists();
        smallMap = maps.GetSmallMap();
        mapShowingOverlays = largeMap = maps.GetLargeMap();
        preComposeListener = largeMap.AddListener(tf.consts.mapPreComposeEvent, onPreCompose);
        mapHTMLOverlay = new tf.map.HTMLOverlay({ map: mapShowingOverlays, autoPan: true });
        createMapHTMLOverlayElements();
        createSwitchMapAreaControl();
        createAnimationToggleControl();
        createOverviewControl();

        (busTrackingControl = new tf.dom.Div({ cssClass: "mapBusTrackingControl" })).AppendTo(largeMap.GetMapMapContainer());
        //busTrackingControl.GetHTMLElement().addEventListener('click', stopBusTracking);

        (ETAControl = new tf.dom.Div({ cssClass: "mapETAControl" })).AppendTo(largeMap.GetMapMapContainer());
        //ETAControl.GetHTMLElement().addEventListener('click', stopShowingETAs);
    }

    function stopAutoCycle() { if (isAutoCycling) { onToggleAutoCycle(); } }

    function setAutoCycleTimeout() { if (!autoCycleTimeout) { autoCycleTimeout = setTimeout(onAutoCycle, appStyles.AutoCycleDuration); } }

    function onAutoCycle() {
        var settings = appStyles.MapExtentSettings[lastAutoCycleExtension];
        if (!!settings) { moveToExtent(lastAutoCycleExtension = settings.next); autoCycleRadioList.GetButton(settings.next).SetIsChecked(true); }
        autoCycleTimeout = null;
        setAutoCycleTimeout();
    }

    function startOrStopAutoCycle() {
        autoCycleCheckBox.SetIsChecked(isAutoCycling);
        if (isAutoCycling) { onAutoCycle(); } else if (!!autoCycleTimeout) {
            clearTimeout(autoCycleTimeout); autoCycleTimeout = null;
        }
    }

    function onToggleAutoCycle() {
        isAutoCycling = !isAutoCycling;
        startOrStopAutoCycle();
    }

    function moveToExtent(extentName) {
        var settings = appStyles.MapExtentSettings[extentName];
        if (!!settings) {
            lastAutoCycleExtension = extentName;
            largeMap.StartAnimation(function (request) {
                switch (request.step) {
                    case 0:
                        return {
                            duration: appStyles.AutoCycleAnimationDuration, easing: tf.units.EaseInOut, center: settings.center,
                            resolution: tf.units.GetResolutionByLevel(settings.level), notifyListeners: false, rotation: 0
                        };
                }
            }, theThis);
        }
    }

    function onMapExtentChanged(newSelection) { moveToExtent(newSelection); isAutoCycling = false; startOrStopAutoCycle(); }

    function onAutoCycleExtentChanged() { startOrStopAutoCycle(); }

    var animationCheckList, animationToggleControl, animationHandlers;

    function onToggleAnimation(notification) {
        var handler = animationHandlers[notification];
        if (!!handler) {
            handler.button.SetIsChecked(handler.handler());
        }
    }

    function createAnimationToggleControl() {
        var busMovement = "bus movement";
        var etaChanges = "eta changes";
        var incChanges = "incident changes";
        var msgChanges = "message changes";
        var devChanges = "device changes";
        var animationToggleCheckStrings = [
            [busMovement, "toggle bus movement animation on/off"],
            [etaChanges, "toggle eta changes animation on/off"],
            [incChanges, "toggle incident changes animation on/off"],
            [msgChanges, "toggle message changes animation on/off"],
            [devChanges, "toggle device changes animation on/off"]
        ];
        var checkedBoxes = {} ;
        for (var i in animationToggleCheckStrings) { checkedBoxes[animationToggleCheckStrings[i][0]] = true; }

        animationHandlers = {};

        animationCheckList = new tf.ui.RadioOrCheckListFromData({
            isRadioList: false, onClick: onToggleAnimation, data: animationToggleCheckStrings,
            isInline: false, checkedBoxes: checkedBoxes
        });

        animationHandlers[busMovement] = { handler: function () { return appStyles.FlashBusesOnMove = !appStyles.FlashBusesOnMove; }, button: animationCheckList.GetButton(busMovement) };

        animationHandlers[etaChanges] = {
            handler: function () {
                appStyles.FlashPlatformsOnETAChange = !appStyles.FlashPlatformsOnETAChange;
                return appStyles.FlashBusesOnETAChange = !appStyles.FlashBusesOnETAChange;
            }, button: animationCheckList.GetButton(etaChanges)
        };

        animationHandlers[incChanges] = {
            handler: function () {
                var checked = appStyles.FlashIncidentOnRemove = !appStyles.FlashIncidentOnRemove;
                appStyles.FlashIncidentOnAdd = appStyles.FlashIncidentOnUpdate = checked;
                return checked;
            }, button: animationCheckList.GetButton(incChanges)
        };

        animationHandlers[msgChanges] = {
            handler: function () {
                var checked = appStyles.FlashMessageOnRemove = !appStyles.FlashMessageOnRemove;
                appStyles.FlashMessageOnAdd = appStyles.FlashMessageOnUpdate = checked;
                return checked;
            }, button: animationCheckList.GetButton(msgChanges)
        };

        animationHandlers[devChanges] = { handler: function () { return appStyles.FlashDevicesOnMove = !appStyles.FlashDevicesOnMove; }, button: animationCheckList.GetButton(devChanges) };

        var div = new tf.dom.Div(null, appStyles.TFStyles.GetUnPaddedDivClassNames(false, false));
        var divE = div.GetHTMLElement(), divES = divE.style;

        divES.marginLeft = "-4px";

        var titleDiv = new tf.dom.Div(), titleDivE = titleDiv.GetHTMLElement(), titleDivES = titleDivE.style;
        titleDivE.innerHTML = "Map animations";
        titleDivES.marginBottom = "2px";
        titleDivES.textAlign = "center";

        div.AddContent(titleDiv);

        appStyles.TFStyles.ApplyStyleProperties(titleDiv, appStyles.MapExtensionCheckBoxStyles);
        appStyles.TFStyles.ApplyStyleProperties(animationCheckList, appStyles.MapExtensionCheckBoxStyles);

        animationCheckList.AppendTo(div);

        animationToggleControl = new tf.map.HTMLControl({ map: smallMap, content: div, isVisible: true, cssStyle: appStyles.AnimationToggleStyles });
    }

    function createSwitchMapAreaControl() {
        autoCycleRadioList = new tf.ui.RadioOrCheckListFromData({
            isRadioList: true, onClick: onMapExtentChanged, data: appStyles.MapExtentSelections, isInline: appStyles.AutoCycleUseInlineButtons,
            selRadioName: lastAutoCycleExtension = appStyles.StartMapExtensionSelection
        });

        var checkedBoxes = {};
       
        if (isAutoCycling = appStyles.StartWithAutoCycle) { checkedBoxes[appStyles.AutoCycleAreaName] = true; }

        autoCycleCheckBox = (autoCycleCheckList = new tf.ui.RadioOrCheckListFromData({
            isRadioList: false, onClick: onToggleAutoCycle, data: appStyles.AutoCycleCheckStrings,
            isInline: appStyles.AutoCycleUseInlineButtons, checkedBoxes: checkedBoxes
        })).GetButton(appStyles.AutoCycleAreaName);

        var div = new tf.dom.Div(null, appStyles.TFStyles.GetUnPaddedDivClassNames(false, false));

        appStyles.TFStyles.ApplyStyleProperties(autoCycleRadioList, appStyles.MapExtensionRadioButtonStyles);
        appStyles.TFStyles.ApplyStyleProperties(autoCycleCheckList, appStyles.MapExtensionCheckBoxStyles);

        autoCycleRadioList.AppendTo(div);
        autoCycleCheckList.AppendTo(div);

        switchMapAreaControl = new tf.map.HTMLControl({ map: mapShowingOverlays, content: div, isVisible: true, cssStyle: appStyles.MapExtentSelectionStyles });

        moveToExtent(appStyles.StartMapExtensionSelection);
        if (appStyles.StartWithAutoCycle) { setAutoCycleTimeout(); }
    }

    function onSmallMapOverview() {
        smallMap.SetLevel(appStyles.SmallMapStartZoom);
        smallMap.SetCenter([appStyles.SmallMapCenterCoords.lon, appStyles.SmallMapCenterCoords.lat]);
    }

    function createOverviewControl() {
        var dim = "2em";
        var div = new tf.dom.Div(null, appStyles.TFStyles.GetUnPaddedDivClassNames(false, false));
        var overviewButton = new tf.ui.TextBtn({ style: true, label: "Overview", onClick: onSmallMapOverview, tooltip: "Pan and Zoom to Overview", dim: dim });
        div.AddContent(overviewButton);
        overviewControl = new tf.map.HTMLControl({ map: smallMap, content: div, isVisible: true, cssStyle: appStyles.OverviewButtonStyles });
    }

    function panOtherMap(fromMap, pointCoords) { var theOtherMap = fromMap == smallMap ? largeMap : smallMap; if (theOtherMap == largeMap) { theOtherMap.SetCenter(pointCoords); } }

    function onClickMap(notification) {
        panOtherMap(notification.sender, notification.eventCoords);
        notifyMouseMoveClickHandler(notification, true, false);
    }
    function onDoubleClickMap(notification) { return onClickMap(notification); }
    function onMouseMoveMap(notification) {
        notifyMouseMoveClickHandler(notification, true, false);
        //if (!!mapHTMLOverlay) { if (mapHTMLOverlay.GetIsVisible()) { showHideHTMLOverlay(false); } }
    }
    function onMapMoveEnd(notification) { }

    function showHideHTMLOverlay(bool) {
        if (!!mapHTMLOverlay) {
            mapHTMLOverlay.SetVisible(bool);
            if (!bool) { toastedItem = undefined; }
        }
    }

    function closeToast() { if (!!toastedItem) { showHideHTMLOverlay(false); } }

    function prepareStreetSmartGraphHTMLContent(keyedItem) {
        var props = keyedItem.GetData().properties;
        var percentage = props.text;
        var innerHTML = 'On street parking areas with estimated <span style="font-weight: bold; color: #03b;">' + percentage + '</span> vacancy<br/>';
        innerHTML += '<span style="font-size: 80%; font-style: italic;">(preliminary estimation based on pre-release crowd-sourced data)</span>';
        streetSmartGraphOverlayContainer.GetHTMLElement().innerHTML = innerHTML;
        mapHTMLOverlay.SetPositioning(tf.consts.positioningCenter, tf.consts.positioningTop);
        mapHTMLOverlay.SetOffset([0, 0]);
        return streetSmartGraphOverlayContainer;
    }

    function prepareMessageHTMLContent(keyedItem) {
        var props = keyedItem.GetData().properties;
        var innerHTML = props.message + '<br/>';
        innerHTML += '<span style="font-size: 88%;font-style: italic;">' + props.message_board_location + '<br/>' + props.highway + ', ' + props.region + '</span>';
        messageOverlayContainer.GetHTMLElement().innerHTML = innerHTML;
        mapHTMLOverlay.SetPositioning(tf.consts.positioningCenter, tf.consts.positioningTop);
        mapHTMLOverlay.SetOffset([0, 1]);
        return messageOverlayContainer;
    }

    function prepareIncidentHTMLContent(keyedItem) {
        var props = keyedItem.GetData().properties;
        var incidentType = !!props.external_incident_type ? props.external_incident_type : "Unknown Incident";
        //var arrival_time = !!props.arrival_time ? props.arrival_time.substring(11) : "Unknown";
        var dispatch_time = !!props.dispatch_time ? props.dispatch_time.substring(11, 11 + 5) : "Unknown";
        var remarks = props.remarks;
        var innerHTML = incidentType + '<br/>';
        innerHTML += '<span style="font-size: 80%;">';
        if (!!remarks) { innerHTML += remarks + '<br/>'; }
        if (dispatch_time != "00:00") {
            innerHTML += 'dispatch: ' + dispatch_time /*+ '<br/>arrival: ' + arrival_time*/;
        }
        innerHTML += '</span>';
        incidentOverlayContainer.GetHTMLElement().innerHTML = innerHTML;
        mapHTMLOverlay.SetPositioning(tf.consts.positioningCenter, tf.consts.positioningBottom);
        mapHTMLOverlay.SetOffset([0, -10]);
        return incidentOverlayContainer;
    }

    function showHTMLOverlay(keyedFeature, prepareContentMethod) {
        mapHTMLOverlay.SetContent(prepareContentMethod(keyedFeature.GetKeyedItem()));
        showHideHTMLOverlay(true);
        var pointCoords = keyedFeature.GetIsPoint() ? keyedFeature.GetPointCoords() : largeMap.GetCenter();
        mapHTMLOverlay.SetPointCoords(pointCoords);
    }

    function toastIncidentOrMessage(keyedItem, overlayContent) {
        var keyedFeature = oc.GetKeyedFeatureFromKeyedItem(keyedItem);
        if (!!keyedFeature) {
            toastedItem = keyedItem;
            showHTMLOverlay(keyedFeature, overlayContent);
        }
    }

    function toastIncident(keyedItem) { toastIncidentOrMessage(keyedItem, prepareIncidentHTMLContent); }
    function toastMessage(keyedItem) { toastIncidentOrMessage(keyedItem, prepareMessageHTMLContent); }

    function onFeatureHoverInOut(notification) {
        var keyedFeature = notification.keyedFeature;

        if (!!keyedFeature) {
            var theMap = notification.sender, isInHover = notification.isInHover;
            var keyedFeatureList = keyedFeature.GetFeatureList();
            var keyedFeatureListName = keyedFeatureList.GetKeyedListName();
            var needsZIndexChange = true;
            var overlayContent = null;
            var checkShowOverlays = theMap == mapShowingOverlays && isInHover;

            if (!isInHover) { showHideHTMLOverlay(false); }

            switch (keyedFeatureListName) {
                case ITPA.Core.BusListName:
                case ITPA.Core.PlatformListName:
                case ITPA.Core.OccupancyListName:
                    break;
                case ITPA.Core.StreetSmartGraphListName:
                    if (checkShowOverlays && appStyles.ShowStreetSmartGraphOverlayOnHover) { overlayContent = prepareStreetSmartGraphHTMLContent; }
                    break;
                case ITPA.Core.MessageListName:
                    if (checkShowOverlays && appStyles.ShowMessageOverlayOnHover) { overlayContent = prepareMessageHTMLContent; }
                    break;
                case ITPA.Core.IncidentListName:
                    if (checkShowOverlays && appStyles.ShowIncidentOverlayOnHover) { overlayContent = prepareIncidentHTMLContent; }
                    break;
                default:
                    needsZIndexChange = false;
                    break;
            }

            if (needsZIndexChange) {
                var newZIndex = !!isInHover ? aboveTopLayerZIndex : featureListZIndices[keyedFeatureListName];
                largeMap.GetLayerForKeyedFeature(keyedFeature).SetZIndex(newZIndex);
                smallMap.GetLayerForKeyedFeature(keyedFeature).SetZIndex(newZIndex);
            }

            if (overlayContent) {
                //var pointCoords = keyedFeature.GetPointCoords();
                showHTMLOverlay(keyedFeature, overlayContent);
            }
        }
    }

    function onFeatureMouseMove(notification) { }

    var trackCount = 1, maxTrackCount = 1000;

    function trackBus() {
        if (!!trackBusKeyedItemFeature) {
            var busCoords = trackBusKeyedItemFeature.GetPointCoords();
            var mapCenterCoords = largeMap.GetCenter();
            if (busCoords[0] != mapCenterCoords[0] || busCoords[1] != mapCenterCoords[1]) {
                largeMap.AnimatedSetCenterIfDestVisible(busCoords);
                return true;
            }
        }
        return false;
    }

    function onPreCompose(notification) {
        if (trackBus()) { notification.continueAnimation(); }
    }

    function stopBusTracking() { setTrackBusKeyedItem(undefined); }

    function setTrackBusKeyedItem(busKeyedItem) {
        var busTrackingControlE = busTrackingControl.GetHTMLElement(), displayStr;
        if (trackBusKeyedItem = busKeyedItem) {
            stopAutoCycle();
            trackBusKeyedItemKey = trackBusKeyedItem.GetKey();
            trackBusKeyedItemFeature = oc.GetKeyedFeatureFromKeyedItem(trackBusKeyedItem);
            switchMapAreaControl.SetVisible(false);
            var props = trackBusKeyedItem.GetData().properties;
            busTrackingControlE.innerHTML = "Tracking ";
            var buttonDim = "20px"
            var busBtn = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                dim: buttonDim, style: true, label: props.name, tooltip: "Show on list", onClick: function () {
                    oc.GetFeatureTables().GoTo(trackBusKeyedItem);
                }
            }));
            var closeBtn = styles.AddButtonDivMargins(new tf.ui.TextBtn({ dim: buttonDim, style: true, label: 'Stop', tooltip: "Stop Tracking", onClick: stopBusTracking }));
            busTrackingControl.AddContent(busBtn, closeBtn);
            displayStr = 'block';
            trackBus();
        }
        else {
            trackBusKeyedItemKey = undefined;
            trackBusKeyedItemFeature = undefined;
            switchMapAreaControl.SetVisible(true);
            displayStr = 'none';
        }
        busTrackingControlE.style.display = displayStr;
    }

    function getETAStyle(etaData, isHover) {
        var eta = etaData.eta;
        var etaStr = ITPA.Core.GetAMPMHour(eta);
        var isBus = !!etaData.isBus;
        var marker_arrowlength = isBus ? 24 : 20;
        var color = '#ffe57f';
        var zindex = isBus ? (isHover ? 10 : 9) : (isHover ? 3 : 2);
        return {
            marker: true, label: etaStr, font_height: isHover ? 18 : 15, zindex: zindex, marker_color: isHover ? "#ffa" : color, font_color: isHover ? "#008" : "#008",
            line_width: isHover ? 2 : 1, line_color: "#ffffff", marker_opacity: isHover ? 100 : 85, border_opacity: 60, border_color: "#000", marker_verpos: "bottom",
            marker_arrowlength: marker_arrowlength
        };
    }

    function getGetETAStyle(etaData, isHover) { return function (mapFeature) { return getETAStyle(etaData, isHover); } }

    function stopShowingETAs() { setETAKeyedItem(undefined); }

    function checkRefreshETAMarkers(notification) {
        if (!!etaKeyedItem) {
            refreshETAMarkers();
        }
    }

    function refreshETAMarkers() {
        //console.log('etadebug refreshETAMarkers');
        var ETAControlE = ETAControl.GetHTMLElement(), displayStr = 'none';
        delETAMarkers();
        var success = false;
        if (!!etaKeyedItem && !!coreETAList) {
            var isBus = isEtaKeyedItemBus, isStop = !isBus;
            var stopOrBusCoreList = isBus ? coreBusList : corePlatformList;

            if (!!stopOrBusCoreList) {
                var stopOrBusCoreKeyedList = stopOrBusCoreList.GetKeyedList();

                if (etaKeyedItem = stopOrBusCoreKeyedList.GetItem(etaKeyedItemKey)) {
                    var props = etaKeyedItem.GetData().properties;
                    var buttonDim = "20px"
                    var name = "Showing ETAs for bus ";
                    var label = isBus ? props.name : props.identifier;
                    if (isStop) { name += "stop "; }
                    ETAControl.ClearContent();
                    ETAControlE.innerHTML = name;
                    var closeBtn = styles.AddButtonDivMargins(new tf.ui.TextBtn({ dim: buttonDim, style: true, label: 'Stop', tooltip: "Stop Showing ETAs", onClick: stopShowingETAs }));
                    var etaBtn = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                        dim: buttonDim, style: true, label: label, tooltip: "Show on list", onClick: function () {
                            oc.GetFeatureTables().GoTo(etaKeyedItem);
                        }
                    }));
                    ETAControl.AddContent(etaBtn, closeBtn);

                    displayStr = 'block';
                    success = true;

                    var etaList = isBus ? coreETAList.GetEtasForBusId(etaKeyedItemKey) : coreETAList.GetEtasForStopId(etaKeyedItemKey);

                    if (!!etaList) {
                        var stopOrBusKeyAttributeName = isBus ? "stopKey" : "busKey";
                        var stopOrBusItemAttributeName = isBus ? "stopItem" : "busItem";
                        ETALayer = maps.GetLargeMapLayer(isBus ? ITPA.Core.PlatformListName : ITPA.Core.BusListName);

                        if (!!ETALayer) {

                            etaItemsDisplaying = {};

                            for (var i in etaList.etas) {
                                var etaData = etaList.etas[i]; // busItem, stopItem, busKey, stopKey
                                var stopOrBusKey = etaData[stopOrBusKeyAttributeName];
                                var etaItemDisplayingKey = tf.js.MakeObjectKey(stopOrBusKey);
                                if (etaItemsDisplaying[etaItemDisplayingKey] != undefined) { console.log('duplicate eta item in list'); continue; }

                                var stopOrBusItem = etaData[stopOrBusItemAttributeName];
                                var geom = { type: 'point', coordinates: [0, 0], style: getGetETAStyle(etaData, false), hoverStyle: getGetETAStyle(etaData, true) };
                                var etaFeature = new tf.map.Feature(geom);
                                var newEtaDisplayingItem = {
                                    etaFeature: etaFeature,
                                    etaData: etaData,
                                    etaItem: stopOrBusItem
                                };
                                etaItemsDisplaying[etaItemDisplayingKey] = newEtaDisplayingItem;
                                etaFeature.etaItem = stopOrBusItem;
                                updateEtaItemPos(newEtaDisplayingItem);

                                if (etaMarkers == undefined) { etaMarkers = [etaFeature]; } else { etaMarkers.push(etaFeature); }
                            }

                            if (etaMarkers != undefined && etaMarkers.length > 0) { for (var i = etaMarkers.length - 1 ; i >= 0 ; --i) { ETALayer.AddMapFeature(etaMarkers[i], true); } ETALayer.AddWithheldFeatures(); }
                        }
                    }
                }
            }
        }

        if (!success) {
            etaKeyedItem = undefined; etaKeyedItemKey = undefined;
        }

        ETAControlE.style.display = displayStr;
    }


    function updateEtaItemPos(itemDisplaying) {
        if (!!itemDisplaying) {
            var keyedFeature = oc.GetKeyedFeatureFromKeyedItem(itemDisplaying.etaItem);
            if (!!keyedFeature) {
                var etaFeature = itemDisplaying.etaFeature;
                etaFeature.SetPointCoords(keyedFeature.GetPointCoords());
            }
        }
    }

    function setETAKeyedItem(keyedItem, isBus) {
        etaKeyedItem = keyedItem;
        etaKeyedItemKey = !!keyedItem ? keyedItem.GetKey() : undefined;
        isEtaKeyedItemBus = !!isBus;
        refreshETAMarkers();
    }

    function delETAMarkers() {
        if (etaMarkers != undefined && ETALayer != undefined) {
            for (var i in etaMarkers) { ETALayer.DelMapFeature(etaMarkers[i]); }
            etaMarkers = undefined; ETALayer = undefined;
        }
        if (etaItemsDisplaying != undefined) {
            etaItemsDisplaying = undefined;
        }
    }

    function onFeatureClick(notification) {
        var keyedFeature = notification.keyedFeature;
        var mapFeature = notification.mapFeature;

        if (!!keyedFeature) {
            var theMap = notification.sender;
            var featureItem = keyedFeature.GetKeyedItem();
            var featureKey = keyedFeature.GetKeyedItemKey();
            var listName = keyedFeature.GetKeyedListName();
            var panCoords = keyedFeature.GetPointCoords();
            var toggleHover;
            var extent;
            var sendToTables;

            switch (listName) {
                case ITPA.Core.DeviceListName:
                    sendToTables = true;
                    break;
                case ITPA.Core.BusListName:
                    //toggleHover = true;
                    sendToTables = true;
                    break;
                case ITPA.Core.PlatformListName:
                    sendToTables = true;
                    break;
                case ITPA.Core.MessageListName:
                    sendToTables = true;
                    break;
                case ITPA.Core.IncidentListName:
                    sendToTables = true;
                    break;
                case ITPA.Core.OccupancyListName:
                    if (!!coreGarageList) {
                        sendToTables = !!(featureItem = coreGarageList.GetKeyedList().GetItem(featureKey));
                    }
                    panCoords = notification.eventCoords;
                    break;
                case ITPA.Core.GarageListName:
                    sendToTables = true;
                    panCoords = notification.eventCoords;
                    break;
                case ITPA.Core.RouteListName:
                    panCoords = notification.eventCoords;
                    if (theMap == largeMap) {
                        extent = notification.mapFeature.GetGeom().GetExtent();
                    }
                    sendToTables = true;
                    break;
                default:
                    panCoords = notification.eventCoords;
                    break;
            }
            if (extent != undefined) {
                extent = tf.js.ScaleMapExtent(extent, 1.4);
                theMap.SetVisibleExtent(extent);
            }
            else {
                panOtherMap(theMap, panCoords);
            }
            if (sendToTables) {
                oc.GetFeatureTables().GoTo(featureItem);
            }
        }
        else {
            if (!!mapFeature) {
                if (!!mapFeature.etaItem) {
                    oc.GetFeatureTables().GoTo(mapFeature.etaItem);
                }
            }
        }

        notifyMouseMoveClickHandler(notification, true, false);
    }

    function onFeatureDoubleClick(notification) {
        var keyedFeature = notification.keyedFeature;
        var processed;

        return processed ? true : onFeatureClick(notification);
    }

    function initialize() {
        oc = settings.oc;
        core = oc.GetCore();
        coreDeviceList = core.GetDeviceList();
        coreBusList = core.GetBusList();
        corePlatformList = core.GetPlatformList();
        coreGarageList = core.GetGarageList();
        if (!!(coreETAList = core.GetETAList())) {
            //coreBusETAList = coreETAList.GetBusList();
            //corePlatformETAList = coreETAList.GetPlatformList();
        }
        appStyles = oc.GetAppStyles();
        appSizer = oc.GetAppLayout().GetAppSizer();
        LargeMapFeatureStyleName = appStyles.LargeMapFeatureStyleName;
        styles = tf.GetStyles();
        mapEventSettings = {};
        mapEventSettings[tf.consts.mapMoveEndEvent] = onMapMoveEnd;
        mapEventSettings[tf.consts.mapClickEvent] = onClickMap;
        mapEventSettings[tf.consts.mapDblClickEvent] = onDoubleClickMap;
        mapEventSettings[tf.consts.mapMouseMoveEvent] = onMouseMoveMap;
        mapEventSettings[tf.consts.mapFeatureHoverInOutEvent] = onFeatureHoverInOut;
        mapEventSettings[tf.consts.mapFeatureMouseMoveEvent] = onFeatureMouseMove;
        mapEventSettings[tf.consts.mapFeatureClickEvent] = onFeatureClick;
        mapEventSettings[tf.consts.mapFeatureDblClickEvent] = onFeatureDoubleClick;
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
