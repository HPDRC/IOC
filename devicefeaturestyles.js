"use strict";

/**
* @this {ITPA.OC.DeviceFeatureStyles}
*/
ITPA.OC.DeviceFeatureStyles = function (settings) {

    var theThis, deviceKeyedList, featureStyles, oc, appStyles, coreFeatureLists, selfFeatureList, flashOnMoveDuration, layer;
    var moveAnimator;

    this.ShowDeviceHistory = function (deviceId, featureList) { return showDeviceHistory(deviceId, featureList); }

    this.HideDeviceHistory = function (deviceId) { return hideDeviceHistory(deviceId); }

    var baseTextStyleSpecs = {
        marker: true, font_height: 15, zindex: 3, marker_color: '#ffe57f', font_color: "#008",
        line_width: 1, line_color: "#ffffff", marker_opacity: 85, border_opacity: 60, border_color: "#000"
    };

    function hideDeviceHistory(deviceId) {
        var item = deviceKeyedList.GetItem(deviceId);
        if (!!item) {
            var h = item.deviceHistory;
            if (h != undefined) {
                var layer = oc.GetMaps().GetLargeMapLayer(ITPA.Core.DeviceListName);
                if (!!layer) {
                    var pf = h.pointFeatures;
                    for (var i in pf) {
                        layer.DelMapFeature(pf[i], true);
                    }
                    layer.DelMapFeature(h.lineFeature, true);
                    layer.DelWithheldFeatures();
                }
                item.deviceHistory = undefined;
            }
        }
    }

    function linkFeature(array, index, len) {
        var mapFeature = array[index];
        var prevIndex = index > 0 ? index - 1 : len - 1;
        var nextIndex = index < len - 1 ? index + 1 : 0;
        mapFeature.nextFeature = array[nextIndex];
        mapFeature.prevFeature = array[prevIndex];
    }

    function showDeviceHistory(deviceId, featureList) {
        hideDeviceHistory(deviceId);
        var item = deviceKeyedList.GetItem(deviceId);
        if (!!item) {
            var len = featureList.length;
            if (len > 0) {
                var layer = oc.GetMaps().GetLargeMapLayer(ITPA.Core.DeviceListName);
                if (!!layer) {
                    var pf = [];
                    var lineStringCoords = [];
                    for (var i in featureList) {
                        var d = featureList[i];
                        var geom = d.geometry;
                        var props = d.properties;
                        var label = '#' + deviceId + ' - ' + props.time_calculation;
                        var zindex = 4;
                        var textStyle = tf.js.ShallowMerge(baseTextStyleSpecs, { label: label, zindex: zindex + 2 });
                        lineStringCoords.push(geom.coordinates);
                        geom.style = [{
                            shape: true, circle: true, circle_radius: 8, line: true, line_width: 2, line_color: "#efefef", line_opacity: 60, snap_to_pixel: false, zindex: zindex
                        }, {
                            shape: true, circle: true, circle_radius: 6, line: true, line_width: 1, line_color: "#333", fill: true, fill_color: "#faa", fill_opacity: 30, snap_to_pixel: false, zindex: zindex + 1
                        }];
                        (geom.hoverStyle = geom.style.slice(0)).push(textStyle);
                        var mapFeature = new tf.map.Feature(geom);
                        pf.push(mapFeature);
                        layer.AddMapFeature(mapFeature, true);
                    }
                    /*var pflen = pf.length;
                    if (pflen > 1) { for (var i = 0 ; i < pflen ; ++i) { linkFeature(pf, i, pflen); } }*/
                    var lineFeatureGeom = { type: 'linestring', coordinates: lineStringCoords, style: { line: true, line_width: 1, line_color: "#000" } };
                    var lineFeature = new tf.map.Feature(lineFeatureGeom);
                    layer.AddMapFeature(lineFeature, true);
                    layer.AddWithheldFeatures();
                    item.deviceHistory = { pointFeatures: pf, lineFeature: lineFeature };
                }
            }
        }
    }

    this.GetFeatureStyles = function () { return featureStyles; }
    this.FlashOnMove = function (keyList, maps) { return flashOnMove(keyList, maps); }

    function getSelfFeatureList() {
        if (!!selfFeatureList) { return selfFeatureList; }
        if (!!(coreFeatureLists = oc.GetCoreFeatureLists())) { selfFeatureList = coreFeatureLists.GetDeviceList(); }
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

    function getFlashMoveStyle(elapsed01) {
        var radius = 4 + Math.pow(elapsed01, 1 / 2) * 16;
        var opacity = 1 - Math.pow(elapsed01, 3);
        var line_width = (2 - elapsed01);
        var g = Math.floor(255 * elapsed01);
        var gs = g.toString(16); if (g < 16) {
            gs = '0' + gs;
        }
        var line_color = '#88' + gs + 'ff';
        var flashStyle = {
            circle: true,
            circle_radius: radius,
            snapToPixel: false,
            line: true,
            line_width: line_width,
            line_color: line_color,
            line_opacity: opacity * 100
        };
        return flashStyle;
    }

    function flashOnMove(keyList, maps) { moveAnimator = flash(maps, getFeatures(keyList), flashOnMoveDuration, getFlashMoveStyle); }

    function getPointStyleSpecs(isHover) {
        var fill_color = "#37f";
        var radius = isHover ? 8 : 6;
        var zindex = isHover ? 3 : 2;
        var pointSpecs = [{
            circle: true,
            circle_radius: radius + 1,
            line: true,
            line_color: "#000",
            line_width: 2,
            snap_to_pixel: false,
            zindex: zindex - 1
        }, {
            circle: true,
            circle_radius: radius,
            fill: true, line: true,
            fill_color: fill_color,
            fill_opacity: 60,
            line_color: "#fc0",
            line_width: 2,
            snap_to_pixel: false,
            zindex: zindex
        }];
        return pointSpecs;
    }

    function getFeatureStyles() {

        function getStyle(keyedFeature, mapFeature) {
            var isHover = mapFeature.GetIsDisplayingInHover();
            var item = keyedFeature.GetKeyedItem(), data = item.GetData(), p = data.properties;
            var pointStyle = getPointStyleSpecs(isHover);
            if (isHover) {
                var label = '#' + p.device_id + ' - ' + p.last_position_on;
                var textStyleSpecs = tf.js.ShallowMerge(baseTextStyleSpecs, { label: label });
                pointStyle.push(textStyleSpecs);
            }
            return pointStyle;
        }

        //function getNormalStyle(mapFeature) { return getStyle(mapFeature, false); }
        //function getHoverStyle(mapFeature) { return getStyle(mapFeature, true); }

        var styleSettings = { style: getStyle, hoverStyle: getStyle };
        var styles = {};

        styles[tf.consts.defaultMapFeatureStyleName] = styles[appStyles.LargeMapFeatureStyleName] = styles[appStyles.SmallMapFeatureStyleName] = styleSettings;
        return { styles: styles };
    }

    function initialize() {
        oc = settings.oc;
        var deviceList = oc.GetCore().GetDeviceList();
        deviceKeyedList = !!deviceList ? deviceList.GetKeyedList() : undefined;
        appStyles = oc.GetAppStyles();
        flashOnMoveDuration = 1000;
        featureStyles = getFeatureStyles();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
