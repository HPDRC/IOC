"use strict";

/**
* @this {ITPA.OC.GarageFeatureStyles}
*/
ITPA.OC.GarageFeatureStyles = function (settings) {

    var theThis, featureStyles, oc, appStyles, occupancyCoreList;

    this.GetFeatureStyles = function () { return featureStyles; }

    function getFeatureStyles() {

        var fillSpecs = { fill: true, zindex: 1 };
        var lineHoverSpecs = { line: true, line_width: appStyles.MapGarageLineHoverWidth, line_color: appStyles.MapGarageLineHoverColor, zindex: 2 };
        var lineHoverStyle = new tf.map.FeatureSubStyle(lineHoverSpecs);

        function getStyle(keyedFeature, mapFeature) {
            var isHover = mapFeature.GetIsDisplayingInHover();
            var key = keyedFeature.GetKeyedItemKey();
            var oc01 = !!occupancyCoreList ? occupancyCoreList.GetAvailability01ForKey(key) : undefined;
            if (oc01 != undefined) { oc01 = 1 - oc01; }
            var fill_color = appStyles.GetColorForOccupancy01(oc01);
            var fillSubStyle = new tf.map.FeatureSubStyle(tf.js.ShallowMerge(fillSpecs, { fill_color: fill_color  }));
            return isHover ? [fillSubStyle, lineHoverStyle] : fillSubStyle;
            /*var fillSubStyle = new tf.map.FeatureSubStyle(tf.js.ShallowMerge(fillSpecs, { fill_color: "#217a00" }));
            return fillSubStyle;*/
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
        occupancyCoreList = oc.GetCore().GetOccupancyList();
        featureStyles = getFeatureStyles();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
