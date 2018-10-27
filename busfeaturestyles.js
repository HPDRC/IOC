"use strict";

/**
* @this {ITPA.OC.BusFeatureStyles}
*/
ITPA.OC.BusFeatureStyles = function (settings) {

    var theThis, featureStyles, oc, appStyles, etaList, routesList, coreFeatureLists, selfFeatureList, pointStyles, lineDirections;
    var etaChangeAnimator, moveAnimator;

    this.GetFeatureStyles = function () { return featureStyles; }
    this.FlashETAChanged = function (keyList, maps) { return flashETAChanged(keyList, maps); }
    this.FlashOnMove = function (keyList, maps) { return flashOnMove(keyList, maps); }

    function getSelfFeatureList() {
        if (!!selfFeatureList) { return selfFeatureList; }
        if (!!(coreFeatureLists = oc.GetCoreFeatureLists())) { selfFeatureList = coreFeatureLists.GetBusList(); }
        return selfFeatureList;
    }

    function getFeatures (keyList) { var featureList = getSelfFeatureList(); return !!featureList ? featureList.GetFeatures(keyList) : null; }

    function flash(maps, features, duration, getStyle) {
        var animator;
        if (!!features && !!features.length) {
            var fp = []; for (var i in features) { fp.push(features[i].GetPointCoords()); }
            animator = new tf.map.PointsStyleAnimator({ maps: maps, pointProviders: fp, duration: duration, getStyle: getStyle });
        }
        return animator;
    }

    function flashETAChanged(keyList, maps) { etaChangeAnimator = flash(maps, getFeatures(keyList), appStyles.FlashBusETADuration, appStyles.GetFlashBusETAStyle); }
    function flashOnMove(keyList, maps) { moveAnimator = flash(maps, getFeatures(keyList), appStyles.FlashBusOnMoveDuration, appStyles.GetFlashMoveBusStyle); }

    function getBusHasETAs(busKey) { return !!etaList ? etaList.GetBusHasEtas(busKey) : false; }

    function getPointStyleSpecs(isHover, hasETAs, hasStaleETAs) {
        var fill_color = hasETAs ? hasStaleETAs ? appStyles.BusFeatureWithStaleETAsShapeFillColor : appStyles.BusFeatureWithGoodETAsShapeFillColor : appStyles.BusFeatureWithoutETAsShapeFillColor;
        var scale, zindex, outlineImg;

        if (hasETAs) {
            outlineImg = oc.GetMapBusBlueOutlineImg();
            zindex = isHover ? 6 : 2;
        }
        else {
            outlineImg = oc.GetMapBusRedOutlineImg();
            zindex = isHover ? 5 : 1;
        }

        scale = isHover ? 0.7 : 0.55;

        var outlineSpecs = { icon: true, icon_img: outlineImg, icon_size: outlineImg.GetDimensions(), scale: scale, zindex: zindex };
        var directionImg = oc.GetMapBusDirectionImg();

        var pointSpecs = { icon: true, icon_img: directionImg, icon_size: directionImg.GetDimensions(), scale: scale, zindex: zindex + 1, rotate_with_map: true };

        return [outlineSpecs, pointSpecs];
    }

    function createPointStyles() {
        var indices = [false, true];

        pointStyles = [[[], []], [[], []]];

        for (var i in indices) {
            var isHover = indices[i];
            for (var j in indices) {
                var hasETAs = indices[j];
                for (var k in indices) {
                    var hasStaleETAs = indices[k];
                    pointStyles[i][j][k] = new tf.map.FeatureSubStyle(getPointStyleSpecs(isHover, hasETAs, hasStaleETAs));
                }
            }
        }
    }

    function getPointStyle(isHover, hasETAs, hasStaleETAs) { return pointStyles[!!isHover ? 1 : 0][!!hasETAs ? 1 : 0][!!hasStaleETAs ? 1 : 0]; }

    function getFeatureStyles() {

        var baseBusTextStyleSpecs = { marker: true, marker_horpos: "center", marker_verpos: "top", zindex: 4, marker_arrowlength: 24 };

        function getStyle(keyedFeature, mapFeature) {
            var isHover = mapFeature.GetIsDisplayingInHover();
            var bus = keyedFeature.GetKeyedItem(), data = bus.GetData(), p = data.properties;
            var key = keyedFeature.GetKeyedItemKey();
            var line = routesList.GetKeyedList().GetItem(p.line_id);
            var hasETAs = getBusHasETAs(key);
            var pointStyle = getPointStyleSpecs(isHover, hasETAs, false);
            pointStyle[1].rotation_rad = p.heading * Math.PI / 180;
            if (isHover) {
                var label = '#' + p.name + ' - ' + p.fleet.toUpperCase();
                //var label = '#' + p.public_transport_vehicle_id + ' - ' + p.fleet.toUpperCase();
                if (line) {
                    var ldp = line.GetData().properties;
                    var direction = ldp.direction.toLowerCase();
                    if (!!lineDirections[direction]) { direction = lineDirections[direction].ab; }
                    var fleet_id = ldp.fleet_id.slice(-4);

                    label += ' ' + fleet_id + ' ' + direction;
                }

                var ocp = ITPA.Core.GetOccupancyPercentage01(p.number_of_occupants);

                if (ocp != undefined) { label += ' (' + (ocp * 100).toFixed (0) + '% full)'; }

                var textStyleSpecs = tf.js.ShallowMerge(baseBusTextStyleSpecs, { label: label });
                pointStyle.push(textStyleSpecs);
            }
            return pointStyle;
        }

        //function getNormalStyle(mapFeature) { return getStyle(mapFeature, false); }
        //function getHoverStyle(mapFeature) { return getStyle(mapFeature, true); }

        //var styleSettings = { style: getNormalStyle, hoverStyle: getHoverStyle };
        var styleSettings = { style: getStyle, hoverStyle: getStyle };
        var styles = {};

        styles[tf.consts.defaultMapFeatureStyleName] = styles[appStyles.LargeMapFeatureStyleName] = styles[appStyles.SmallMapFeatureStyleName] = styleSettings;
        return { styles: styles };
    }

    function initialize() {
        oc = settings.oc;
        appStyles = oc.GetAppStyles();
        etaList = oc.GetCore().GetETAList();
        routesList = oc.GetCore().GetRouteList();
        lineDirections = ITPA.Core.MakeLineDirectionAbreviations();
        //createPointStyles();
        featureStyles = getFeatureStyles();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
