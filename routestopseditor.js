"use strict";

ITPA.OC.RouteStopsEditor = function (settings) {
    var theThis, editorName, map, layer, tables, styles, oc, appLayout, maps, mapEventHandler, selfHideCB, routesList, stopsList;
    var topContainer, editorWrapper, captionButtonsWrapper, captionButtonsWrapperE, routeStopsEditorTitleE;
    var scrollerDiv, scrollerDivE, scrollerDivES;
    var toaster;
    var linesKeyedList, stopsKeyedList, table;
    var isShowing;
    var allRoutesLoaded, nRoutesLoading, nRoutesLoaded;
    var allMDTStops, nMDTStops, itpaStopsByFleetId, fiuRoutesByFleetId;
    var allFIUStops, nFIUStops;
    var lineDirections;
    var fiuFleetOrder, mdtFleetOrder;
    var minDistanceInMetersToDetectStopMove;
    var currentStop, currentStopKF, isCurrentStopPlatformItem;
    var newStopCoordsFeature, newStopCoordsFeatureAdded;
    var needsUpdate, someFailed;
    var refreshButton, submitButton;

    this.Show = function (showBool) { return show(showBool); }
    this.GetIsShowing = function () { return isShowing; }
    this.Toggle = function () { return theThis.Show(!theThis.GetIsShowing()); }

    function doShow(showBool) {
        //if (inPlaceTextArea.IsAttached()) { inPlaceTextArea.Detach(); }
        //datePicker.Detach();
        if (!showBool) {
            removeCurrentStopTraces();
        }
        styles.ChangeOpacityVisibilityClass(editorWrapper, showBool);
    }

    function show(showBool) { if (isShowing != (showBool = !!showBool)) { doShow(isShowing = showBool); } }

    function selfHide() { if (selfHideCB) { selfHideCB({ sender: theThis }); } show(false); }

    function showInterfaceItems(showBool) {
        scrollerDivES.display = showBool ? 'block' : 'none';
        captionButtonsWrapper.GetHTMLElement().style.display = showBool ? 'inline-block' : 'none';
    }

    function createContentContainer() {
        var contentContainer = new tf.dom.Div();
        var contentContainerStyle = contentContainer.GetHTMLElement().style;

        contentContainerStyle.textAlign = 'left';
        contentContainerStyle.marginBottom = contentContainerStyle.marginTop = "10px";
        contentContainerStyle.border = "2px solid navy";
        contentContainerStyle.borderRadius = "4px";
        contentContainerStyle.overflow = "hidden";
        contentContainerStyle.backgroundColor = 'navajowhite';
        return contentContainer;
    }

    function createStopsSection(title) {
        var stopsSectionWrapper = new tf.dom.Div({ cssClass: "stopsSectionWrapper" });
        var stopsSectionWrapperE = stopsSectionWrapper.GetHTMLElement();
        var stopsSectionWrapperES = stopsSectionWrapperE.style;
        var stopsSectionTitle = new tf.dom.Div({ cssClass: "stopsSectionTitle" });
        var stopsSectionTitleE = stopsSectionTitle.GetHTMLElement();
        var stopsSectionContent = new tf.dom.Div({ cssClass: "stopsSectionContent" });

        stopsSectionTitleE.innerHTML = '' + title;

        stopsSectionWrapper.AddContent(stopsSectionTitle, stopsSectionContent);
        return {
            wrapper: stopsSectionWrapper,
            wrapperE: stopsSectionWrapperE,
            wrapperES: stopsSectionWrapperES,
            title: stopsSectionTitle,
            titleE: stopsSectionTitleE,
            content: stopsSectionContent,
            contentE: stopsSectionContent.GetHTMLElement()
        };
    }

    function removeCurrentStopTraces() {
        if (newStopCoordsFeatureAdded) {
            layer.DelMapFeature(newStopCoordsFeature);
            newStopCoordsFeatureAdded = false;
        }
        if (!!currentStop) { if (!!currentStopKF) { currentStopKF.SetIsAlwaysInHover(false); } }
        currentStop = currentStopKF = undefined;
    }

    function getOnClickStop(stop, isPlatformItem) {
        return function (event) {
            var addNewCoords, panCoords;
            removeCurrentStopTraces();
            currentStop = stop;
            isCurrentStopPlatformItem = isPlatformItem;

            var platformItem = isPlatformItem ? stop : stop.itpaStop;

            if (!!platformItem) { platformItem = stopsList.GetKeyedList().GetItem(platformItem.GetKey()); }

            if (platformItem) {
                tables.GoTo(platformItem);
                var kf = oc.GetKeyedFeatureFromKeyedItem(platformItem);
                if (!!kf) {
                    panCoords = kf.GetPointCoords();
                    currentStopKF = kf;
                    kf.SetIsAlwaysInHover(true);
                }
                addNewCoords = !isPlatformItem && !stop.coordsCheck;
            }
            else if (!isPlatformItem) {
                addNewCoords = true; panCoords = stop.props.pointCoords;
            }

            if (!!panCoords) {
                mapEventHandler.StopAutoCycle();
                mapEventHandler.SetTrackBusKeyedItem(undefined);
                map.SetCenter(panCoords);
            }

            if (newStopCoordsFeatureAdded = addNewCoords) {
                newStopCoordsFeature.SetPointCoords(stop.props.pointCoords);
                layer.AddMapFeature(newStopCoordsFeature);
            }

            maps.SetLargeMapLayerVisible(ITPA.Core.PlatformListName, true);

            return false;
        }
    }

    function createStopButton(mdtOrfiuId, toolTipMaker) {
        var buttonDim = "18px", textDim = buttonDim;
        var label, toolTip, button, isPlatformItem;
        var stop = allMDTStops[mdtOrfiuId];

        if (!stop) { stop = allFIUStops[mdtOrfiuId]; }

        if (!!stop) {
            label = stop.props.StopID + ' - ' + stop.props.name;
        }
        else {
            stop = itpaStopsByFleetId[mdtOrfiuId + ''];

            if (!!stop) {
                var props = stop.GetData().properties;
                isPlatformItem = true;
                label = props.fleet_id + ' - ' + props.identifier;
            }
        }

        if (!!label) {
            toolTip = tf.js.GetFunctionOrNull(toolTipMaker) ? toolTipMaker(stop) : label;
            if (toolTip == undefined) { toolTip = label; }
            button = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                dim: textDim, style: true, label: label, tooltip: toolTip, onClick: getOnClickStop(stop, isPlatformItem)
            }));
            button.GetHTMLElement().style.display = 'block';
        }

        return button;
    }

    function createRenamedToolTip(stop) {
        var toolTip = 'Previous name was: ';
        if (stop.itpaStop) { toolTip += stop.itpaStop.GetData().properties.identifier; }
        else { toolTip += 'unknown'; }
        return toolTip;
    }

    function createMovedToolTip(stop) {
        var toolTip;
        if (stop.itpaStop) {
            if (stop.distance != undefined) {
                var distanceInFeet = stop.distance * 3.28084;
                toolTip = 'Moved by a distance of: ' + distanceInFeet.toFixed(1) + ' feet';
            }
        }
        return toolTip;
    }

    function createObsoleteToolTip(stop) { return "Removed from this route"; }

    function createNewToolTip(stop) { return "Added to this route"; }

    function createRenamedStopButton(mdtOrfiuId) { return createStopButton(mdtOrfiuId, createRenamedToolTip); }
    function createMovedStopButton(mdtOrfiuId) { return createStopButton(mdtOrfiuId, createMovedToolTip); }
    function createObsoleteStopButton(mdtOrfiuId) {
        return createStopButton(mdtOrfiuId, createObsoleteToolTip);
    }
    function createNewStopButton(mdtOrfiuId) { return createStopButton(mdtOrfiuId, createNewToolTip); }

    function addErrorSection(section, title, count, values, createFunction) {
        if (!!count) {
            var titleUse = title;
            if (count > 1) { titleUse += ' (' + count + ')'; }
            section.titleE.innerHTML = titleUse;
            section.wrapperES.display = 'block';
            for (var i in values) {
                var stopButton = createFunction(values[i]);
                if (!!stopButton) { section.content.AddContent(stopButton); }
            }
        }
    }

    function getRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var props = keyedItem.GetData().properties;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var routeWrapperTitleDiv = new tf.dom.Div({ cssClass: "routeWrapperTitleDiv" });
                var routeTitleNumberDiv = new tf.dom.Div({ cssClass: "routeTitleNumberDiv mdtRouteTitleNumberDiv" });
                var routeTitleDiv = new tf.dom.Div({ cssClass: "routeTitleDiv" });
                var routeResultsDiv = new tf.dom.Div({ cssClass: "routeResultsDiv" });

                var missingSection = createStopsSection("Missing");
                var obsoleteSection = createStopsSection("Obsolete");
                var movedSection = createStopsSection("Moved");
                var renamedSection = createStopsSection("Renamed");

                routeWrapperTitleDiv.AddContent(routeTitleNumberDiv, routeTitleDiv);
                content.AddContent(routeWrapperTitleDiv, routeResultsDiv, missingSection.wrapper, obsoleteSection.wrapper, movedSection.wrapper, renamedSection.wrapper);

                keyedItem.routeTitleNumberDivE = routeTitleNumberDiv.GetHTMLElement();
                keyedItem.routeTitleDivE = routeTitleDiv.GetHTMLElement();
                keyedItem.routeResultsDivE = routeResultsDiv.GetHTMLElement();

                keyedItem.missingSection = missingSection;
                keyedItem.obsoleteSection = obsoleteSection;
                keyedItem.movedSection = movedSection;
                keyedItem.renamedSection = renamedSection;
            }

            keyedItem.fleetOrder = ((keyedItem.fleet = props.fleet.toLowerCase()) == 'fiu') ? fiuFleetOrder : mdtFleetOrder;

            keyedItem.fleet_id = parseInt(props.fleet_id, 10);
            if (!(keyedItem.direction = lineDirections[props.direction.toLowerCase()])) { keyedItem.direction = { order: -1 }; }

            var identifier = props.identifier;

            if (keyedItem.fleetOrder == fiuFleetOrder) {
                keyedItem.routeTitleNumberDivE.className = "routeTitleNumberDiv fiuRouteTitleNumberDiv";
            }
            else {
                keyedItem.routeTitleNumberDivE.className = "routeTitleNumberDiv mdtRouteTitleNumberDiv";
            }

            identifier += ' ' + props.direction;

            keyedItem.routeTitleNumberDivE.innerHTML = props.fleet_id + '';

            keyedItem.routeTitleDivE.innerHTML = identifier;
            keyedItem.routeTitleNumberDivE.style.backgroundColor = props.color;

            keyedItem.missingSection.wrapperES.display = keyedItem.obsoleteSection.wrapperES.display = keyedItem.movedSection.wrapperES.display = keyedItem.renamedSection.wrapperES.display = 'none';

            var serviceTitle = keyedItem.fleetOrder == fiuFleetOrder ? "Transloc" : "MDT";
            var serviceLink;

            if (!!keyedItem.url) {
                serviceLink = "<a href='" + keyedItem.url + "' target='null' title='See raw service results'>" + serviceTitle + " service</a>";
            }
            else {
                serviceLink = serviceTitle + " service";
            }

            if (!!keyedItem.failedToLoad) {
                keyedItem.routeResultsDivE.innerHTML = "<b>failed</b> to retrieve route stops from " + serviceLink;
            }
            else if (!!keyedItem.stopIds) {

                var resultsInnerHTML = '<b>' + keyedItem.stopIds.length + "</b> stops retrieved from " + serviceLink + "<br />";

                if (keyedItem.nSequenceErrors) {
                    var errorStr = keyedItem.nSequenceErrors == 1 ? "error" : "errors";
                    resultsInnerHTML += "<span style='color:darkred;'>" + keyedItem.nSequenceErrors + " sequence " + errorStr +"</span><br />";
                }
                if (keyedItem.nDuplicateStops) {
                    var stopStr = keyedItem.nDuplicateStops == 1 ? "stop" : "stops";
                    resultsInnerHTML += "<span style='color:darkred;'>" + keyedItem.nDuplicateStops + " duplicate " + stopStr + "</span><br />";
                }

                if (keyedItem.failed) {
                    resultsInnerHTML += "<b>update</b> is needed";

                    addErrorSection(keyedItem.missingSection, 'Added', keyedItem.nMissing, keyedItem.missing, createNewStopButton);
                    addErrorSection(keyedItem.movedSection, 'Moved', keyedItem.nCoordsFailed, keyedItem.coordsFailed, createMovedStopButton);
                    addErrorSection(keyedItem.renamedSection, 'Renamed', keyedItem.nNameUpdated, keyedItem.nameUpdated, createRenamedStopButton);
                    addErrorSection(keyedItem.missingSection, 'Removed', keyedItem.nObsoletes, keyedItem.obsoletes, createObsoleteStopButton);
                }
                else {
                    resultsInnerHTML += "data <b>is current</b>";
                    keyedItem.routeResultsDivE.style.backgroundColor = "#c0ff00";
                }
                keyedItem.routeResultsDivE.innerHTML = resultsInnerHTML;
            }
            else {
                keyedItem.routeResultsDivE.innerHTML = "retrieving route stops from " + serviceLink + "...";
            }

        }
        return { sender: theThis, content: content };
    }

    function sortRouteRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        if (kia.fleetOrder != kib.fleetOrder) { return kia.fleetOrder - kib.fleetOrder; }
        return kia.fleet_id == kib.fleet_id ? (kia.direction.order - kib.direction.order) : (kia.fleet_id - kib.fleet_id);
    }

    function checkAllRoutesLoaded() {
        if (++nRoutesLoaded == nRoutesLoading) {
            allRoutesLoaded = true;
            //needsUpdate = false;
            //someFailed = true;
            var title = needsUpdate ? (someFailed ? "Update is blocked because some lines failed to load" : "Some stops have changed, an update is needed") : "All stops are current";
            var titleEnding = needsUpdate ? (someFailed ? ' ***' : ' *') : '';
            routeStopsEditorTitleE.innerHTML = editorName + titleEnding;
            routeStopsEditorTitleE.title = title;
            if (needsUpdate && !someFailed) {
                refreshButton.GetHTMLElement().style.marginRight = "16px";
                submitButton.GetHTMLElement().style.display = "inline-block";
            }
            else {
                refreshButton.GetHTMLElement().style.marginRight = "4px";
                submitButton.GetHTMLElement().style.display = "none";
            }
            captionButtonsWrapperE.style.display = 'inline-block';

            toaster.Toast({ text: "Refresh complete<br />" + (needsUpdate ? "Update is needed" : "Data is current") });
        }
    }

    function loadMDTStops(then, routeid, dir, tripid) {
        var mainURL = "http://www.miamidade.gov/transit/WebServices/";
        var getRouteStopsService = mainURL + "BusRouteStops/";
        var url = getRouteStopsService + "?RouteID=" + routeid + "&Dir=" + dir;
        if (tripid != undefined) { url += "&TripID=" + tripid; }
        ITPA.Core.GetJSONFromXMLServiceWithRedirect(then, url, theThis);
    }

    function compareStopIds(a, b) { return parseInt(a, 10) - parseInt(b, 10); }
    function compareStops(a, b) { return a.props.StopID - b.props.StopID; }

    function getDistanceFromItpaStop(itpaStop, pointCoords) {
        var existingData = itpaStop.GetData();
        var pointCoordsExisting = existingData.geometry.coordinates;
        return tf.units.GetDistanceInMetersBetweenMapCoords(pointCoords, pointCoordsExisting);
    }

    function checkObsoletes(itpaLine) {
        var stopIdsMap = itpaLine.stopIdsMap;
        var p = itpaLine.GetData().properties;
        var platformIds = p.platform_ids;
        var nPlatformIds = platformIds.length;
        var obsoletes = [];

        for (var i = 0 ; i < nPlatformIds ; ++i) {
            var platId = platformIds[i];
            var existingStop = stopsKeyedList.GetItem(platId);
            if (!!existingStop) {
                var esp = existingStop.GetData().properties;
                var espmdtid = esp.fleet_id;
                if (!!stopIdsMap[espmdtid]) {

                }
                else {
                    obsoletes.push(espmdtid + '');
                    //console.log('obsolete stop ' + platId + ' on line id: ' + p.line_id);
                }
            }
            else {
                console.log('stop ' + platId + ' missing from line id: ' + p.line_id);
            }
        }
        return obsoletes;
    }

    function getOnStopsLoaded(keyedItem) {
        return function (data, url) {
            keyedItem.url = url;
            if (!!data && tf.js.GetIsArray(data.Record)) {
                /*<StopID>6936</StopID><StopName>NW 2 AV & NW 22 LN</StopName><Sequence>81</Sequence><Latitude>25.799005</Latitude><Longitude>-80.199108</Longitude>*/
                var p = keyedItem.GetData().properties;
                var routeid = p.fleet_id;
                var dir = p.direction;
                var stopIds = [], sequenceCheck = 1;
                var nMissing = 0, missing = [];
                var nCoordsFailed = 0, coordsFailed = [];
                var nNameUpdated = 0, nameUpdated = [];
                var stopIdsMap = {};
                var nSequenceErrors = 0;
                var nDuplicateStops = 0;
                var keyedItemPlatformIds = {};
                var kiData = keyedItem.GetData(), kip = kiData.properties;
                var keyedItemPlatformIdsArray = kip.platform_ids;

                for (var i in keyedItemPlatformIdsArray) {
                    keyedItemPlatformIds['' + keyedItemPlatformIdsArray[i]] = true;
                }

                data = data.Record;
                for (var i in data) {
                    var d = data[i], sid = d.StopID + '', sidInt = parseInt(sid, 10);
                    if (d.Sequence != sequenceCheck) {
                        if (d.Sequence < sequenceCheck) {
                            //console.log('stop ' + d.Sequence + ' out of sequence for route: ' + routeid);
                            sequenceCheck = parseInt(d.Sequence, 10);
                            ++nSequenceErrors;
                        }
                    }
                    ++sequenceCheck;

                    if (stopIdsMap[sid] != undefined) {
                        ++nDuplicateStops;
                        continue;
                    }

                    // uncomment to test for obsolete / removed stop
                    //if (sidInt == 3940) { continue; }

                    var existingStop = allMDTStops[sid];
                    if (existingStop == undefined) {
                        var pointCoords = [parseFloat(d.Longitude), parseFloat(d.Latitude)];
                        var itpaStop = itpaStopsByFleetId[sid];
                        var coordsCheck = true, distance;
                        var nameWasUpdated = false;
                        if (!itpaStop) {
                            missing.push(sid);
                            ++nMissing;
                        }
                        else {
                            if (!keyedItemPlatformIds['' + itpaStop.GetData().properties.platform_id]) {
                                missing.push(sid);
                                ++nMissing;
                            }
                            distance = getDistanceFromItpaStop(itpaStop, pointCoords);
                            coordsCheck = distance < minDistanceInMetersToDetectStopMove;
                            var identifierExisting = itpaStop.GetData().properties.identifier;
                            if (identifierExisting != d.StopName) { nameWasUpdated = true; }
                        }
                        existingStop = allMDTStops[sid] = {
                            props: { pointCoords: pointCoords, name: d.StopName, StopID: sidInt },
                            nuses: 1, routesAndDirs: [{ routeItem: keyedItem, routeid: routeid, dir: dir } ],
                            itpaStop: itpaStop, coordsCheck: coordsCheck, distance: distance, nameWasUpdated: nameWasUpdated
                        };
                        ++nMDTStops;
                    }
                    else {
                        if (existingStop.props.pointCoords[0] != parseFloat(d.Longitude) || existingStop.props.pointCoords[1] != parseFloat(d.Latitude)) {
                            console.log('stop coords differ in usage ' + sid);
                        }
                        ++existingStop.nuses;
                        existingStop.routesAndDirs.push({ routeItem: keyedItem, routeid: routeid, dir: dir });
                        coordsCheck = existingStop.coordsCheck;
                        nameWasUpdated = existingStop.nameWasUpdated;
                    }

                    if (!coordsCheck) { ++nCoordsFailed; coordsFailed.push(sid); }
                    if (nameWasUpdated) { ++nNameUpdated; nameUpdated.push(sid); }

                    stopIds.push(sidInt);
                    stopIdsMap[sid] = existingStop;
                }

                keyedItem.nSequenceErrors = nSequenceErrors;
                keyedItem.nDuplicateStops = nDuplicateStops;

                keyedItem.stopIds = stopIds;
                keyedItem.stopIdsMap = stopIdsMap;

                (keyedItem.missing = missing).sort(compareStopIds);
                keyedItem.nMissing = nMissing;

                (keyedItem.coordsFailed = coordsFailed).sort(compareStopIds);
                keyedItem.nCoordsFailed = nCoordsFailed;

                (keyedItem.nameUpdated = nameUpdated).sort(compareStopIds);
                keyedItem.nNameUpdated = nNameUpdated;

                (keyedItem.obsoletes = checkObsoletes(keyedItem)).sort(compareStopIds);
                keyedItem.nObsoletes = keyedItem.obsoletes.length;

                if (keyedItem.failed = nMissing || nCoordsFailed || nNameUpdated || keyedItem.nObsoletes) {
                    needsUpdate = true;
                }
                keyedItem.NotifyUpdated();
            }
            else {
                someFailed = keyedItem.failedToLoad = true;
            }
            checkAllRoutesLoaded();
        }
    }

    function loadFIURoutes() {
        var translocRoutesUrl = "http://feeds.transloc.com/stops.json?include_routes=true&agencies=571";
        new tf.ajax.JSONGet().Request(translocRoutesUrl, function (notification) {
            var data;

            if (!!notification) { data = notification.data; }

            if (tf.js.GetIsValidObject(data)) {
                var routes = data.routes;
                var stops = data.stops;
                if (tf.js.GetIsArray(routes) && tf.js.GetIsArray(stops)) {

                    nFIUStops = stops.length;

                    for (var i in stops) {
                        var stop = stops[i];
                        var sidInt = stop.id, sid = sidInt + '';
                        var pointCoords = [stop.position[1], stop.position[0]];
                        var name = stop.name;
                        var itpaStop = itpaStopsByFleetId[sid];
                        var distance;
                        var coordsCheck = true, nameWasUpdated = false;

                        if (!!itpaStop) {
                            distance = getDistanceFromItpaStop(itpaStop, pointCoords);
                            coordsCheck = distance < minDistanceInMetersToDetectStopMove;
                            var identifierExisting = itpaStop.GetData().properties.identifier;
                            if (identifierExisting != name) { nameWasUpdated = true; }
                        }

                        allFIUStops[sid] = {
                            props: { pointCoords: pointCoords, name: name, StopID: sidInt },
                            nuses: 0, routesAndDirs: [],
                            itpaStop: itpaStop, coordsCheck: coordsCheck, distance: distance, nameWasUpdated: nameWasUpdated
                        };
                        ++nFIUStops;
                    }

                    for (var i in routes) {
                        var route = routes[i];
                        var routeId = route.id;
                        var fiuRoute = fiuRoutesByFleetId[routeId + ''];

                        if (!!fiuRoute) {

                            var stopIds = [], sequenceCheck = 1;
                            var nMissing = 0, missing = [];
                            var nCoordsFailed = 0, coordsFailed = [];
                            var nNameUpdated = 0, nameUpdated = [];
                            var nObsoletes, obsoletes = [];
                            var stopIdsMap = {};
                            var fiuRouteProps = fiuRoute.GetData().properties;
                            var dir = fiuRouteProps.direction;

                            var keyedItemPlatformIds = {};
                            var kiData = fiuRoute.GetData(), kip = kiData.properties;
                            var keyedItemPlatformIdsArray = kip.platform_ids;

                            for (var i in keyedItemPlatformIdsArray) {
                                keyedItemPlatformIds['' + keyedItemPlatformIdsArray[i]] = true;
                            }

                            fiuRoute.url = translocRoutesUrl;

                            if (tf.js.GetIsArray(route.stops)) {
                                for (var i in route.stops) {
                                    var sidInt = route.stops[i], sid = sidInt + '';
                                    var fiuStop = allFIUStops[sid];

                                    if (!!fiuStop) {
                                        if (!keyedItemPlatformIds['' + fiuStop.itpaStop.GetData().properties.platform_id]) {
                                            ++nMissing; missing.push(sid);
                                        }
                                        fiuStop.routesAndDirs.push({ routeItem: fiuRoute, routeid: route.id, dir: dir });
                                        if (!fiuStop.coordsCheck) { ++nCoordsFailed; coordsFailed.push(sid); }
                                        if (fiuStop.nameWasUpdated) { ++nNameUpdated; nameUpdated.push(sid); }
                                        stopIds.push(sidInt);
                                        stopIdsMap[sid] = fiuStop;
                                    }
                                    else {
                                        console.log('transloc data: not found stop ' + sid + ' for route ' + routeId);
                                    }
                                }
                            }

                            fiuRoute.stopIds = stopIds;
                            fiuRoute.stopIdsMap = stopIdsMap;

                            (fiuRoute.missing = missing).sort(compareStopIds);
                            fiuRoute.nMissing = nMissing;

                            (fiuRoute.coordsFailed = coordsFailed).sort(compareStopIds);
                            fiuRoute.nCoordsFailed = nCoordsFailed;

                            (fiuRoute.nameUpdated = nameUpdated).sort(compareStopIds);
                            fiuRoute.nNameUpdated = nNameUpdated;

                            (fiuRoute.obsoletes = checkObsoletes(fiuRoute)).sort(compareStopIds);
                            fiuRoute.nObsoletes = fiuRoute.obsoletes.length;

                            if (fiuRoute.failed = nMissing || nCoordsFailed || nNameUpdated || fiuRoute.nObsoletes) {
                                needsUpdate = true;
                            }
                        }
                    }
                }
            }

            for (var i in fiuRoutesByFleetId) {
                var item = fiuRoutesByFleetId[i];
                if (!item.stopIds) { someFailed = item.failedToLoad = true; }
                item.NotifyUpdated();
                checkAllRoutesLoaded();
            }
        }, theThis, undefined, false, undefined, undefined, undefined);
    }

    function doLoadAllRoutes() {
        var routeItems = tf.js.ObjectToArray(linesKeyedList.GetKeyedItemList());
        var stopItems = tf.js.ObjectToArray(stopsKeyedList.GetKeyedItemList());
        allMDTStops = {};
        allFIUStops = {};
        nMDTStops = 0;
        nFIUStops = 0;
        nRoutesLoaded = 0;
        nRoutesLoading = routeItems.length;
        itpaStopsByFleetId = {};
        for (var i in stopItems) {
            var stopItem = stopItems[i], p = stopItem.GetData().properties;
            itpaStopsByFleetId[p.fleet_id + ''] = stopItem;
        }
        fiuRoutesByFleetId = {};
        for (var i = 0 ; i < nRoutesLoading ; ++i) {
            var routeItem = routeItems[i], p = routeItem.GetData().properties;
            routeItem.stopIds = undefined;
            routeItem.NotifyUpdated();
            if (p.fleet.toLowerCase() == 'mdt') {
                loadMDTStops(getOnStopsLoaded(routeItem), p.fleet_id, p.direction);
            }
            else {
                fiuRoutesByFleetId[p.fleet_id + ''] = routeItem;
            }
        }
        loadFIURoutes();
        checkAllRoutesLoaded();
        return false;
    }

    var stopsAreLoaded, routesAreLoaded;

    function checkRoutesStopsLoaded() { if (stopsAreLoaded && routesAreLoaded) { doLoadAllRoutes(); } }

    function loadAllRoutes() {

        someFailed = needsUpdate = false;
        captionButtonsWrapperE.style.display = 'none';
        routeStopsEditorTitleE.innerHTML = editorName + " (Refreshing...)";

        routesAreLoaded = stopsAreLoaded = false;

        toaster.Toast({ text: "Starting refresh..." });

        routesList.LoadRoutes(function (data) {
            linesKeyedList.UpdateFromNewData(data.features);
            routesAreLoaded = true;
            checkRoutesStopsLoaded();
        });

        stopsList.LoadPlatforms(function (data) {
            stopsKeyedList.UpdateFromNewData(data.features);
            stopsAreLoaded = true;
            checkRoutesStopsLoaded();
        });

        return false;

    }

    function createTable() {
        var tableSettings = settings.tableSettings, tableRowStyle = settings.tableRowStyle, tableRowHoverStyle = settings.tableRowHoverStyle;
        var rowSettings = { style: tableRowStyle, selectedStyle: tableRowHoverStyle };

        linesKeyedList = new tf.js.KeyedList({
            name: "lines",
            getKeyFromItemData: function (data) { return !!data ? data.properties.line_id : undefined },
            filterAddItem: function (itemData) { return true; },
            needsUpdateItemData: function (updateObj) { return true; }
        });

        stopsKeyedList = new tf.js.KeyedList({
            name: "stops",
            getKeyFromItemData: function (data) { return !!data ? data.properties.platform_id : undefined },
            filterAddItem: function (itemData) { return true; },
            needsUpdateItemData: function (updateObj) { return true; }
        });


        scrollerDiv = new tf.dom.Div({ cssClass: "tableScrollerDiv" });
        scrollerDivE = scrollerDiv.GetHTMLElement();
        scrollerDivES = scrollerDivE.style;
        scrollerDivES.display = 'block';
        scrollerDivES.height = "calc(100% - 36px)";

        //var toasterStyle = { zIndex: 2, position: "absolute", right: "0px", top: "0px", boxShadow: "-3px 3px 6px rgba(0,0,0,0.5)" };
        //toaster = new tf.ui.Toaster({ container: scrollerDiv, timeout: 2000, className: "routeStopsConsistencyResults", style: toasterStyle });

        var toasterStyle = { zIndex: 20, position: "absolute", right: "0px", top: "0px" };
        toaster = new tf.ui.Toaster({
            container: scrollerDiv, timeout: 2000, className: "", style: toasterStyle, toastClassName: "routeStopsConsistencyResults", toastStyle: {
                display: "block", margin: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)"
            }, addBefore: true
        });

        loadAllRoutes();

        var tableCreateSettings = {
            keyedList: linesKeyedList, optionalScope: theThis, tableSettings: tableSettings, rowSettings: rowSettings,
            properties: {}, getRowContent: getRowContent
        };

        table = new tf.ui.KeyedTable(tableCreateSettings);
        table.SetSort(sortRouteRows);
        scrollerDiv.AddContent(table);
    }

    function addPlatforms(platformArray, initialId, platformList, fleet) {
        var platform_id = initialId;
        var platformListAsArray = tf.js.ObjectToArray(platformList);

        //platformListAsArray.sort(compareStops);

        for (var i in platformListAsArray) {
            var stop = platformListAsArray[i], p = stop.props;
            var plat = {
                platform_id: platform_id,
                identifier: p.name,
                platform_coordinate: { lat: p.pointCoords[1], lng: p.pointCoords[0] },
                fleet: fleet,
                fleet_id: p.StopID
            };
            stop.platform_id = platform_id;
            platformArray.push(plat);
            ++platform_id;
        }
        return platform_id;
    }

    function submit() {
        if (needsUpdate && !someFailed) {
            var platform = [];
            var platform_id = addPlatforms(platform, 1, allFIUStops, 'fiu');
            platform_id = addPlatforms(platform, platform_id, allMDTStops, 'mdt');

            var line_platform_route = [];
            var routeItems = tf.js.ObjectToArray(linesKeyedList.GetKeyedItemList());
            var nRoutesSubmit = routeItems.length;
            for (var i = 0 ; i < nRoutesSubmit ; ++i) {
                var routeItem = routeItems[i], p = routeItem.GetData().properties;
                if (!!routeItem.stopIds) {
                    var stopsListUse = (p.fleet.toLowerCase() == 'mdt') ? allMDTStops : allFIUStops;
                    var line_id = p.line_id, running_number = 0;
                    for (var stopIdIndex in routeItem.stopIds) {
                        var stopId = routeItem.stopIds[stopIdIndex];
                        var stop = stopsListUse[stopId];
                        if (!!stop) {
                            var lpr = {
                                line_id: line_id,
                                running_number: ++running_number,
                                platform_id: stop.platform_id
                            };
                            line_platform_route.push(lpr);
                        }
                        else {
                            console.log('missing stop for route ' + p.identifier);
                        }
                    }
                }
            }

            var updateRecord = {
                platform: platform,
                line_platform_route: line_platform_route
            };

            //var debugRecord = true;
            var debugRecord = false;

            if (debugRecord) {
                window.open(null).document.write(JSON.stringify(updateRecord));
            }
            else {
                captionButtonsWrapperE.style.display = 'none';
                routeStopsEditorTitleE.innerHTML = editorName + " (Updating...)";

                mapEventHandler.SetETAKeyedItem(undefined);

                toaster.Toast({ text: "Starting update..." });

                //appLayout.SetRouteStopsCheck(false);

                routesList.UpdateStops(updateRecord, function (notification) {
                    var success = false;
                    if (!!notification) {
                        toaster.Toast({ text: notification.message });
                        if (!!(success = !!notification.status)) { loadAllRoutes(); }
                    }
                    else {
                        toaster.Toast({ text: "Failed to contact server" });
                    }
                    if (!success) {
                        captionButtonsWrapperE.style.display = 'inline-block';
                        routeStopsEditorTitleE.innerHTML = editorName;
                    }
                    //appLayout.SetRouteStopsCheck(true);
                });
            }
        }
        return false;
    }

    function createEditor() {
        var buttonDim = "18px";

        appLayout = oc.GetAppLayout();
        topContainer = appLayout.GetTopLayout().GetContainer();

        editorWrapper = new tf.dom.Div({ cssClass: "floatEditorWrapper routetopseditorwrapper" });

        var routeStopsEditorTitleWrapper = new tf.dom.Div({ cssClass: "floatEditorTitleWrapper" });

        var hideButton = styles.AddButtonDivLeftRightMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphCloseXName, onClick: selfHide, tooltip: "Hide " + editorName, dim: buttonDim })
        );

        var routeStopsEditorTitle = new tf.dom.Div({ cssClass: "floatEditorTitle" });

        routeStopsEditorTitleE = routeStopsEditorTitle.GetHTMLElement();
        routeStopsEditorTitleE.innerHTML = editorName;

        captionButtonsWrapper = new tf.dom.Div({ cssClass: "floatRightButtonsWrapper" });

        var buttonDim2 = "20px";

        refreshButton = styles.AddButtonDivMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphUndoName, onClick: loadAllRoutes, tooltip: "Refresh List", dim: buttonDim2 })
        );

        submitButton = styles.AddButtonDivMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphUndoName, onClick: submit, tooltip: "Update Server and Refresh List", dim: buttonDim2 })
        );

        refreshButton.GetHTMLElement().style.marginRight = "16px";
        tf.dom.AddCSSClass(submitButton, "flipHV");

        captionButtonsWrapper.AddContent(refreshButton, submitButton);
        captionButtonsWrapperE = captionButtonsWrapper.GetHTMLElement();
        captionButtonsWrapperE.style.display = 'none';

        routeStopsEditorTitleWrapper.AddContent(hideButton, routeStopsEditorTitle, captionButtonsWrapper);

        createTable();

        editorWrapper.AddContent(routeStopsEditorTitleWrapper, scrollerDiv);

        topContainer.AddContent(editorWrapper);

        doShow(false);
    }

    function initialize() {
        styles = tf.GetStyles();
        editorName = "Route Stops Editor";
        oc = settings.oc;
        mapEventHandler = oc.GetMapEventHandler();
        tables = settings.tables;
        map = tables.GetMap();
        maps = oc.GetMaps();
        layer = maps.GetLargeMapLayer(ITPA.Core.PlatformListName);
        newStopCoordsFeature = new tf.map.Feature({
            type: 'point', coordinates: [0.0, 0.0], style: [
                { marker: true, label: 'New Stop Location', marker_verpos: "bottom", zindex: 10 },
                { circle: true, circle_radius: 5, fill: true, fill_color: "#ff0", line: true, line_color: "#000", line_width: 1, zindex: 11 }
            ]
        });
        minDistanceInMetersToDetectStopMove = 0.0001;
        fiuFleetOrder = 0;
        mdtFleetOrder = 1 - fiuFleetOrder;
        lineDirections = ITPA.Core.MakeLineDirectionAbreviations();
        selfHideCB = tf.js.GetFunctionOrNull(settings.onSelfHide);
        routesList = oc.GetCore().GetList(ITPA.Core.RouteListName);
        stopsList = oc.GetCore().GetList(ITPA.Core.PlatformListName);
        createEditor();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
