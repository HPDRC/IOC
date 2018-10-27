"use strict";

var appStyles = {
    "topFontSizePXNumber": 12,
    "inputFormBorderRadiusPxNumber": "8",
    "inputFormBkColor": "rgba(128,128,128,0.5)",
    "mapPopupTextButtonTextColor": "rgba(255,255,255,1)",
    "mapPopupTextButtonBkColor": "rgba(0,0,0,0.7)",
    "mapSubLegendBkColor": "rgba(0,0,0,0.5)",
    "buttonShapedLinkBkColor": "rgba(0,0,0,0.5)",
    "buttonShapedLinkTextColor": "rgba(255,255,255,1)",
    "buttonShapedLinkHoverBkColor": "#fff",
    "buttonShapedLinkMarginPxNumber": 1,
    "buttonShapedLinkHoverTextColor": "rgba(0,0,0,1)",
    "darkTextColor": "#fff",
    "paddingPxNumber": "6",
    "popupCaptionBorderRadiusPXNumber": 16,
    "popupContentBkColor": "rgba(0, 0, 80, 0.2)",
    "popupCaptionBackgroundColor": "rgba(0, 0, 60, 0.1)",
    "mapControlButtonBkColor": "rgba(244, 244, 255, 0.4)",
    "mapControlButtonHoverBkColor": "rgba(244, 244, 255, 0.9)",
    "buttonDarkFill": "rgba(0, 0, 0, 0.7)",
    "dLayerSpanBackgroundColor": "rgba(32, 32, 32, 1)",
    "textShadow": '1px 1px 1px #000',
    "darkTextShadow": '1px 1px 1px #fff',
    "textShadowSelRadioCheck": '1px 1px 1px #333',
    "borderSeparatorLineSpecs": "1px solid",
    "textInputBackgroundColor": "#000",
    "mapZoomInBorderRadius": "5px 5px 0 0",
    "mapZoomOutBorderRadius": "0 0 5px 5px",
    "mapControlFontWeight": "700",
    "mapScaleLineBkColor": "rgba(255,255,255,0.5)",
    "mapScaleLineBorderRadiusPxNumber": 4,
    "mapScaleLinePaddingPxNumber": 2,
    "mapScaleLineBorder": "1px solid #07375f",
    "mapScaleLineFontSizeEmNumber": 0.9,
    "mapScaleLineMarginPxNumber": 4,
    "mapScaleLineFontColor": "rgba(0, 0, 0, 0.7)",
    "tfLogoBorderRadius": "10%",
    "tfLogoWidth": "8em",
    "tfLogoHeight": "8em",
    "tfLogoOpacity": 0.8,
    "tfLogoBkColor": "rgba(255,255,255,0.3)",
    "tfLogoBorder": "1px solid rgba(128,128,128,0.3)",
    "mapControlLineHeightEmNumber": 0,
    "mapControlTextColor": "rgba(0, 0, 0, 1)",
    "overviewMapWidthPxNumber": 300,
    "overviewMapHeightPxNumber": 200,
    "overviewMapBorderWidthPxNumberNumber": 1,
    "overviewMapBoxBorder": "2px dotted red"
};

/**
* @this {ITPA.OC.AppStyles}
*/
ITPA.OC.AppStyles = function (settings) {

    var theThis = this;

    this.TFStyles = tf.GetStyles(appStyles);
    this.TFSubStyles = theThis.TFStyles.GetSubStyles();

    // change application styles by changing the public and private attribute values below

    // public attributes accessed directly by other components

    // app layout

    this.DocumentTitle = "ITPA Interactive Operations Center";

    this.PanelBkColor = "#e8e8e8";
    //this.PanelBkColor = "red";

    // message HTML overlay container styles

    this.BaseOverlayContainerStyles = { inherits: [theThis.TFSubStyles.defaultShadowStyle, theThis.TFSubStyles.buttonStyleBase, theThis.TFSubStyles.paddedBlockDivStyle, theThis.TFSubStyles.cursorDefaultStyle] };

    this.ShowStreetSmartGraphOverlayOnHover = true;
    this.StreetSmartGraphOverlayContainerStyles = {
        inherits: [theThis.BaseOverlayContainerStyles],
        backgroundColor: "navajoWhite", /*fontFamily: "Arial", */fontSize: "1.2em", color: "#003377",
        border: "2px dashed #037", borderRadius: "10px", padding: "4px",
        maxWidth: "30em"
    };

    this.ShowMessageOverlayOnHover = true;
    this.MessageOverlayContainerStyles = {
        inherits: [theThis.BaseOverlayContainerStyles],
        backgroundColor: "#000", /*fontFamily: "Arial", */fontSize: "1.2em", color: "#fc0",
        border: "2px dashed #fc0", borderRadius: "10px", padding: "4px",
        maxWidth: "20em"
    };

    this.ShowIncidentOverlayOnHover = true;
    this.IncidentOverlayContainerStyles = {
        inherits: [theThis.BaseOverlayContainerStyles],
        backgroundColor: "orange", /*fontFamily: "Arial", */fontSize: "1.4em", color: "#002",
        border: "2px dotted #b00", borderRadius: "10px", padding: "4px",
        maxWidth: "20em"
    };

    // map settings

    this.MapMinZoom = 11;
    this.MapMaxZoom = 21;

    this.LargeMapStartZoom = 16;
    this.LargeMapCenterCoords = { lat: 25.76143192301123, lon: -80.37505597700209 };

    this.SmallMapStartZoom = 11;
    this.SmallMapCenterCoords = { lat: 25.754454115443843, lon: -80.27412567612273 };

    // map extension auto cycle settings

    this.StartWithAutoCycle = false;
    this.AutoCycleUseInlineButtons = true;
    this.AutoCycleDuration = 15000;
    this.AutoCycleAnimationDuration = 3000;

    var MMCampusAreaName = "UC";
    var MMCampusToolTip = "Pan to the University City Area";
    var BBCampusAreaName = "BBC";
    var BBCampusToolTip = "Pan to the Biscayne Bay Campus Area";
    var MIBeachAreaName = "MB";
    var MIBBeachToolTip = "Pan to the Miami Beach Area";
    var OverviewAreaName = "Overview";
    var OverviewToolTip = "Show an Overview of the ITPA Area";

    this.AutoCycleAreaName = "Cycle";
    this.AutoCycleToolTip = "Cycle over all areas";

    this.MapExtentSelections = [[MMCampusAreaName, MMCampusToolTip], [MIBeachAreaName, MIBBeachToolTip], [BBCampusAreaName, BBCampusToolTip], [OverviewAreaName, OverviewToolTip]];
    this.MapExtentSettings = {};
    this.StartMapExtensionSelection = MMCampusAreaName;
    this.AutoCycleCheckStrings = [[theThis.AutoCycleAreaName, theThis.AutoCycleToolTip]];

    this.MapExtentSettings[MMCampusAreaName] = { center: [theThis.LargeMapCenterCoords.lon, theThis.LargeMapCenterCoords.lat], level: theThis.LargeMapStartZoom, next: MIBeachAreaName},
    this.MapExtentSettings[BBCampusAreaName] = { center: [-80.14427913856048, 25.91346867681252], level: theThis.LargeMapStartZoom, next: OverviewAreaName },
    this.MapExtentSettings[MIBeachAreaName] = { center: [-80.1460293754783, 25.7924922099323], level: 14, next: BBCampusAreaName },
    //this.MapExtentSettings[OverviewAreaName] = { center: [-80.29203414916991, 25.788472907888437], level: 11, next: MMCampusAreaName }
    //this.MapExtentSettings[OverviewAreaName] = { center: [-80.27203414916991, 25.788472907888437], level: 12, next: MMCampusAreaName }
    this.MapExtentSettings[OverviewAreaName] = { center: [-80.28203414916991, 25.788472907888437], level: 12, next: MMCampusAreaName }

    //var mapExtensionTopColor = "navy";
    var mapExtensionTopColor = "rgba(0, 56, 127, 0.75)";
    var mapExtensionSeparator = "4px";
    //var mapExtensionTextColor = "#008";
    var mapExtensionTextColor = "white";
    var mapExtensionSmallRadius = "6px"
    var mapExtensionBorder = "1px solid #2424be";
    //var mapExtensionSmallBkColor = "#cf6";
    //var mapExtensionSmallBkColor = "red";
    var mapExtensionSmallBkColor = "rgba(0, 56, 127, 1)";
    var mapExtensionDistanceFromMargin = "0.5em";

    this.OverviewButtonStyles = {
        inherits: [theThis.TFSubStyles.defaultShadowStyle],
        position: 'absolute', bottom: mapExtensionDistanceFromMargin, left: mapExtensionDistanceFromMargin, backgroundColor: mapExtensionTopColor,
        border: mapExtensionBorder, borderRadius: "2px", padding: mapExtensionSeparator
    };

    this.AnimationToggleStyles = {
        inherits: [theThis.TFSubStyles.defaultShadowStyle],
        fontSize: "10px",
        position: 'absolute', bottom: mapExtensionDistanceFromMargin, right: mapExtensionDistanceFromMargin, backgroundColor: mapExtensionTopColor,
        border: mapExtensionBorder, borderRadius: "2px", padding: mapExtensionSeparator
    };

    this.MapExtentSelectionStyles = {
        inherits: [theThis.TFSubStyles.defaultShadowStyle],
        position: 'absolute', bottom: mapExtensionDistanceFromMargin, right: mapExtensionDistanceFromMargin, backgroundColor: mapExtensionTopColor,
        border: mapExtensionBorder, borderRadius: "2px", padding: mapExtensionSeparator
    };

    this.MapExtensionRadioButtonStyles = {
        fontSize: "2em", color: mapExtensionTextColor, backgroundColor: mapExtensionSmallBkColor,
        border: mapExtensionBorder, borderRadius: mapExtensionSmallRadius
    }

    this.MapExtensionCheckBoxStyles = {
        fontSize: "1.6em", color: mapExtensionTextColor, backgroundColor: mapExtensionSmallBkColor,
        border: mapExtensionBorder, borderRadius: mapExtensionSmallRadius
    }

    if (theThis.AutoCycleUseInlineButtons) { theThis.MapExtensionCheckBoxStyles.marginLeft = mapExtensionSeparator; }
    else { theThis.MapExtensionCheckBoxStyles.marginTop = mapExtensionSeparator; }

    // feature style names

    this.LargeMapFeatureStyleName = "largeMapFeature";
    this.SmallMapFeatureStyleName = "smallMapFeature"

    this.MapFeatureStyleNames = [this.LargeMapFeatureStyleName, this.SmallMapFeatureStyleName];

    // map text features

    this.BaseTextFeatureFont = "bold 1em verdana";
    this.BaseTextFeatureFillColor = "#ff0";
    this.BaseTextFeatureLineColor = "#00f";
    this.BaseTextFeatureLineWidth = 3;

    this.BaseTextFeatureStyle = {
        text: true, fill: true, line: true,
        font: this.BaseTextFeatureFont,
        fill_color: this.BaseTextFeatureFillColor,
        line_color: this.BaseTextFeatureLineColor,
        line_width: this.BaseTextFeatureLineWidth
    };

    // map route features

    this.MapColorRouteLineWidth = 5;
    this.MapRouteLineWidth = 2;

    this.MapRouteLineNormalColor = "#000";
    this.MapRouteLineHoverColor = "#f00";
    this.MapRouteLineDashColor = "#fff";
    this.MapRouteLineDash = [20, 20];

    // map garage features

    this.MapGarageLineHoverColor = "#00f";
    this.MapGarageLineHoverWidth = 2;

    // map shape features

    this.BasePointShapeLineWidth = 1;
    this.BasePointShapeLineColor = "#00f",
    this.BasePointShapeRadius = this.MapRouteLineWidth + 3;

    this.BasePointShapeFeatureStyle = {
        shape: true, fill: true, line: true,
        line_color: this.BasePointShapeLineColor,
        line_width: this.BasePointShapeLineWidth
    };

    // text positioning for bus and platform labels

    this.ShowPlatformTextOnTheLeft = true;
    this.ShowBusTextOnTheLeft = !this.ShowPlatformTextOnTheLeft;

    // flashing platforms on bus ETA's and vice-versa

    this.ETARelationFlashDuration = 500;
    this.GetETARelationFlashStyle = function (elapsed01) {
        var radius = 4 + Math.pow(elapsed01, 1 / 2) * 12;
        var opacity = 1 - Math.pow(elapsed01, 3);
        var line_width = (2.5 - elapsed01);
        var flashStyle = {
            circle: true,
            circle_radius: radius,
            snapToPixel: false,
            line: true,
            line_width: line_width,
            line_color: "#0c0",
            line_opacity: opacity * 100
        };
        return flashStyle;
    }

    // bus features

    this.BusFeatureShapePoints = 4;

    this.BusFeatureShapeNormalRadius = this.BasePointShapeRadius + 4;
    this.BusFeatureShapeHoverRadius = this.BusFeatureShapeNormalRadius + 3;

    this.BusFeatureShapeNormalWithETAsRadius = this.BusFeatureShapeNormalRadius + 1;
    this.BusFeatureShapeHoverWithETAsRadius = this.BusFeatureShapeHoverRadius + 1;

    this.BusFeatureShapeNormalRotation = Math.PI / 4;
    this.BusFeatureShapeHoverRotation = 0;

    this.BusFeatureWithGoodETAsShapeFillColor = "#0F0";
    this.BusFeatureWithStaleETAsShapeFillColor = "#FF0";
    this.BusFeatureWithoutETAsShapeFillColor = "#F00";

    this.BusFeatureTextSpacing = 4;

    this.FlashBusesOnMove = true;
    this.FlashBusOnMoveDuration = 500;
    this.GetFlashMoveBusStyle = function (elapsed01) {
        var radius = 4 + Math.pow(elapsed01, 1 / 2) * 16;
        var opacity = 1 - Math.pow(elapsed01, 3);
        var line_width = (2 - elapsed01);
        var flashStyle = {
            circle: true,
            circle_radius: radius,
            snapToPixel: false,
            line: true,
            line_width: line_width,
            line_color: "#f00",
            line_opacity: opacity * 100
        };
        return flashStyle;
    }

    this.FlashDevicesOnMove = true;

    this.FlashBusesOnETAChange = true;
    this.FlashBusETADuration = 500;

    this.GetFlashBusETAStyle = function (elapsed01) {
        var angle = Math.PI * elapsed01 / 4 ;
        var flashStyle = {
            shape: true,
            shape_radius: theThis.BusFeatureShapeHoverWithETAsRadius + 1,
            shape_points: 8,
            snapToPixel: false,
            line: true,
            line_width: 1,
            line_color: "#00f",
            line_dash: [4, 7],
            rotation_rad: angle,
            zindex:2
        };
        var flashStyle2 = {
            shape: true,
            shape_radius: theThis.BusFeatureShapeNormalWithETAsRadius,
            shape_points: 4,
            snapToPixel: false,
            line: true,
            line_width: 1,
            line_color: "#00f",
            fill: true,
            fill_color: "#ff0",
            fill_opacity: (1 - Math.pow(elapsed01, 8)) * 100,
            rotation_rad: theThis.BusFeatureShapeNormalRotation,
            zindex: 2
        }
        return [flashStyle, flashStyle2];
    }

    // platform features

    this.PlatformFeatureShapePoints = 3;

    //this.PlatformFeatureShapeNormalRadius = this.BasePointShapeRadius + 2;
    //this.PlatformFeatureShapeHoverRadius = this.PlatformFeatureShapeNormalRadius + 3;

    //this.PlatformFeatureShapeNormalWithETAsRadius = this.PlatformFeatureShapeNormalRadius + 1;
    //this.PlatformFeatureShapeHoverWithETAsRadius = this.PlatformFeatureShapeHoverRadius + 1;

    this.PlatformFeatureShapeNormalRadius = 4;
    this.PlatformFeatureShapeHoverRadius = 5;

    this.PlatformFeatureShapeNormalWithETAsRadius = 5;
    this.PlatformFeatureShapeHoverWithETAsRadius = 6;

    this.PlatformFeatureShapeNormalRotation = Math.PI;
    this.PlatformFeatureShapeHoverRotation = this.ShowPlatformTextOnTheLeft ? - Math.PI / 2 : Math.PI / 2;

    this.PlatformFeatureWithGoodETAsShapeFillColor = "#0F0";
    this.PlatformFeatureWithStaleETAsShapeFillColor = "#DD0";
    this.PlatformFeatureWithoutETAsShapeFillColor = "#F00";

    this.PlatformFeatureTextSpacing = 2;

    this.FlashPlatformsOnETAChange = true;
    this.FlashPlatformETADuration = 500;
    
    this.GetFlashPlatformETAStyle = function (elapsed01) {
        var flashStyle = {
            /*shape: true,
            shape_radius: theThis.PlatformFeatureShapeNormalWithETAsRadius,
            shape_points: 3,
            snapToPixel: false,*/
            circle: true,
            circle_radius:theThis.PlatformFeatureShapeNormalWithETAsRadius, 
            line: true,
            line_width: 1,
            line_color: "#000",
            fill: true,
            fill_color: "#ff0",
            fill_opacity: (1 - Math.pow(elapsed01, 10)) * 100,
            rotation_rad: theThis.PlatformFeatureShapeNormalRotation,
            zindex: 1
        };
        return flashStyle;
    }

    // message & incident flash style

    this.GetFlashIconNotificationStyle = function (elapsed01, iconStyle, line_color, circle_radius, line_dash) {
        var opacity = Math.floor(elapsed01 * 5) % 2 == 1 ? 0 : 1;
        var flashStyle = {
            circle: true,
            circle_radius: circle_radius,
            snapToPixel: false,
            line: true,
            line_width: 2,
            line_color: line_color,
            line_opacity: opacity * 100,
            line_dash: line_dash,
            rotation_rad: Math.PI / 4,
            zindex: 3
        };
        return [iconStyle, flashStyle];
    }

    // message features

    //this.MessageFeatureNormalPointStyle = { scale: 0.4, zindex: 1, icon: true, icon_anchor: [0, 1], icon_url: './images/messageMarker.png' };
    //this.MessageFeatureHoverPointStyle = tf.js.ShallowMerge(this.MessageFeatureNormalPointStyle, { scale: 0.5, zindex: 2 });

    this.FlashMessageOnAdd = true;
    this.FlashMessageOnUpdate = true;
    this.FlashMessageOnRemove = true;

    this.FlashMessageDuration = 5000;
    /*this.GetFlashMessageStyle = function (elapsed01) {
        return theThis.GetFlashIconNotificationStyle(elapsed01, theThis.MessageFeatureHoverPointStyle, "#f00", 10, [4, 2]);
    }*/

    // incident features

    //this.IncidentFeatureNormalPointStyle = { scale: 0.8, zindex: 1, icon: true, icon_anchor: [0.5, 0.5], icon_url: './images/incidentMarker.png' };
    //this.IncidentFeatureHoverPointStyle = tf.js.ShallowMerge(this.IncidentFeatureNormalPointStyle, { scale: 1, zindex: 2 });

    this.FlashIncidentOnAdd = true;
    this.FlashIncidentOnUpdate = true;
    this.FlashIncidentOnRemove = true;

    this.FlashIncidentDuration = 5000;
    /*this.GetFlashIncidentStyle = function (elapsed01) {
        return theThis.GetFlashIconNotificationStyle(elapsed01, theThis.IncidentFeatureHoverPointStyle, "#f00", 16, [4, 2]);
    }*/

    // private attributes accessed by other components through this component's public methods

    // garage occupancy color codes

    var garageOccupancyColors = [
        "#640f0f",  //  0-10%
        "#8c0f0f", "#af1616", "#ff3c1e", "#f06a1e", "#f5b91e", "#f8e71c", "#b4d200", "#82ba00",
        "#4a8e00",  // 90-99%
        "#217a00"  // 100%
    ];

    var garageOccupancyUnknownColor = "#bfbfbf";

    // code from here on

    // public methods

    this.GetColorForOccupancy01 = function (oc01) { return getColorForOccupancy01(oc01); }

    // private methods

    function getColorForOccupancy01(oc01) {
        var color = undefined;

        if (oc01 !== undefined) {
            var nColors = garageOccupancyColors.length - 1;

            oc01 = 1 - tf.js.NumberClip(tf.js.GetFloatNumber(oc01, 1), 0, 1);

            var colorIndex = Math.floor(oc01 * nColors);

            color = garageOccupancyColors[colorIndex];
        }
        else { color = garageOccupancyUnknownColor; }

        return color;
    }

    function initialize() { } ;

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
