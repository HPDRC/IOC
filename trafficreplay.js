"use strict";

tf.map.LoopRouteBusTrackers = function (options) {
    var theThis = this; if (!(theThis instanceof tf.map.LoopRouteBusTrackers)) { return new tf.map.LoopRouteBusTrackers(options); }
    var KL, klListener;
    var minDistMoveBetweenSamplesInMeters, minDistanceToBeNearStartEnd, directionValNearStartEnd, maxAbsDirectionVal;
    var loopStartPos, loopEndPos;

    this.UpdateFromNewData = function (newData) { KL.UpdateFromNewData(newData); };

    function setDirection(item, direction) {
        var wasPos = item.direction >= 0;
        item.direction = direction;
        if (Math.abs(item.direction) > maxAbsDirectionVal) {
            item.direction = item.direction < 0 ? - maxAbsDirectionVal : maxAbsDirectionVal;
        }
        var isPos = item.direction >= 0;
        //if (isPos != wasPos) { console.log('item changed direction ' + item.GetData().key); }
        var busData = item.GetData().bus.GetData();
        busData.colorToFill = isPos ? "#f00" : "#00f";
        busData.direction = item.direction;
    };

    function incDirection(item, increment) { setDirection(item, item.direction + increment); };

    function trackCurPos(item) {
        if (!item.isUpdating) {
            item.distanceToLoopStart = tf.units.GetHaversineDistance(item.curPos, loopStartPos);
            item.distanceToLoopEnd = tf.units.GetHaversineDistance(item.curPos, loopEndPos);
            if (item.distanceToLoopStart < minDistanceToBeNearStartEnd) { setDirection(item, directionValNearStartEnd); }
            else {
                if (item.distanceToLoopEnd < minDistanceToBeNearStartEnd) { setDirection(item, -directionValNearStartEnd); }
                else {
                    if (item.prevDistanceToLoopStart !== undefined) {
                        if (item.prevDistanceToLoopStart > item.distanceToLoopStart && item.prevDistanceToLoopEnd < item.distanceToLoopEnd) {
                            incDirection(item, -1);  // going towards loop start
                        }
                        else if (item.prevDistanceToLoopStart < item.distanceToLoopStart && item.prevDistanceToLoopEnd > item.distanceToLoopEnd) {
                            incDirection(item, 1); // going towards loop end
                        }
                    }
                }
            }
            item.prevDistanceToLoopStart = item.distanceToLoopStart;
            item.prevDistanceToLoopEnd = item.distanceToLoopEnd;
        }
        //else { console.log('tracking skipped for ' + item.GetData().key) }
    };

    function onKLChange(notification) {
        for (var i in notification.addedItems) {
            var ai = notification.addedItems[i];
            var d = ai.GetData(), coords = d.coords;
            ai.lastDate = d.atDate;
            ai.curPos = coords.slice(0);
            ai.isUpdating = false;
            ai.updateCount = 0;
            ai.direction = 0;
            ai.prevTrackStart = ai.prevTrackEnd = ai.trackStart = ai.trackEnd = undefined;
            ai.prevDistanceToLoopStart = ai.distanceToLoopStart = ai.prevDistanceToLoopEnd = ai.distanceToLoopEnd = undefined;
            trackCurPos(ai);
        }

        for (var i in notification.updatedItems) {
            var ui = notification.updatedItems[i];
            if (!ui.isUpdating) {
                var d = ui.GetData(), coords = d.coords;
                if (tf.units.GetHaversineDistance(coords, ui.curPos) > minDistMoveBetweenSamplesInMeters) {
                    if (d.atDate < ui.lastDate) {
                        ui.lastDate = d.atDate;
                        ui.skipUpdate = ui.isUpdating;
                        ui.curPos = coords.slice(0);
                        ui.updateCount = 0;
                        ui.direction = 0;
                        ui.prevTrackStart = ui.prevTrackEnd = ui.trackStart = ui.trackEnd = undefined;
                        ui.prevDistanceToLoopStart = ui.distanceToLoopStart = ui.prevDistanceToLoopEnd = ui.distanceToLoopEnd = undefined;
                    }
                    else {
                        ui.lastDate = d.atDate;
                        ui.prevPos = ui.curPos;
                        ui.curPos = coords.slice(0);
                        trackCurPos(ui);
                    }
                }
            }
        }
    };

    function createKL() {
        KL = new tf.js.KeyedList({
            name: "busTrackers", keepNotUpdated: false,
            getKeyFromItemData: function (itemData) { return !!itemData ? itemData.key : undefined; },
            needsUpdateItemData: function (updateObj) { return true; },
            filterAddItem: function (itemData) { return true; }
        });
        klListener = KL.AddAggregateListener(onKLChange);
    };

    function initialize() {
        maxAbsDirectionVal = 10000;
        directionValNearStartEnd = 100;
        minDistMoveBetweenSamplesInMeters = 50;
        minDistanceToBeNearStartEnd = 100;
        createKL();
        loopStartPos = options.loopStartPos.slice(0);
        loopEndPos = options.loopEndPos.slice(0);
    };

    initialize();
};

tf.map.LineStringsByStartAndEnd = function (options) {
    var theThis = this; if (!(theThis instanceof tf.map.LineStringsByStartAndEnd)) { return new tf.map.LineStringsByStartAndEnd(options); }
    var KL, layer;
    var maxDistanceTolerance;

    this.SetLayer = function (layerSet) { layer = layerSet; };

    this.Size = function () { return KL.GetItemCount(); }

    this.GetTableSpecs = function () {
        return {
            KL: KL,
            onSelect: onSelect,
            tableName: "Partials",
            getRowContent: getRowContent,
            compare: compare
        };
    };

    function onSelect() {

    };

    function getHideShowTextToolTip(keyedItem) {
        return keyedItem.GetData().mapFeatureVisible ?
            { text: "Hide", toolTip: "Hide map feature on map" } :
            { text: "Show", toolTip: "Show map feature on map" }
    };

    function updateVisibleButton(keyedItem) {
        var result = getHideShowTextToolTip(keyedItem);
        keyedItem.visibleButton.SetText(result.text);
        keyedItem.visibleButton.ChangeToolTip(result.toolTip);
    };

    function getOnVisible(keyedItem) {
        return function onVisible(notification) {
            var data = keyedItem.GetData();
            if (data.mapFeatureVisible = !data.mapFeatureVisible) {
                layer.AddMapFeature(data.mapFeature);
                layer.AddMapFeature(data.startMapFeature);
                layer.AddMapFeature(data.endMapFeature);
            }
            else {
                layer.DelMapFeature(data.mapFeature);
                layer.DelMapFeature(data.startMapFeature);
                layer.DelMapFeature(data.endMapFeature);
            }
            updateVisibleButton(keyedItem);
        };
    };

    function getRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();

            if ((content = keyedItem.listContent) == undefined) {
                keyedItem.listContent = content = options.createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })
                var divAllWrapperE = divAllWrapper.GetHTMLElement();
                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineInEditorDiv" });
                var divLineWrapperE = divLineWrapper.GetHTMLElement();

                divAllWrapperE.style.whiteSpace = 'normal';

                var buttonDim = "1.0rem", textDim = buttonDim;

                keyedItem.visibleButton = new tf.ui.TextBtn({
                    style: true, label: "Hide", dim: buttonDim, tooltip: "Show/Hide", onClick: getOnVisible(keyedItem)
                });

                updateVisibleButton(keyedItem);

                divAllWrapper.AddContent(divLineWrapper, keyedItem.visibleButton);
                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
            }

            var title = data.datetime + ' ' + options.getTwoCoordsName(data.startCoord, data.endCoord);
            keyedItem.title = title;
            keyedItem.divLineWrapperE.innerHTML = title;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    };

    function compare(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        return kia.title < kib.title ? -1 : 1;
        /*var a = kia.GetData(), b = kib.GetData();
        if (a.startCoord[0] != b.startCoord[0]) { return a.startCoord[0] - b.startCoord[0]; }
        if (a.startCoord[1] != b.startCoord[1]) { return a.startCoord[1] - b.startCoord[1]; }
        if (a.endCoord[0] != b.endCoord[0]) { return a.endCoord[0] - b.endCoord[0]; }
        if (a.endCoord[1] != b.endCoord[1]) { return a.endCoord[1] - b.endCoord[1]; }
        return a.dateObj.getTime() - b.dateObj.getTime();*/
    };

    this.Reset = function () {
        if (layer) {
            KL.RemoveAllItems();
            layer.RemoveAllFeatures();
        }
    };

    this.Add = function (dateObj, datetime, startCoord, endCoord, lineString) {
        if (layer) {
            var key = getKey(datetime, startCoord, endCoord);
            if (key !== undefined) {
                if (!KL.GetItem(key)) {
                    if (getMinDistanceFromExisting(lineString, maxDistanceTolerance).canAdd) {
                        var geom = {
                            type: 'linestring', coordinates: lineString, style: getPartialStyle, hoverStyle: getPartialStyle
                        };
                        var mapFeature;
                        layer.AddMapFeature(mapFeature = new tf.map.Feature(geom));
                        var startEndGeom = {
                            type: 'point',
                            style: { marker: true, label: 'start' },
                            coordinates: lineString[0].slice(0)
                        };

                        var startMapFeature = new tf.map.Feature(startEndGeom);
                        startEndGeom.style = { marker: true, label: 'end' };
                        startEndGeom.coordinates = lineString[lineString.length - 1].slice(0);
                        var endMapFeature = new tf.map.Feature(startEndGeom);
                        layer.AddMapFeature(startMapFeature);
                        layer.AddMapFeature(endMapFeature);
                        KL.UpdateFromNewData([{
                            key: key, dateObj: dateObj, datetime: datetime, startCoord: startCoord, endCoord: endCoord, lineString: lineString,
                            mapFeature: mapFeature, mapFeatureVisible: true, startMapFeature: startMapFeature, endMapFeature: endMapFeature
                        }]);
                    }
                }
                else { console.log('duplicate key'); }
            }
        }
        console.log('current count ' + theThis.Size());
    };

    function getMinDistanceFromExisting(lineString, maxDistanceTolerance) {
        var minDistance = undefined;
        var canAdd = true;
        var kil = KL.GetKeyedItemList();
        for (var i in kil) {
            var ki = kil[i], kid = ki.GetData();
            var thisDistance = tf.js.GetDistanceBetweenLineStrings2(kid.lineString, lineString);
            console.log('this distance = ' + thisDistance);
            if (minDistance == undefined || thisDistance < minDistance) {
                minDistance = thisDistance;
                if (maxDistanceTolerance !== undefined && thisDistance < maxDistanceTolerance) {
                    canAdd = false;
                    break;
                }
            }
        }
        console.log('min distance = ' + minDistance + ' canAdd = ' + canAdd);
        return { minDistance: minDistance, canAdd: canAdd };
    };

    function getPartialStyle(kf, mapFeature) {
        var zindex = 10;
        var lineItemColor = "#037";
        var line_width = 5;
        return [{ line: true, line_color: lineItemColor, line_width: line_width, zindex: zindex, snaptopixel: false },
        { line: true, line_color: "#fc0", line_width: line_width - 2, zindex: zindex + 1, line_dash: [line_width, line_width * 2], snaptopixel: false }];
    };

    function getKey(datetime, from, to) {
        var key;
        if (tf.js.GetIsNonEmptyString(datetime) && tf.js.GetIsArrayWithMinLength(from, 2) && tf.js.GetIsArrayWithMinLength(to, 2)) {
            key = from[0] + '/' + from[1] + '|' + to[0] + '/' + to[1] + '=' + datetime;
        }
        return key;
    };

    function createKL() {
        KL = new tf.js.KeyedList({
            name: "partialLineStrings",
            keepNotUpdated: true,
            getKeyFromItemData: function (itemData) { return !!itemData ? itemData.key : undefined; },
            needsUpdateItemData: function (itemData) {
                console.log('update attempted in partial line strings');
                return false;
            },
            filterAddItem: function (itemData) { return true; }
        });
    };

    function initialize() {
        //maxDistanceTolerance = 300;
        maxDistanceTolerance = 150;
        createKL();
    };

    initialize();
};

ITPA.OC.TrafficReplay = function () {
    var theThis, debug, styles, urlapiApp, appSpecs, serverURL, polyCode, totalTime;
    var singleAppHCFOnTheSide, singleAppMapContentOnTheSide, twoHorPaneLayout, HCFLayout, dLayers, appSizer, map;
    var busHistoryKeyedList, deviceHistoryKeyedList, busTable, deviceTable, routesKeyedList, stopsKeyedList, scrubSlider;
    var busHistoryData, deviceHistoryData, lastSelectedBus, lastSelectedDevice, startToastCB, endToastCB, lastTrackFeature;
    var nMinutesInterval, startDate, startDateStr, endDate, authForm, toaster, dateButton, datePicker;
    var hourButton, hourMenu, hourButtonLabel, buttonDim, hourAMPMButton, isAM, timeSpanButton, timeSpanStr, timeSpanMenu, timeSpanItems;
    var name0HourStr, dateForPicker, hourForMenu, busLayer, deviceLayer, routesLayer, stopsLayer, extraLayer, timePartialsLayer, pinPartialsLayer;
    var preComposeListener, featureClickListener, interpolateCoordsBetweenEvents, timer;
    var routesAreLoaded, stopsAreLoaded, imagesPreLoaded, urlAPICreated, currentTimeElem;
    var mapBusDirImagePreloaded, mapDeviceImagePreloaded, currentMenu, appToolBar, stopTextStyleSpecs, isTracking, isShowingEventRoute;
    var animationDisplayControl, minDate, maxDate, playPauseButton, wrapTime, playbackSpeed, speedButton;
    var settings;
    var loginDiv, emailInput, passwordInput;
    var menuItemSelectedClasses, menuItemUnselectedClasses;
    var busRawData, deviceRawData;
    var trackingItem;
    var showingMapPins;
    var fromImagePreloaded, toImagePreloaded;
    var showFIUOnly;
    var MMCCenter, GCCenter, ECCenter, BBCCenter;
    var markTimeButton, clearTimeButton;
    var markedTime;
    var isMaximized;
    var dumpLineStringJSONButton;
    var partialBusRouteFeature, partialBusRouteBus;
    var jsonEditControl;
    var startMapFeature, endMapFeature;
    var featureMoving;
    var lastElapsedTime;
    var frameCount, nFramesForCenter;
    var isLoadingHistory, isLoadingBusHistory, isLoadingDeviceHistory;
    var scrubSliderMax;
    var lineStringsByStartAndEnd;
    var partialsTable;
    //var GPERouteBusTrackers, CATSRouteBusTrackers;

    this.Initialize = function (settingsSet) { if (settings == undefined) { settings = settingsSet; doInitialize(); } }

    function logConsole(str) { if (!!debug) { debug.LogIfTest(str); } }

    function closeCurrentMenu() { if (!!currentMenu) { currentMenu.Detach(); currentMenu = undefined; } }
    function closeCurrentMenuAndCheck(thisMenu) { var isCurrent = currentMenu == thisMenu; closeCurrentMenu(); return isCurrent; }
    function openMenu(theMenu, styleSet) { closeCurrentMenu(); if (!!theMenu) { (currentMenu = theMenu).AppendTo(appToolBar, styleSet); } }

    function checkToolbarButtons() {
        var hasSelItem = lastSelectedBus != undefined;
        var displayStr = hasSelItem ? 'inline-block' : 'none';
    }

    function onRefresh() { closeCurrentMenu(); loadHistoryInterval(); }

    function onDateButtonClicked() {
        if (!closeCurrentMenuAndCheck(datePicker)) {
            datePicker.SetDate(dateForPicker);
            var toolBarRect = appToolBar.GetHTMLElement().getBoundingClientRect();
            var topStr = toolBarRect.bottom + 'px';
            openMenu(datePicker, { position: "absolute", right: "0px", top: topStr, zIndex: 10 })
        }
    }

    function onHourButtonClicked() {
        if (!closeCurrentMenuAndCheck(hourMenu)) {
            var targetRect = hourButton.GetHTMLElement().getBoundingClientRect();
            var topStr = targetRect.bottom + 'px';
            openMenu(hourMenu, { position: "absolute", left: targetRect.left + 'px', top: topStr, zIndex: 10 });
        }
    }

    function onTimeSpanButtonClicked() {
        if (!closeCurrentMenuAndCheck(timeSpanMenu)) {
            var targetRect = timeSpanButton.GetHTMLElement().getBoundingClientRect();
            var topStr = targetRect.bottom + 'px';
            openMenu(timeSpanMenu, { position: "absolute", left: targetRect.left + 'px', top: topStr, zIndex: 10, whiteSpace: "nowrap", overflow: "hidden" });
        }
    }

    function setDateButtonLabel() { if (!!dateButton) { dateButton.SetText(tf.js.GetMonthDayYearStr(dateForPicker)); } }
    function setHourButtonLabel() { if (!!hourButton) { hourButton.SetText(hourButtonLabel); } }
    function setHourAMPMButtonLabel() { if (!!hourAMPMButton) { hourAMPMButton.SetText(isAM ? 'am' : 'pm'); } }
    function setTimeSpanButtonLabel() { if (!!timeSpanButton) { timeSpanButton.SetText(timeSpanStr); } }

    function onDatePickerDateClicked(notification) { dateForPicker = notification.date; closeCurrentMenu(); setDateButtonLabel(); }
    function onHourMenuClicked(notification) { hourForMenu = parseInt(notification.text, 10); hourButtonLabel = notification.text; closeCurrentMenu(); setHourButtonLabel(); }
    function onHourAMPMButtonClicked() { closeCurrentMenu(); isAM = !isAM; setHourAMPMButtonLabel(); }
    function onTimeSpanMenuClicked(notification) {
        nMinutesInterval = notification.item.nMinutesInterval;
        timeSpanStr = notification.item.timeSpanStr;
        closeCurrentMenu();
        setTimeSpanButtonLabel();
    }

    function onPlayPause() { timer.Pause(!timer.GetIsPaused()); map.Render(); }
    function onStop() { timer.Pause(true); timer.SetElapsedTime(0); drawFrame(0); playPauseButton.SetIsToggled(true); updateCurrentTimeElem(); }
    function onToggleAutoRepeat() { timer.SetWrap(wrapTime = !wrapTime); }

    function updateSpeedButtonLabel() { if (!!speedButton) { speedButton.SetText(playbackSpeed + 'x'); } }

    function onSpeedButtonClicked() { if ((playbackSpeed *= 10) > 100) { playbackSpeed = 1; } timer.SetSpeed(playbackSpeed); updateSpeedButtonLabel(); }

    function onMarkTimeButtonClicked() {
        if (markedTime == undefined) {
            markTimeButton.SetText("R");
            markedTime = timer.GetElapsedTime();
            var displayTimeStamp = getDisplayTimeStampFor(markedTime);
            markTimeButton.ChangeToolTip("Restore time " + displayTimeStamp);
            clearTimeButton.ChangeToolTip("Clear time " + displayTimeStamp);
            console.log('marked ' + markedTime);
            updatePartialBusRouteFeatureStatus();
            updateCurrentTimeElem();
            setAuxButtonsDisplay();
        }
        else {
            timer.SetElapsedTime(markedTime);
            forceRefreshPartialBusRouteFeatureStatus();
            console.log('restored ' + markedTime);
            updateCurrentTimeElem();
            setAuxButtonsDisplay();
        }
    };

    function onClearMarkedTimeButtonClicked() {
        if (markedTime !== undefined) {
            markTimeButton.SetText("M");
            markTimeButton.ChangeToolTip("Mark Time");
            clearTimeButton.ChangeToolTip("Clear Marked Time");
            console.log('cleared ' + markedTime);
            markedTime = undefined;
            updatePartialBusRouteFeatureStatus();
            updateCurrentTimeElem();
            setAuxButtonsDisplay();
        }
    };

    function setAuxButtonsDisplay() {
        var markTimeButtonDisplay = isMaximized ? "inline-block" : "none";
        var clearTimeButtonDisplay = isMaximized && markedTime !== undefined ? "inline-block" : "none";
        var width = isMaximized ? "calc(100% - 20px)" : "26rem";
        clearTimeButton.GetHTMLElement().style.display = clearTimeButtonDisplay;
        markTimeButton.GetHTMLElement().style.display = markTimeButtonDisplay;
        animationDisplayControl.GetHTMLElement().style.width = width;

        dumpLineStringJSONButton.GetHTMLElement().style.display = partialBusRouteFeature !== undefined ? "inline-block" : "none";
    };

    function onToggleMaximized() {
        isMaximized = !isMaximized;
        updateCurrentTimeElem();
        setAuxButtonsDisplay();
    };

    function onDumpJSONClicked() {
        if (partialBusRouteFeature) {
            var precision = 6;
            jsonEditControl.Edit({
                title: "JSON data", saveText: "Close", /*cancelText: "Cancel", */saveToolTip: "Close window", cancelToolTip: "Close window", nRows: 30,
                text: polyCode.EncodeLineString(partialBusRouteFeature.GetGeom().GetCoordinates().slice(0), precision)
            });
        }
    };

    function onSliderChange(evt, pos) {
        var elapsedTime = parseInt(pos.current, 10) / scrubSliderMax * totalTime;
        timer.SetElapsedTime(elapsedTime);
        drawFrame(elapsedTime);
        //scrubSlider.SetPos01(pos01);
        if (timer.GetIsPaused()) {
            forceRefreshPartialBusRouteFeatureStatus();
        }
    };

    function createAnimationControl() {
        var rightMarginPX = 8;
        var marginStr = rightMarginPX + "px";
        var style = {
            display: "block", overflow: "hidden",
            position: "absolute", right: marginStr, bottom: marginStr, fontSize: "1.8em", backgroundColor: "rgba(255,255,255,0.65)", borderRadius: "8px", border: "2px solid navy",
            "tf-shadow": [0, 0, 4, "rgba(0,0,0,0.6)"], zIndex: 2, textAlign: "left", minWidth: "26rem"
        };
        var lightBool = true;
        var buttonDim = "1.0em", textDim = buttonDim;
        var topDiv = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass });

        speedButton = new tf.ui.TextBtn({ style: true, label: "", dim: buttonDim, tooltip: "Select playback speed", onClick: onSpeedButtonClicked });
        updateSpeedButtonLabel();

        speedButton.GetHTMLElement().style.minWidth = "3rem";

        var maxiMinButton = new tf.ui.SvgGlyphToggleBtn({
            style: lightBool, onClick: onToggleMaximized, dim: buttonDim, isToggled: isMaximized,
            glyph: tf.styles.SvgGlyphLeftArrowName, tooltip: "Maximize size", toggledGlyph: tf.styles.SvgGlyphRightArrowName, toggledTooltip: "Restore size"
        });

        var autoRepeatButton = new tf.ui.SvgGlyphToggleBtn({
            style: lightBool, onClick: onToggleAutoRepeat, dim: buttonDim, isToggled: wrapTime,
            glyph: tf.styles.SvgGlyphAutoRepeatName, tooltip: "Auto-repeat", toggledGlyph: tf.styles.SvgGlyphNoAutoRepeatName, toggledTooltip: "Auto-repeat"
        });

        markTimeButton = new tf.ui.TextBtn({ style: true, label: "T", dim: buttonDim, tooltip: "Mark Time", onClick: onMarkTimeButtonClicked });
        markTimeButton.GetHTMLElement().style.minWidth = "3rem";
        clearTimeButton = new tf.ui.TextBtn({ style: true, label: "C", dim: buttonDim, tooltip: "Clear Marked Time", onClick: onClearMarkedTimeButtonClicked });
        clearTimeButton.GetHTMLElement().style.minWidth = "3rem";

        dumpLineStringJSONButton = new tf.ui.TextBtn({ style: true, label: "J", dim: buttonDim, tooltip: "Dump JSON", onClick: onDumpJSONClicked });
        dumpLineStringJSONButton.GetHTMLElement().style.minWidth = "3rem";

        playPauseButton = new tf.ui.SvgGlyphToggleBtn({
            style: lightBool, onClick: onPlayPause, dim: buttonDim, isToggled: false,
            glyph: tf.styles.SvgGlyphPauseName, tooltip: "Pause", toggledGlyph: tf.styles.SvgGlyphPlayName, toggledTooltip: "Play"
        });

        var stopButton = new tf.ui.SvgGlyphBtn({ style: lightBool, glyph: tf.styles.SvgGlyphStopName, onClick: onStop, tooltip: "Stop", dim: buttonDim });

        var currentTimeDivStyle = {
                verticalAlign: "middle",
                borderLeft: "1px solid #003377",
                padding: "6px",
                paddingBottom: "2px",
                display: "inline-block",
                cursor: "default",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "calc(100% - 14px)",
                backgroundColor: "transparent",
                background: "none",
                textAlign: "center"
             };

        var currentTimeDiv = new tf.dom.Div();
        currentTimeElem = currentTimeDiv.GetHTMLElement();

        styles.ApplyStyleProperties(currentTimeDiv, currentTimeDivStyle);

        topDiv.AddContent(
            styles.AddButtonDivMargins(maxiMinButton),
            styles.AddButtonDivRightMargin(speedButton),
            styles.AddButtonDivRightMargin(stopButton),
            styles.AddButtonDivRightMargin(playPauseButton),
            styles.AddButtonDivRightMargin(autoRepeatButton),

            styles.AddButtonDivRightMargin(markTimeButton),
            styles.AddButtonDivRightMargin(clearTimeButton),
            styles.AddButtonDivRightMargin(dumpLineStringJSONButton),

            styles.AddButtonDivRightMargin(currentTimeElem));

        var barDiv = new tf.dom.Div({ cssClass: styles.unPaddedBlockDivClass + " " + cssClassNames.rangeClassName });
        var barStyle = { overflow: "hidden", borderTop: "1px solid #003377" };

        styles.ApplyStyleProperties(barDiv, barStyle);

        scrubSlider = new tf.dom.RangeInput({});
        scrubSlider.GetHTMLElement().min = 0;
        scrubSlider.GetHTMLElement().max = scrubSliderMax;
        tf.dom.OnRangeChange(scrubSlider, onSliderChange);

        /*scrubSlider = new tf.ui.CanvasSlider(0, "1.5rem", false);
        var scrubSliderElem = scrubSlider.GetHTMLElement();

        scrubSlider.SetOnClickListener(function (sender, pos01) {
            var elapsedTime = totalTime * pos01;
            timer.SetElapsedTime(elapsedTime);
            drawFrame(elapsedTime);
            scrubSlider.SetPos01(pos01);
            if (timer.GetIsPaused()) {
                forceRefreshPartialBusRouteFeatureStatus();
            }
        }, theThis);

        scrubSliderElem.style.width = "calc(100% - 2px)";
        scrubSliderElem.style.display = "block";*/

        barDiv.AddContent(scrubSlider);

        topDiv.AddContent(barDiv);

        styles.ApplyStyleProperties(animationDisplayControl = topDiv, style);
        animationDisplayControl.AppendTo(map.GetMapMapContainer());
        showAnimationControl(false);
        setAuxButtonsDisplay();
    }

    function createJSONEditControl() {
        jsonEditControl = new tf.ui.FullScreenMultiLineInput({
            fullScreenSettings: { customStyle: { backgroundColor: "rgba(0,0,0,0.3)" } },
            multiLineInputSettings: {
                textAreaToolTip: "Copy JSON to the clipboard",
                validator: function (notification) {
                    return true;
                },
                onClose: function (notification) {
                    /*isShowing = false;
                    if (notification.isConfirmed) { }*/
                }
            }
        });
    };

    function showAnimationControl(showBool) { styles.ChangeOpacityVisibilityClass(animationDisplayControl, showBool); }

    function addToolbarButtons() {

        datePicker = new tf.ui.DatePicker({ onClick: onDatePickerDateClicked });
        dateButton = new tf.ui.TextBtn({ style: true, label: "", dim: buttonDim, tooltip: "Select date", onClick: onDateButtonClicked });
        setDateButtonLabel();

        var hourItems = [];

        for (var i = 0 ; i < 12 ; ++i) { var text = i == 0 ? name0HourStr : '' + i; hourItems.push({ text: text, toolTip: 'Select hour ' + text }); }

        hourMenu = new tf.ui.QuickMenu({ onClick: onHourMenuClicked, items: hourItems });
        hourButton = new tf.ui.TextBtn({ style: true, label: "", dim: buttonDim, tooltip: "Select hour", onClick: onHourButtonClicked });
        setHourButtonLabel();

        var hourButtonES = hourButton.GetHTMLElement().style;
        hourButtonES.minWidth = "1.4rem";
        hourButtonES.textAlign = "right";

        hourAMPMButton = new tf.ui.TextBtn({ style: true, label: "", dim: buttonDim, tooltip: "Select AM/PM", onClick: onHourAMPMButtonClicked });
        setHourAMPMButtonLabel();

        timeSpanMenu = new tf.ui.QuickMenu({ onClick: onTimeSpanMenuClicked, items: timeSpanItems });
        timeSpanButton = new tf.ui.TextBtn({ style: true, label: "", dim: buttonDim, tooltip: "Select History Time Span", onClick: onTimeSpanButtonClicked });
        setTimeSpanButtonLabel();

        var div = HCFLayout.CreateUnPaddedDivForHeader();
        var divStyle = { padding: "2px", borderTop: "1px solid #bfbfbf" };

        styles.ApplyStyleProperties(div, divStyle);

        div.AddContent(dateButton, hourButton, hourAMPMButton, timeSpanButton);

        urlapiApp.AddToToolBar(div);

        //urlapiApp.AddToToolBar(styles.AddButtonDivMargins(dateButton));
        //urlapiApp.AddToToolBar(styles.AddButtonDivRightMargin(hourButton));
        //urlapiApp.AddToToolBar(styles.AddButtonDivRightMargin(hourAMPMButton));
        //urlapiApp.AddToToolBar(styles.AddButtonDivRightMargin(timeSpanButton));
    }

    function createLayers() {
        var layerZIndex = 50;
        var layerSettings = { name: "", isVisible: true, isHidden: false, useClusters: false, zIndex: layerZIndex };

        ++layerSettings.zIndex; layerSettings.name = "Routes"; routesLayer = map.AddFeatureLayer(layerSettings);

        ++layerSettings.zIndex; layerSettings.name = "Stops"; layerSettings.minMaxLevels = { minLevel: 15, maxLevel: 21 };
        stopsLayer = map.AddFeatureLayer(layerSettings);
        delete layerSettings.minMaxLevels;

        ++layerSettings.zIndex; layerSettings.name = "Buses"; layerSettings.isHidden = true; busLayer = map.AddFeatureLayer(layerSettings);
        ++layerSettings.zIndex; layerSettings.name = "Devices"; layerSettings.isHidden = true; deviceLayer = map.AddFeatureLayer(layerSettings);
        ++layerSettings.zIndex; layerSettings.name = "Extra"; layerSettings.isHidden = true; extraLayer = map.AddFeatureLayer(layerSettings);
        ++layerSettings.zIndex; layerSettings.name = "TimePartials"; layerSettings.isHidden = true; timePartialsLayer = map.AddFeatureLayer(layerSettings);
        ++layerSettings.zIndex; layerSettings.name = "PinPartials"; layerSettings.isHidden = true; pinPartialsLayer = map.AddFeatureLayer(layerSettings);
    };

    function showAllLabels(showBool) {
        var busList = busHistoryKeyedList.GetKeyedItemList();
        for (var i in busList) { var busFeature = busList[i].mapFeature; if (!!busFeature) { busFeature.SetIsAlwaysInHover(showBool); } }
        var deviceList = deviceHistoryKeyedList.GetKeyedItemList();
        for (var i in deviceList) { var deviceFeature = deviceList[i].mapFeature; if (!!deviceFeature) { deviceFeature.SetIsAlwaysInHover(showBool); } }
    }

    function setShowAuxMapPins(show) {
        if (showingMapPins != (show = !!show)) {
            if (showingMapPins = show) {
                extraLayer.AddMapFeature(startMapFeature);
                extraLayer.AddMapFeature(endMapFeature);
            }
            else {
                extraLayer.DelMapFeature(startMapFeature);
                extraLayer.DelMapFeature(endMapFeature);
            }
        }
    };

    function isSameCoords(c1, c2) { return c1[0] == c2[0] && c1[1] == c2[1]; }
    function isMMCCenter(coords) { return isSameCoords(coords, MMCCenter); }
    function isBBCCenter(coords) { return isSameCoords(coords, BBCCenter); }
    function isECCenter(coords) { return isSameCoords(coords, ECCenter); }
    function isGCCenter(coords) { return isSameCoords(coords, GCCenter); }

    function coordsToText(coords) { return 'lon ' + coords[0].toFixed(5) + ' lat ' + coords[1].toFixed(5); };
    function twoCoordsToText(c1, c2) { return coordsToText(c1) + ' ' + coordsToText(c2); };

    function getTwoCoordsName(c1, c2) {
        if (isMMCCenter(c1) && isBBCCenter(c2)) { return "GPE BBC"; }
        if (isMMCCenter(c2) && isBBCCenter(c1)) { return "GPE MMC"; }
        if (isGCCenter(c1) && isECCenter(c2)) { return "CATS EC"; }
        if (isGCCenter(c2) && isECCenter(c1)) { return "CATS GC"; }
        return twoCoordsToText(c1, c2);
    };

    function createHeaderToolbar() {
        var div = HCFLayout.CreateUnPaddedDivForHeader();
        var divStyle = { padding: "2px", borderTop: "1px solid #bfbfbf" };
        var lightBool = true;
        var buttonDim = "1.6rem";

        styles.ApplyStyleProperties(div, divStyle);

        var busLabelGlyph = {
            name: 'busLabelGlyph',
            style: "enable-background:new 0 0 1000 1000;",
            W: 979.97498, H: 979.90002,
            paths: [{
                style: "fill-opacity:1",
                d: "m 202.05,138.65 c -8.3,-9.5 -19.8,-15.9 -33.4,-15.9 -25.3,0 -45.9,20.6 -45.9,45.9 0,14.4 7.2,26.5 17.6,34.9 l 2.7,2 c 7.4,5.2 15.9,8.9 25.6,8.9 25.3,0 45.9,-20.5 45.9,-45.9 0,-9.7 -3.7,-18.3 -8.9,-25.7 l -3.6,-4.2 z"
            }, {
                style: "fill-opacity:1;stroke:none;stroke-opacity:1;",
                d: "M 953.05,529.55 449.95,26.35 c -11.1,-11.1 -24.5,-18.4 -38.6,-22.6 -2.2,-1.1 -4.7,-1.6 -7.2,-2.1 -1,-0.2 -1.9,-0.4 -2.9,-0.6 -1.1,-0.1 -2.1,-0.6 -3.2,-0.6 l -3.5,0 c -6.2,-0.6 -12.5,-0.6 -18.7,0 l -344.8,0 c -16.9,0 -30.6,13.7 -30.6,30.6 l 0,30.6 0,46.2 0,267.9 c -0.6,6.2 -0.6,12.4 0,18.7 l 0,3.6 c 0,1.2 0.6,2.1 0.6,3.2 0.2,0.9 0.4,1.9 0.6,2.9 0.6,2.5 1,5 2.1,7.2 4.2,14.1 11.5,27.5 22.6,38.6 l 503.1,503.1 c 35.8,35.8 93.9,35.8 129.8,0 l 293.8,-293.8 c 35.9,-35.8 35.9,-93.9 0,-129.7 z m -52.6,110.5 -270.1,257.9 c -23.9,23.9 -62.6,23.9 -86.5,0 L 61.35,405.05 c 0.3,-1.7 0.3,-5.3 0.3,-7 l 0,-63.7 0,-48.4 0,-0.9 0,-95 0,-128.5 195.2,0 28.3,0 0.9,0 25.4,0 86.8,0 c 3.1,0 7.7,0.9 10.5,0.1 l 491.9,491.9 c 23.7,23.9 23.7,62.7 -0.2,86.5 z"
            }]
        };

        var busLabelItems = [{ text: "Show All", toolTip: "Show all labels", showBool: true }, { text: "Hide All", toolTip: "Hide all labels", showBool: false }];
        var busLabelMenu = new tf.ui.QuickMenu({
            items: busLabelItems,
            onClick: function (notification) { closeCurrentMenu(); showAllLabels(notification.item.showBool); }
        });
        var busLabelButton = new tf.ui.SvgGlyphBtn({
            tooltip: "Show/Hide Labels", dim: buttonDim, paddingDim: "2px", style: lightBool, glyph: busLabelGlyph,
            onClick: function (notification) {
                if (!closeCurrentMenuAndCheck(busLabelMenu)) {
                    var targetRect = busLabelButton.GetHTMLElement().getBoundingClientRect();
                    var topStr = targetRect.bottom + 'px';
                    openMenu(busLabelMenu, { position: "absolute", left: targetRect.left + 'px', top: topStr, zIndex: 10 });
                }
                return false;
            }});

        var buttons = busLabelMenu.GetButtons();
        busLabelMenu.GetTopDivStyle().textAlign = 'left';
        for (var i in buttons) {
            var thisButton = buttons[i], thisItem = busLabelItems[i];
            var thisButtonStyle = thisButton.GetHTMLElement().style;
            thisButtonStyle.display = 'inline-block';
            thisButton.SetStyle(thisItem.showBool ? menuItemSelectedClasses : menuItemUnselectedClasses);
        }

        var busTrackItems = [{ text: "Track selected item", toolTip: "Track the currently selected item", doTrack: true }, { text: "Do not track", toolTip: "Do not track", doTrack: false }];
        var busTrackMenu = new tf.ui.QuickMenu({
            items: busTrackItems,
            onClick: function (notification) { closeCurrentMenu(); isTracking = notification.item.doTrack; colorBusTrackMenu(); }
        });
        var busTrackButton = new tf.ui.SvgGlyphBtn({
            tooltip: "Track selected item", dim: buttonDim, paddingDim: "0px", style: lightBool, glyph: tf.styles.SvgGlyphBullsEye2Name,
            onClick: function (notification) {
                if (!closeCurrentMenuAndCheck(busTrackMenu)) {
                    var targetRect = busLabelButton.GetHTMLElement().getBoundingClientRect();
                    //var targetRect = busTrackButton.GetHTMLElement().getBoundingClientRect();
                    var topStr = targetRect.bottom + 'px';
                    openMenu(busTrackMenu, { position: "absolute", left: targetRect.left + 'px', top: topStr, zIndex: 10 });
                }
                return false;
            }
        });

        function colorBusTrackMenu() {
            var buttons = busTrackMenu.GetButtons();
            busTrackMenu.GetTopDivStyle().textAlign = 'left';
            for (var i in buttons) {
                var thisButton = buttons[i], thisItem = busTrackItems[i], isSelected = thisItem.doTrack == isTracking;
                var thisButtonStyle = thisButton.GetHTMLElement().style;
                thisButtonStyle.display = 'inline-block';
                thisButtonStyle.zIndex = isSelected ? 2 : 1;
                thisButton.SetStyle(thisItem.doTrack ? menuItemSelectedClasses : menuItemUnselectedClasses);
                var buttonText = thisItem.text;
                if (isSelected) { buttonText = '* ' + buttonText; }
                thisButton.SetText(buttonText);
            }
        }

        colorBusTrackMenu();

        var busRouteItems = [{ text: "Show selected item route", toolTip: "Show the event route of the currently selected item", doRoute: true }, { text: "Do not show", toolTip: "Do not show the current event route", doRoute: false }];
        var busRouteMenu = new tf.ui.QuickMenu({
            items: busRouteItems,
            onClick: function (notification) {
                closeCurrentMenu(); setShowEventRoute(notification.item.doRoute);
                colorBusRouteMenu();
            }
        });
        var busRouteButton = new tf.ui.SvgGlyphBtn({
            tooltip: "Show selected item route", dim: buttonDim, paddingDim: "0px", style: lightBool, glyph: tf.styles.SvgGlyphRoadName,
            onClick: function (notification) {
                if (!closeCurrentMenuAndCheck(busRouteMenu)) {
                    //var targetRect = busRouteButton.GetHTMLElement().getBoundingClientRect();
                    var targetRect = busLabelButton.GetHTMLElement().getBoundingClientRect();
                    var topStr = targetRect.bottom + 'px';
                    var leftStr = targetRect.left + 'px';
                    //var leftStr = '2px';
                    openMenu(busRouteMenu, { position: "absolute", left: leftStr, top: topStr, zIndex: 10 });
                }
                return false;
            }
        });

        function colorBusRouteMenu() {
            var buttons = busRouteMenu.GetButtons();
            busRouteMenu.GetTopDivStyle().textAlign = 'left';
            for (var i in buttons) {
                var thisButton = buttons[i], thisItem = busRouteItems[i], isSelected = thisItem.doRoute == isShowingEventRoute;
                var thisButtonStyle = thisButton.GetHTMLElement().style;
                thisButtonStyle.display = 'inline-block';
                thisButtonStyle.zIndex = isSelected ? 2 : 1;
                thisButton.SetStyle(thisItem.doRoute ? menuItemSelectedClasses : menuItemUnselectedClasses);
                var buttonText = thisItem.text;
                if (isSelected) { buttonText = '* ' + buttonText; }
                thisButton.SetText(buttonText);
            }
        }

        colorBusRouteMenu();

        var mapPinItems = [
            { text: "Show map pins", toolTip: "Show auxiliary map pins", showPins: true },
            { text: "Do not show", toolTip: "Do not show auxiliary map pins", showPins: false },

            { text: "CATS GC-EC", toolTip: "Move Start and End pins to CATS", showPins: true, coords1: GCCenter, coords2: ECCenter },
            { text: "CATS EC-GC", toolTip: "Move Start and End pins to CATS", showPins: true, coords1: ECCenter, coords2: GCCenter },
            { text: "GPE BBC", toolTip: "Move Start and End pins to MMC -> BBC", showPins: true, coords1: MMCCenter, coords2: BBCCenter },
            { text: "GPE MMC", toolTip: "Move Start and End pins to BBC -> MMC", showPins: true, coords1: BBCCenter, coords2: MMCCenter },

            { text: "Start to GC", toolTip: "Move Start pin to Modesto Maidique Campus", showPins: true, coords1: GCCenter },
            { text: "End to EC", toolTip: "Move End pin to Engineering Campus", showPins: true, coords2: ECCenter },
            { text: "Start to MMC", toolTip: "Move Start pin to Modesto Maidique Campus", showPins: true, coords1: MMCCenter },
            { text: "End to BBC", toolTip: "Move End pin to Biscayne Bay Campus", showPins: true, coords2: BBCCenter },
            { text: "Start to BBC", toolTip: "Move Start pin to Modesto Maidique Campus", showPins: true, coords1: BBCCenter },
            { text: "End to MMC", toolTip: "Move End pin to Biscayne Bay Campus", showPins: true, coords2: MMCCenter },

            { text: "Swap Start End", toolTip: "Swap Start and End pin locations", showPins: true, swapPins: true }
        ];
        var mapPinMenu = new tf.ui.QuickMenu({
            items: mapPinItems,
            onClick: function (notification) {
                closeCurrentMenu();
                if (notification.item.coords1) { startMapFeature.SetPointCoords(notification.item.coords1); }
                if (notification.item.coords2) { endMapFeature.SetPointCoords(notification.item.coords2); }
                if (notification.item.swapPins) {
                    var csaved = startMapFeature.GetPointCoords().slice(0);
                    startMapFeature.SetPointCoords(endMapFeature.GetPointCoords());
                    endMapFeature.SetPointCoords(csaved);
                }
                setShowAuxMapPins(notification.item.showPins);
                colorMapPinMenu();
            }
        });
        var mapPinButton = new tf.ui.SvgGlyphBtn({
            tooltip: "Show map pins", dim: buttonDim, paddingDim: "0px", style: lightBool, glyph: tf.styles.SvgGlyphMapPinName,
            onClick: function (notification) {
                if (!closeCurrentMenuAndCheck(mapPinMenu)) {
                    var targetRect = busLabelButton.GetHTMLElement().getBoundingClientRect();
                    var topStr = targetRect.bottom + 'px';
                    var leftStr = targetRect.left + 'px';
                    openMenu(mapPinMenu, { position: "absolute", left: leftStr, top: topStr, zIndex: 10 });
                }
                return false;
            }
        });

        function colorMapPinMenu() {
            var buttons = mapPinMenu.GetButtons();
            mapPinMenu.GetTopDivStyle().textAlign = 'left';
            for (var i = 0; i < 2; ++i) {
                var thisButton = buttons[i], thisItem = mapPinItems[i], isSelected = thisItem.showPins == showingMapPins;
                var thisButtonStyle = thisButton.GetHTMLElement().style;
                thisButtonStyle.display = 'block';
                thisButtonStyle.zIndex = isSelected ? 2 : 1;
                thisButton.SetStyle(isSelected ? menuItemSelectedClasses : menuItemUnselectedClasses);
                var buttonText = thisItem.text;
                if (isSelected) { buttonText = '* ' + buttonText; }
                thisButton.SetText(buttonText);
            }
        }

        colorMapPinMenu();

        div.AddContent(
            styles.AddButtonDivMargins(busLabelButton),
            styles.AddButtonDivMargins(busTrackButton),
            styles.AddButtonDivMargins(busRouteButton),
            styles.AddButtonDivMargins(mapPinButton)
        );
        urlapiApp.AddToToolBar(div);
    }

    function onAllCreated() {
        appToolBar = urlapiApp.GetToolBar();
        singleAppHCFOnTheSide = urlapiApp.GetSingleAppHCFOnTheSide();
        twoHorPaneLayout = (singleAppMapContentOnTheSide = singleAppHCFOnTheSide.GetSingleAppMapContentOnTheSide()).GetLeftSeparatorRightLayout();
        HCFLayout = singleAppHCFOnTheSide.GetHCFLayout();
        map = singleAppMapContentOnTheSide.GetMap();
        map.ShowMapCenter(false);
        map.SetHasInteractions(true);
        map.SetGoDBOnDoubleClick(false);
        map.SetUsePanOnClick(false);
        map.SetView({ minLevel: 11, maxLevel: 18 });
        dLayers = singleAppMapContentOnTheSide.GetDLayers();
        appSizer = singleAppMapContentOnTheSide.GetAppContainerSizer();
        twoHorPaneLayout.SetRightSideCollapsed(false);
        var toasterStyle = { zIndex: 20, position: "absolute", left: "0px", top: "0px" };
        toaster = new tf.ui.Toaster({
            container: twoHorPaneLayout.GetContainer(), timeout: 2000, className: "", style: toasterStyle, toastClassName: "tableToastStyle", toastStyle: {
                display: "block", margin: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)"
            }, addBefore: true
        });

        createLayers();

        lineStringsByStartAndEnd.SetLayer(pinPartialsLayer);

        addToolbarButtons();
        createAnimationControl();
        createJSONEditControl();
        createHeaderToolbar();
        //createTableToolBar();
        preComposeListener = map.AddListener(tf.consts.mapPreComposeEvent, onPreCompose);
        featureClickListener = map.AddListener(tf.consts.mapFeatureClickEvent, onFeatureClick);
        map.AddListener(tf.consts.mapMouseMoveEvent, onMapMouseMove);
        map.AddListener(tf.consts.mapClickEvent, onMapClickEvent);
        map.AddListener(tf.consts.mapFeatureMouseMoveEvent, onFeatureMouseMove);
        
        loadHistoryInterval();

        createSVGMapMarkers();
    }

    function createImageCanvasFromSettings(icSettings) {
        var sizeCanvas = icSettings.sizeCanvas, imageToPaint = icSettings.imageToPaint, iconAnchor = icSettings.iconAnchor, bottomMargin = icSettings.bottomMargin, zindex = icSettings.zindex;
        var canvas = document.createElement('canvas'), ctx = canvas.getContext("2d");
        if (!iconAnchor) { iconAnchor = [0.5, 0.5]; }
        ctx.canvas.width = sizeCanvas[0];
        ctx.canvas.height = sizeCanvas[1] + (bottomMargin != undefined ? bottomMargin : 0);
        ctx.clearRect(0, 0, sizeCanvas[0], sizeCanvas[1]);
        if (icSettings.circleRadius != undefined) {
            ctx.fillStyle = icSettings.circleFill;
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.beginPath();
            ctx.arc(sizeCanvas[0] / 2, sizeCanvas[1] / 2, icSettings.circleRadius, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fill();
        }
        else if (icSettings.iconShadow) {
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        var imageDims = icSettings.sizeImage != undefined ? icSettings.sizeImage : sizeCanvas;
        ctx.translate(sizeCanvas[0] / 2, sizeCanvas[1] / 2);
        ctx.drawImage(imageToPaint, -imageDims[0] / 2, -imageDims[1] / 2, imageDims[0], imageDims[1]);
        return { icon: true, icon_img: canvas, icon_size: [ctx.canvas.width, ctx.canvas.height], icon_anchor: iconAnchor, zindex: zindex, snaptopixel: true };
    };
    function createImageCanvas(sizeCanvas, imageToPaint, iconAnchor, bottomMargin, zindex) {
        return createImageCanvasFromSettings({ sizeCanvas: sizeCanvas, imageToPaint: imageToPaint, iconAnchor: iconAnchor, bottomMargin: bottomMargin, zindex: zindex });
    };
    function getSVGMapMarkerGeomAndStyles(coords, imageUse, imageSize, iconAnchor, bottomMargin, zIndex) {
        return {
            type: 'point',
            coordinates: coords != undefined ? coords : [0, 0],
            style: createImageCanvas(imageSize, imageUse, iconAnchor, bottomMargin, zIndex),
            hoverStyle: createImageCanvas([imageSize[0] + 2, imageSize[1] + 2], imageUse, iconAnchor, bottomMargin, zIndex + 1)
        };
    };

    function createSVGMapMarkers() {
        var imgMult = 1.8;
        var imageSizeUse = [20 * imgMult, 30 * imgMult], iconAnchor = [0.5, 1], startZIndex = 40;
        var geom = getSVGMapMarkerGeomAndStyles(MMCCenter, fromImagePreloaded.GetImg(), imageSizeUse, iconAnchor, 0, startZIndex++);
        geom.isStartFeature = true;
        startMapFeature = new tf.map.Feature(geom);
        if (showingMapPins) { extraLayer.AddMapFeature(startMapFeature); }
        geom = getSVGMapMarkerGeomAndStyles(BBCCenter, toImagePreloaded.GetImg(), imageSizeUse, iconAnchor, 0, startZIndex++);
        geom.isEndFeature = true;
        endMapFeature = new tf.map.Feature(geom);
        if (showingMapPins) { extraLayer.AddMapFeature(endMapFeature); }
    };

    /*function createTableToolBar() {
        var div = HCFLayout.CreateUnPaddedDivForHeader();
        var divStyle = { padding: "2px", borderTop: "1px solid #bfbfbf" };
        var lightBool = true;
        var buttonDim = "1.6rem";

        styles.ApplyStyleProperties(div, divStyle);

        var busTableButton = new tf.ui.TextBtn({ style: true, label: "Buses", dim: buttonDim, tooltip: "View Bus List", onClick: function (notification) { urlapiApp.GotoTable(0); return false; } });
        var deviceTableButton = new tf.ui.TextBtn({ style: true, label: "Devices", dim: buttonDim, tooltip: "View Device List", onClick: function (notification) { urlapiApp.GotoTable(1); return false; } });

        div.AddContent(
            styles.AddButtonDivMargins(busTableButton),
            styles.AddButtonDivMargins(deviceTableButton)
            );
        urlapiApp.AddToToolBar(div);
    }*/

    function checkAllCreated() { if (urlAPICreated && imagesPreLoaded && routesAreLoaded && stopsAreLoaded) { onAllCreated(); } }

    function onURLAPICreated() { urlAPICreated = true; checkAllCreated(); }

    function stopMove(mapFeature) { if (mapFeature) { console.log(mapFeature.GetPointCoords()); } };

    function startStopMove(mapFeature) {
        if (mapFeature) {
            if (mapFeature == featureMoving) { stopMove(featureMoving); featureMoving = undefined; }
            else { stopMove(featureMoving); featureMoving = mapFeature; }
        }
        else { if (featureMoving) { stopMove(featureMoving); featureMoving = undefined; } }
    };

    function moveMapFeatureMoving(pointCoords) { if (featureMoving) { featureMoving.SetPointCoords(pointCoords); } };

    function onFeatureMouseMove(notification) { moveMapFeatureMoving(notification.eventCoords); };

    function onMapMouseMove(notification) { moveMapFeatureMoving(notification.eventCoords); };

    function onMapClickEvent(notification) { if (featureMoving) { startStopMove(featureMoving); } };

    function onFeatureClick(notification) {
        var mapFeature = notification.mapFeature, mapFeatureSettings = mapFeature.GetSettings();

        if (!!mapFeatureSettings.isStartFeature || !!mapFeatureSettings.isEndFeature) { startStopMove(mapFeature); }
        if (!!mapFeature.busItem) {
            urlapiApp.GotoTable(0);
            var isInHover = mapFeature.isBusFeature ? mapFeature.GetIsAlwaysInHover() : true;
            mapFeature.SetIsAlwaysInHover(!isInHover);
            if (mapFeature.busItem == lastSelectedBus) { trackingItem = undefined; setSelBusItem(undefined); }
            else {
                setTimeout(function () {
                    busTable.GetRowFromKeyedItem(mapFeature.busItem).Select(true, true);
                    setSelBusItem(mapFeature.busItem);
                    mapFeature.SetIsAlwaysInHover(true);
                }, 100);
            }
        }
        if (!!mapFeature.deviceItem) {
            urlapiApp.GotoTable(1);
            var isInHover = mapFeature.isDeviceFeature ? mapFeature.GetIsAlwaysInHover() : true;
            mapFeature.SetIsAlwaysInHover(!isInHover);
            setTimeout(function () { deviceTable.GetRowFromKeyedItem(mapFeature.deviceItem).Select(true, true); setSelDeviceItem(mapFeature.deviceItem); mapFeature.SetIsAlwaysInHover(true); }, 100);
        }
    }

    function getDisplayTimeStampFor(elapsedTime) {
        var newCurrentTime = new Date();
        newCurrentTime.setTime(minDate.getTime() + elapsedTime);
        var timeStamp = tf.js.GetTimeStampFromDate(newCurrentTime);
        timeStamp = timeStamp.substring(0, 19);
        return timeStamp;
    };

    function updateCurrentTimeElem(elapsedTime) {
        if (elapsedTime == undefined) { elapsedTime = timer.GetElapsedTime(); }
        if (!!currentTimeElem && !!minDate) {
            var doUpdate = lastElapsedTime == undefined;

            if (!doUpdate) { doUpdate = Math.abs(elapsedTime - lastElapsedTime) > 999; }

            if (doUpdate) {
                var label = getDisplayTimeStampFor(lastElapsedTime = elapsedTime);
                if (markedTime !== undefined && isMaximized) {
                    label += ' (' + getDisplayTimeStampFor(markedTime) + ')';
                }
                currentTimeElem.innerHTML = label;
                scrubSlider.GetHTMLElement().value = (totalTime != 0 ? elapsedTime / totalTime : 0) * scrubSliderMax;
            }
        }
    }

    function drawFrame(elapsedTime) {
        updateCurrentTimeElem(elapsedTime);
        positionBuses(elapsedTime);
        positionDevices(elapsedTime);
        if (!!trackingItem) {
            if (isTracking) {
                var trackingFeature = trackingItem.mapFeature;
                new tf.map.PointsStyleAnimator({
                    maps: [map], pointProviders: [trackingFeature], duration: 100,
                    getStyle: function (elapsed01) {
                        var radius = 6 + Math.pow(elapsed01, 1 / 2) * 16;
                        var opacity = 1 - Math.pow(elapsed01, 3);
                        var line_width = (2 - elapsed01);
                        var drawOpacity = opacity * 50;
                        var flashStyle = {
                            circle: true, circle_radius: radius, snaptopixel: false,
                            line: true, line_width: line_width, line_color: "#f00", line_opacity: drawOpacity
                        };
                        return flashStyle;
                    }
                });
                if (!timer.GetIsPaused()) {
                    if (++frameCount > nFramesForCenter) {
                        map.SetCenter(trackingFeature.GetPointCoords());
                        frameCount = 0;
                    }
                }
            }
        }
    }

    function onPreCompose(notification) {
        if (!timer.GetIsPaused()) {
            var elapsedTime = timer.GetElapsedTime();
            drawFrame(elapsedTime);
            //notification.continueAnimation();
        }
    }

    function getPartialLineString(history, fromTimeMillis, toTimeMillis) {
        var partialLineString = [];
        if (toTimeMillis < fromTimeMillis) { toTimeMillis = fromTimeMillis; }
        var startRecord = getHistoryRecord(history, fromTimeMillis);
        var endRecord = getHistoryRecord(history, toTimeMillis);
        partialLineString.push(startRecord.coords);
        if (startRecord.nextHistoryIndex !== undefined && endRecord.prevHistoryIndex !== undefined) {
            for (var i = startRecord.nextHistoryIndex; i <= endRecord.prevHistoryIndex; ++i) {
                partialLineString.push(history[i].coordinates.slice(0));
            }
        }
        partialLineString.push(endRecord.coords);
        return partialLineString;
    };

    function getHistoryRecord(history, atTimeMillis) {
        var len = history.length, coords, heading_rad, posSeg01 = 0;
        if (!!minDate) { atTimeMillis += minDate.getTime(); }
        var index = tf.js.BinarySearch(history, atTimeMillis, function (key, item) { return key - item.timeMillis; });
        var nextHistoryIndex, prevHistoryIndex;
        if (index < 0) {
            var prevCoords, prevMillis, nextCoords, nextMillis, prevHeading, nextHeading;
            index = -(index + 1);
            var hPrev = history[index - 1], hNext = history[index];
            if (index > 0) {
                prevCoords = hPrev.coordinates;
                prevMillis = hPrev.timeMillis;
                prevHeading = hPrev.heading_rad;
                if (prevMillis > atTimeMillis) { logConsole('out of order 1'); }
                prevHistoryIndex = index - 1;
            }
            if (index < len) {
                nextCoords = hNext.coordinates;
                nextMillis = hNext.timeMillis;
                nextHeading = hNext.heading_rad;
                if (nextMillis < atTimeMillis) { logConsole('out of order 2'); }
            }
            if (!!prevCoords) {
                coords = prevCoords;
                heading_rad = prevHeading;
                if (interpolateCoordsBetweenEvents && !!nextCoords && hPrev.line_id == hNext.line_id) {
                    var diffMillis = nextMillis - prevMillis;
                    var dMilis01 = diffMillis > 0 ? (atTimeMillis - prevMillis) / diffMillis : 0;
                    posSeg01 = dMilis01;
                    if (dMilis01 > 0) {
                        var dlon = nextCoords[0] - prevCoords[0];
                        var dlat = nextCoords[1] - prevCoords[1];
                        coords = [prevCoords[0] + dlon * dMilis01, prevCoords[1] + dlat * dMilis01];
                        var deltaRotation = tf.units.GetShortestArcBetweenAngles(prevHeading, nextHeading)
                        heading_rad = prevHeading + deltaRotation * dMilis01;
                    }
                    nextHistoryIndex = index;
                }
                else {
                    if (index + 1 < len) { nextHistoryIndex = index + 1; }
                }
            }
            else {
                if (index + 1 < len) { nextHistoryIndex = index + 1; }
                coords = nextCoords;
                heading_rad = nextHeading;
            }
        }
        else {
            if (index >= len) { index = len - 1; }
            coords = history[index].coordinates;
            heading_rad = history[index].heading_rad;
            if (index > 0) { prevHistoryIndex = index - 1; }
            if (index + 1 < len) { nextHistoryIndex = index + 1; }
        }
        return { coords: coords, heading_rad: heading_rad, posSeg01: posSeg01, nextHistoryIndex: nextHistoryIndex, prevHistoryIndex: prevHistoryIndex };
    };

    function positionDevices(atTimeMillis) {
        var itemList = deviceHistoryKeyedList.GetKeyedItemList();

        for (var i in itemList) {
            var device = itemList[i], d = device.GetData(), p = d.properties, h = d.history;
            var record = getHistoryRecord(h, atTimeMillis), coords = record.coords;;
            if (coords != undefined) {
                p.heading_rad = record.heading_rad;
                device.mapFeature.SetPointCoords(coords);
                device.mapFeature.RefreshStyle();
                if (!device.isShowing) { deviceLayer.AddMapFeature(device.mapFeature); device.isShowing = true; }
            }
            else { if (device.isShowing) { deviceLayer.DelMapFeature(device.mapFeature); device.isShowing = false; } }
        }
    }

    function positionBuses(atTimeMillis) {
        var busList = busHistoryKeyedList.GetKeyedItemList();

        //var gpeTrackData = [];
        //var catsTrackData = [];

        var atDate = new Date();
        atDate.setTime(minDate.getTime() + atTimeMillis);

        for (var i in busList) {
            var bus = busList[i], d = bus.GetData(), p = d.properties, h = d.history;
            var record = getHistoryRecord(h, atTimeMillis), coords = record.coords;;
            if (coords != undefined) {
                /*if (d.properties.fleet == 'fiu') {
                    var trackData = {
                        key: '' + d.properties.public_transport_vehicle_id, coords: coords.slice(0), time: atTimeMillis, bus: bus,
                        atDate: atDate
                    };
                    switch (d.properties.public_transport_vehicle_id) {
                        case 4013817:
                        case 4015931:
                        case 4015929:
                            gpeTrackData.push(trackData);
                            break;
                        default:
                            catsTrackData.push(trackData);
                            //console.log(d.properties.public_transport_vehicle_id);
                            break;
                    }
                }*/
                p.heading_rad = record.heading_rad;
                bus.mapFeature.SetPointCoords(coords);
                bus.mapFeature.RefreshStyle();
                if (!bus.isShowing) { busLayer.AddMapFeature(bus.mapFeature); bus.isShowing = true; }
            }
            else { if (bus.isShowing) { busLayer.DelMapFeature(bus.mapFeature); bus.isShowing = false; } }
        }

        //GPERouteBusTrackers.UpdateFromNewData(gpeTrackData);
        //CATSRouteBusTrackers.UpdateFromNewData(catsTrackData);
    }

    function createContentContainer() {
        var contentContainer = new tf.dom.Div();
        var contentContainerStyle = contentContainer.GetHTMLElement().style;

        contentContainerStyle.textAlign = 'left';
        contentContainerStyle.border = "2px solid navy";
        contentContainerStyle.borderRadius = "4px";
        contentContainerStyle.overflow = "hidden";
        return contentContainer;
    }

    function getDeviceRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var p = data.properties, h = data.history;

            if ((content = keyedItem.listContent) == undefined) {
                keyedItem.listContent = content = createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })
                var divAllWrapperE = divAllWrapper.GetHTMLElement();
                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineInEditorDiv" });
                var divLineWrapperE = divLineWrapper.GetHTMLElement();

                divAllWrapper.AddContent(divLineWrapper);
                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
            }

            var title = p.device_id + ' - ' + h.length + ' events';
            keyedItem.title = title;
            keyedItem.divLineWrapperE.innerHTML = title;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    }

    function getBusRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var p = data.properties, h = data.history;

            if ((content = keyedItem.listContent) == undefined) {
                keyedItem.listContent = content = createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })
                var divAllWrapperE = divAllWrapper.GetHTMLElement();
                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineInEditorDiv" });
                var divLineWrapperE = divLineWrapper.GetHTMLElement();

                divAllWrapper.AddContent(divLineWrapper);
                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
            }

            var title = p.fleet.toUpperCase() + ' ' + p.public_transport_vehicle_id + ' - ' + h.length + ' events';
            keyedItem.title = title;
            keyedItem.divLineWrapperE.innerHTML = title;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    }

    function onContentChange(notification) { checkToolbarButtons(); }

    function createTable(tables, keyedList, tableSettings, rowSettings, getRowContent, index, title) {
        var ktsettings = {
            keyedList: keyedList, optionalScope: theThis, tableSettings: tableSettings, rowSettings: rowSettings,
            properties: {}, getRowContent: getRowContent, onContentChange: onContentChange
        };
        var table = new tf.ui.KeyedTable(ktsettings)
        tables.push({ table: table, dLayer: null, index: index, title: title });
        return table;
    }

    function compareBuses(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var a = kia.GetData().properties, b = kib.GetData().properties;
        var fleetA = a.fleet, fleetB = b.fleet;
        if (fleetA != fleetB) { return fleetA < fleetB ? -1 : 1; }
        var fleetIdA = a.public_transport_vehicle_id;
        var fleetIdB = b.public_transport_vehicle_id;
        return fleetIdA - fleetIdB;
    }

    function compareDevices(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var a = kia.GetData().properties, b = kib.GetData().properties;
        return a.device_id - b.device_id;
    }

    function createTables(tables) {
        var tableSettings = tf.js.ShallowMerge(appSpecs.busTableStyle, { selectOnHover: appSpecs.busTableSelectOnHover, onSelect: onBusRowSelect });
        busTable = createTable(tables, busHistoryKeyedList, tableSettings, { style: appSpecs.busTableRowStyle, selectedStyle: appSpecs.busTableRowHoverStyle }, getBusRowContent, 0, "Buses");
        busTable.SetSort(compareBuses);
        tableSettings.onSelect = onDeviceRowSelect;
        deviceTable = createTable(tables, deviceHistoryKeyedList, tableSettings, { style: appSpecs.busTableRowStyle, selectedStyle: appSpecs.busTableRowHoverStyle }, getDeviceRowContent, 0, "Devices");
        deviceTable.SetSort(compareDevices);
        var lsTableSpecs = lineStringsByStartAndEnd.GetTableSpecs();
        tableSettings.onSelect = lsTableSpecs.onSelect;
        partialsTable = createTable(tables, lsTableSpecs.KL, tableSettings, { style: appSpecs.busTableRowStyle, selectedStyle: appSpecs.busTableRowHoverStyle },
            lsTableSpecs.getRowContent, 0, lsTableSpecs.tableName);
        partialsTable.SetSort(lsTableSpecs.compare);
    };

    function removeEventRoute() { if (!!lastTrackFeature) { routesLayer.DelMapFeature(lastTrackFeature); lastTrackFeature = undefined; } }
    function showEventRoute(trackFeature) { removeEventRoute(); if (lastTrackFeature = trackFeature) { routesLayer.AddMapFeature(lastTrackFeature); } }
    function showSelectedRoute() { var trackFeature = (isShowingEventRoute && !!trackingItem) ? trackingItem.trackFeature : undefined; showEventRoute(trackFeature); }

    function setShowEventRoute(showBool) { isShowingEventRoute = !!showBool; showSelectedRoute(); }

    function calcStartEndSegments() {
        if (lastSelectedBus && showingMapPins) {
            var busData = lastSelectedBus.GetData();
            var startPoint = startMapFeature.GetPointCoords(), endPoint = endMapFeature.GetPointCoords();
            //var d = lastSelectedBus.GetData(), h = d.history;
            var trackFeature = lastSelectedBus.trackFeature;
            var pointCoords = trackFeature.GetGeom().GetCoordinates();
            var hitToleranceDistance = 150;
            var lastIndex = undefined, lastProj = undefined, minDistImprove = 20, acceptDistance = undefined;
            while (true) {
                var hitTestStart = tf.helpers.HitTestMapCoordinatesArray(pointCoords, startPoint, lastIndex, lastProj, undefined, acceptDistance, undefined, minDistImprove);
                if (hitTestStart.closestPoint && tf.units.GetHaversineDistance(hitTestStart.closestPoint, startPoint) < hitToleranceDistance) {
                    lastIndex = hitTestStart.minDistanceIndex;
                    lastProj = hitTestStart.proj;
                    var startIndex = lastIndex;
                    //console.log('hit start at ' + lastIndex);
                    var hitTestEnd = tf.helpers.HitTestMapCoordinatesArray(pointCoords, endPoint, lastIndex, lastProj, undefined, acceptDistance, undefined, minDistImprove);
                    if (hitTestEnd.closestPoint && tf.units.GetHaversineDistance(hitTestEnd.closestPoint, endPoint) < hitToleranceDistance) {
                        lastIndex = hitTestEnd.minDistanceIndex;
                        lastProj = hitTestEnd.proj;
                        console.log('hit segment from start to end locations from ' + startIndex + ' to ' + lastIndex);
                        var datetime = busData.history[startIndex].datetime, dateObj = busData.history[startIndex].dateObj;
                        //var partialLineString = pointCoords.slice(startIndex, lastIndex + 1);
                        var partialLineString = [];
                        for (var i = startIndex; i <= lastIndex; ++i) {
                            partialLineString.push(pointCoords[i].slice(0));
                        }
                        lineStringsByStartAndEnd.Add(dateObj, datetime, startPoint, endPoint, partialLineString);
                    }
                    else {
                        break;
                    }
                }
                else {
                    break;
                }
            }
        }
    };

    function setSelBusItem(selItem) {
        removeEventRoute();
        updatePartialBusRouteFeatureStatus();
        if (lastSelectedBus = selItem) {
            if (!!lastSelectedBus.mapFeature) {
                lastSelectedBus.mapFeature.SetIsAlwaysInHover(!lastSelectedBus.mapFeature.GetIsAlwaysInHover());
                map.AnimatedSetCenterIfDestVisible(lastSelectedBus.mapFeature.GetPointCoords());
                trackingItem = lastSelectedBus;

                calcStartEndSegments();

            }
            showSelectedRoute();
        }
        updatePartialBusRouteFeatureStatus();
    }

    function onBusRowSelect(notification) {
        if (!!notification.isClick) {
            if (!!notification.selected) {
                var selItem = notification.selected.GetKeyedItem();
                if (selItem == lastSelectedBus) {
                    selItem = undefined;
                    trackingItem = undefined;
                }
                setSelBusItem(selItem);
            }
        }
        return true;
    }

    function setSelDeviceItem(selItem) {
        removeEventRoute();
        if (lastSelectedDevice = selItem) {
            if (!!lastSelectedDevice.mapFeature) {
                lastSelectedDevice.mapFeature.SetIsAlwaysInHover(!lastSelectedDevice.mapFeature.GetIsAlwaysInHover());
                map.AnimatedSetCenterIfDestVisible(lastSelectedDevice.mapFeature.GetPointCoords());
                trackingItem = lastSelectedDevice;
            }
            showSelectedRoute();
        }
    }

    function onDeviceRowSelect(notification) {
        if (!!notification.isClick) {
            if (!!notification.selected) {
                var selItem = notification.selected.GetKeyedItem();
                setSelDeviceItem(selItem);
            }
        }
        return true;
    }

    function initTables() { var tables = []; createTables(tables); return tables; }

    function onAppSpecsLoaded(appSpecsSet) { appSpecs = appSpecsSet; }

    function createApplication() {
        //var widthTableRow = "90%";
        var widthTableRow = "16rem";
        var panels = tf.consts.panelNameNoAddress + '+' + tf.consts.panelNameNoMapLocation + '+' + tf.consts.panelNameNoUserLocation + '+' + tf.consts.panelNameLayers + '+' + tf.consts.panelNameTFLogo;
        var appSpecs = {
            "replaceURLParams": {
                "lat": 25.82,
                "lon": -80.3,
                "level": 12,
                "fmap": "m2",
                "panels": panels,
                "legendh": "{Cities::~Capitals:Capitals_WorldMap@wm_Capitals-120-6000;Capitals:Capitals_WorldMap@wm_Capitals-6000-15000;~Metro:Big_Cities_over_million_WorldMap@wm_Cities_Greater_900K-120-5000;Metro:Big_Cities_over_million_WorldMap@wm_Cities_Greater_900K-5000-15000;~Cities:Cities_WorldMap@wm_Cities_75K_to_900K-120-2400+wm_Cities_Greater_900K-120-2400+wm_Cities_Unknownpop-120-2400;Cities:Cities_WorldMap@wm_Cities_75K_to_900K-2400-15000+wm_Cities_Greater_900K-2400-15000+wm_Cities_Unknownpop-2400-15000;};{Hubs::~Ports:Marine_Ports_WorldMap@wm_Marine_Ports-120-360;Ports:Marine_Ports_WorldMap@wm_Marine_Ports-360-2000;~Railway:Railway_Stations_WorldMap@wm_Railway_Stations-120-240;~Airports:Airports_WorldMap@wm_Airports-120-240;};{Water::Bays:Seas_and_Bays_WorldMap@wm_Seas_Bays-120-2000;Glaciers:Glaciers_WorldMap@wm_Glacier-120-4000;~Rivers_B:Lake_and_River_contours_WorldMap@wm_Water_Poly-120-500;~Great_Lakes_L:Great_Lakes_labels_WorldMap@WM_GREAT_LAKES_NAME-120-4000;~Great_Lakes_B:Great_Lakes_contours_WorldMap@wm_Great_Lakes-120-4000;OSM-water:Lake_and_River_contours_from_Open_Street_Maps@osm_water-0-4000;};{Regions::~Admin_L:States_and_Provinces_names_labeled_WorldMap@wm_World_Admin_name-120-2000;~Admin_B:States_and_Provinces_boundaries_WorldMap@wm_World_Admin-120-2000;~Countries_L:Nation_names_labeled_WorldMap@nation_name-2000-5000;Countries_L:Nation_names_labeled_WorldMap@nation_name-5000-30000;~Countries_B:Nations_boundaries_WorldMap@wm_World_Nations-120-15000;OSM-Admin:Administrative_boundaries_from_Open_Street_Maps@osm_admin-0-60000;};{Parcels::FA-address:Addresses_from_First_American_Parcel_Data@fa_address-0-0.5;FA-owner:Property_owner_from_First_American_Parcel_Data@fa_owner-0-0.5;~lines:Property_lines,_from_First_American@fa_parcel-0-1;lines:Property_lines,_from_First_American@fa_parcel-1-2;OSM-buildings:Building_contours_from_Open_Street_Maps@osm_buildings-0-7;};{People::population:People_per_block_per_Census_2000@blk_pop-0-5;income:Aggregate_Neighborhood_Income_and_number_of_homes,_per_Census-2000@bg_mhinc-0.7-10+blkgrpy-0.7-10;};{Services::~business:Yellow_Pages@nypages-0-1.2;business:Yellow_Pages@nypages-1.2-5;food:Restaurants_from_NavTeq@nv_restrnts-0-10;doctors:Physicians_specialties@physicianspecialty-0-5;};Landmarks:Cultural_Landmarks_WorldMap@wm_Cultural_Landmarks-120-240;Utilities:Utilities_WorldMap@wm_Utilities-120-720;Environment:Hydrology@prism-0-120;~Places:Places@gnis2-0-6+hotels-0-6;Places:Places@gnis2-6-24+hotels-6-24;OSM-place-names:Place_names_labeled_from_Open_Street_Maps@osm_place_names-0-30000;{Roads::lines:Road_lines_from_NavTeq@street-0-2000;names:Road_names_labeled_from_NavTeq@street_names-0-240;~OSM-lines:Road_lines_from_Open_Street_Maps@osm_roads-0.5-7000;OSM-lines:Road_lines_from_Open_Street_Maps@osm_roads-0-0.5;~OSM-names:Road_names_labeled_from_Open_Street_Maps@osm_road_names-0-7000;~busHistoryData:Routes_WorldMap@wm_Major_Routes-120-1000+wm_Minor_Routes-120-1000;busHistoryData:Routes_WorldMap@wm_Major_Routes-1000-5000+wm_Minor_Routes-1000-5000;~railways:Railroad_WorldMap@wm_Railroad_Track-120-2000;};{Towns::~borders:Borders@incorp-0-120;~towns:Cities,_towns@wtown-0-60;};plugin_photo;",
                "legendm": "{OSM::~buildings:Building_outlines@osm_buildings-0-60;~land:Land@osm_land-0-240000;~landuse:Land_usage_information@osm_landuse-0-7000;~place_names:Names_for_country,state,city_and_other small_places@osm_place_names-0-15000;~road_names:Road_names@osm_road_names-0-240;~roads:Roads@osm_roads-0-7000;~water:Water_outlines@osm_water-0-15000;};",
                "address": "",
                "vid": "",
                "passthrough": "",
                "tflogo": "0",
                "type": "map",
                "source": "best_available",
                "rgpopup": 5,
                "help": "<span><b>Double Click</b>: Local Data Reports and Queries<br /><b>Drag</b>: Browse the map<br />Buttons: <b>Full Screen</b>, <b>Reset Rotation</b>, <b>Search Location</b>, <b>Zoom</b>, <b>Map Layers</b><br /><br />Address bar examples:<br />1 Flagler St, Miami, FL<br />Miami<br />Miami, FL<br />33139<br />25.77 -80.19 (coordinates)</span>"
            },

            "separatorStyle": { "backgroundColor": "rgba(0,107,133, 0.8)", "borderLeft": "1px solid#abebfb", "borderRight": "1px solid #00b" },

            "pageStyle": { "color": "#004" },

            "headerStyle": { "backgroundColor": "#333" },
            "contentStyle": { "backgroundColor": "#888" },
            "footerStyle": { "backgroundColor": "#333", "fontSize": "1.2em", "textShadow": "1px 1px 1px #9c9c9c", "color": "#fff" },

            "titleStyle": { "backgroundColor": "#333", "fontSize": "1.5em", "verticalAlign": "middle", "textShadow": "1px 1px 1px #9c9c9c", "color": "#fff" },

            "documentTitle": "ITPA Event Tracker",

            "logoBkColor": "#fff",
            "logoStyle": { "border": "1px solid #ddf" },
            "appLogoImgStr": "./images/track.svg",

            "busTableStyle": { "backgroundColor": "#000" },

            "busTableRowStyle": {
                "tf-shadow": [-2, -2, 4, "rgba(0,0,0,0.6)"],
                "textShadow": "1px 1px 1px #333",
                "border": "2px solid #fff",
                "backgroundColor": "rgba(255, 255, 255, 0.3)", "color": "#fff", "borderRadius": "8px", "margin": "4px", "padding": "4px", "width": widthTableRow
            },
            "busTableRowHoverStyle": {
                "tf-shadow": [3, 3, 6, "rgba(0,0,0,0.8)"],
                "textShadow": "2px 2px 2px #000",
                "border": "2px dotted #000",
                "backgroundColor": "rgba(255, 255, 255, 0.9)", "color": "#fff", "borderRadius": "10px", "margin": "2px", "marginTop": "4px", "marginLeft": "4px", "padding": "8px", "width": widthTableRow
            },

            "busTableSelectOnHover": false
        };

        settings.onCreated = onURLAPICreated;

        settings.fullURL = {};
        settings.fullURL[tf.consts.paramNameAppSpecs] = appSpecs;

        settings.onAppSpecsLoaded = onAppSpecsLoaded;
        settings.onRefresh = onRefresh;
        settings.initTables = initTables;
        settings.documentTitle = "ITPA Event Tracker";

        urlapiApp = new tf.urlapi.AppFromSpecs(settings);
    }

    function getBusHistory (then, baseDate, timeMultiplier, timeUnit) {
        if (tf.js.GetFunctionOrNull(then)) {
            if (!tf.js.GetIsNonEmptyString(baseDate)) {
                var nowDate = new Date();
                baseDate = nowDate.getFullYear() + '-' + (nowDate.getMonth() + 1) + '-' + nowDate.getDate();
            }
            if (timeMultiplier == undefined) { timeMultiplier = 1; }
            if (!tf.js.GetIsNonEmptyString(timeUnit)) { timeUnit = "day"; }
            var url = serverURL + "buses/history";
            var payload = { authForm: authForm, busId: 0, baseDate: baseDate, timeMultiplier: timeMultiplier, timeUnit: timeUnit };
            var payloadStr = JSON.stringify(payload);

            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification && !!notification.data) { data = notification.data.features; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    function getBusHistoryInterval(then) { return getBusHistory(then, startDateStr, nMinutesInterval, "minute"); }

    function getDeviceHistory(then, baseDate, timeMultiplier, timeUnit) {
        if (tf.js.GetFunctionOrNull(then)) {
            if (!tf.js.GetIsNonEmptyString(baseDate)) {
                var nowDate = new Date();
                baseDate = nowDate.getFullYear() + '-' + (nowDate.getMonth() + 1) + '-' + nowDate.getDate();
            }
            if (timeMultiplier == undefined) { timeMultiplier = 1; }
            if (!tf.js.GetIsNonEmptyString(timeUnit)) { timeUnit = "day"; }
            var url = serverURL + "devices/history";
            var payload = { authForm: authForm, deviceId: 0, baseDate: baseDate, timeMultiplier: timeMultiplier, timeUnit: timeUnit };
            var payloadStr = JSON.stringify(payload);

            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data;
                if (!!notification && !!notification.data) { data = notification.data.features; }
                then(data);
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
    }

    function getDeviceHistoryInterval(then) { return getDeviceHistory(then, startDateStr, nMinutesInterval, "minute"); }

    function paintBus(busItem, isHover, notification) {
        var ctx = notification.ctx;
        var size = isHover ? [36, 36] : [30, 30];
        var data = busItem.GetData();
        var p = data.properties;
        var isBus = p.public_transport_vehicle_id != undefined;
        var lineW = 2;

        ctx.canvas.width = size[0];
        ctx.canvas.height = size[1];
        ctx.translate(0.5, 0.5);
        ctx.clearRect(0, 0, size[0], size[1]);

        var colorToFill = isBus ? "rgba(255, 200, 192, 0.5)" : "rgba(192, 200, 255, 0.5)";

        if (data.colorToFill) { colorToFill = data.colorToFill; }

        ctx.fillStyle = colorToFill;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = lineW;

        ctx.beginPath();

        var diameter = size[0] - 2 * lineW;

        tf.canvas.circle(ctx, lineW, lineW, diameter);
        ctx.fill();
        ctx.closePath();

        ctx.translate(size[0] / 2, size[1] / 2);
        ctx.rotate(p.heading_rad);

        var imgToDraw = isBus ? mapBusDirImagePreloaded.GetImg() : mapDeviceImagePreloaded.GetImg();

        ctx.drawImage(imgToDraw, -size[0] / 2, -size[1] / 2, size[0], size[1]);

        return size;
    };

    function getPaintFunction(busItem, isHover) { return function (notification) { return paintBus(busItem, isHover, notification); } }

    function getBusStyle(kf, mapFeature) {
        var isHover = mapFeature.GetIsDisplayingInHover();
        var mapFeatureSettings = mapFeature.GetSettings(), bus = mapFeatureSettings.busItem;
        var zindex = isHover ? 41 : 40;
        var data = bus.GetData(), props = data.properties;
        var label = props.fleet.toUpperCase() + ' ' + props.public_transport_vehicle_id;
        var markerOpacity = isHover ? 100 : 80;
        var lineWidth = 1;
        var cfs = new tf.map.CanvasFeatureStyle({
            size: [30, 30], baseStyle: { zindex: zindex + 2, rotate_with_map: true, opacity: markerOpacity / 100, snaptopixel: false },
            paint: getPaintFunction(bus, isHover)
        });
        if (data.direction !== undefined) {
            label += ' ' + data.direction;
            isHover = true;
        }
        var markerStyle = {
            marker: true, label: label, zindex: zindex + 3, marker_color: "#3399ff", marker_verpos: "top", marker_horpos: "right", marker_opacity: 80, line: true,
            font_height: 14, font_color: "#fff", border_color: "#f00", marker_arrowlength: 16, snaptopixel: false
        };
        var cfsStyle = cfs.GetStyle();
        var style = isHover ? [cfsStyle, markerStyle] : cfsStyle;
        return style;
    };

    function getDeviceStyleFunction(device, isHover) {
        return function (mapFeature) {
            var zindex = isHover ? 41 : 40;
            var data = device.GetData(), props = data.properties;
            var label = '' + props.device_id;
            var markerOpacity = isHover ? 100 : 80;
            var lineWidth = 1;
            var cfs = new tf.map.CanvasFeatureStyle({
                size: [30, 30], baseStyle: { zindex: zindex + 2, rotate_with_map: true, opacity: markerOpacity / 100, snaptopixel: false },
                paint: getPaintFunction(device, isHover)
            });
            var markerStyle = {
                marker: true, label: label, zindex: zindex + 3, marker_color: "#3399ff", marker_verpos: "top", marker_horpos: "right", marker_opacity: 80, line: true,
                font_height: 14, font_color: "#fff", border_color: "#f00", marker_arrowlength: 16, snaptopixel: false
            };
            var cfsStyle = cfs.GetStyle();
            var style = isHover ? [cfsStyle, markerStyle] : cfsStyle;
            return style;
        }
    }

    function getRouteStyleFunction(routeItem, isHover) {
        return function (mapFeature) {
            var zindex = 1;
            var lineItemColor = routeItem.GetData().properties.color;
            return [{ line: true, line_color: lineItemColor, line_width: 5, zindex: zindex, snaptopixel: false},
                { line: true, line_color: "#fff", line_width: 3, zindex: zindex + 1, line_dash: [4, 8], snaptopixel: false }];
        }
    }

    function getStopStyleFunction(stopItem, isHover) {
        return function getStyle(mapFeature) {
            var data = stopItem.GetData(), p = data.properties;
            var pointStyle = [{
                circle: true, circle_radius: 4, fill: true, fill_color: "#ff0", zindex: isHover ? 2 : 1, line: true, line_color: "#000", snaptopixel: false
            }];
            if (isHover) {
                var label = '#' + p.fleet_id + ' - ' + p.fleet.toUpperCase() + ' - ' + p.identifier.toLowerCase();
                var textStyleSpecs = tf.js.ShallowMerge(stopTextStyleSpecs, { label: label });
                pointStyle.push(textStyleSpecs);
            }
            return pointStyle;
        }
    }

    function loadRoutes() {
        var url = serverURL + "routes";

        new tf.ajax.JSONGet().Request(url, function (notification) {
            var data;
            if (!!notification && !!notification.data) { data = notification.data.features; }
            if (!!data) {
                routesKeyedList.UpdateFromNewData(data);

                var routesList = routesKeyedList.GetKeyedItemList();

                for (var i in routesList) {
                    var item = routesList[i], d = item.GetData(), g = d.geometry;
                    item.mapFeature = new tf.map.Feature({
                        type: 'multilinestring', coordinates: g.coordinates, style: getRouteStyleFunction(item, false), hoverStyle: getRouteStyleFunction(item, true)
                    });
                    item.mapFeature.lineItem = item;
                }
            }
            routesAreLoaded = true;
            checkAllCreated();
        }, theThis, undefined, false, undefined, undefined, undefined);
    }

    function loadStops() {
        var url = serverURL + "platforms";

        new tf.ajax.JSONGet().Request(url, function (notification) {
            var data;
            if (!!notification && !!notification.data) { data = notification.data.features; }
            if (!!data) {
                stopsKeyedList.UpdateFromNewData(data);

                var stopsList = stopsKeyedList.GetKeyedItemList();

                for (var i in stopsList) {
                    var item = stopsList[i], d = item.GetData(), g = d.geometry;
                    item.mapFeature = new tf.map.Feature({
                        type: 'point', coordinates: g.coordinates, style: getStopStyleFunction(item, false), hoverStyle: getStopStyleFunction(item, true)
                    });
                    item.mapFeature.stopItem = item;
                }
            }
            stopsAreLoaded = true;
            checkAllCreated();
        }, theThis, undefined, false, undefined, undefined, undefined);
    }

    function getHistoryCoords(history) {
        var coords = [], len = !!history ? history.length : 0;
        for (var i = 0 ; i < len ; ++i) {
            var h = history[i];
            coords.push(h.coordinates.slice(0));
        }
        return coords;
    }

    function emptyLayer() {
        partialBusRouteFeature = undefined;
        removeEventRoute();
        busLayer.RemoveAllFeatures();
        routesLayer.RemoveAllFeatures();
        stopsLayer.RemoveAllFeatures();
        deviceLayer.RemoveAllFeatures();
        var busList = busHistoryKeyedList.GetKeyedItemList();
        for (var i in busList) { var bus = busList[i]; bus.isShowing = false; }
        var deviceList = deviceHistoryKeyedList.GetKeyedItemList();
        for (var i in deviceList) { var device = deviceList[i]; device.isShowing = false; }
    }

    function checkFinishLoadHistory() {
        if (isLoadingHistory) {
            if (!(isLoadingBusHistory || isLoadingDeviceHistory)) {
                isLoadingHistory = false;

                var hasData = false;
                var historyLists = [deviceRawData, busRawData], nHistoryLists = historyLists.length;
                var dateFieldNames = ["time_calculated", "datetime"];

                for (var i = 0 ; i < nHistoryLists ; ++i) {
                    var thisList = historyLists[i];
                    if (thisList.length > 0) {
                        var dateFieldName = dateFieldNames[i];
                        var data0 = thisList[0];
                        var dataN = thisList[thisList.length - 1];
                        var date0 = tf.js.GetDateFromTimeStamp(data0.properties[dateFieldName]);
                        var dateN = tf.js.GetDateFromTimeStamp(dataN.properties[dateFieldName]);
                        if (minDate == undefined || minDate > date0) { minDate = date0; }
                        if (maxDate == undefined || maxDate < dateN) { maxDate = dateN; }
                        hasData = true;
                    }
                }

                if (hasData) { totalTime = maxDate.getTime() - minDate.getTime(); }

                timer.SetElapsedTime(0);
                timer.SetLimit(totalTime);
                timer.Pause(!hasData);
                map.Render();

                urlapiApp.UpdateCurTableFooter();

                if (!!startToastCB) { startToastCB.Close(); }
                endToastCB = toaster.Toast({ text: "Event History retrieved" });
                showAnimationControl(hasData);
                showSelectedRoute();
                //setShowAuxMapPins()
            }
        }
    }

    function loadHistoryInterval() {
        if (!isLoadingHistory) {
            isLoadingBusHistory = isLoadingDeviceHistory = isLoadingHistory = true;
            if (!!startToastCB) { startToastCB.Close(); }
            if (!!endToastCB) { endToastCB.Close(); }
            startToastCB = toaster.Toast({ text: "Retrieving Event History from ITPA server...", timeout: 0 });
            timer.Pause(true);
            emptyLayer();
            showAnimationControl(false);
            minDate = maxDate = undefined;
            /*trackingItem = */lastSelectedDevice = lastSelectedBus = undefined;
            totalTime = 0;
            calcStartDate();
            loadBusInterval();
            loadDeviceInterval();
            //loadBusFeedInterval();
            if (trackingItem != undefined) { if (trackingItem != lastSelectedBus && trackingItem != lastSelectedDevice) { trackingItem = undefined; } }
        }
    }

    function loadDeviceInterval() {

        var selectedDeviceKey = !!lastSelectedDevice ? lastSelectedDevice.GetKey() : undefined;

        getDeviceHistoryInterval(function (data) {
            deviceHistoryData = [];
            deviceRawData = undefined;
            var limit, dataLen = 0;
            if (!!data) {
                //{"geometry":{"coordinates":[-80.3736,25.758911],"type":"Point"},"type":"Feature","properties":{"altitude":-3,"device_id":35,"heading":0,"time_calculation":"2016-11-21 13:09:21.0","speed":0,"heading_rad":0,"coordinates":[-80.37369601435994,25.758911781037]}}
                deviceRawData = data;
                var newData = {}, degToRad = Math.PI / 180;
                dataLen = data.length;
                for (var i = 0 ; i < dataLen ; ++i) {
                    var d = data[i], g = d.geometry, p = d.properties, key = tf.js.MakeObjectKey(p.public_transport_vehicle_id);
                    var newDataItem = newData[key];
                    if (g.coordinates[0] != g.coordinates[1] || g.coordinates[0] != 0) {
                        if (newDataItem == undefined) {
                            var newDataItemProps = { properties: { device_id: p.device_id }, history: [] };
                            newDataItem = newData[key] = newDataItemProps;
                            deviceHistoryData.push(newDataItemProps);
                        }
                        p.heading_rad = p.heading * degToRad;
                        p.coordinates = g.coordinates;
                        p.dateObj = tf.js.GetDateFromTimeStamp(p.time_calculation);
                        p.timeMillis = p.dateObj.getTime();
                        newDataItem.history.push(p);
                    }
                }
            }
            deviceHistoryKeyedList.UpdateFromNewData(deviceHistoryData);

            var itemList = deviceHistoryKeyedList.GetKeyedItemList();
            var trackGeom = { type: 'linestring', style: [{ line: true, line_color: "#f88", line_opacity: 40, line_width: 26 }] };

            for (var i in itemList) {
                var keyedItem = itemList[i], d = keyedItem.GetData(), p = d.properties, h = d.history;
                keyedItem.isShowing = false;
                trackGeom.coordinates = getHistoryCoords(h);
                if (keyedItem.mapFeature == undefined) {
                    var startCoords = h[0].coordinates;
                    keyedItem.mapFeature = new tf.map.Feature({ type: 'point', coordinates: startCoords, style: getDeviceStyleFunction(keyedItem, false), hoverStyle: getDeviceStyleFunction(keyedItem, true) });
                    keyedItem.mapFeature.isDeviceFeature = true;
                    keyedItem.mapFeature.deviceItem = keyedItem;
                    keyedItem.trackFeature = new tf.map.Feature(trackGeom);
                    keyedItem.trackFeature.deviceItem = keyedItem;
                }
                else {
                    keyedItem.trackFeature.SetGeom(trackGeom);
                    //keyedItem.trackFeature = new tf.map.Feature(trackGeom);
                }
                if (keyedItem.GetKey() == selectedDeviceKey) {
                    lastSelectedDevice = keyedItem;
                }
            }
            isLoadingDeviceHistory = false;
            checkFinishLoadHistory();
        });
    }

    /*
{
    "sender": {},
    "data": [{
        "uuid": "0c951552-0a1f-428b-bfd0-aa554895491d",
        "name": "cats-2",
        "created": "2017-03-02T22:13:30.530421Z",
        "url": "/srv/videos/0c951552-0a1f-428b-bfd0-aa554895491d__cats-2___720p2628kbs-1488492507.mp4"
    }, {
        "uuid": "12951ae0-d3cf-4cb1-b089-d5ec885c9427",
        "name": "cats-2",
        "created": "2017-03-02T22:18:18.697698Z",
        "url": "/srv/videos/12951ae0-d3cf-4cb1-b089-d5ec885c9427__cats-2___480p1128kbs-1488492826.mp4"
    }, {
        "uuid": "87750853-f5f1-4c46-984c-c432d0d86043",
        "name": "cats-2",
        "created": "2017-03-02T22:25:56.213347Z",
        "url": "/srv/videos/87750853-f5f1-4c46-984c-c432d0d86043__cats-2___480p1128kbs-1488493432.mp4"
    }, {
        "uuid": "0779fd6f-3490-4d1c-b4b5-920500cd743c",
        "name": "cats-1",
        "created": "2017-03-02T23:12:18.064942Z",
        "url": "/srv/videos/0779fd6f-3490-4d1c-b4b5-920500cd743c__cats-1___480p1128kbs-1488496322.mp4"
    }, {
        "uuid": "9e9c597f-ac89-4e98-a023-599ceb4030dc",
        "name": "cats-2",
        "created": "2017-03-02T23:19:58.498150Z",
        "url": "/srv/videos/9e9c597f-ac89-4e98-a023-599ceb4030dc__cats-2___480p1128kbs-1488496418.mp4"
    }, {
        "uuid": "8ebc3532-9bfd-4e9c-ba6f-2339b36f50dd",
        "name": "cats-2",
        "created": "2017-03-03T04:02:56.195893Z",
        "url": "/srv/videos/8ebc3532-9bfd-4e9c-ba6f-2339b36f50dd__cats-2___480p1128kbs-1488496818.mp4"
    }, {
        "uuid": "3a27dc0e-5658-4a82-ab76-6fff9421f759",
        "name": "cats-1",
        "created": "2017-03-03T15:27:17.420431Z",
        "url": "/srv/videos/3a27dc0e-5658-4a82-ab76-6fff9421f759__cats-1___720p2628kbs-1488554834.mp4"
    }, {
        "uuid": "ec315cc8-1f4e-4508-9c6c-efb77a329c84",
        "name": "cats-1",
        "created": "2017-03-03T16:04:59.423740Z",
        "url": "/srv/videos/ec315cc8-1f4e-4508-9c6c-efb77a329c84__cats-1___480p1128kbs-1488555201.mp4"
    }, {
        "uuid": "82a35069-9cb3-4573-ae60-d88f27f1ad2c",
        "name": "cats-2",
        "created": "2017-03-04T04:01:44.924313Z",
        "url": "/srv/videos/82a35069-9cb3-4573-ae60-d88f27f1ad2c__cats-2___720p2628kbs-1488537116.mp4"
    }, {
        "uuid": "f7fba259-ac26-4ba3-9191-4640087798b7",
        "name": "cats-1",
        "created": "2017-03-06T19:58:14.589661Z",
        "url": "/srv/videos/f7fba259-ac26-4ba3-9191-4640087798b7__cats-1___720p2628kbs-1488798740.mp4"
    }, {
        "uuid": "98820ec5-60b2-4955-b37c-1dbda17f1034",
        "name": "cats-2",
        "created": "2017-03-07T04:05:07.704118Z",
        "url": "/srv/videos/98820ec5-60b2-4955-b37c-1dbda17f1034__cats-2___480p1128kbs-1488798307.mp4"
    }]
}    */

    function loadBusFeedInterval() {
        var url = "http://utma-video.cs.fiu.edu/api/videos/";

        new tf.ajax.JSONGet().Request(url, function (notification) {
            var data;
            //if (!!notification && !!notification.data) { data = notification.data.features; }
            console.log(JSON.stringify(notification));
        }, theThis, undefined, false, undefined, undefined, undefined);
    }

    function loadBusInterval() {

        var selectedBusKey = !!lastSelectedBus ? lastSelectedBus.GetKey() : undefined;

        getBusHistoryInterval(function (data) {
            busHistoryData = [];
            busRawData = undefined;
            var busLinesByLineId = {};
            var limit, dataLen = 0;
            if (!!data) {
                busRawData = data;
                //public_transport_vehicle_id, datetime, fleet, heading, line_id, name, speed
                var newData = {}, degToRad = Math.PI / 180;
                dataLen = data.length;
                for (var i = 0 ; i < dataLen ; ++i) {
                    var d = data[i], g = d.geometry, p = d.properties, key = tf.js.MakeObjectKey(p.public_transport_vehicle_id);
                    if (showFIUOnly && p.fleet != 'fiu') {
                        continue;
                    }
                    var newDataItem = newData[key];
                    if (newDataItem == undefined) {
                        var newDataItemProps = { properties: { public_transport_vehicle_id: p.public_transport_vehicle_id, fleet: p.fleet }, history: [] };
                        newDataItem = newData[key] = newDataItemProps;
                        busHistoryData.push(newDataItemProps);
                    }
                    var blbliKey = tf.js.MakeObjectKey(p.line_id);
                    if (busLinesByLineId[blbliKey] == undefined) { busLinesByLineId[blbliKey] = p.line_id; }
                    p.heading_rad = p.heading * degToRad;
                    p.coordinates = g.coordinates;
                    p.dateObj = tf.js.GetDateFromTimeStamp(p.datetime);
                    p.timeMillis = p.dateObj.getTime();
                    newDataItem.history.push(p);
                }
            }

            busHistoryKeyedList.UpdateFromNewData(busHistoryData);

            var busList = busHistoryKeyedList.GetKeyedItemList();
            var trackGeom = { type: 'linestring', style: [{ line: true, line_color: "#f88", line_opacity: 40, line_width: 26 }] };
            var lineStops = {};

            for (var i in busList) {
                var bus = busList[i], d = bus.GetData(), p = d.properties, h = d.history;
                bus.isShowing = false;
                trackGeom.coordinates = getHistoryCoords(h);
                if (bus.mapFeature == undefined) {
                    var startCoords = h[0].coordinates;
                    bus.mapFeature = new tf.map.Feature({
                        busItem: bus, type: 'point', coordinates: startCoords,
                        //style: getBusStyleFunction(bus, false), hoverStyle: getBusStyleFunction(bus, true)
                        style: getBusStyle, hoverStyle: getBusStyle
                    });
                    bus.mapFeature.isBusFeature = true;
                    bus.mapFeature.busItem = bus;
                    bus.trackFeature = new tf.map.Feature(trackGeom);
                    bus.trackFeature.busItem = bus;
                }
                else {
                    //bus.trackFeature.SetGeom(trackGeom);
                    bus.trackFeature = new tf.map.Feature(trackGeom);
                }
                if (bus.GetKey() == selectedBusKey) {
                    lastSelectedBus = bus;
                }
            }

            for (var i in busLinesByLineId) {
                var lineId = busLinesByLineId[i];
                var lineItem = routesKeyedList.GetItem(lineId);
                if (!!lineItem) {
                    var d = lineItem.GetData(), p = d.properties;
                    if (!!lineItem.mapFeature) { routesLayer.AddMapFeature(lineItem.mapFeature, true); }
                    for (var j in p.platform_ids) {
                        var platId = p.platform_ids[j], key = tf.js.MakeObjectKey(platId);
                        if (lineStops[key] == undefined) {
                            lineStops[key] = true;
                            var stopItem = stopsKeyedList.GetItem(platId);
                            if (!!stopItem) { stopsLayer.AddMapFeature(stopItem.mapFeature, true); }
                        }
                    }
                }
            }

            routesLayer.AddWithheldFeatures();
            stopsLayer.AddWithheldFeatures();
            isLoadingBusHistory = false;
            checkFinishLoadHistory();
        });
    }

    function getHour0to12(date) {
        var hours, isAM = true;
        if (!!date) {
            var hours = date.getHours(); if (hours > 12) { hours -= 12; isAM = false; }
            var minutes = date.getMinutes();
        }
        else { hours = 0; }
        return { hours: hours, isAM: isAM } ;
    }

    function calcStartDate() {
        var calcHours = hourForMenu; if (!isAM) { calcHours += 12; }
        var calcMins = 0;
        startDate = new Date(dateForPicker.getFullYear(), dateForPicker.getMonth(), dateForPicker.getDate(), calcHours, calcMins, 0, 0);
        startDateStr = tf.js.GetTimeStampFromDate(startDate);
        endDate = new Date(startDate); endDate.setMinutes(endDate.getMinutes() + nMinutesInterval)
    }

    function setStartDate(newDate) {
        var g = getHour0to12(newDate);

        dateForPicker = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        hourForMenu = g.hours;
        hourButtonLabel = g.hours > 0 ? '' + g.hours : name0HourStr;
        isAM = g.isAM;

        calcStartDate();

        setDateButtonLabel();
        setHourButtonLabel();
        setHourAMPMButtonLabel();
    }

    function preloadImages() {
        function makeDataFromSVG(fromSVG) { return "data:image/svg+xml;utf8," + encodeURIComponent(fromSVG); }
        var fromSVG = '<svg xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="0 0 37.541998 52.066015" xml:space="preserve" width="37.542" height="52.066017"><path style="fill:#33cd5f;fill-opacity:1;stroke:#000000;stroke-linecap:butt;stroke-opacity:1;stroke-linejoin:round;stroke-width:1.1;stroke-miterlimit:4;stroke-dasharray:none" d="M 18.771,0.49999809 C 8.695,0.49999809 0.5,8.6989981 0.5,18.770998 c 0,9.461 13.676,19.698 17.63,32.338 0.085,0.273 0.34,0.459 0.626,0.457 0.287,-0.004 0.538,-0.192 0.619,-0.467 3.836,-12.951 17.666,-22.856 17.667,-32.33 C 37.041,8.6989981 28.845,0.49999809 18.771,0.49999809 Z m 0,32.13099991 c -7.9,0 -14.328,-6.429 -14.328,-14.328 0,-7.9 6.428,-14.3279999 14.328,-14.3279999 7.898,0 14.327,6.4279999 14.327,14.3279999 0,7.899 -6.429,14.328 -14.327,14.328 z" /><path d="M 17.491987,32.053536 C 14.72134,31.72142 12.547927,30.865333 10.4178,29.267079 9.6776719,28.711755 8.5836331,27.649072 8.0205177,26.938505 6.3421849,24.820701 5.3150402,22.309714 5.0369017,19.644675 4.9078899,18.408524 5.0175369,16.595491 5.2991384,15.308541 6.3906811,10.320071 10.357268,6.2177124 15.313137,4.9517748 16.66082,4.6075198 17.124594,4.555504 18.821934,4.5582359 c 1.659792,0.00267 2.040614,0.044746 3.313399,0.3660747 1.747467,0.4411677 3.437805,1.2498595 4.920955,2.3542846 0.737616,0.5492649 2.161188,1.965297 2.696138,2.6818603 1.379868,1.8483245 2.2095,3.7634445 2.635509,6.0838005 0.171856,0.936055 0.186303,3.396013 0.02559,4.3577 -0.660389,3.95175 -2.829084,7.293935 -6.149548,9.4771 -1.117319,0.734624 -2.960835,1.533582 -4.244512,1.839523 -1.042011,0.248343 -1.718768,0.324734 -3.027752,0.341764 -0.715908,0.0093 -1.390786,0.0063 -1.499728,-0.0068 z" style="fill:#ff0000;fill-opacity:1;stroke:none;stroke-width:1.69799995;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /></svg>';
        var toSVG = '<svg xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="0 0 37.541998 52.066015" xml:space="preserve" width="37.542" height="52.066017"><path style="fill:#387ef5;fill-opacity:1;stroke:#000000;stroke-linejoin:round;stroke-opacity:1;stroke-width:1.1;stroke-miterlimit:4;stroke-dasharray:none" d="M 18.771,0.49999809 C 8.695,0.49999809 0.5,8.6989981 0.5,18.770998 c 0,9.461 13.676,19.698 17.63,32.338 0.085,0.273 0.34,0.459 0.626,0.457 0.287,-0.004 0.538,-0.192 0.619,-0.467 3.836,-12.951 17.666,-22.856 17.667,-32.33 C 37.041,8.6989981 28.845,0.49999809 18.771,0.49999809 Z m 0,32.13099991 c -7.9,0 -14.328,-6.429 -14.328,-14.328 0,-7.9 6.428,-14.3279999 14.328,-14.3279999 7.898,0 14.327,6.4279999 14.327,14.3279999 0,7.899 -6.429,14.328 -14.327,14.328 z" /><path d="M 16.932297,31.971499 C 12.339831,31.3131 8.4926786,28.534608 6.4065867,24.369617 4.4054277,20.374199 4.5435059,15.479076 6.7684711,11.540162 7.6961091,9.8979402 9.2861721,8.1406588 10.851745,7.0274723 c 1.41916,-1.0090817 3.385681,-1.8583995 5.223796,-2.2560971 0.722092,-0.1562331 1.040522,-0.1773919 2.691017,-0.178811 1.665176,-0.00143 1.962502,0.018147 2.691017,0.1772014 5.586243,1.2196281 9.734526,5.4019344 10.857963,10.9470174 0.156108,0.770521 0.178715,1.109403 0.176059,2.639052 -0.0026,1.522894 -0.02641,1.863332 -0.179715,2.574017 -0.642478,2.978462 -2.08033,5.530868 -4.232971,7.514164 -1.88734,1.738867 -4.412284,2.992994 -6.933338,3.443754 -0.999688,0.178743 -3.239992,0.223263 -4.213276,0.08373 z" style="fill:#ff0000;fill-opacity:1;stroke:none;stroke-width:1.10000002;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /></svg>';
        new tf.dom.ImgsPreLoader({
            imgSrcs: [
                "./images/directionsm.png",
                "./images/directionsm2.png",
                makeDataFromSVG(fromSVG),
                makeDataFromSVG(toSVG)
            ],
            onAllLoaded: function (ipl) {
                var imgs = ipl.GetImgs();
                var index = 0;
                mapBusDirImagePreloaded = imgs[index++];
                mapDeviceImagePreloaded = imgs[index++];
                fromImagePreloaded = imgs[index++];
                toImagePreloaded = imgs[index++];
                imagesPreLoaded = true;
                checkAllCreated();
            }
        });
    };

    function createKeyedLists() {
        busHistoryKeyedList = new tf.js.KeyedList({
            name: "busHistoryData",
            getKeyFromItemData: function (itemData) { return !!itemData ? itemData.properties.public_transport_vehicle_id : undefined; },
            needsUpdateItemData: function (itemData) { return true; }, filterAddItem: function (itemData) {
                return showFIUOnly ? itemData.properties.fleet == 'fiu' : true;
            }
        });
        deviceHistoryKeyedList = new tf.js.KeyedList({
            name: "deviceHistoryData",
            getKeyFromItemData: function (itemData) { return !!itemData ? itemData.properties.device_id : undefined; },
            needsUpdateItemData: function (itemData) { return true; }, filterAddItem: function (itemData) { return true; }
        });
        routesKeyedList = new tf.js.KeyedList({
            name: "busRoutes",
            getKeyFromItemData: function (itemData) { return !!itemData ? itemData.properties.line_id : undefined; },
            needsUpdateItemData: function (itemData) { return true; }, filterAddItem: function (itemData) { return true; }
        });
        stopsKeyedList = new tf.js.KeyedList({
            name: "busStops",
            getKeyFromItemData: function (itemData) { return !!itemData ? itemData.properties.platform_id : undefined; },
            needsUpdateItemData: function (itemData) { return true; }, filterAddItem: function (itemData) { return true; }
        });
    }

    function forceRemovePartialBusRouteFeatureStatus() {
        if (partialBusRouteFeature) {
            timePartialsLayer.DelMapFeature(partialBusRouteFeature);
            partialBusRouteFeature = undefined;
        }
    };

    function forceRefreshPartialBusRouteFeatureStatus(){
        forceRemovePartialBusRouteFeatureStatus();
        updatePartialBusRouteFeatureStatus();
    };

    function updatePartialBusRouteFeatureStatus() {
        var isPaused = timer.GetIsPaused();
        var hasMarkedTime = markedTime !== undefined;

        if (lastSelectedBus && partialBusRouteBus && (lastSelectedBus != partialBusRouteBus)) {
            forceRemovePartialBusRouteFeatureStatus();
        }

        var hasSelectedBus = lastSelectedBus !== undefined;
        var shouldHavePartialBusRouteFeature = isPaused && hasMarkedTime && hasSelectedBus;
        var hasPartialBusRouteFeature = !!partialBusRouteFeature;
        if (shouldHavePartialBusRouteFeature != hasPartialBusRouteFeature) {
            if (shouldHavePartialBusRouteFeature) {
                var d = lastSelectedBus.GetData(), p = d.properties, h = d.history;
                var partialLineString = getPartialLineString(h, markedTime, timer.GetElapsedTime());
                var geom = {
                    type: 'linestring', coordinates: partialLineString, style: getPartialStyle, hoverStyle: getPartialStyle
                };
                timePartialsLayer.AddMapFeature(partialBusRouteFeature = new tf.map.Feature(geom));
                partialBusRouteBus = lastSelectedBus;
            }
            else {
                forceRemovePartialBusRouteFeatureStatus();
            }
            setAuxButtonsDisplay();
        }
    };

    function onPausePlay(notification) {
        //console.log('is paused? ' + notification.isPaused);
        updatePartialBusRouteFeatureStatus();
    };

    function createTimer() { timer = new tf.helpers.Timer({ onPausePlay: onPausePlay }); timer.SetSpeed(playbackSpeed); timer.SetLimit(nMinutesInterval * 1000 * 60); timer.SetWrap(wrapTime = true); timer.Pause(true); }

    var cssTag, cssClassNames, cssClasses;

    function createClassName (tag, name) { return tag + name; };

    function createCSSClassNames() {
        cssClassNames = {
            wrapperClassName: createClassName(cssTag, "Wrapper"),
            rangeClassName: createClassName(cssTag, "Range")
        };
        cssClasses = {};
    };

    function createCSSClasses() {
        var rangeHeightInt = 30, thumbBorderInt = 1, trackHeightInt = 4, thumbWidthInt = 4, thumbHeightInt = rangeHeightInt / 2;
        var backgroundLivelyColor = "#037", darkTextColor = "#037";
        var noMarginNoBorderNoPadding = {
            margin: "0px", border: "0px", padding: "0px"
        };

        tf.styles.AddRangeClasses({
            cssClasses: cssClasses,
            className: cssClassNames.rangeClassName,
            thumbHeightInt: thumbHeightInt,
            thumbBorderInt: thumbBorderInt,
            rangeSettings: {
                inherits: [noMarginNoBorderNoPadding],
                width: "calc(100% - 8px)", height: rangeHeightInt + "px", background: "transparent", cursor: "pointer",
                marginLeft: "4px", marginRight: "4px"
            },
            trackSettings: {
                inherits: [noMarginNoBorderNoPadding],
                width: "100%", height: trackHeightInt + "px", cursor: "pointer", background: backgroundLivelyColor,
                borderColor: "transparent", color: "transparent"
            },
            thumbSettings: {
                inherits: [noMarginNoBorderNoPadding],
                border: thumbBorderInt + "px solid " + darkTextColor,
                height: thumbHeightInt + "px", width: thumbWidthInt + "px",
                borderRadius: "0px", background: "#ffffff", cursor: "pointer",
                boxShadow: "0px 0px 1px " + backgroundLivelyColor + ", 0px 0px 1px " + backgroundLivelyColor
            }
        });

        cssClasses[cssClassNames.rangeClassName] = tf.js.ShallowMerge(cssClasses[cssClassNames.rangeClassName], { overflow: "hidden" });
    };

    function afterLogin() {

        cssTag = "ioctr";
        createCSSClassNames();
        createCSSClasses();
        tf.styles.CreateCSSClasses(cssClasses);

        var params = window.location.href;

        params = tf.urlapi.ParseURLAPIParameters(params);

        showFIUOnly = params['fiuonly'] != undefined;

        menuItemSelectedClasses = styles.CreateTextDivBtnClasses("white", "green", "white", "darkgreen");
        menuItemUnselectedClasses = styles.CreateTextDivBtnClasses("white", "red", "white", "darkred");

        stopTextStyleSpecs = {
            marker: true, font_height: 15, zindex: 3, marker_color: '#ffe57f', font_color: "#008",
            line_width: 1, line_color: "#ffffff", marker_opacity: 85, border_opacity: 60, border_color: "#000", snaptopixel: false
        };
        routesAreLoaded = stopsAreLoaded = urlAPICreated = imagesPreLoaded = false;
        isShowingEventRoute = isTracking = true;
        timeSpanItems = [
            { text: "1 hour", toolTip: "View 1 hour of history", nMinutesInterval: 1 * 60, timeSpanStr: "1 hour" },
            { text: "2 hours", toolTip: "View 2 hours of history", nMinutesInterval: 2 * 60, timeSpanStr: "2 hours" },
            { text: "4 hours", toolTip: "View 4 hours of history", nMinutesInterval: 4 * 60, timeSpanStr: "4 hours" },
            { text: "6 hours", toolTip: "View 6 hours of history", nMinutesInterval: 6 * 60, timeSpanStr: "6 hours" }
        ];
        var firstTimeSpan = timeSpanItems[0];
        //var firstTimeSpan = timeSpanItems[1];
        //var firstTimeSpan = timeSpanItems[2];
        //var firstTimeSpan = timeSpanItems[3];
        timeSpanStr = firstTimeSpan.timeSpanStr;
        nMinutesInterval = firstTimeSpan.nMinutesInterval;
        interpolateCoordsBetweenEvents = true;
        buttonDim = "1.25rem";
        name0HourStr = '0/12';
        playbackSpeed = 1;
        createTimer();
        polyCode = new tf.map.PolyCode();
        createKeyedLists();

        //var initialDate = new Date();
        var initialDate = new Date(2018, 3, 25, 8, 0, 0);

        initialDate.setHours(initialDate.getHours() - 1);
        setStartDate(initialDate);
        preloadImages();
        loadRoutes();
        loadStops();
        createApplication();
    }

    function checkLogin() {
        try {
            var url = serverURL + 'users/ca';
            var payloadStr = JSON.stringify(authForm);
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var canAdmin = tf.js.GetIsValidObject(notification) && tf.js.GetIsValidObject(notification.data) && notification.data.status == true;
                if (canAdmin) { afterLogin(); }
            }, theThis, undefined, false, undefined, undefined, payloadStr);
        }
        catch (Exception) { canAdmin = false; }
    }

    function createButton(className, eventListener, title, tooltip) {
        var button = document.createElement('button');
        button.className = className;
        button.style.pointerEvents = "all";
        button.addEventListener('click', eventListener);
        if (tf.js.GetIsNonEmptyString(title)) { button.innerHTML = title; }
        if (tf.js.GetIsNonEmptyString(tooltip)) { button.title = tooltip; }
        return button;
    }

    function createInput(className, label, tooltip, placeholder) {
        var input = document.createElement('input');
        input.className = className != undefined ? className : "";
        input.title = tooltip;
        input.placeholder = placeholder;
        return input;
    }

    function makeAuthForm (email, password) { return { apiversion: 5, email: email, password: password }; }

    function onLogin() {
        authForm = makeAuthForm(emailInput.value, passwordInput.value);
        document.body.removeChild(loginDiv.GetHTMLElement());
        checkLogin();
    }

    function doLogin() {

        loginDiv = new tf.dom.Div({ cssClass: "loginDiv" });
        var loginDivES = loginDiv.GetHTMLElement().style;
        var button = createButton("loginButton", onLogin, "Login", "Login");
        emailInput = createInput("emailInput", 'email: ', 'email', 'email');
        passwordInput = createInput("passwordInput ", 'password: ', 'password', 'password');
        passwordInput.type = 'password';

        loginDivES.textAlign = 'center';
        loginDiv.AddContent(emailInput, passwordInput, button);
        document.body.appendChild(loginDiv.GetHTMLElement());
    }

    function doInitialize() {
        serverURL = tf.js.GetNonEmptyString(settings.serverURL, "http://utma-api.cs.fiu.edu/api/v1/");
        if (tf.js.GetIsValidObject(settings.authForm)) { authForm = settings.authForm; checkLogin(); } else { doLogin(); }
    }

    var MMC_BBC_linestring;

    function initialize() {
        //debug = tf.GetDebug();

        lineStringsByStartAndEnd = tf.map.LineStringsByStartAndEnd({ createContentContainer: createContentContainer, getTwoCoordsName: getTwoCoordsName });

        scrubSliderMax = 1000;

        showingMapPins = false;
        //showingMapPins = true;

        frameCount = 0;
        isMaximized = false;
        nFramesForCenter = 10;

        /*
        GCCenter = [-80.371772, 25.755524];
        MMCCenter = [-80.371529, 25.755062];
        ECCenter = [-80.368313, 25.769972];
        BBCCenter = [-80.1405, 25.910514];

        GCCenter = MMCCenter;

        MMC_BBC_linestring = [MMCCenter, BBCCenter];

        GPERouteBusTrackers = tf.map.LoopRouteBusTrackers({ loopStartPos: MMCCenter, loopEndPos: BBCCenter });
        CATSRouteBusTrackers = tf.map.LoopRouteBusTrackers({ loopStartPos: MMCCenter, loopEndPos: ECCenter });
        */

        styles = tf.GetStyles(tf.styles.GetGraphiteAPIStyleSpecifications());
        isLoadingBusHistory = isLoadingDeviceHistory = isLoadingHistory = false;
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};


//[-80.36826241879811, 25.76990837262082]