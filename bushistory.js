"use strict";

/**
* @this {ITPA.OC.BusHistory}
*/
ITPA.OC.BusHistory = function (settings) {

    var theThis, extent, maps, coreBusList, coreRouteKeyedList, routeFeatureStyles, map, layer, layerLine, lines, routeFeatureList, styles, animationDisplayControl, headerControl, detailsControl;
    var animateButton, animateTimeout, animateMillis, curEventIndex, nEvents, data, pointFeatures, prevMapFeature, lastCheckedAnimationTime, labelButton, busIDShowing, trackMapCenter, detailsItemTitle;
    var dateControl, currentLine, currentLineId, currentLineP, currentDateStr, currentMonth, currentDay, currentYear, currentDOW, currentDate, clickListener, summaryTitleE;
    var textColorBlue, textColorBlueShadow, currentRouteDir;
    var loadStatusControl, loadStatusTitleE, errorContactingServer, nRoutes, nDirections, routes, routeDirIndices, routeDirCounts, isHidden;
    var dateItemTitle, datePicker;

    this.OnDelete = function () { return onDelete(); }
    this.IsDeleted = function () { return isDeleted(); }

    this.Show = function (busId) { return show(busId); }
    this.GetBusIdShowing = function () { return isHidden ? 0 : busIDShowing; }
    this.Hide = function () { return hide(); }

    function onDelete() {
        if (!isDeleted()) {
            datePicker.Detach();
            removeBusTracks();
            if (clickListener) { clickListener.OnDelete(); clickListener = undefined; }
            map.RemoveLayer(layer);
            map.RemoveLayer(layerLine);
            routeDirCounts = routeDirIndices = routes = detailsItemTitle = lastCheckedAnimationTime = coreRouteKeyedList =
                routeFeatureStyles = layer = layerLine = maps = coreBusList = map = undefined;
        }
    }

    function isDeleted() { return map == undefined; }

    function hide() {
        if (!isDeleted()) {
            datePicker.Detach();
            isHidden = true;
            busIDShowing = 0;
            resetAnimation();
            styles.ChangeOpacityVisibilityClass(headerControl, false);
            styles.ChangeOpacityVisibilityClass(detailsControl, false);
            styles.ChangeOpacityVisibilityClass(dateControl, false);
            styles.ChangeOpacityVisibilityClass(animationDisplayControl, false);
            layer.SetVisible(false);
            layerLine.SetVisible(false);
            maps.ShowBubbleMap(false);
        }
    }

    function removeBusTracks() {
        if (!isDeleted()) {
            styles.ChangeOpacityVisibilityClass(detailsControl, false);
            styles.ChangeOpacityVisibilityClass(dateControl, false);
            styles.ChangeOpacityVisibilityClass(animationDisplayControl, false);
            layerLine.RemoveAllFeatures();
            layer.RemoveAllFeatures();
            pointFeatures = undefined;
            lines = undefined;
            data = undefined;
            extent = undefined;
            nEvents = undefined;
            prevMapFeature = undefined;
            lastCheckedAnimationTime = undefined;
            currentRouteDir = currentLine = currentLineId = undefined;
        }
    }

    function getBusTrackStyle(isHover, trackData) {
        var zindex = isHover ? 5 : 1;
        var fill_color = isHover ? "#f00" : "#7af";
        var style = [{
            shape: true, circle: true, circle_radius: 8, line: true, line_width: 1, line_color: "#000", line_opacity: 60, snap_to_pixel: false, zindex: zindex, opacity: 0.5
        }, {
            shape: true, circle: true, circle_radius: 6, line: true, line_width: 2, line_color: "#fff", line_opacity: 40, fill: true, fill_color: fill_color, fill_opacity: 40, snap_to_pixel: false, zindex: zindex + 1, opacity: 0.5
        }];

        if (isHover) {
            var p = trackData.properties;
            var baseTextStyleSpecs = {
                marker: true, font_height: 15, zindex: 3, marker_color: '#ffe57f', font_color: "#008",
                line_width: 1, line_color: "#ffffff", marker_opacity: 85, border_opacity: 60, border_color: "#000"
            };

            var label = p.datetime.substring(11, 19);
            var textStyle = tf.js.ShallowMerge(baseTextStyleSpecs, { label: label, zindex: zindex + 2 });

            style.push(textStyle);
        }
        return style;
    }

    function getBusTrackStyleFunction(isHover, trackData) { return function (mapFeature) { return getBusTrackStyle(isHover, trackData); } };

    function onBusHistoryLoaded(dataH) {
        //console.log('history loaded');
        if (!isDeleted()) {
            errorContactingServer = false;
            extent = undefined;
            curEventIndex = 0;
            data = [];
            nEvents = 0;
            lines = {};
            pointFeatures = [];
            prevMapFeature = undefined;
            nRoutes = 0;
            routes = {};
            nDirections = 0;
            routeDirIndices = [];
            routeDirCounts = [];
            if (tf.js.GetIsArray(dataH)) {
                var lastLineId;
                var eventIndex = 0;
                data = dataH;
                nEvents = data.length;
                if (nEvents > 0) {
                    for (var i in data) {
                        var d = data[i], g = d.geometry, p = d.properties;
                        var line_id = p.line_id;
                        
                        if (line_id != lastLineId) {
                            var lineKey = line_id + '';
                            var routeId = p.fleet_id, routeKey = routeId + '';
                            lastLineId = line_id;
                            routeDirCounts.push(1);
                            routeDirIndices.push(eventIndex);
                            if (lines[lineKey] == undefined) {
                                lines[lineKey] = line_id;
                            }
                            if (routes[routeKey] == undefined) {
                                routes[routeKey] = 1;
                                ++nRoutes;
                                ++nDirections;
                            }
                            else {
                                ++routes[routeKey];
                                ++nDirections;
                            }
                        }
                        else {
                            ++routeDirCounts[routeDirCounts.length - 1];
                        }

                        d.routeDirIndex = routeDirIndices.length - 1;
                        if (extent == undefined) { extent = [g.coordinates[0], g.coordinates[1], g.coordinates[0], g.coordinates[1]]; }
                        else { extent = tf.js.UpdateMapExtent(extent, g.coordinates); }

                        g.style = getBusTrackStyleFunction(false, d);
                        g.hoverStyle = getBusTrackStyleFunction(true, d);

                        var pointFeature = new tf.map.Feature(g);
                        pointFeatures.push(pointFeature);
                        layer.AddMapFeature(pointFeature, true);
                        pointFeature.eventIndex = eventIndex;
                        pointFeature.isBusHistoryFeature = true;
                        ++eventIndex;
                    }

                    for (var i in lines) {
                        var lineId = lines[i];
                        var lineKeyedFeature = routeFeatureList.GetFeature(lineId);
                        if (!!lineKeyedFeature) {
                            var lineFeature = lineKeyedFeature.GetMapFeature()
                            extent = tf.js.MergeMapExtents(extent, lineFeature.GetGeom().GetExtent());
                            layerLine.AddMapFeature(lineFeature, true);
                        }
                    }


                    layer.AddWithheldFeatures();
                    layerLine.AddWithheldFeatures();
                    extent = tf.js.ScaleMapExtent(extent, 1.6);
                    setExtent();
                }
                //console.log('features added');
                updateDate();
                updateDetails();
                //gotoEvent(0);
                if (nEvents > 0) {
                    styles.ChangeOpacityVisibilityClass(detailsControl, true);
                    styles.ChangeOpacityVisibilityClass(animationDisplayControl, true);
                    prevMapFeature = pointFeatures[0];
                    prevMapFeature.SetIsAlwaysInHover(true); 
                }
                layer.SetVisible(true);
                layerLine.SetVisible(true);
            }
            else {
                errorContactingServer = true;
            }
            styles.ChangeOpacityVisibilityClass(loadStatusControl, false);
            styles.ChangeOpacityVisibilityClass(dateControl, true);
        }
    };

    function show(busId) {
        if (!isDeleted()) {
            resetAnimation();
            busIDShowing = busId;
            if (busId > 0) {
                isHidden = false;
                removeBusTracks();
                maps.ShowBubbleMap(true);
                loadStatusTitleE.innerHTML = "retrieving events from server...";
                styles.ChangeOpacityVisibilityClass(headerControl, true);
                styles.ChangeOpacityVisibilityClass(loadStatusControl, true);
                coreBusList.GetBusHistory(onBusHistoryLoaded, busId, currentDateStr);
                /*coreBusList.GetBusHistory(function (data) {
                    console.log(JSON.stringify(data));
                }, 0, currentDateStr, 15, "minute");*/
                updateLabel();
                updateDate();
            }
        }
    }

    function setExtent() { if (!!extent) { map.SetVisibleExtent(extent); } };

    function getAnimationTime() {
        var now = Date.now();
        if (lastCheckedAnimationTime === undefined) { lastCheckedAnimationTime = now; animationTime = 0; }
        else {
            if (!isAnimationPaused) { animationTime += (now - lastCheckedAnimationTime) * animationSpeed; }
            lastCheckedAnimationTime = now;
        }
        return animationTime;
    };

    function findEventNumber(forTime) { return 0; };

    function onAnimate2() { animateTimeout = null; if (!isDeleted()) { if (maps.GetIsShowingBubbleMap()) { gotoEvent(findEventNumber(getAnimationTime())); } } };

    function onAnimate() { animateTimeout = null; if (!isDeleted()) { if (maps.GetIsShowingBubbleMap()) { gotoEvent(curEventIndex + 1); } } }

    function clearAnimateTimeout() { if (!!animateTimeout) { clearTimeout(animateTimeout); animateTimeout = null; } }
    function setAnimateTimeout() { clearAnimateTimeout(); animateTimeout = setTimeout(onAnimate, animateMillis); }

    function onAnimationToggle() { if (animateButton.GetIsToggled()) { clearAnimateTimeout(); } else { setAnimateTimeout(); } };

    function resetAnimation() { if (!animateButton.GetIsToggled()) { clearAnimateTimeout(); animateButton.SetIsToggled(true); } };

    function gotoEvent(eventNumber) {
        if (!isDeleted()) {
            if (!!prevMapFeature) { prevMapFeature.SetIsAlwaysInHover(false); }
            if (eventNumber < 0) { eventNumber = nEvents - 1; }
            if (eventNumber >= nEvents) { eventNumber = 0; }
            if (eventNumber < 0) { eventNumber = 0; }
            if (eventNumber < nEvents) {
                curEventIndex = eventNumber;
                (prevMapFeature = pointFeatures[eventNumber]).SetIsAlwaysInHover(true);
                if (!!trackMapCenter) { map.AnimatedSetCenterIfDestVisible(prevMapFeature.GetPointCoords()); }
                updateDetails();
            }
            if (!animateButton.GetIsToggled() && maps.GetIsShowingBubbleMap()) { setAnimateTimeout(); }
        }
    };

    function incDecEvent(incDec) { gotoEvent(curEventIndex + incDec); };

    function gotoNextRouteOrDir() {
        if (nEvents > 0) {
            var curEvent = data[curEventIndex], routeDirIndex = curEvent.routeDirIndex;
            var nextRouteDirIndex = routeDirIndex >= routeDirIndices.length -1 ? 0 : routeDirIndex + 1;
            var nextEventIndex = routeDirIndices[nextRouteDirIndex];
            if (nextEventIndex != curEventIndex) { gotoEvent(nextEventIndex); }
        }
    };

    function updateLabel() { if (!isDeleted()) { labelButton.SetText('bus id: ' + busIDShowing); } }

    function updateDate() {
        if (!isDeleted()) {
            var innerHTML;
            if (errorContactingServer) { innerHTML = 'unable to contact server'; dateItemTitle.SetText(""); }
            else {
                var nEventsUse = nEvents != undefined ? nEvents : 0;
                var dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
                dateItemTitle.SetText(dow[currentDOW] + ' ' + currentDateStr);
                innerHTML = nEventsUse + ' events';
                if (nEventsUse > 0) {
                    var routeRoutes = nRoutes > 1 ? "routes" : "route", dirDirs = nDirections > 1 ? "dirs" : "dir";
                    innerHTML += ' ' + nRoutes + ' ' + routeRoutes + ' ' + nDirections + ' ' + dirDirs;
                }
            }
            summaryTitleE.innerHTML = innerHTML;
        }
    };

    function updateDetails() {
        if (!isDeleted()) {
            if (!!detailsItemTitle) {
                var event = data[curEventIndex];
                if (!!event) {
                    var p = event.properties;
                    if (currentLineId != p.line_id || currentRouteDir != event.routeDirIndex) {
                        currentLineId = p.line_id;
                        currentLine = coreRouteKeyedList.GetItem(currentLineId);
                        currentLineP = !!currentLine ? currentLine.GetData().properties : undefined;
                        currentRouteDir = event.routeDirIndex;
                        var routeDirCount = routeDirCounts[currentRouteDir];
                        var name = p.name != undefined ? p.name : busIDShowing + '';
                        var lineFleet = p.fleet.toUpperCase();
                        var lineName;
                        if (currentLineP) { lineName = currentLineP.fleet_id + '-' + currentLineP.direction.toLowerCase(); }
                        else { lineName = p.line_id; }
                        var detailsStr = (event.routeDirIndex + 1) + ' -  ' + name + ": " + lineFleet + '-' + lineName + ' ('+ routeDirCount + ')';
                        detailsItemTitle.SetText(detailsStr);
                    }
                }
            }
        }
    };

    function onToggleTrack() { trackMapCenter = !trackMapCenter; };

    function createLoadStatusControl() {
        var rightMarginPX = 8;
        var marginStr = rightMarginPX + "px";
        var style = {
            display: "block",
            position: "absolute",
            right: marginStr, bottom: marginStr,
            textColor: "white", fontSize: "1.2em", backgroundColor: "rgba(192,192,192,0.5)", borderRadius: "8px", border: "2px solid navy",
            "tf-shadow": [0, 0, 4, "rgba(0,0,0,0.6)"], zIndex: 2
        };
        var div;

        var loadStatusTitle = new tf.dom.Div({ cssClass: styles.paddedBlockDivClass });
        loadStatusTitleE = loadStatusTitle.GetHTMLElement();
        var loadStatusTitleES = loadStatusTitleE.style;

        loadStatusTitleES.color = textColorBlue;
        loadStatusTitleES.textShadow = textColorBlueShadow;
        loadStatusTitleES.fontWeight = "bold";
        loadStatusTitleE.innerHTML = "";

        (div = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(
            loadStatusTitle
        );

        styles.ApplyStyleProperties(loadStatusControl = div, style);
        loadStatusControl.AppendTo(map.GetMapMapContainer());
        styles.ChangeOpacityVisibilityClass(loadStatusControl, false);
    }

    function createDetailsControl() {
        var rightMarginPX = 8;
        var marginStr = rightMarginPX + "px";
        var style = {
            display: "block",
            position: "absolute", left: marginStr, bottom: marginStr, textColor: "white", fontSize: "1.5em", backgroundColor: "rgba(192,192,192,0.5)", borderRadius: "8px", border: "2px solid navy",
            "tf-shadow": [0, 0, 4, "rgba(0,0,0,0.6)"], zIndex: 2
        };

        var div, buttonDim = "1em", textDim = buttonDim;

        detailsItemTitle = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: true, label: '', tooltip: "Go to the first event of the next route or direction", onClick: function () { gotoNextRouteOrDir(); }
        }));

        detailsItemTitle.GetHTMLElement().style.display = 'inline-block';

        (div = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(
            detailsItemTitle
        );

        styles.ApplyStyleProperties(detailsControl = div, style);
        detailsControl.AppendTo(map.GetMapMapContainer());
        styles.ChangeOpacityVisibilityClass(detailsControl, false);
    }

    function onDateButtonClicked() {
        if (datePicker.IsAttached()) { datePicker.Detach(); }
        else {
            datePicker.SetDate(currentDate);
            datePicker.AppendTo(map.GetMapMapContainer(), { position: "absolute", right: "48px", bottom: "60px" });
        }
    };

    function onDatePickerDateClicked(notification) { setToDate(notification.date); show(busIDShowing); datePicker.Detach(); };

    function createDateControl() {
        var rightMarginPX = 8;
        var marginStr = (rightMarginPX) + "px";
        var topMarginStr = "120px";
        var style = {
            display: "block",
            position: "absolute", right: marginStr, bottom: marginStr, textColor: "white", fontSize: "1.2em", backgroundColor: "rgba(192,192,192,0.5)", borderRadius: "8px", border: "2px solid navy",
            "tf-shadow": [0, 0, 4, "rgba(0,0,0,0.6)"], zIndex: 2
        };

        var div, divDate, divSummary, buttonDim = "1.2em", textDim = buttonDim;

        dateItemTitle = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: true, label: '', tooltip: "Date", onClick: onDateButtonClicked
        }));

        dateItemTitle.GetHTMLElement().style.display = 'inline-block';

        var back = styles.AddButtonDivLeftRightMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphLeftArrowName, onClick: function () { onPrevNextDay(-1); }, tooltip: "Go to previous day", dim: buttonDim })
        );
        var next = styles.AddButtonDivRightMargin(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphRightArrowName, onClick: function () { onPrevNextDay(1); }, tooltip: "Go to next day", dim: buttonDim })
        );
        var last = styles.AddButtonDivRightMargin(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphArrowToEndName, onClick: function () { onPrevNextDay(0); }, tooltip: "Go to current date", dim: buttonDim })
        );

        (divDate = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(dateItemTitle, back, next, last);

        var summaryTitle = styles.AddButtonDivLeftRightMargins(new tf.dom.Div({ cssClass: styles.unPaddedInlineBlockDivClass }));
        summaryTitleE = summaryTitle.GetHTMLElement();
        var summaryTitleES = summaryTitleE.style;

        summaryTitleES.color = textColorBlue;
        summaryTitleES.lineHeight = "1em";
        summaryTitleES.fontSize = "1em";
        summaryTitleES.marginBottom = "4px";
        summaryTitleES.fontWeight = "bold";
        summaryTitleES.textShadow = textColorBlueShadow;
        summaryTitleE.innerHTML = "";

        (divSummary = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(
            summaryTitle
        );

        (div = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(
            divDate, divSummary
        );

        styles.ApplyStyleProperties(dateControl = div, style);
        dateControl.AppendTo(map.GetMapMapContainer());
        styles.ChangeOpacityVisibilityClass(dateControl, false);
    }

    function createHeaderControl() {
        var rightMarginPX = 8;
        var marginStr = rightMarginPX + "px";
        var style = {
            display: "block",
            position: "absolute", left: marginStr, top: marginStr, fontSize: "1.8em", backgroundColor: "rgba(192,192,192,0.5)", borderRadius: "8px", border: "2px solid navy",
            "tf-shadow": [0, 0, 4, "rgba(0,0,0,0.6)"], zIndex: 2
        };
        var div, buttonDim = "1em", textDim = buttonDim;

        labelButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: true, label: '', tooltip: "Toggle map auto-panning during animation", onClick: function () { onToggleTrack(); }
        }));

        labelButton.GetHTMLElement().style.display = 'inline-block';

        /*var hideButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: true, label: 'Hide', tooltip: "Hide bus history", onClick: function () { hide(); }
        }));*/


        var hideButton = styles.AddButtonDivLeftMargin(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphCloseXName, onClick: function () { hide(); }, tooltip: "Hide bus history", dim: buttonDim })
        );

        (div = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(hideButton, labelButton);

        styles.ApplyStyleProperties(headerControl = div, style);
        headerControl.AppendTo(map.GetMapMapContainer());
        styles.ChangeOpacityVisibilityClass(headerControl, false);
    }

    function createAnimationControl() {
        var rightMarginPX = 8;
        var marginStr = rightMarginPX + "px";
        var style = {
            display: "block",
            position: "absolute", right: marginStr, top: marginStr, fontSize: "1.8em", backgroundColor: "rgba(192,192,192,0.5)", borderRadius: "8px", border: "2px solid navy",
            "tf-shadow": [0, 0, 4, "rgba(0,0,0,0.6)"], zIndex: 2
        };
        var div, buttonDim = "1.0em", textDim = buttonDim;

        (div = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(

            styles.ApplyStyleProperties(styles.AddButtonDivMargins(animateButton = new tf.ui.SvgGlyphToggleBtn({
                style: true, onClick: function () { onAnimationToggle(); }, dim: buttonDim, isToggled: true,
                glyph: tf.styles.SvgGlyphPauseName, tooltip: "Pause animation", toggledGlyph: tf.styles.SvgGlyphPlayName, toggledTooltip: "Animate event progression"
            }),
                { verticalAlign: "middle" })
            ),

            styles.AddButtonDivMargins(
                new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphArrowToStartName, onClick: function () { gotoEvent(0); }, tooltip: "Go to first event", dim: buttonDim })
            ),
            styles.AddButtonDivMargins(
                new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphLeftArrowName, onClick: function () { incDecEvent(-1); }, tooltip: "Go to previous event", dim: buttonDim })
            ),
            styles.AddButtonDivMargins(
                new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphRightArrowName, onClick: function () { incDecEvent(+1); }, tooltip: "Go to next event", dim: buttonDim })
            ),
            styles.AddButtonDivMargins(
                new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphArrowToEndName, onClick: function () { gotoEvent(-1); }, tooltip: "Go to last event", dim: buttonDim })
            ),
            styles.AddButtonDivMargins(
                new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphRoadName, onClick: function () { setExtent(); }, tooltip: "Set overview map extent", dim: buttonDim })
            )
        );

        styles.ApplyStyleProperties(animationDisplayControl = div, style);
        animationDisplayControl.AppendTo(map.GetMapMapContainer());
        styles.ChangeOpacityVisibilityClass(animationDisplayControl, false);
    }

    function onPrevNextDay(inc) {
        var changed;
        datePicker.Detach();
        if (inc == 0) { changed = true; setToCurrentDate(); }
        else {
            var nextDate = new Date(currentDate.getTime());
            nextDate.setDate (currentDate.getDate() + inc);
            if (nextDate <= new Date()) {
                currentDate = nextDate;
                changed = true;
                setToDate(currentDate);
            }
        }
        if (changed) {
            show(busIDShowing);
        }
    }

    function buildDateStr() {
        var monthUse = currentMonth + 1; if (monthUse < 10) { monthUse = '0' + monthUse; }
        var dayUse = currentDay; if (dayUse < 10) { dayUse = '0' + dayUse; }
        currentDateStr = currentYear + '-' + monthUse + '-' + dayUse;
    }

    function setToDate(theDate) {
        currentDate = theDate;
        currentYear = theDate.getFullYear();
        currentMonth = theDate.getMonth();
        currentDay = theDate.getDate();
        currentDOW = theDate.getDay();
        buildDateStr();
    }

    function setToCurrentDate() { setToDate(new Date()); };

    function onFeatureClicked(notification) {
        if (!isDeleted()) {
            if (!isHidden) {
                var mapFeature = notification.mapFeature;
                if (!!mapFeature && mapFeature.isBusHistoryFeature) {
                    if (mapFeature.eventIndex != undefined) {
                        gotoEvent(mapFeature.eventIndex);
                    }
                }
            }
        }
    }

    function initialize() {
        isHidden = true;
        if (tf.js.GetIsValidObject(settings)) {
            var oc = settings.oc;
            if (!!oc) {
                if (!!(maps = oc.GetMaps())) {
                    var core = oc.GetCore();
                    if (!!(coreBusList = core.GetBusList())) {
                        var coreRouteList = core.GetRouteList();
                        if (!!coreRouteList) {
                            coreRouteKeyedList = coreRouteList.GetKeyedList();
                            styles = tf.GetStyles();
                            textColorBlue = "#213873";
                            textColorBlueShadow = '0px 0px 2px #fff';
                            map = maps.GetBubbleMap();
                            layer = map.AddFeatureLayer({ name: "bus history", isVisible: false, isHidden: false, zIndex: 10 });
                            layerLine = map.AddFeatureLayer({ name: "bus lines", isVisible: false, isHidden: false, zIndex: 9 });
                            //layerLine.SetOpacity(0.5);
                            routeFeatureStyles = oc.GetRouteFeatureStyles();
                            routeFeatureList = oc.GetCoreFeatureLists().GetRouteList();
                            createAnimationControl();
                            createHeaderControl();
                            createDetailsControl();
                            createDateControl();
                            createLoadStatusControl();
                            trackMapCenter = false;
                            animateMillis = 50;
                            setToCurrentDate();
                            clickListener = map.AddListener(tf.consts.mapFeatureClickEvent, onFeatureClicked);
                            datePicker = new tf.ui.DatePicker({ onClick: onDatePickerDateClicked });
                        }
                    }
                }
            }
        }
        if (map == undefined) { onDelete(); }
    };

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
