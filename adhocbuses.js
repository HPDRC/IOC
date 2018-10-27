"use strict";

ITPA.OC.AdHocBuses = function (settings) {
    var theThis = this;
    if (!(theThis instanceof ITPA.OC.AdHocBuses)) { return new ITPA.OC.AdHocBuses(settings); }

    var serverURL, busesToTrack, trackDelayMillis, busesBeingTracked;
    var largeMapBusLayer, smallMapBusLayer;
    var directionImg, outlineImg;
    var requestIndex;

    this.PanToBusById = function (busId) {
        var bus = getBusBeingTrackedById(busId);
        if (bus) {
            var mapFeature = bus.mapFeature;
            if (mapFeature) {
                settings.oc.GetMaps().GetLargeMap().SetCenter(mapFeature.GetPointCoords());
            }
        }
    };

    function getBusBeingTrackedById(busId) {
        return busesBeingTracked ? busesBeingTracked[busId + ''] : undefined;
    };

    function getBusStyle(keyedFeature, mapFeature) {
        var isHover = mapFeature.GetIsDisplayingInHover();
        var mapFeatureSettings = mapFeature.GetSettings();
        var theBus = mapFeatureSettings.theBus, track = theBus.track;
        var style;
        var zindex = 10;
        var scale = isHover ? 0.75 : 0.6;
        var rotation_rad = track.heading * Math.PI / 180;
        var pointSpecs = { icon: true, icon_img: directionImg, icon_size: directionImg.GetDimensions(), scale: scale, zindex: zindex + 4, rotate_with_map: true, rotation_rad: rotation_rad };
        var outlineSpecs = { icon: true, icon_img: outlineImg, icon_size: outlineImg.GetDimensions(), scale: scale, zindex: zindex + 3 };
        var marker_arrowlength = 18;

        if (isHover) {
            var label = theBus.name + ' | ' + track.dateStr;
            style = { marker: true, label: label, zindex: zindex + 1, marker_arrowlength: marker_arrowlength };
        }
        else {
            var label = theBus.name;
            style = { marker: true, label: label, zindex: zindex + 2, marker_arrowlength: marker_arrowlength };
        }
        return [outlineSpecs, pointSpecs, style];
    }

    function onTracked(notification) {
        if (notification && notification.data && notification.requestProps && notification.requestProps.requestIndex == requestIndex) {
            for (var i in busesBeingTracked) { busesBeingTracked.updated = false; }

            for (var i in notification.data) {
                var di = notification.data[i], key = di.id + '';
                var btti = busesToTrack[key];
                if (btti) {
                    var pos = [tf.js.GetLongitudeFrom(di.lon), tf.js.GetLatitudeFrom(di.lat)];
                    var bbtk = busesBeingTracked[key];
                    if (!bbtk) {
                        bbtk = busesBeingTracked[key] = {updated: false, mapFeature: undefined, name: btti.name};
                    }
                    bbtk.updated = true;
                    bbtk.track = di;
                    bbtk.track.dateDate = tf.js.GetDateFromTimeStamp(bbtk.track.date);
                    bbtk.track.dateStr = tf.js.GetMonthDayYearStr(bbtk.track.dateDate) + ' ' + tf.js.GetAMPMHourWithMinutes(bbtk.track.dateDate);
                    var mapFeature = bbtk.mapFeature;
                    if (!mapFeature) {
                        mapFeature = bbtk.mapFeature = new tf.map.Feature({ theBus: bbtk, type: 'point', coordinates: pos, style: getBusStyle, hoverStyle: getBusStyle });
                        largeMapBusLayer.AddMapFeature(mapFeature);
                        smallMapBusLayer.AddMapFeature(mapFeature);
                    }
                    else {
                        mapFeature.RefreshStyle();
                        mapFeature.SetPointCoords(pos);
                    }
                }
            }

            for (var i in busesBeingTracked) {
                var bbti = busesBeingTracked[i];
                if (!bbti.updated) {
                    largeMapBusLayer.DelMapFeature(bbti.mapFeature);
                    smallMapBusLayer.DelMapFeature(bbti.mapFeature);
                    delete busesBeingTracked[i];
                }
            }
        }
    };

    function doTrack() {
        var url = serverURL;
        if (++requestIndex == 10000) { requestIndex = 1; }
        new tf.ajax.JSONGet().Request(url, function (notification) {
            try { onTracked(notification); } catch (e) { console.log(e); }
            setTimeout(doTrack, trackDelayMillis);
        }, theThis, { requestIndex: requestIndex }, false, undefined, undefined, undefined);
    };

    function initialize() {
        serverURL = "http://transit.cs.fiu.edu/api/v1/transit/gettrack";
        var busesToTrackArray = [
            //{ name: "MPV-2", id: 0 },    // not purchased yet, ID to be determined
            { name: /*"CATS1" /**/"MPV-3"/**/, id: 5011 },
            { name: /*"CATS2" /**/"MPV-1"/**/, id: 5012 },
            { name: "SW-1", id: 5667 },
            { name: "SW-2", id: 7140 },
            { name: "SW-3", id: 8828 },
            { name: "SW-4", id: 1103 },
            { name: "SW-5", id: 4056 },
            { name: "SW-6", id: 4061 },
            { name: "SW-7", id: 25001 }
        ];
        busesToTrack = {};
        for (var i in busesToTrackArray) {
            var bt = busesToTrackArray[i];
            busesToTrack[bt.id + ''] = bt;
        }
        requestIndex = 1;
        trackDelayMillis = 1000;
        busesBeingTracked = {};
        var oc = settings.oc, maps = oc.GetMaps();
        largeMapBusLayer = maps.GetLargeMapLayer(ITPA.Core.BusListName);
        smallMapBusLayer = maps.GetSmallMapLayer(ITPA.Core.BusListName);
        directionImg = oc.GetMapBusDirectionImg();
        outlineImg = oc.GetMapBusGreenOutlineImg();
        setTimeout(doTrack, trackDelayMillis);
    };

    initialize();
};
