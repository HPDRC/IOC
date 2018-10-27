"use strict";

/**
* @this {ITPA.OC.OccupancyFeatureStyles}
*/
ITPA.OC.OccupancyFeatureStyles = function (settings) {

    var theThis, featureStyles, oc, appStyles, occupancyCoreList;

    this.GetFeatureStyles = function () { return featureStyles; }

    function getFeatureStyles() {

        var textStyleSpecs = tf.js.ShallowMerge(appStyles.BaseTextFeatureStyle, { zindex: 2 });

        function getStyle(keyedFeature, mapFeature) {
            var isHover = mapFeature.GetIsDisplayingInHover();
            var item = keyedFeature.GetKeyedItem();
            var itemData = item.GetData(), p = itemData.properties;
            var label = p.identifier.toLowerCase();
            var lineWidth = isHover ? 2 : 1;
            var zindex = isHover ? 6 : 1;
            var marker_color = "#fff";

            if (p.available_percentage_str != undefined) {
                label += ' ' + p.available_percentage_str;
                marker_color = "#ffd";
                zindex = isHover ? 7 : 2;
            }

            isHover = true;

            var markerOpacity = isHover ? 100 : 80;
            var baseStyle = {
                marker_horpos: "center", marker_verpos: "center",
                marker: true, label: label, font_height: isHover ? 15 : 12, zindex: zindex, marker_color: marker_color, font_color: isHover ? "#008" : "#008",
                line_width: lineWidth, line_color: "#ffffff", marker_opacity: markerOpacity, border_opacity: 60, border_color: "#000"
            };
            return baseStyle;
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
        appStyles = oc.GetAppStyles();
        occupancyCoreList = oc.GetCore().GetOccupancyList();
        featureStyles = getFeatureStyles();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

