"use strict";

ITPA.OC.TripsEd = function (settings) {
    var theThis, styles, urlapiApp, appSpecs;

    var itpaMDTRoutesIds, itpaMDTRouteIdMap;
    var linesByMDTRouteId;

    var polyCode;
    var singleAppHCFOnTheSide, singleAppMapContentOnTheSide, twoHorPaneLayout, HCFLayout, dLayers, appSizer, map;
    var routesKeyedList, routeTable, stopsKeyedList, stopsTable, servicesKeyedList, servicesTable;
    var serverURL;
    var routes, routesAreLoaded, stops, stopsById, stopsAreLoaded, services, servicesAreLoaded;
    var lastSelectedRoute;
    var MDTServiceAPI;

    var lastRouteIdSchedLoading, schedsToLoad, nSchedsLoaded, nSchedsToLoad, nRouteStopsToLoad, nRouteStopsLoaded;

    var isRefreshing;

    var db;

    var toaster;
    var schedLoadedToast;

    var rightDiv, rightDivE;

    var allDirections, allTrips;


    function getCachedValue(key, then) {
        //then(undefined); return;

        if (tf.js.GetFunctionOrNull(then)) {
            var value;

            if (!!db) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT theValue FROM KEYVALUES WHERE theKey=?', [key], function (tx, results) {
                        var value;
                        var len = results.rows.length;
                        if (len > 0) { value = results.rows[0].theValue; }
                        then(value);
                    });
                });
            }
            else {
                value = localStorage.getItem(key);
                then(value);
            }
        }
    }

    function setCachedValue(key, value) {
        //console.log('setting ' + key);
        if (!!db) {
            db.transaction(function (tx) {
                tx.executeSql('INSERT OR REPLACE INTO KEYVALUES (theKey, theValue) VALUES (?, ?)', [key, value]);
            });
        }
        else {
            value = localStorage.setItem(key, value);
        }
    }

    function deSelectLastSelected() {
        if (!!lastSelectedRoute) {
            lastSelectedRoute = undefined;
            routeTable.GetTable().UnselectRow();
            stopsTable.GetTable().UnselectRow();
            servicesTable.GetTable().UnselectRow();
        }
    }

    function onRefresh() {
        if (!isRefreshing) {
            isRefreshing = true;
            lastRouteIdSchedLoading = false;
            toaster.Toast({ text: "Refreshing..." });
            routesAreLoaded = stopsAreLoaded = servicesAreLoaded = false;
            loadRoutes();
            loadServices();
        }
    }

    function getTripStopSortBySeq(routeItemData, tripId) {
        return function (a, b) {
            /*
            var aSeq = parseInt(a.sequence, 10);
            var bSeq = parseInt(b.sequence, 10);
            if (aSeq == bSeq) {
                return a.indexInSched - b.indexInSched;
                //if (a.time != b.time) { console.log('stop time with same sequence different times, routeId: ' + routeItemData.RouteID + ' stopId: ' + a.stopId + ' tripId: ' + tripId) ; }
            }
            return aSeq - bSeq;*/
            //var ma = getMinutes(a.time);
            //var mb = getMinutes(b.time);
            var ma = a.minutes;
            var mb = b.minutes;
            if (ma == undefined) {
                if (mb == undefined) {
                    return 0;
                }
                return -1;
            }
            else if (mb == undefined) {
                return 1;
            }
            return ma - mb;
        }
    }

    function checkSchedulesLoaded() {
        if (!MDTServiceAPI.GetHasRequestsPending() && (nSchedsLoaded >= nSchedsToLoad)) {
            console.log('scheds loaded');
            var routeItems = routesKeyedList.GetKeyedItemList();

            dumpTrips();

            for (var i in routeItems) {
                var routeItem = routeItems[i];
                var routeItemData = routeItem.GetData();
                for (var iS in routeItem.services) {
                    var routeService = routeItem.services[iS];
                    var routeTrips = [];
                    for (var j in routeService.tripsById) {
                        var routeItemTrip = routeService.tripsById[j];
                        var routeItemTripStopsTimes = routeItemTrip.stopTimes;
                        var nStopTimes = routeItemTripStopsTimes.length;
                        var prevMinutes = undefined;

                        //if ("3794476" == routeItemTrip.tripId) { console.log("here2"); }

                        routeItemTripStopsTimes.sort(getTripStopSortBySeq(routeItemData, j));

                        /*for (var ist = 0 ; ist < nStopTimes ; ++ist) {
                            var stopTime = routeItemTripStopsTimes[ist];
                            stopTime.minutes = getMinutes(stopTime.time, prevMinutes);
                            if (stopTime.minutes != undefined) {
                                prevMinutes = stopTime.minutes;
                            }
                            else {
                                stopTime.badScheduleTime = true;
                            }
                        }

                        for (var ist = 0 ; ist < nStopTimes ; ++ist) {
                            var stopTime = routeItemTripStopsTimes[ist];
                            if (stopTime.minutes == undefined) {
                                var copyFromIndex = ist > 0 ? ist - 1 : (ist < nStopTimes - 1 ? ist + 1 : undefined);
                                stopTime.minutes = copyFromIndex != undefined ? routeItemTripStopsTimes[copyFromIndex].minutes : 0;
                            }
                        }*/

                        var nTripStops = routeItemTripStopsTimes.length;

                        routeItemTrip.totalMinutes = 0;

                        if (nTripStops > 0) {
                            var indexFirst = 0, lastStop = routeItemTripStopsTimes[nTripStops - 1];
                            while (indexFirst < nTripStops - 1 && !!routeItemTripStopsTimes[indexFirst].badScheduleTime) {
                                ++indexFirst;
                            }
                            if (indexFirst < nTripStops - 1) {
                                var firstStop = routeItemTripStopsTimes[indexFirst];
                                var totalMinutes = lastStop.minutes - firstStop.minutes;
                                if (totalMinutes < 0) { console.log('negative trip total time'); }
                                if (totalMinutes > 140) {
                                    console.log('trip longer than max time: ' + totalMinutes + ' id: ' + routeItemTrip.tripId);
                                }
                                routeItemTrip.totalMinutes = totalMinutes;
                            }
                        }

                        routeTrips.push(routeItemTrip);
                    }

                    routeTrips.sort(function (a, b) {
                        var sa = a.stopTimes[0], sb = b.stopTimes[0];
                        return sa.minutes - sb.minutes;
                    });

                    routeService.routeTrips = routeTrips;
                }
            }

            routesKeyedList.NotifyItemsUpdated();

            closeLastSchedToast();
            toaster.Toast({ text: "Refresh complete" });

            isRefreshing = false;
        }
    }

    // 12am = midnight, 12pm = noon

    function getMinutes(schedTime, prevMinutes) {
        var minutes;
        if (schedTime.indexOf('/') >= 0) {
            //minutes = prevMinutes;
            minutes = -1;
        }
        else {
            var hourMinSplitAmPm = schedTime.split(' ');
            var hourSplitMin = hourMinSplitAmPm[0].split(':');
            var hour = parseInt(hourSplitMin[0], 10);
            var min = parseInt(hourSplitMin[1], 10);
            if (hourMinSplitAmPm[1].toLowerCase() == 'pm') {
                if (hour < 12) { hour += 12; }
            }
            else if (hour == 12) {
                //console.log('got 12am');
                hour = 0;
            }
            minutes = hour * 60 + min;
            //console.log('time ' + schedTime + ' minutes ' + minutes);
            if (prevMinutes != undefined && prevMinutes > minutes) {
                //console.log('compensating for past midnight');
                minutes += 24 * 60;
            }
        }
        return minutes;
    }

    function dumpServiceIds() {
        var keyedItems = servicesKeyedList.GetKeyedItemList();
        for (var i in keyedItems) {
            var item = keyedItems[i], d = item.GetData();
            console.log(d.ServiceID);
        }
    }

    function dumpStops() {
        var keyedItems = stopsKeyedList.GetKeyedItemList();
        var fullStr = ''
        for (var i in keyedItems) {
            var item = keyedItems[i], d = item.GetData(), p = d;
            fullStr += p.StopID + ',' + p.StopName  + ',' + p.Longitude + ',' + p.Latitude + ';'
        }
        tf.GetDebug().FileLog("xml_stops", fullStr);
    }

    function dumpTrips() {
        // {"tripId":"3802268","direction":"Westbound","routeId":"338","tripServiceId":"SATURDAY"}
        //console.log(JSON.stringify(allTrips));
        var fullStr = ''
        allTrips = tf.js.SortObject(allTrips, function (a, b) { return parseInt(a.tripId, 10) - parseInt(b.tripId, 10); });
        for (var i in allTrips) {
            var thisTrip = allTrips[i], p = thisTrip;
            fullStr += p.tripId + ',' + p.routeId + ',' + p.direction + ',' + p.tripServiceId + ';'
        }
        tf.GetDebug().FileLog("xml_trips", fullStr);
    }

    function checkAllLoaded() {
        if (routesAreLoaded && servicesAreLoaded && nRouteStopsLoaded >= nRouteStopsToLoad) {

            //console.log(JSON.stringify(allDirections));

            stopsKeyedList.UpdateFromNewData(stops);
            urlapiApp.UpdateCurTableFooter();

            schedsToLoad = [];

            //dumpStops();
            //dumpServiceIds();
            //console.log(JSON.stringify(services));

            for (var i in services) {
                var service = services[i];
                var serviceRoute = service.RouteID;
                if (linesByMDTRouteId[serviceRoute] != undefined) {
                    var serviceItem = servicesKeyedList.GetItem(service.ServiceID);
                    for (var j in linesByMDTRouteId[serviceRoute]) {
                        var lineObj = linesByMDTRouteId[serviceRoute][j];
                        var serviceObj = { serviceItem: serviceItem, serviceName: service.ServiceName, serviceId: service.ServiceID, tripsById: {} };
                        //lineObj.routeItem.servicesById[service.ServiceID] = serviceObj;
                        lineObj.routeItem.services.push(serviceObj)
                        serviceItem.routeItems.push({ routeItem: lineObj.routeItem });
                    }
                }
            }

            var stopsCount = stopsKeyedList.GetItemCount();
            var linesCount = routesKeyedList.GetItemCount();
            if (stopsCount > 0 && linesCount > 0) {
                var routeItems = routesKeyedList.GetKeyedItemList();
                var stopItems = stopsKeyedList.GetKeyedItemList();
                var lineCount = 0;

                for (var i in stopItems) {
                    var item = stopItems[i];
                    item.routesByKey = {};
                }

                for (var i in routeItems) {
                    var routeItem = routeItems[i], routeProperties = routeItem.GetData();
                    var routeStops = routeItem.stopItems, routeId = routeProperties.RouteID;
                    var routeKey = routeItem.GetKey();
                    var nRouteStops = !!routeStops ? routeStops.length : 0;
                    for (var j = 0 ; j < nRouteStops ; ++j) {
                        var routeStop = routeStops[j], stopId = routeStop.StopID;
                        var stopItem = stopsKeyedList.GetItem(stopId);
                        if (!!stopItem) {
                            routeStop.stopItem = stopItem;
                            var stopProperties = stopItem.GetData();
                            var routeSeqKey = routeKey + '#' + routeStop.Sequence;
                            if (stopItem.routesByKey[routeSeqKey] == undefined) {
                                var routeSequenceObj = { routeId: routeId, routeItem: routeItem, routeProperties: routeProperties, sequence: routeStop.Sequence };
                                stopItem.routesByKey[routeSeqKey] = routeSequenceObj;
                            }
                        } else { console.log('LINKING STOPS AND LINES: route ' + i + ' is missing stop [' + j + '] = id = ' + stopId); }
                    }
                }

                for (var i in stopItems) {
                    var item = stopItems[i];
                    var stopRouteItems = tf.js.ObjectToArray(item.routesByKey);
                    stopRouteItems.sort(function (a, b) {
                        var pa = a.routeProperties, pb = b.routeProperties;
                        var ra = parseInt(pa.RouteID, 10), rb = parseInt(pb.RouteID, 10);
                        if (ra == rb) {
                            var da = pa.Direction, db = pb.Direction;
                            if (da == db) {
                                return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
                            }
                            return da < db ? -1 : 1;
                        }
                        return ra - rb;
                    });
                    item.routeItems = stopRouteItems;
                }

                for (var i in routeItems) {
                    var routeItem = routeItems[i];
                    var routeProperties = routeItem.GetData(), routeId = routeProperties.RouteID, routeDir = routeProperties.Direction;
                    var routeServices = routeItem.services;
                    var routeStops = routeItem.stopItems;

                    routeItem.tripsById = {};

                    for (var j in routeServices) {
                        var routeService = routeServices[j], routeServiceId = routeService.serviceId;
                        var stopIdsAdded = {};
                        for (var k in routeStops) {
                            var routeStop = routeStops[k];
                            var routeStopId = routeStop.StopID;
                            if (stopIdsAdded['' + routeStopId] == undefined) {
                                stopIdsAdded['' + routeStopId] = true;
                                //var routeStopSequence = routeStop.Sequence;
                                //console.log('sched: RouteId ' + routeId + ' Service ' + routeServiceId + ' Dir ' + routeDir + ' StopID ' + routeStopId + ' Seq ' + routeStopSequence);
                                schedsToLoad.push({
                                    routeItem: routeItem,
                                    stopName: routeStop.StopName,
                                    stopId: routeStopId,
                                    stopItem: routeStop.stopItem,
                                    routeId: routeId,
                                    routeServiceId: routeServiceId,
                                    routeDir: routeDir,
                                    routeStopId: routeStopId,
                                    //routeStopSequence: routeStopSequence,
                                    indexOfService: j,
                                    indexOfStop: k
                                });
                            }
                        }
                    }
                }

                nSchedsLoaded = 0;
                nSchedsToLoad = schedsToLoad.length;
                loadNextSched();
            }

            routesKeyedList.NotifyItemsUpdated();
            servicesKeyedList.NotifyItemsUpdated();
            stopsKeyedList.NotifyItemsUpdated();
        }
    }

    function loadNextSched() { if (nSchedsLoaded < nSchedsToLoad) { getBusSchedules(schedsToLoad[nSchedsLoaded]); } else { checkSchedulesLoaded(); } }

    function onCreated() {
        singleAppHCFOnTheSide = urlapiApp.GetSingleAppHCFOnTheSide();
        twoHorPaneLayout = (singleAppMapContentOnTheSide = singleAppHCFOnTheSide.GetSingleAppMapContentOnTheSide()).GetLeftSeparatorRightLayout();
        HCFLayout = singleAppHCFOnTheSide.GetHCFLayout();
        map = singleAppMapContentOnTheSide.GetMap();
        map.SetView({ minLevel: 11, maxLevel: 18 });
        map.SetFractionalZoomInteraction(true);
        dLayers = singleAppMapContentOnTheSide.GetDLayers();
        appSizer = singleAppMapContentOnTheSide.GetAppContainerSizer();
        twoHorPaneLayout.SetRightSideCollapsed(false);

        var rightPanel = twoHorPaneLayout.GetRight();

        rightDiv = new tf.dom.Div();
        rightDivE = rightDiv.GetHTMLElement();

        var rightDivStyle = { height: "calc(100% - 0px)", backgroundColor: "#fff", display: "inline-block", overflow: "hidden", color: "#000"/*, padding: "4px"/*, overflowY: "scroll"*/};

        styles.ApplyStyleProperties(rightDiv, rightDivStyle);

        var HCFLayoutDomObj = HCFLayout.GetDomObj();

        styles.ApplyStyleProperties(HCFLayoutDomObj, { display: "inline-block", verticalAlign: "top" });

        rightPanel.InsertContentBefore(rightDiv, HCFLayoutDomObj);

        var toasterStyle = { zIndex: 20, position: "absolute", left: "0px", top: "0px" };

        toaster = new tf.ui.Toaster({
            container: twoHorPaneLayout.GetContainer(), timeout: 2000, className: "", style: toasterStyle, toastClassName: "tableToastStyle", toastStyle: {
                display: "block", margin: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)"
            }, addBefore: true
        });

        isRefreshing = false;
        onRefresh();
    }

    function createContentContainer() {
        var contentContainer = new tf.dom.Div();
        var contentContainerStyle = contentContainer.GetHTMLElement().style;

        contentContainerStyle.textAlign = 'left';
        //contentContainerStyle.width = "100%";
        contentContainerStyle.border = "2px solid navy";
        contentContainerStyle.borderRadius = "4px";
        contentContainerStyle.overflow = "hidden";
        return contentContainer;
    }

    function getServiceRowContent(notification) {
        /*
            RouteID:"1"
            ServiceID:"WEEKDAY"
            ServiceName:"Weekday"
            ServiceOrder:"1"
        */

        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var p = data;

            if ((content = keyedItem.listContent) == undefined) {
                keyedItem.listContent = content = createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })
                var divAllWrapperE = divAllWrapper.GetHTMLElement();
                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineInEditorDiv" });
                var divLineWrapperE = divLineWrapper.GetHTMLElement();

                var divRoutesWrapper = new tf.dom.Div();
                var divRoutesWrapperE = divRoutesWrapper.GetHTMLElement();
                var divRoutesWrapperES = divRoutesWrapperE.style

                divRoutesWrapperES.whiteSpace = "normal";
                divRoutesWrapperES.backgroundColor = "darkblue";
                divRoutesWrapperES.padding = "3px";

                divAllWrapper.AddContent(divLineWrapper, divRoutesWrapper);
                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
                keyedItem.divRoutesWrapperE = divRoutesWrapperE;
            }

            var title = 'Name: ' + p.ServiceName + '<br/>' + 'Id: ' + p.ServiceID + '<br/>' + 'Order: ' + p.ServiceOrder;
            keyedItem.title = title;
            if (keyedItem.routeItems != undefined) {
                var routesStr = '';
                var nRoutes = keyedItem.routeItems.length;
                if (nRoutes > 0) { routesStr += '<p>Bus Routes</p>'; }
                for (var i = 0 ; i < nRoutes ; ++i) {
                    var routeItem = keyedItem.routeItems[i].routeItem, d = routeItem.GetData(), p = d;
                    var routeName = '- ' + p.Direction + ' ' + p.RouteID + ' ' + p.RouteAliasLong
                    if (i > 0) { routesStr += '<br/>'; }
                    routesStr += routeName;
                }
                keyedItem.divRoutesWrapperE.innerHTML = routesStr;
            }
            keyedItem.divLineWrapperE.innerHTML = title;
            keyedItem.divAllWrapperE.style.backgroundColor = keyedItem.divLineWrapperE.style.backgroundColor = p.color;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    }

    function getStopRowContent(notification) {
        /*
            <StopID>3859</StopID>
            <StopName>SW 107 AV & #1431 (PUBLIX)</StopName>
            <Latitude>25.755476</Latitude>
            <Longitude>-80.367987</Longitude>
        */

        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var p = data;

            if ((content = keyedItem.listContent) == undefined) {
                keyedItem.listContent = content = createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })
                var divAllWrapperE = divAllWrapper.GetHTMLElement();
                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineInEditorDiv" });
                var divLineWrapperE = divLineWrapper.GetHTMLElement();

                var divRoutesWrapper = new tf.dom.Div();
                var divRoutesWrapperE = divRoutesWrapper.GetHTMLElement();
                var divRoutesWrapperES = divRoutesWrapperE.style

                divRoutesWrapperES.whiteSpace = "normal";
                divRoutesWrapperES.backgroundColor = "darkblue";
                divRoutesWrapperES.padding = "3px";

                divAllWrapper.AddContent(divLineWrapper, divRoutesWrapper);
                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
                keyedItem.divRoutesWrapperE = divRoutesWrapperE;
            }

            var title = p.StopID + ' - ' + p.StopName;
            keyedItem.title = title;

            if (keyedItem.routeItems != undefined) {
                var routesStr = '';
                var nRoutes = keyedItem.routeItems.length;
                if (nRoutes > 0) { routesStr += '<p>Bus Routes</p>'; }
                for (var i = 0 ; i < nRoutes ; ++i) {
                    var routeObj = keyedItem.routeItems[i];
                    if (i > 0) { routesStr += '<br/>'; }
                    routesStr += '#' + routeObj.sequence + '&nbsp;in&nbsp;' + routeObj.routeId + '&nbsp;' + routeObj.routeProperties.Direction;
                }
                keyedItem.divRoutesWrapperE.innerHTML = routesStr;
            }

            keyedItem.divLineWrapperE.innerHTML = title;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    }

    function getRouteRowContent(notification) {
        /*
            Direction: "Northbound"
            Airport:"T"
            Bike:"T"
            Metrorail:"T"
            RouteAlias:"7"
            RouteAliasLong:"CBD-DOLPHIN MALL/MIA STA.VIA NW 7ST"
            RouteColor:"FF0000"
            RouteDescription:"Miami International Airport (MIA) Metrorail station, City of Sweetwater, Dolphin Mall, Miami International Mall, Fontainebleau Blvd., Mall of the Americas, Downtown Bus Terminal, Main Library, Historical Museum of South Florida, Miami Art Museum, MDC Wolfson Campus, Historic Overtown/Lyric Theatre Metrorail station"
            RouteID:"7"
            SortOrder:"7"
            Wheelchair:"T"
        */

        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var p = data;

            if ((content = keyedItem.listContent) == undefined) {
                keyedItem.listContent = content = createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })
                var divAllWrapperE = divAllWrapper.GetHTMLElement();
                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineInEditorDiv" });
                var divLineWrapperE = divLineWrapper.GetHTMLElement();

                var divStopsWrapper = new tf.dom.Div();
                var divStopsWrapperE = divStopsWrapper.GetHTMLElement();
                var divStopsWrapperES = divStopsWrapperE.style

                divStopsWrapperES.whiteSpace = "normal";
                divStopsWrapperES.backgroundColor = "darkblue";
                divStopsWrapperES.padding = "3px";
                divStopsWrapperES.margin = "3px";

                var divTripsWrapper = new tf.dom.Div();
                var divTripsWrapperE = divTripsWrapper.GetHTMLElement();
                var divTripsWrapperES = divTripsWrapperE.style

                divTripsWrapperES.whiteSpace = "normal";
                divTripsWrapperES.backgroundColor = "darkblue";
                divTripsWrapperES.padding = "3px";
                divTripsWrapperES.margin = "3px";

                divAllWrapper.AddContent(divLineWrapper, divStopsWrapper, divTripsWrapper);

                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
                keyedItem.divStopsWrapperE = divStopsWrapperE;
                keyedItem.divTripsWrapperE = divTripsWrapperE;
            }

            var title = p.Direction + ' ' + p.RouteID + ' ' + p.RouteAliasLong;
            keyedItem.title = title;
            if (keyedItem.services != undefined) {
                var nServices = keyedItem.services.length;
                if (nServices > 0) { title += '<br/>'; }
                for (var i = 0 ; i < nServices ; ++i) {
                    var serviceObj = keyedItem.services[i];
                    var serviceName = serviceObj.serviceName;
                    if (i > 0) { title += ', '; }
                    title += serviceName;
                }
            }
            keyedItem.divLineWrapperE.innerHTML = title;
            keyedItem.divAllWrapperE.style.backgroundColor = keyedItem.divLineWrapperE.style.backgroundColor = '#' + p.RouteColor;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    }

    function onContentChange(notification) { }

    function createTable(tables, keyedList, tableSettings, rowSettings, getRowContent, index, title) {
        var settings = {
            keyedList: keyedList, optionalScope: theThis, tableSettings: tableSettings, rowSettings: rowSettings,
            properties: {}, getRowContent: getRowContent, onContentChange: onContentChange
        };
        var table = new tf.ui.KeyedTable(settings)
        tables.push({ table: table, dLayer: null, index: index, title: title });
        return table;
    }

    function compareRoutes(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var a = kia.GetData(), b = kib.GetData();
        var idA = parseInt(a.RouteID, 10);
        var idB = parseInt(b.RouteID, 10);
        if (idA == idB) { return a.Direction < b.Direction ? -1 : 1; }
        return idA - idB;
    }

    function compareServices(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var a = kia.GetData(), b = kib.GetData();
        var idA = parseInt(a.ServiceOrder, 10);
        var idB = parseInt(b.ServiceOrder, 10);
        return idA - idB;
    }

    function compareStops(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var a = kia.GetData(), b = kib.GetData();
        var idA = parseInt(a.StopID, 10);
        var idB = parseInt(b.StopID, 10);
        return idA - idB;
    }

    function createTables(tables) {
        var tableSettings = tf.js.ShallowMerge(appSpecs.routeTableStyle, { selectOnHover: appSpecs.routeTableSelectOnHover, onSelect: onRouteRowSelect });
        routeTable = createTable(tables, routesKeyedList, tableSettings, { style: appSpecs.routeTableRowStyle, selectedStyle: appSpecs.routeTableRowHoverStyle }, getRouteRowContent, 0, "Bus Lines");
        stopsTable = createTable(tables, stopsKeyedList, tableSettings, { style: appSpecs.routeTableRowStyle, selectedStyle: appSpecs.routeTableRowHoverStyle }, getStopRowContent, 0, "Bus Stops");
        servicesTable = createTable(tables, servicesKeyedList, tableSettings, { style: appSpecs.routeTableRowStyle, selectedStyle: appSpecs.routeTableRowHoverStyle }, getServiceRowContent, 0, "Bus Line Services");
        routeTable.SetSort(compareRoutes);
        servicesTable.SetSort(compareServices);
        stopsTable.SetSort(compareStops);
    }

    function onRouteRowSelect(notification) {
        if (!!notification.isClick) {
            if (!!notification.selected) {
                var selItem = notification.selected.GetKeyedItem();
                if (selItem.isRouteItem) {
                    showRouteSchedule(selItem);
                    showRouteStops(selItem);
                }
            }
        }
        return true;
    }

    var routeScheduleDiv, routeScheduleDivE, routeScheduleDivES;

    function createRightDivInfoPane(title) {
        var containerDiv = new tf.dom.Div(), containerDivE = containerDiv.GetHTMLElement(), containerDivES = containerDivE.style;
        var div = new tf.dom.Div(), divE = div.GetHTMLElement(), divES = divE.style;
        var contentDiv = new tf.dom.Div(), contentDivE = contentDiv.GetHTMLElement(), contentDivES = contentDivE.style;
        var titleDiv = new tf.dom.Div(), titleDivE = titleDiv.GetHTMLElement(), titleDivES = titleDivE.style;

        //containerDivES.maxWidth = "20em";
        containerDivES.height = "100%";
        containerDivES.display = "inline-block";
        containerDivES.borderRight = "1px solid black";
        containerDivES.userSelect = "initial";

        //titleDivES.maxWidth = "20em";
        titleDivES.height = "30px";
        titleDivES.padding = "2px";
        titleDivES.display = "block";
        titleDivES.verticalAlign = "bottom";
        titleDivES.lineHeight = "26px";
        titleDivES.fontSize = "24px";
        titleDivES.borderBottom = "1px solid black";

        titleDivE.innerHTML = '' + title;

        divES.overflow = "hidden";
        //divES.maxWidth = "20em";
        divES.height = "calc(100% - 31px)";
        divES.display = "block";
        divES.verticalAlign = "top";
        divES.overflow = "hidden";
        divES.overflowY = "scroll";

        contentDivES.padding = "2px";
        contentDivES.margin = "2px";

        div.AddContent(contentDiv);
        containerDiv.AddContent(titleDiv, div);


        rightDiv.AddContent(containerDiv);

        return {
            div: div, divE: divE, divES: divES,
            contentDiv: contentDiv, contentDivE: contentDivE, contentDivES: contentDivES
        };
    }

    function showRouteSchedule(routeItem) {

        if (routeScheduleDiv == undefined) {
            var divs = createRightDivInfoPane("Schedule");
            routeScheduleDiv = divs.contentDiv;
            routeScheduleDivE = divs.contentDivE;
            routeScheduleDivES = divs.contentDivES;
        }

        var innerHTML = "";

        if (routeItem.services != undefined) {
            var nServices = routeItem.services.length;
            if (nServices > 0) {
                for (var iS = 0 ; iS < nServices ; ++iS) {
                    var routeService = routeItem.services[iS];
                    if (routeService.routeTrips != undefined) {
                        var nTrips = routeService.routeTrips.length;
                        if (nTrips > 0) { innerHTML += '<p>' + routeService.serviceName + ' Trips (' + nTrips + ')</p>'; }
                        for (var i = 0 ; i < nTrips ; ++i) {
                            var tripObj = routeService.routeTrips[i];
                            var tripStops = tripObj.stopTimes, nTripStops = tripStops.length;
                            //if (tripObj.tripId == "3794420") { console.log('here3'); }
                            if (nTripStops > 0) {
                                var totalMinutes = tripObj.totalMinutes;
                                innerHTML += '<p>' + tripObj.tripId + ':&nbsp;' + tripObj.dest + '<br/>(' + totalMinutes + ' minutes)</p>';
                                for (var iT = 0 ; iT < nTripStops ; ++iT) {
                                    var tripStop = tripStops[iT];
                                    if (iT > 0) { innerHTML += '<br/>'; }
                                    var minutes = tripStop.badScheduleTime ? '???' : tripStop.minutes;
                                    var stopName = minutes + '&nbsp;:&nbsp;' + tripStop.time + '&nbsp;@&nbsp;' + tripStop.stopName + '(' + tripStop.stopId + ')';
                                    if (!!tripStop.badScheduleTime) {
                                        stopName += '***<br/>';
                                    }
                                    innerHTML += stopName;
                                }
                            }
                            else {
                                innerHTML += '<p>' + tripObj.tripId + ':&nbsp;' + tripObj.dest + '</p>';
                            }
                        }
                    }
                }
            }
        }

        routeScheduleDivE.innerHTML = innerHTML;

        //rightDiv.ReplaceContent(routeScheduleDiv);
    }

    var routeStopsDiv, routeStopsDivE, routeStopsDivES;

    function showRouteStops(routeItem) {

        if (routeStopsDiv == undefined) {
            var divs = createRightDivInfoPane("Stops");
            routeStopsDiv = divs.contentDiv;
            routeStopsDivE = divs.contentDivE;
            routeStopsDivES = divs.contentDivES;
        }

        var innerHTML = "";

        var nStops = routeItem.stopItems.length;
        if (nStops > 0) { innerHTML += '<p>Bus Stops</p>'; }
        for (var i = 0 ; i < nStops ; ++i) {
            var stopObj = routeItem.stopItems[i];
            if (i > 0) { innerHTML += '<br/>'; }
            innerHTML += stopObj.Sequence + ':&nbsp;' + stopObj.StopName + ':&nbsp;(' + stopObj.StopID + ')';
        }

        routeStopsDivE.innerHTML = innerHTML;

        //rightDiv.ReplaceContent(routeStopsDiv);
    }

    function initTables() { var tables = []; createTables(tables); return tables; }

    function onAppSpecsLoaded(appSpecsSet) { appSpecs = appSpecsSet; }

    function createApplication() {
        var panels = tf.consts.panelNameNoAddress + '+' + tf.consts.panelNameNoMapLocation + '+' + tf.consts.panelNameNoUserLocation + '+' + tf.consts.panelNameTFLogo;
        var tableRowWidth = "20em";
        var appSpecs = {
            "replaceURLParams": {
                //"lat": 25.813894,
                //"lon": -80.122650,
                //"level": 15,
                "level": 12,
                "fmap": "m2",
                "panels": panels,
                "legendh": "{Cities::~Capitals:Capitals_WorldMap@wm_Capitals-120-6000;Capitals:Capitals_WorldMap@wm_Capitals-6000-15000;~Metro:Big_Cities_over_million_WorldMap@wm_Cities_Greater_900K-120-5000;Metro:Big_Cities_over_million_WorldMap@wm_Cities_Greater_900K-5000-15000;~Cities:Cities_WorldMap@wm_Cities_75K_to_900K-120-2400+wm_Cities_Greater_900K-120-2400+wm_Cities_Unknownpop-120-2400;Cities:Cities_WorldMap@wm_Cities_75K_to_900K-2400-15000+wm_Cities_Greater_900K-2400-15000+wm_Cities_Unknownpop-2400-15000;};{Hubs::~Ports:Marine_Ports_WorldMap@wm_Marine_Ports-120-360;Ports:Marine_Ports_WorldMap@wm_Marine_Ports-360-2000;~Railway:Railway_Stations_WorldMap@wm_Railway_Stations-120-240;~Airports:Airports_WorldMap@wm_Airports-120-240;};{Water::Bays:Seas_and_Bays_WorldMap@wm_Seas_Bays-120-2000;Glaciers:Glaciers_WorldMap@wm_Glacier-120-4000;~Rivers_B:Lake_and_River_contours_WorldMap@wm_Water_Poly-120-500;~Great_Lakes_L:Great_Lakes_labels_WorldMap@WM_GREAT_LAKES_NAME-120-4000;~Great_Lakes_B:Great_Lakes_contours_WorldMap@wm_Great_Lakes-120-4000;OSM-water:Lake_and_River_contours_from_Open_Street_Maps@osm_water-0-4000;};{Regions::~Admin_L:States_and_Provinces_names_labeled_WorldMap@wm_World_Admin_name-120-2000;~Admin_B:States_and_Provinces_boundaries_WorldMap@wm_World_Admin-120-2000;~Countries_L:Nation_names_labeled_WorldMap@nation_name-2000-5000;Countries_L:Nation_names_labeled_WorldMap@nation_name-5000-30000;~Countries_B:Nations_boundaries_WorldMap@wm_World_Nations-120-15000;OSM-Admin:Administrative_boundaries_from_Open_Street_Maps@osm_admin-0-60000;};{Parcels::FA-address:Addresses_from_First_American_Parcel_Data@fa_address-0-0.5;FA-owner:Property_owner_from_First_American_Parcel_Data@fa_owner-0-0.5;~lines:Property_lines,_from_First_American@fa_parcel-0-1;lines:Property_lines,_from_First_American@fa_parcel-1-2;OSM-buildings:Building_contours_from_Open_Street_Maps@osm_buildings-0-7;};{People::population:People_per_block_per_Census_2000@blk_pop-0-5;income:Aggregate_Neighborhood_Income_and_number_of_homes,_per_Census-2000@bg_mhinc-0.7-10+blkgrpy-0.7-10;};{Services::~business:Yellow_Pages@nypages-0-1.2;business:Yellow_Pages@nypages-1.2-5;food:Restaurants_from_NavTeq@nv_restrnts-0-10;doctors:Physicians_specialties@physicianspecialty-0-5;};Landmarks:Cultural_Landmarks_WorldMap@wm_Cultural_Landmarks-120-240;Utilities:Utilities_WorldMap@wm_Utilities-120-720;Environment:Hydrology@prism-0-120;~Places:Places@gnis2-0-6+hotels-0-6;Places:Places@gnis2-6-24+hotels-6-24;OSM-place-names:Place_names_labeled_from_Open_Street_Maps@osm_place_names-0-30000;{Roads::lines:Road_lines_from_NavTeq@street-0-2000;names:Road_names_labeled_from_NavTeq@street_names-0-240;~OSM-lines:Road_lines_from_Open_Street_Maps@osm_roads-0.5-7000;OSM-lines:Road_lines_from_Open_Street_Maps@osm_roads-0-0.5;~OSM-names:Road_names_labeled_from_Open_Street_Maps@osm_road_names-0-7000;~routes:Routes_WorldMap@wm_Major_Routes-120-1000+wm_Minor_Routes-120-1000;routes:Routes_WorldMap@wm_Major_Routes-1000-5000+wm_Minor_Routes-1000-5000;~railways:Railroad_WorldMap@wm_Railroad_Track-120-2000;};{Towns::~borders:Borders@incorp-0-120;~towns:Cities,_towns@wtown-0-60;};plugin_photo;",
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

            "documentTitle": "ITPA Bus Trips Editor",

            "logoBkColor": "#fff",
            "logoStyle": { "border": "1px solid #ddf" },
            "appLogoImgStr": "./images/road.svg",

            "routeTableStyle": { "backgroundColor": "#000" },

            "routeTableRowStyle": {
                "tf-shadow": [-2, -2, 4, "rgba(0,0,0,0.6)"],
                "textShadow": "1px 1px 1px #333",
                "border": "2px solid #fff",
                "backgroundColor": "rgba(255, 255, 255, 0.3)", "color": "#fff", "borderRadius": "8px", "margin": "4px", "padding": "4px", "width": tableRowWidth
            },
            "routeTableRowHoverStyle": {
                "tf-shadow": [3, 3, 6, "rgba(0,0,0,0.8)"],
                "textShadow": "2px 2px 2px #000",
                "border": "2px dotted #000",
                "backgroundColor": "rgba(255, 255, 255, 0.9)", "color": "#fff", "borderRadius": "10px", "margin": "2px", "marginTop": "4px", "marginLeft": "4px", "padding": "8px", "width": tableRowWidth
            },

            "routeTableSelectOnHover": false
        };

        settings.onCreated = onCreated;

        settings.fullURL = {};
        settings.fullURL[tf.consts.paramNameAppSpecs] = appSpecs;

        settings.onAppSpecsLoaded = onAppSpecsLoaded;
        settings.onRefresh = onRefresh;
        settings.initTables = initTables;
        settings.documentTitle = "ITPA Bus Line Editor";

        urlapiApp = new tf.urlapi.AppFromSpecs(settings);
    }

    function closeLastSchedToast() {
        if (!!schedLoadedToast) { schedLoadedToast.Close(); schedLoadedToast = undefined; }
    }

    function getOnSchedLoaded(localStorageKey, routeItem, stopItem, stopId, /*routeStopSequence,*/ indexOfService, indexOfStop, stopName) {
        return function (notification) {
            /*
               Destination:"Downtown Miami"
               SchedTime:"4:49 AM"
               TripID:"3790335"
            */


            //if (stopId == "5223") { console.log('here4'); }
            //if (routeItem.services[indexOfService].serviceId == "WEEKDAY" && stopId == "5223" && routeItem.GetData().Direction == "Eastbound") { console.log('here7'); }

            if (localStorageKey != undefined) { setCachedValue(localStorageKey, JSON.stringify(notification)); }

            var routeItemData = routeItem.GetData();

            var thisRouteId = routeItemData.RouteID;
            
            if (thisRouteId != lastRouteIdSchedLoading) {
                closeLastSchedToast();
                lastRouteIdSchedLoading = thisRouteId;
                schedLoadedToast = toaster.Toast({ text: "Loading Sched for route: " + thisRouteId, timeout: 0 });
            }

            var tripDirection = routeItemData.Direction;
            var tripServiceId = routeItem.services[indexOfService].serviceId;

            var sched;

            if (!!notification) {
                if (!!notification.Sched) {
                    sched = tf.js.GetIsArray(notification.Sched) ? notification.Sched : [notification.Sched];
                }
                //else { console.log('schedule missing'); }
            }
            else { console.log('undefined schedule result'); }

            if (!!sched) {
                var nSched = sched.length, prevMinutes;

                for (var l = 0 ; l < nSched ; ++l) {
                    var schedEntry = sched[l];
                    var dest = schedEntry.Destination;
                    var tripId = schedEntry.TripID;
                    var time = schedEntry.SchedTime;
                    var minutes = getMinutes(time, prevMinutes);
                    var badScheduleTime = false;

                    if (minutes != -1) { prevMinutes = minutes; }
                    else { badScheduleTime = true; }

                    var routeService = routeItem.services[indexOfService];
                    var tripObj = routeService.tripsById[tripId];
                    if (tripObj == undefined) {
                        tripObj = routeService.tripsById[tripId] = { tripId: tripId, dest: dest, stopTimes: [] };
                    }
                    else {
                        if (tripObj.dest != dest) {
                            console.log('trip with different dests');
                        }
                    }

                    var allTripsItem = allTrips[tripId];

                    if (allTripsItem == undefined) {
                        allTrips[tripId] = { tripId: tripId, direction: tripDirection, routeId: thisRouteId, tripServiceId: tripServiceId };
                    }
                    else {
                        if (allTripsItem.direction != tripDirection || allTripsItem.routeId != thisRouteId || allTripsItem.tripServiceId != tripServiceId) {
                            console.log('inconsistency in trip id: ' + tripId)
                        }
                    }

                    //if (routeItem.services[indexOfService].serviceId == "WEEKDAY" && stopId == "5223" && routeItem.GetData().Direction == "Eastbound") { console.log('here4'); }

                    tripObj.stopTimes.push({
                        indexInSched: l, stopId: stopId, stopItem: stopItem, minutes: minutes, time: time,
                        /*sequence: routeStopSequence, */indexOfService: indexOfService, serviceName: routeItem.services[indexOfService].serviceName,
                        stopName: stopName, badScheduleTime : badScheduleTime
                    });
                }
            }

            ++nSchedsLoaded;
            loadNextSched();
        }
    }

    function getBusSchedules(schedProps) {
        var localStorageBusScheduleKey = 'mdtBusSchedule$' + schedProps.routeId + '$' + schedProps.routeServiceId + '$' + schedProps.routeDir + '$' + schedProps.routeStopId /*+ '$' + schedProps.routeStopSequence*/;
        getCachedValue(localStorageBusScheduleKey, function (value) {
            //if (schedProps.routeServiceId == "WEEKDAY" && schedProps.routeStopId == "5223" && schedProps.routeDir == "Eastbound") { console.log('here6'); }
            //console.log(schedProps.routeServiceId + ' ' + schedProps.routeStopId + ' ' + schedProps.routeStopSequence + ' ' + schedProps.routeDir);
            var storedBusSched = value;
            if (!!storedBusSched) { getOnSchedLoaded(undefined, schedProps.routeItem, schedProps.stopItem, schedProps.routeStopId, /*schedProps.routeStopSequence, */schedProps.indexOfService, schedProps.indexOfStop, schedProps.stopName)(JSON.parse(storedBusSched)); }
            else { MDTServiceAPI.GetBusSchedules(schedProps.routeId, schedProps.routeServiceId, schedProps.routeDir, schedProps.routeStopId, undefined/*schedProps.routeStopSequence*/, getOnSchedLoaded(localStorageBusScheduleKey, schedProps.routeItem, schedProps.stopItem, schedProps.routeStopId, /*schedProps.routeStopSequence, */schedProps.indexOfService, schedProps.indexOfStop, schedProps.stopName)); }
        });
    }

    function getOnRouteStopsLoaded(item, localStorageKey) {
        return function (notification) {
            /*
                <StopID>3859</StopID>
                <StopName>SW 107 AV & #1431 (PUBLIX)</StopName>
                <Sequence>2</Sequence>
                <Latitude>25.755476</Latitude>
                <Longitude>-80.367987</Longitude>
            */
            if (localStorageKey != undefined) { setCachedValue(localStorageKey, JSON.stringify(notification)); }
            var routeStops = !!notification ? notification.Record : [];
            item.stopItems = routeStops;
            for (var i in routeStops) {
                var routeStop = routeStops[i];
                var stopId = routeStop.StopID;
                if (stopsById[stopId] == undefined) {
                    var stopData = tf.js.ShallowMerge(routeStop);
                    delete stopData.Sequence;
                    stopsById[stopId] = stopData;
                    stops.push(stopData);
                }
            }
            ++nRouteStopsLoaded;
            checkAllLoaded();
        }
    }

    function getBusRouteStops(routeId, direction, routeItem) {
        var localStorageRouteStopsKey = 'mdtBusRouteStops$' + routeId + '$' + direction;
        getCachedValue(localStorageRouteStopsKey, function (value) {
            var storedBusRouteStops = value;

            if (!!storedBusRouteStops) { getOnRouteStopsLoaded(routeItem, undefined)(JSON.parse(storedBusRouteStops)); }
            else { MDTServiceAPI.GetBusRouteStops(routeId, direction, getOnRouteStopsLoaded(routeItem, localStorageRouteStopsKey)); }
        });
    }

    function getOnBusRoutesLoaded(localStorageKey, directionsById) {
        return function (notification) {
            var localRoutes = !!notification ? notification.Record : [];

            if (localStorageKey != undefined) { setCachedValue(localStorageKey, JSON.stringify(notification)); }

            for (var i in localRoutes) {
                var localRoute = localRoutes[i];
                var localRouteDirections = directionsById[localRoute.RouteID];
                for (var j in localRouteDirections) {
                    var localRouteDirection = localRouteDirections[j];
                    var routeAndDirData = tf.js.ShallowMerge(localRoute);
                    routeAndDirData.Direction = localRouteDirection;
                    routes.push(routeAndDirData);
                }
            }

            routesKeyedList.UpdateFromNewData(routes);

            nRouteStopsLoaded = 0;
            nRouteStopsToLoad = routesKeyedList.GetItemCount();


            urlapiApp.UpdateCurTableFooter();
            var keyedItems = routesKeyedList.GetKeyedItemList();
            for (var i in keyedItems) {
                var item = keyedItems[i], d = item.GetData();
                var mdtRouteID = d.RouteID;
                if (linesByMDTRouteId[mdtRouteID] == undefined) { linesByMDTRouteId[mdtRouteID] = []; }
                linesByMDTRouteId[mdtRouteID].push({ routeItem: item, routeItemData: d });
                item.isRouteItem = true;
                item.services = [];
                item.stopItems = [];
                getBusRouteStops(mdtRouteID, d.Direction, item);
            }
            routesAreLoaded = true;
            toaster.Toast({ text: "Routes loaded..." });
            checkAllLoaded();
        }
    }

    function getOnDirectionsForRouteLoaded(localStorageKey) {
        return function (notification) {
            if (localStorageKey != undefined) { setCachedValue(localStorageKey, JSON.stringify(notification)); }

            var directions = !!notification ? notification.Record : [];
            var directionsById = {};

            for (var i in directions) {
                var direction = directions[i];
                if (directionsById[direction.RouteID] == undefined) { directionsById[direction.RouteID] = []; }
                directionsById[direction.RouteID].push(direction.Direction);
                var existingDirection = allDirections[direction.Direction];
                if (existingDirection == undefined) {
                    existingDirection = allDirections[direction.Direction] = { count: 0, route_ids: [] };
                }
                ++existingDirection.count;
                existingDirection.route_ids.push(direction.RouteID);
            }

            toaster.Toast({ text: "Route directions loaded..." });

            var localStorageMDTBusRoutesKey = "mdtBusRoutes";

            getCachedValue(localStorageMDTBusRoutesKey, function (value) {
                var storedMDTBusRoutes = value;
                if (!!storedMDTBusRoutes) { getOnBusRoutesLoaded(undefined, directionsById)(JSON.parse(storedMDTBusRoutes)); }
                else { MDTServiceAPI.GetBusRoutes(getOnBusRoutesLoaded(localStorageMDTBusRoutesKey, directionsById)); }
            });
        }
    }

    function loadRoutes() {
        deSelectLastSelected();

        var localStorageMDTRouteDirectionsKey = "mdtRouteDirections";

        stopsById = {};
        stops = [];
        routes = [];
        linesByMDTRouteId = {};
        allDirections = {}
        allTrips = {}

        getCachedValue(localStorageMDTRouteDirectionsKey, function (value) {
            var storedMDTRouteDirections = value;
            if (!!storedMDTRouteDirections) { getOnDirectionsForRouteLoaded(undefined)(JSON.parse(storedMDTRouteDirections)); }
            else { MDTServiceAPI.GetDirectionsForRouteId(undefined, getOnDirectionsForRouteLoaded(localStorageMDTRouteDirectionsKey)); }
        });
    }

    function getOnServicesLoaded(localStorageKey) {
        return function (notification) {
            services = !!notification ? notification.Record : undefined;
            servicesKeyedList.UpdateFromNewData(services);
            urlapiApp.UpdateCurTableFooter();
            var keyedItems = servicesKeyedList.GetKeyedItemList();
            for (var i in keyedItems) {
                var item = keyedItems[i];
                item.routeItems = [];
            }
            if (localStorageKey != undefined) { setCachedValue(localStorageKey, JSON.stringify(notification)); }
            servicesAreLoaded = true;
            toaster.Toast({ text: "Route Services loaded..." });
            checkAllLoaded();
        };
    }

    function loadServices() {
        var localStorageMDTServicesKey = "mdtServices";
        getCachedValue(localStorageMDTServicesKey, function (value) {
            var storedMDTServices = value;
            if (!!storedMDTServices) { getOnServicesLoaded(undefined)(JSON.parse(storedMDTServices)); }
            else { MDTServiceAPI.GetRouteServices(getOnServicesLoaded(localStorageMDTServicesKey)); }
        });
    }

    function initITPAMDTRouteIds() {
        itpaMDTRoutesIds = [7, 8, 11, 24, 34, 36, 51, 71, 95, 123, 137, 150, 200, 212, 238, 288, 297, 301, 302];
        //itpaMDTRoutesIds = [7];
        //itpaMDTRoutesIds = [11];
        //itpaMDTRoutesIds = [54];
        //itpaMDTRoutesIds = [297];
        //itpaMDTRoutesIds = [27];
        itpaMDTRouteIdMap = {}; for (var i in itpaMDTRoutesIds) { var itpaMDTRouteId = itpaMDTRoutesIds[i]; itpaMDTRouteIdMap['' + itpaMDTRouteId] = itpaMDTRouteId; }
    }

    function initApp() {
        //var getAllMDTRoutes = false;
        var getAllMDTRoutes = true;

        styles = tf.GetStyles(tf.styles.GetGraphiteAPIStyleSpecifications());
        polyCode = new tf.map.PolyCode();
        serverURL = tf.js.GetNonEmptyString(settings.serverURL, "http://192.168.0.81/api/v1/");
        MDTServiceAPI = new tf.services.MDTServiceAPI();
        initITPAMDTRouteIds();
        routesKeyedList = new tf.js.KeyedList({
            name: "routes",
            getKeyFromItemData: function (itemData) { return itemData.RouteID + '#' + itemData.Direction; },
            needsUpdateItemData: function (itemData) { return true; },
            filterAddItem: function (itemData) { return getAllMDTRoutes || itpaMDTRouteIdMap[itemData.RouteID] != undefined; }
        });
        stopsKeyedList = new tf.js.KeyedList({
            name: "stops",
            getKeyFromItemData: function (itemData) { return itemData.StopID; },
            needsUpdateItemData: function (itemData) { return true; },
            filterAddItem: function (itemData) { return true; }
        });
        servicesKeyedList = new tf.js.KeyedList({
            name: "services",
            getKeyFromItemData: function (itemData) { return itemData.ServiceID; },
            needsUpdateItemData: function (itemData) { return true; },
            filterAddItem: function (itemData) { return true; }
        });

        createApplication();
    }

    function initDB() {
        db = openDatabase('mdtTrips', '1.0', 'MDT Trips', 50 * 1024 * 1024);

        /*db.transaction(function (tx) {
            tx.executeSql("DROP TABLE KEYVALUES", [],
                function (t, results) { console.log("Table Dropped") },
                function (t, error) { console.log("Error: " + error.message) }
            );
        });*/
        
        db.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS KEYVALUES (theKey unique, theValue)', [],
                function (tx, results) {
                    console.log("Table created"); initApp();
                },
                function (tx, results) { console.log("Table created"); }
            );
        });
    }

    function initialize() {
        initDB();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
