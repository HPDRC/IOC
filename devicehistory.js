"use strict";

/**
* @this {ITPA.OC.DeviceHistory}
*/
ITPA.OC.DeviceHistory = function (settings) {

    var theThis, oc, core, extent, maps, coreDeviceList, map, layer, styles, animationDisplayControl, headerControl;
    var animateButton, animateTimeout, animateMillis, curEventIndex, nEvents, data, pointFeatures, prevMapFeature, lastCheckedAnimationTime, labelButton, idShowing, trackMapCenter;
    var clickListener;
    var textColorBlue, textColorBlueShadow;
    var loadStatusControl, loadStatusTitleE, errorContactingServer;
    var isHidden;
    var directionImg;
    var dateItemTitle, datePicker;
    var dateControl, currentDateStr, currentMonth, currentDay, currentYear, currentDOW, currentDate, summaryTitleE;

    this.OnDelete = function () { return onDelete(); }
    this.IsDeleted = function () { return isDeleted(); }

    this.Show = function (deviceId) { return show(deviceId); }
    this.GetDeviceIdShowing = function () { return isHidden ? 0 : idShowing; }
    this.Hide = function () { return hide(); }

    function onDelete() {
        if (!isDeleted()) {
            removeCurrentFeatures();
            if (clickListener) { clickListener.OnDelete(); clickListener = undefined; }
            map.RemoveLayer(layer);
            core = lastCheckedAnimationTime = layer = maps = coreDeviceList = map = undefined;
        }
    }

    function isDeleted() { return map == undefined; }

    function hide() {
        if (!isDeleted()) {
            isHidden = true;
            idShowing = 0;
            resetAnimation();
            styles.ChangeOpacityVisibilityClass(headerControl, false);
            styles.ChangeOpacityVisibilityClass(animationDisplayControl, false);
            styles.ChangeOpacityVisibilityClass(dateControl, false);
            layer.SetVisible(false);
            maps.ShowBubbleMap(false);
        }
    }

    function removeCurrentFeatures() {
        if (!isDeleted()) {
            styles.ChangeOpacityVisibilityClass(animationDisplayControl, false);
            styles.ChangeOpacityVisibilityClass(dateControl, false);
            layer.RemoveAllFeatures();
            pointFeatures = undefined;
            data = undefined;
            extent = undefined;
            nEvents = undefined;
            prevMapFeature = undefined;
            lastCheckedAnimationTime = undefined;
        }
    }

    function getTrackStyle(isHover, trackData) {
        var zindex = isHover ? 8 : 3;
        var fill_opacity = isHover ? 100 : 40;
        var circle_radius = isHover ? 8 : 6;
        var style = [];
        var p = trackData.properties;
        var cfs = new tf.map.CanvasFeatureStyle({
            size: [30, 30],
            baseStyle: { zindex: zindex + 2, rotate_with_map: true, opacity: fill_opacity / 100, rotation_rad: p.heading * Math.PI / 180 },
            paint: getPaintFunction(isHover, trackData)
        });
        var pointSpecs = cfs.GetStyle();

        style.push(pointSpecs);

        if (isHover) {
            var baseTextStyleSpecs = {
                marker: true, font_height: 15, zindex: 3, marker_color: '#ffe57f', font_color: "#008",
                line_width: 1, line_color: "#ffffff", marker_opacity: 85, border_opacity: 60, border_color: "#000"
            };

            var label = trackData.dateLabel;

            var textStyle = tf.js.ShallowMerge(baseTextStyleSpecs, { label: label, zindex: zindex + 3 });

            style.push(textStyle);
        }
        return style;
    }

    function getTrackStyleFunction(isHover, trackData) { return function (mapFeature) { return getTrackStyle(isHover, trackData); } }

    function paint(isHover, data, notification) {
        var ctx = notification.ctx;
        var size = isHover ? [36, 36] : [30, 30];
        var p = data.properties;
        var label = p.time_calculation;
        var hColor = data.deltatime01 * 120;
        var hslColor = "hsl(" + hColor + ", 100%, 50%)";
        var lineW = 2;

        ctx.canvas.width = size[0];
        ctx.canvas.height = size[1];
        ctx.translate(0.5, 0.5);
        ctx.clearRect(0, 0, size[0], size[1]);

        ctx.fillStyle = hslColor;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = lineW;

        ctx.beginPath();

        var diameter = size[0] - 2 * lineW;

        tf.canvas.circle(ctx, lineW, lineW, diameter);
        ctx.fill();
        //ctx.stroke();
        ctx.closePath();

        ctx.drawImage(directionImg.GetImg(), 0, 0, size[0], size[1]);

        return size;
    }

    function getPaintFunction(isHover, data) { return function (notification) { return paint(isHover, data, notification); }}

    function onDeviceHistoryLoaded(dataH) {
        if (!isDeleted()) {
            errorContactingServer = false;
            extent = undefined;
            curEventIndex = 0;
            data = [];
            nEvents = 0;
            pointFeatures = [];
            prevMapFeature = undefined;
            if (tf.js.GetIsArray(dataH)) {
                var eventIndex = 0;
                data = dataH;
                nEvents = data.length;
                if (nEvents > 0) {
                    var nowDate = new Date();
                    var nowYear = nowDate.getFullYear();
                    var coords = [];

                    var lastIndex = nEvents - 1;
                    var firstTime = tf.js.GetDateFromTimeStamp(data[0].properties.time_calculation);
                    var lastTime = tf.js.GetDateFromTimeStamp(data[lastIndex].properties.time_calculation);
                    var allDeltaTime = lastTime - firstTime;

                    nEvents = 0;

                    for (var i in data) {
                        var d = data[i], g = d.geometry, p = d.properties;

                        if (g.coordinates[0] != 0 && g.coordinates[1] != 0) {

                            var dateEvent = tf.js.GetDateFromTimeStamp(p.time_calculation);
                            var thisDeltaTime = dateEvent - firstTime;
                            var thisDeltaTime01 = allDeltaTime != 0 ? thisDeltaTime / allDeltaTime : 1;
                            var thisYear = dateEvent.getFullYear() == nowYear;
                            var hmsap = ' ' + tf.js.GetAMPMHourWithSeconds(dateEvent);
                            var start = thisYear ? 5 : 0;

                            d.dateLabel = p.time_calculation.substring(start, 10) + hmsap;;
                            d.deltatime01 = thisDeltaTime01;

                            coords.push(g.coordinates);

                            if (extent == undefined) { extent = [g.coordinates[0], g.coordinates[1], g.coordinates[0], g.coordinates[1]]; }
                            else { extent = tf.js.UpdateMapExtent(extent, g.coordinates); }

                            g.style = getTrackStyleFunction(false, d);
                            g.hoverStyle = getTrackStyleFunction(true, d);

                            var pointFeature = new tf.map.Feature(g);
                            pointFeatures.push(pointFeature);
                            layer.AddMapFeature(pointFeature, true);
                            pointFeature.isDeviceHistoryFeature = true;
                            pointFeature.eventIndex = eventIndex;
                            ++eventIndex;
                        }
                    }

                    if (nEvents = eventIndex) {
                        var lsg = {
                            type: 'linestring', coordinates: coords, style: {
                                line: true, line_width: 1, line_color: "#000", zindex: 1
                            }
                        };

                        var lineFeature = new tf.map.Feature(lsg);
                        layer.AddMapFeature(lineFeature, true);
                        layer.AddWithheldFeatures();
                        extent = tf.js.ScaleMapExtent(extent, 1.6);
                        setExtent();
                    }
                }

                if (nEvents > 0) {
                    styles.ChangeOpacityVisibilityClass(animationDisplayControl, true);
                    prevMapFeature = pointFeatures[0];
                    prevMapFeature.SetIsAlwaysInHover(true);
                }
                updateLabel();
                updateDate();
                layer.SetVisible(true);
            }
            else {
                errorContactingServer = true;
            }
            styles.ChangeOpacityVisibilityClass(loadStatusControl, false);
            styles.ChangeOpacityVisibilityClass(dateControl, true);
        }
    }

    function updateDate() {
        if (!isDeleted()) {
            var innerHTML;
            if (errorContactingServer) {
                innerHTML = 'unable to contact server';
                dateItemTitle.SetText("");
            }
            else {
                var nEventsUse = nEvents != undefined ? nEvents : 0;
                var dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
                dateItemTitle.SetText(dow[currentDOW] + ' ' + currentDateStr);
                innerHTML = nEventsUse + ' events';
            }
            summaryTitleE.innerHTML = innerHTML;
        }
    }

    function show(deviceId) {
        if (!isDeleted()) {
            resetAnimation();
            idShowing = deviceId;
            if (deviceId > 0) {
                isHidden = false;
                removeCurrentFeatures();
                maps.ShowBubbleMap(true);
                loadStatusTitleE.innerHTML = "retrieving events from server...";
                styles.ChangeOpacityVisibilityClass(headerControl, true);
                styles.ChangeOpacityVisibilityClass(loadStatusControl, true);
                coreDeviceList.GetDeviceHistory(onDeviceHistoryLoaded, deviceId, currentDateStr);
                updateLabel();
                updateDate();
            }
        }
    }

    function setExtent() { if (!!extent) { map.SetVisibleExtent(extent); } }

    function getAnimationTime() {
        var now = Date.now();
        if (lastCheckedAnimationTime === undefined) { lastCheckedAnimationTime = now; animationTime = 0; }
        else {
            if (!isAnimationPaused) { animationTime += (now - lastCheckedAnimationTime) * animationSpeed; }
            lastCheckedAnimationTime = now;
        }
        return animationTime;
    }

    function onAnimate() { animateTimeout = null; if (!isDeleted()) { if (maps.GetIsShowingBubbleMap()) { gotoEvent(curEventIndex + 1); } } }
    function clearAnimateTimeout() { if (!!animateTimeout) { clearTimeout(animateTimeout); animateTimeout = null; } }
    function setAnimateTimeout() { clearAnimateTimeout(); animateTimeout = setTimeout(onAnimate, animateMillis); }
    function onAnimationToggle() { if (animateButton.GetIsToggled()) { clearAnimateTimeout(); } else { setAnimateTimeout(); } }
    function resetAnimation() { if (!animateButton.GetIsToggled()) { clearAnimateTimeout(); animateButton.SetIsToggled(true); } }

    function gotoEvent(eventNumber) {
        if (!isDeleted()) {
            if (!!prevMapFeature) { prevMapFeature.SetIsAlwaysInHover(false); }
            if (eventNumber < 0) { eventNumber = nEvents - 1; }
            if (eventNumber >= nEvents) {
                if (!animateButton.GetIsToggled()) { resetAnimation(); }
                eventNumber = 0;
            }
            if (eventNumber < 0) { eventNumber = 0; }
            if (eventNumber < nEvents) {
                curEventIndex = eventNumber;
                (prevMapFeature = pointFeatures[eventNumber]).SetIsAlwaysInHover(true);
                if (!!trackMapCenter) {
                    map.AnimatedSetCenterIfDestVisible(prevMapFeature.GetPointCoords());
                }
                updateLabel();
            }
            if (!animateButton.GetIsToggled() && maps.GetIsShowingBubbleMap()) { setAnimateTimeout(); }
        }
    }

    function incDecEvent(incDec) { gotoEvent(curEventIndex + incDec); }

    function updateLabel() {
        if (!isDeleted()) {
            var buttonText = 'id: ' + idShowing;
            if (nEvents > 0) { buttonText += ' [' + (curEventIndex + 1) + '/' + nEvents + ']' }
            labelButton.SetText(buttonText);
        }
    }

    function onToggleTrack() { trackMapCenter = !trackMapCenter; }

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

        (div = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass })).AddContent(loadStatusTitle);

        styles.ApplyStyleProperties(loadStatusControl = div, style);
        loadStatusControl.AppendTo(map.GetMapMapContainer());
        styles.ChangeOpacityVisibilityClass(loadStatusControl, false);
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

        var hideButton = styles.AddButtonDivLeftMargin(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphCloseXName, onClick: function () { hide(); }, tooltip: "Hide history", dim: buttonDim })
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

    function onFeatureClicked(notification) {
        if (!isDeleted()) {
            if (!isHidden) {
                var mapFeature = notification.mapFeature;
                if (!!mapFeature && mapFeature.isDeviceHistoryFeature) {
                    if (mapFeature.eventIndex != undefined) {
                        gotoEvent(mapFeature.eventIndex);
                        
                    }
                }
            }
        }
    }

    function onDateClicked(notification) {
        console.log(notification.date);
        datePicker.SetDate(notification.date);
    }

    function onDateButtonClicked() {
        if (datePicker.IsAttached()) { datePicker.Detach(); }
        else {
            datePicker.SetDate(currentDate);
            datePicker.AppendTo(map.GetMapMapContainer(), { position: "absolute", right: "48px", bottom: "60px" });
        }
    }


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

    function onPrevNextDay(inc) {
        var changed;
        datePicker.Detach();
        if (inc == 0) { changed = true; setToCurrentDate(); }
        else {
            var nextDate = new Date(currentDate.getTime());
            nextDate.setDate(currentDate.getDate() + inc);
            if (nextDate <= new Date()) {
                currentDate = nextDate;
                changed = true;
                setToDate(currentDate);
            }
        }
        if (changed) {
            show(idShowing);
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

    function setToCurrentDate() {
        setToDate(new Date());
    }

    function onDatePickerDateClicked(notification) {
        setToDate(notification.date);
        show(idShowing);
        datePicker.Detach();
    }

    function initialize() {
        if (tf.js.GetIsValidObject(settings)) {
            oc = settings.oc;
            if (!!oc) {
                if (!!(maps = oc.GetMaps())) {
                    core = oc.GetCore();
                    if (!!(coreDeviceList = core.GetDeviceList())) {
                        styles = tf.GetStyles();
                        directionImg = oc.GetMapBusDirectionImg();
                        textColorBlue = "#213873";
                        textColorBlueShadow = '0px 0px 2px #fff';
                        map = maps.GetBubbleMap();

                        layer = map.AddFeatureLayer({ name: "device history", isVisible: false, isHidden: false, zIndex: 10 });
                        createAnimationControl();
                        createHeaderControl();
                        createDateControl();
                        createLoadStatusControl();
                        trackMapCenter = false;
                        animateMillis = 500;
                        setToCurrentDate();
                        clickListener = map.AddListener(tf.consts.mapFeatureClickEvent, onFeatureClicked);
                        datePicker = new tf.ui.DatePicker({ onClick: onDatePickerDateClicked });
                    }
                }
            }
        }
        if (map == undefined) { onDelete(); }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

