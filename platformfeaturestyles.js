"use strict";

/**
* @this {ITPA.OC.PlatformFeatureStyles}
*/
ITPA.OC.PlatformFeatureStyles = function (settings) {

    var theThis, featureStyles, oc, appStyles, etaList, coreFeatureLists, selfFeatureList, pointStyles;
    var etaChangeAnimator;

    this.GetFeatureStyles = function () { return featureStyles; }
    this.FlashETAChanged = function (keyList, maps) { return flashETAChanged(keyList, maps); }

    function getSelfFeatureList() {
        if (!!selfFeatureList) { return selfFeatureList; }
        if (!!(coreFeatureLists = oc.GetCoreFeatureLists())) { selfFeatureList = coreFeatureLists.GetPlatformList(); }
        return selfFeatureList;
    }

    function getFeatures(keyList) { var featureList = getSelfFeatureList(); return !!featureList ? featureList.GetFeatures(keyList) : null; }

    function flash(maps, features, duration, getStyle) {
        var animator;
        if (!!features && !!features.length) {
            var fp = []; for (var i in features) { fp.push(features[i].GetPointCoords()); }
            animator = new tf.map.PointsStyleAnimator({ maps: maps, pointProviders: fp, duration: duration, getStyle: getStyle });
        }
        return animator;
    }

    function flashETAChanged(keyList, maps) { etaChangeAnimator = flash(maps, getFeatures(keyList), appStyles.FlashPlatformETADuration, appStyles.GetFlashPlatformETAStyle); }

    function getPlatformHasETAs(platformKey) { return !!etaList ? etaList.GetStopHasEtas(platformKey) : false; }

    function getSmallRadius(radius) { return ((radius = radius /= 3) < 1) ? 1 : radius; }

    function getPointStyleSpecs (useSmallShape, isHover, hasETAs, hasStaleETAs) {
        var fill_color = hasETAs ? hasStaleETAs ? appStyles.PlatformFeatureWithStaleETAsShapeFillColor : appStyles.PlatformFeatureWithGoodETAsShapeFillColor : appStyles.PlatformFeatureWithoutETAsShapeFillColor;
        var pointSpecs ;

        if (!!isHover) {
            var radius = hasETAs ? appStyles.PlatformFeatureShapeHoverWithETAsRadius : appStyles.PlatformFeatureShapeHoverRadius;

            if (useSmallShape) { radius = getSmallRadius(radius); }

            var radius2 = radius / 2;

            pointSpecs = {
                circle: true,
                circle_radius: radius,
                //shape_points: appStyles.PlatformFeatureShapePoints,
                //shape_radius: null,
                //shape_radius1: radius,
                //shape_radius2: radius2,
                //rotation_rad: appStyles.PlatformFeatureShapeHoverRotation,
                fill_color: fill_color,
                zindex: hasETAs ? 5 : 4
            };
        }

        else {
            var radius = hasETAs ? appStyles.PlatformFeatureShapeNormalWithETAsRadius : appStyles.PlatformFeatureShapeNormalRadius;

            if (useSmallShape) { radius = getSmallRadius(radius); }

            pointSpecs = {
                circle: true,
                circle_radius: radius,
                //shape: true,
                //shape_points: appStyles.PlatformFeatureShapePoints,
                //shape_radius: radius,
                //shape_radius1: null,
                //shape_radius2: null,
                //rotation_rad: appStyles.PlatformFeatureShapeNormalRotation,
                fill_color: fill_color,
                zindex: hasETAs ? 2 : 1
            };
        }

        var stopShapeFeatureStyle = {
            shape: true, fill: true, line: true,
            line_color: "#000",
            line_width: 1
        };

        return tf.js.ShallowMerge(stopShapeFeatureStyle, pointSpecs);
    }

    function createPointStyles() {
        var indices = [false, true];

        pointStyles = [[[[], []], [[], []]],[[[], []], [[], []]]];

        for (var a in indices) {
            var useSmallRadius = indices[a];
            for (var i in indices) {
                var isHover = indices[i];
                for (var j in indices) {
                    var hasETAs = indices[j];
                    for (var k in indices) {
                        var hasStaleETAs = indices[k];
                        pointStyles[a][i][j][k] = new tf.map.FeatureSubStyle(getPointStyleSpecs(useSmallRadius, isHover, hasETAs, hasStaleETAs));
                    }
                }
            }
        }
    }

    function getPointStyle(useSmallRadius, isHover, hasETAs, hasStaleETAs) { return pointStyles[!!useSmallRadius ? 1 : 0][!!isHover ? 1 : 0][!!hasETAs ? 1 : 0][!!hasStaleETAs ? 1 : 0]; }

    function getFeatureStyles() {

        //var baseTextStyleSpecs = { marker: true, marker_horpos: "center", marker_verpos: "top", zindex: 4, marker_arrowlength: 24, marker_color: '#ffe57f' };
        var baseTextStyleSpecs = {
            marker: true, font_height: 15, zindex: 3, marker_color: '#ffe57f', font_color: "#008",
            line_width: 1, line_color: "#ffffff", marker_opacity: 85, border_opacity: 60, border_color: "#000"
        };

        /*function getStyle(mapFeature, isHover, useSmallRadius) {
            var item = mapFeature.GetKeyedItem(), data = item.GetData(), p = data.properties;
            var key = mapFeature.GetKeyedItemKey();
            var hasETAs = getPlatformHasETAs(key);
            var pointStyle = [getPointStyle(useSmallRadius, isHover, hasETAs, false)];
            if (isHover) {
                var label = '#' + p.fleet_id + ' - ' + p.fleet.toUpperCase() + ' - ' + p.identifier.toLowerCase();
                var textStyleSpecs = tf.js.ShallowMerge(baseTextStyleSpecs, { label: label });
                pointStyle.push(textStyleSpecs);
            }
            return pointStyle;
        }*/

        function getStyle(keyedFeature, mapFeature) {
            var isHover = mapFeature.GetIsDisplayingInHover();
            var useSmallRadius = mapFeature.getStyleName() == appStyles.SmallMapFeatureStyleName;
            var item = keyedFeature.GetKeyedItem(), data = item.GetData(), p = data.properties;
            var key = keyedFeature.GetKeyedItemKey();
            var hasETAs = getPlatformHasETAs(key);
            var pointStyle = [getPointStyle(useSmallRadius, isHover, hasETAs, false)];
            if (isHover) {
                var label = '#' + p.fleet_id + ' - ' + p.fleet.toUpperCase() + ' - ' + p.identifier.toLowerCase();
                var textStyleSpecs = tf.js.ShallowMerge(baseTextStyleSpecs, { label: label });
                pointStyle.push(textStyleSpecs);
            }
            return pointStyle;
        }

        //function getNormalStyle(mapFeature) { return getStyle(mapFeature, false, false); }
        //function getHoverStyle(mapFeature) { return getStyle(mapFeature, true, false); }

        //function getNormalStyleSmallRadius(mapFeature) { return getStyle(mapFeature, false, true); }
        //function getHoverStyleSmallRadius(mapFeature) { return getStyle(mapFeature, true, true); }

        //var defaultStyleSettings = { style: getNormalStyle, hoverStyle: getHoverStyle };
        //var smallRadiusStyleSettings = { style: getNormalStyleSmallRadius, hoverStyle: getHoverStyleSmallRadius };

        var defaultStyleSettings = { style: getStyle, hoverStyle: getStyle };
        var smallRadiusStyleSettings = { style: getStyle, hoverStyle: getStyle };
        var styles = {};

        styles[tf.consts.defaultMapFeatureStyleName] = styles[appStyles.LargeMapFeatureStyleName] = defaultStyleSettings;
        styles[appStyles.SmallMapFeatureStyleName] = smallRadiusStyleSettings;
        return { styles: styles };
    }

    function initialize() {
        oc = settings.oc;
        appStyles = oc.GetAppStyles();
        etaList = oc.GetCore().GetETAList();
        createPointStyles();
        featureStyles = getFeatureStyles();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

