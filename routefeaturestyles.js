"use strict";

/**
* @this {ITPA.OC.RouteFeatureStyles}
*/
ITPA.OC.RouteFeatureStyles = function (settings) {

    var theThis, featureStyles, oc, appStyles, colorStyleCaches;
    var mapRouteLineWidth, normalRouteStyleSpecs, normaRouteStyle, hoverRouteStyleSpecs, hoverRouteStyle, colorRouteStyleSpecsBase;

    this.GetFeatureStyles = function () { return featureStyles; }

    this.GetRouteStyle = function (lineItem, isHover) { return getItemColorStyle(lineItem, isHover, false); }

    function getItemColorStyle(item, isHover, isSmall) {
        var lineWidth = 3, zindex = isHover ? 5 : 1;
        var lineWidthTick = lineWidth * 2 + 1;
        var lineItemColor = item.GetData().properties.color;
        var lineWidthNoHover = isHover ? lineWidth : (isSmall ? 1 : lineWidth);
        var style = { line: true, line_color: lineItemColor, line_width: lineWidthNoHover, zindex: zindex };
        if (isHover) { style.line_dash = [20, 20]; style.line_color = "#fff"; };
        return isHover ? [{ line: true, line_color: "#000", line_width: lineWidthTick + 2, zindex: 3 },
            { line: true, line_color: lineItemColor, line_width: lineWidthTick, zindex: 4 }, style] : style;
    }

    function getStyle(keyedFeature, mapFeature) {
        var isHover = mapFeature.GetIsDisplayingInHover();
        var isSmall = mapFeature.getStyleName() == appStyles.SmallMapFeatureStyleName;
        return getItemColorStyle(keyedFeature.GetKeyedItem(), isHover, isSmall);
    }

    /*function getColorStyle(mapFeature, isHover, isSmall) { var item = mapFeature.GetKeyedItem(); return getItemColorStyle(item, isHover, isSmall); }
    function getNormalColorStyleSmall(mapFeature) { return getColorStyle(mapFeature, false, true); }
    function getHoverColorStyleSmall(mapFeature) { return getColorStyle(mapFeature, true, true); }
    function getNormalColorStyle(mapFeature) { return getColorStyle(mapFeature, false, false); }
    function getHoverColorStyle(mapFeature) { return getColorStyle(mapFeature, true, false); }*/

    function getFeatureStyles() {

        //var routeStyleWithColor = { style: getNormalColorStyle, hoverStyle: getHoverColorStyle };
        //var routeStyleWithColorSmall = { style: getNormalColorStyleSmall, hoverStyle: getHoverColorStyleSmall };

        var routeStyleWithColor = { style: getStyle, hoverStyle: getStyle };
        var routeStyleWithColorSmall = { style: getStyle, hoverStyle: getStyle };
        var styles = {};

        styles[tf.consts.defaultMapFeatureStyleName] = routeStyleWithColor;
        styles[appStyles.LargeMapFeatureStyleName] = routeStyleWithColor;
        styles[appStyles.SmallMapFeatureStyleName] = routeStyleWithColorSmall;
        return { styles: styles };
    }

    function initialize() {
        oc = settings.oc;
        appStyles = oc.GetAppStyles();

        mapRouteLineWidth = appStyles.MapRouteLineWidth;
        normalRouteStyleSpecs = { zindex: 3, line: true, line_color: appStyles.MapLineNormalColor, line_width: mapRouteLineWidth };
        normaRouteStyle = new tf.map.FeatureStyle(normalRouteStyleSpecs);

        hoverRouteStyleSpecs = tf.js.ShallowMerge(normalRouteStyleSpecs, { zindex: 4, line_color: appStyles.MapRouteLineHoverColor });
        hoverRouteStyle = new tf.map.FeatureStyle(hoverRouteStyleSpecs);

        colorRouteStyleSpecsBase = [
            { line: true, line_width: appStyles.MapColorRouteLineWidth },
            {
                zindex: 2, line: true, line_color: appStyles.MapRouteLineDashColor, line_width: 1, line_dash: appStyles.MapRouteLineDash
            }];


        //featureStyles = tf.js.ShallowMerge(getFeatureStyles(), { simplifyTolerance: 2 });
        featureStyles = getFeatureStyles();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};


