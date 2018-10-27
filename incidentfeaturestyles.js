"use strict";

/**
* @this {ITPA.OC.IncidentFeatureStyles}
*/
ITPA.OC.IncidentFeatureStyles = function (settings) {
    var theThis, coreFeatureLists, oc, appStyles, selfFeatureList, featureStyles, hoverPointStyle;
    var flashAnimator;

    this.GetFeatureStyles = function () { return featureStyles; }
    this.Flash = function (keyList, maps) { return flash(keyList, maps); }

    function getSelfFeatureList() {
        if (!!selfFeatureList) { return selfFeatureList; }
        if (!!(coreFeatureLists = oc.GetCoreFeatureLists())) { selfFeatureList = coreFeatureLists.GetIncidentList(); }
        return selfFeatureList;
    }

    function getFlashStyle(elapsed01) {
        return appStyles.GetFlashIconNotificationStyle(elapsed01, hoverPointStyle, "#f00", 16, [4, 2]);
    }

    function doFlash(maps, features, duration, getStyle) {
        var animator;
        if (!!features && !!features.length) {
            var fp = []; for (var i in features) { fp.push(features[i].GetPointCoords()); }
            animator = new tf.map.PointsStyleAnimator({ maps: maps, pointProviders: fp, duration: duration, getStyle: getStyle });
        }
        return animator;
    }

    function getFeatures(keyList) { var featureList = getSelfFeatureList(); return !!featureList ? featureList.GetFeatures(keyList) : null; }

    function flash(keyList, maps) { flashAnimator = doFlash(maps, getFeatures(keyList), appStyles.FlashMessageDuration, getFlashStyle); }

    function initialize() {
        oc = settings.oc;
        var img = oc.GetMapIncidentImg();
        appStyles = oc.GetAppStyles();
        var normalPointStyle = { scale: 0.8, zindex: 1, icon: true, icon_anchor: [0.5, 0.5], icon_img: img, icon_size: img.GetDimensions() };
        hoverPointStyle = tf.js.ShallowMerge(normalPointStyle, { scale: 1, zindex: 2 });
        featureStyles = { style: normalPointStyle, hoverStyle: hoverPointStyle };
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
