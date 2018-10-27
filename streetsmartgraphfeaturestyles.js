"use strict";

/**
* @this {ITPA.OC.StreetSmartGraphFeatureStyles}
*/
ITPA.OC.StreetSmartGraphFeatureStyles = function (settings) {

    var theThis, featureStyles, oc, appStyles, ssgCoreList, ssgCoreKeyedList;
    var vacancyUnknownColor;

    var getColorIndexForOccupancy01 = function (oc01) {
        var colorIndex = undefined;
        if (oc01 !== undefined) {
            var nColors = g_occupancyColors.length - 1;
            oc01 = tf.js.NumberClip(tf.js.GetFloatNumber(oc01, 1), 0, 1);
            colorIndex = Math.floor(oc01 * nColors);
        }
        return colorIndex;
    };

    this.GetFeatureStyles = function () { return featureStyles; }

    function getFeatureStyles() {

        /*function getStyle(mapFeature, isHover) {
            var key = mapFeature.GetKeyedItemKey();
            var item = !!ssgCoreKeyedList ? ssgCoreKeyedList.GetItem(key) : undefined;
            var p = !!item ? item.GetData().properties : undefined;
            var line_color = !!p ? p.color : vacancyUnknownColor;
            var around_line_color = isHover ? "#000" : "#88a";
            var lineWidth = isHover ? 8 : 6;
            //console.log('line_color: ' + line_color);
            return [
                    { line: true, line_width: lineWidth + 4, line_color: around_line_color, zindex: 1, line_opacity: 70, line_dash: [20, 10] },
                    { line: true, line_width: lineWidth, line_color: line_color, line_opacity: 100, zindex: 2, line_dash: [20, 10] }
            ];
        }

        function getNormalStyle(mapFeature) { return getStyle(mapFeature, false); }
        function getHoverStyle(mapFeature) { return getStyle(mapFeature, true); }*/

        function getStyle(keyedFeature, mapFeature) {
            var isHover = mapFeature.GetIsDisplayingInHover();
            var key = keyedFeature.GetKeyedItemKey();
            var item = !!ssgCoreKeyedList ? ssgCoreKeyedList.GetItem(key) : undefined;
            var p = !!item ? item.GetData().properties : undefined;
            var line_color = !!p ? p.color : vacancyUnknownColor;
            var around_line_color = isHover ? "#000" : "#88a";
            var lineWidth = isHover ? 8 : 6;
            //console.log('line_color: ' + line_color);
            return [
                    { line: true, line_width: lineWidth + 4, line_color: around_line_color, zindex: 1, line_opacity: 70, line_dash: [20, 10] },
                    { line: true, line_width: lineWidth, line_color: line_color, line_opacity: 100, zindex: 2, line_dash: [20, 10] }
            ];
        }

        var styleSettings = { style: getStyle, hoverStyle: getStyle };
        var styles = {};

        styles[tf.consts.defaultMapFeatureStyleName] = styles[appStyles.LargeMapFeatureStyleName] = styles[appStyles.SmallMapFeatureStyleName] = styleSettings;
        return { styles: styles };
    }

    function initialize() {
        vacancyUnknownColor = "#bfbfbf";
        oc = settings.oc;
        appStyles = oc.GetAppStyles();
        ssgCoreList = oc.GetCore().GetStreetSmartGraphList();
        ssgCoreKeyedList = !!ssgCoreList ? ssgCoreList.GetKeyedList() : undefined;
        featureStyles = getFeatureStyles();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
