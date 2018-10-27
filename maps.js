"use strict";

/**
* @this {ITPA.OC.Maps}
*/
ITPA.OC.Maps = function (settings) {

    var theThis, oc, core, styles, appStyles, smallMapObj, smallMap, largeMapObj, largeMap, defaultMapSettings;
    var featureListZIndices, aboveTopLayerZIndex;
    var mapBubble, mapInBubble, showingBubbleMap;
    var canAdmin;


    this.GetFeatureListZIndices = function () { return tf.js.ShallowMerge(featureListZIndices); }
    this.GetAboveTopLayerZIndex = function () { return aboveTopLayerZIndex; }
    this.OnResize = function () { smallMap.OnResize(); largeMap.OnResize(); }

    this.GetSmallMap = function () { return smallMap; }
    this.GetLargeMap = function () { return largeMap; }
    this.GetBubbleMap = function () { return mapInBubble; }
    this.ShowBubbleMap = function (show) { return showBubbleMap(show); }
    this.GetIsShowingBubbleMap = function () { return showingBubbleMap; }

    this.GetLargeMapLayer = function (listName) {
        var layer;
        if (!!largeMapObj) { layer = largeMapObj.layers[listName]; }
        return layer;
    }

    this.GetSmallMapLayer = function (listName) {
        var layer;
        if (!!smallMapObj) { layer = smallMapObj.layers[listName]; }
        return layer;
    }

    this.SetLargeMapLayerVisible = function (listName, visibleBool) {
        var layer = theThis.GetLargeMapLayer(listName);
        return !!layer ? layer.SetVisible(visibleBool) : false;
    }

    this.IsLargeMapLayerVisible = function (listName) {
        var layer = theThis.GetLargeMapLayer(listName);
        return !!layer ? layer.GetIsVisible() : false;
    }

    function showBubbleMap(show) {
        if (showingBubbleMap != (show = !!show)) {
            styles.ChangeOpacityVisibilityClass(mapBubble, showingBubbleMap = show);
        }
    }

    function createFeatureListZIndex(layerSettings, featureListName, zIndex) {
        layerSettings[featureListName] = { zIndex: featureListZIndices[featureListName] = zIndex }; return ++zIndex;
    }

    function createLayerSettings() {
        var layerSettings = {}, zIndex = 0;
        var listNamesInZOrder = [
            ITPA.Core.GarageListName, ITPA.Core.StreetSmartGraphListName, ITPA.Core.RouteListName, ITPA.Core.PlatformListName, ITPA.Core.BusListName,
            ITPA.Core.MessageListName, ITPA.Core.IncidentListName, ITPA.Core.OccupancyListName];
        
        if (canAdmin) { listNamesInZOrder.push(ITPA.Core.DeviceListName); };

        for (var i in listNamesInZOrder) {
            var listName = listNamesInZOrder[i];
            var layerName = core.GetLayerNameForListName(listName);
            zIndex = createFeatureListZIndex(layerSettings, listName, zIndex);
            layerSettings[listName].name = layerName;
            layerSettings[listName].isVisible = true;
            layerSettings[listName].isHidden = false;
        }

        layerSettings[ITPA.Core.OccupancyListName].minMaxLevels = { minLevel: 15, maxLevel: 21 };
        layerSettings[ITPA.Core.StreetSmartGraphListName].minMaxLevels = { minLevel: 14, maxLevel: 21 };

        aboveTopLayerZIndex = zIndex;

        return layerSettings;
    }

    function createMap(mapSettings, mapEventSettings, layerSettings, useLogo) {
        var minZoom = appStyles.MapMinZoom, maxZoom = appStyles.MapMaxZoom;
        var extent = core.GetMapExtent();
        var panels = tf.consts.panelNameNoAddress + '+' + tf.consts.panelNameNoMapLocation + '+' + tf.consts.panelNameNoMapScale + '+' +
            tf.consts.panelNameNoUserLocation + '+' + tf.consts.panelNameLayers;
        var mapLayers = {};
        var mapSettingsUse = tf.js.ShallowMerge(defaultMapSettings);

        if (!!useLogo) { mapSettingsUse.panels += '+' + tf.consts.panelNameTFLogo; }

        var mapSettingsMerged = tf.js.ShallowMerge(mapSettings, mapSettingsUse);
        var map = new tf.map.Map(mapSettingsMerged);

        for (var i in layerSettings) {
            mapLayers[i] = map.AddFeatureLayer(layerSettings[i]);
        }
        map.AddListeners(mapEventSettings);
        return { map: map, layers: mapLayers } ;
    }

    var mapBubbleMaximized = false;

    function setMapBubbleMaximized(set) {
        if (mapBubbleMaximized != (set = !!set)) {
            var mapBubbleE = mapBubble.GetHTMLElement(), mapBubbleES = mapBubbleE.style;
            if (mapBubbleMaximized = set) {
                mapBubbleES.width = mapBubbleES.height = "calc(100% - 22px)";
            }
            else {
                mapBubbleES.width = "50%";
                mapBubbleES.height = "35%";
            }
            mapInBubble.OnResize();
        }
    };

    function toggleMapBubbleMaximized() { setMapBubbleMaximized(!mapBubbleMaximized); };

    function onMapDoubleClick(notification) {
        toggleMapBubbleMaximized();
    };

    function createMapBubble(parentContainer) {
        styles = tf.GetStyles();
        var subStyles = styles.GetSubStyles();
        var rightMarginPX = 8;
        var margin = rightMarginPX + "px";
        var bottomMargin = (rightMarginPX) + "px";
        var containerStyles = {
            inherits: [subStyles.cursorDefaultStyle, subStyles.noSelectStyle],
            backgroundColor: "white", color: "rgb(0, 68, 152)",
            border: "2px dashed rgb(0, 68, 152)", borderRadius: "10px", padding: "0px",
            width: "50%", height: "35%",
            "tf-shadow": [0, 0, 8, "rgba(0,0,0,0.6)"],
            padding: "2px",
            position: "absolute", left: margin, bottom: bottomMargin,
            display: "block", zIndex: 1, opacity: 1
        };

        mapBubble = new tf.dom.Div(null, styles.GetUnPaddedDivClassNames(false, false));

        //var mapMapBubble = new tf.dom.Div(null, styles.GetUnPaddedDivClassNames(false, false));
        var mapMapBubble = mapBubble;

        styles.ApplyStyleProperties(mapBubble, containerStyles);

        var panels = tf.consts.panelNameNoAddress + '+' + tf.consts.panelNameNoMapLocation + '+' + tf.consts.panelNameNoMapScale + '+' + tf.consts.panelNameNoUserLocation;

        var mapInBubbleSettings = tf.js.ShallowMerge(defaultMapSettings, {
            container: mapMapBubble, panels: panels, extent: undefined, viewSettings: undefined,
            level: 16,
            showMapCenter: false,
            showScale: true,
            center: oc.GetAppStyles().LargeMapCenterCoords
        });

        mapInBubble = new tf.map.Map(mapInBubbleSettings);
        mapInBubble.SetHasInteractions(true);

        //mapBubble.AddContent(mapMapBubble);

        mapBubble.AppendTo(parentContainer);

        mapInBubble.SetGoDBOnDoubleClick(false);

        mapInBubble.AddListener(tf.consts.mapDblClickEvent, onMapDoubleClick);

        oc.GetAppLayout().GetAppSizer().AddMap(mapInBubble);

        setTimeout(function () { mapInBubble.OnResize(); }, 500);

        styles.ChangeOpacityVisibilityClass(mapBubble, false);
        showingBubbleMap = false;
    }

    function createMaps() {
        var layerSettings = createLayerSettings();
        smallMapObj = createMap(settings.smallMapSettings, settings.mapEventSettings, layerSettings, false);
        largeMapObj = createMap(settings.largeMapSettings, settings.mapEventSettings, layerSettings, true);
        smallMap = smallMapObj.map;
        largeMap = largeMapObj.map;

        createMapBubble(largeMap.GetMapMapContainer());
    }

    function initDefaultMapSettings() {
        var minZoom = appStyles.MapMinZoom, maxZoom = appStyles.MapMaxZoom;
        var extent = core.GetMapExtent();
        var viewSettings = { minLevel: minZoom, maxLevel: maxZoom, extent: extent };
        var panels = tf.consts.panelNameNoAddress + '+' + tf.consts.panelNameNoMapLocation + '+' + tf.consts.panelNameNoMapScale + '+' +
            tf.consts.panelNameNoUserLocation + '+' + tf.consts.panelNameLayers;

        //viewSettings = undefined;

        defaultMapSettings = {
            panels: panels, mapEngine: tf.consts.mapnik2Engine, mapType: tf.consts.typeNameMap, mapSource: tf.consts.sourceName_best_available,
            viewSettings: viewSettings, showMapCenter: false
        };
    }

    function initialize() {
        featureListZIndices = {};
        aboveTopLayerZIndex = 0;
        oc = settings.oc;
        appStyles = oc.GetAppStyles();
        core = oc.GetCore();
        canAdmin = core.GetCanAdmin();
        initDefaultMapSettings();
        createMaps();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
