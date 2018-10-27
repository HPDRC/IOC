"use strict";

/**
* @this {ITPA.OC.AppLayout}
*/
ITPA.OC.AppLayout = function (settings) {

    var theThis, oc, core, appStyles, topLayout, leftTopBotLayout, rightTopBotLayout, centerPanel, onResizeCallBack, appContainerSizer, panelBkColor;
    var fiuBusCounter, mdtBusCounter, stopsCounter, ETAsCounter, serviceListItem, serverServiceItem, listLayoutToolbarTab, listLayoutDiv, listIsMaximized, listTabTitleE;
    var maximizedTitle, restoredTitle, garageAddServiceName, garageList, occList;
    var routesList, stopsList, routeStopsUpdateServiceName, routeLinesUpdateServiceName, serverTimeServiceName;
    var toaster, styles;
    var busList;
    var maxHistoryAge = 1000 * 60 * 3;
    var marginPxNumber = 6;
    var showingServerStatus, showLiveVideoFeeds;
    var liveVideoFeedsButton, serverStatusButton;
    var dataGatheringDiv, serverServicesDiv, liveVideoFeedsDiv, topTabDiv;
    var liveFeeds;

    this.ToastText = function (text, expire) { return toaster.Toast({ text: text, timeout: expire }); }

    this.ToastRefreshingLines = function () { return toastRefreshingLines(); }

    this.GetListMaximized = function () { return listIsMaximized; }
    this.SetListMaximized = function (setBool) {
        if (listIsMaximized != (setBool = !!setBool)) {
            var displayStr = (listIsMaximized = setBool) ? 'none' : 'block';
            var panel = theThis.GetRightTopPanel();
            panel.GetHTMLElement().style.display = displayStr;
            listTabTitleE.title = listIsMaximized ? maximizedTitle : restoredTitle;
            //resizeLayout();
            resizeListLayout();
            if (!listIsMaximized) { if (!showingServerStatus) { if (!!liveFeeds) { liveFeeds.Play(); } } }
            else { if (!showingServerStatus) { if (!!liveFeeds) { liveFeeds.Stop(); } } }
        }
    }
    this.ToggleListMaximized = function () { theThis.SetListMaximized(!theThis.GetListMaximized()); }

    var garageCheck, oldGarageServiceCount;
    this.GetGarageCheck = function () { return garageCheck; }
    this.SetGarageCheck = function (setBool) {
        var newGarageCheck = !!garageList && !!setBool;
        if (newGarageCheck != garageCheck) { if (garageCheck = newGarageCheck) { /*oldGarageServiceCount = undefined;*/ } }
    }

    var routeStopsCheck, oldRouteStopsServiceCount;
    this.GetRouteStopsCheck = function () { return routeStopsCheck; }
    this.SetRouteStopsCheck = function (setBool) {
        var newRouteStopsCheck = (!!routesList || !!stopsList) && !!setBool;
        if (newRouteStopsCheck != routeStopsCheck) { if (routeStopsCheck = newRouteStopsCheck) { /*oldRouteStopsServiceCount = undefined;*/ } }
    }

    var routeLinesCheck, oldRouteLinesServiceCount;
    this.GetRouteLinesCheck = function () { return routeLinesCheck; }
    this.SetRouteLinesCheck = function (setBool) {
        var newRouteLinesCheck = (!!routesList) && !!setBool;
        if (newRouteLinesCheck != routeLinesCheck) { if (routeLinesCheck = newRouteLinesCheck) { /*oldRouteLinesServiceCount = undefined;*/ } }
    }

    this.GetTopLayout = function () { return topLayout; }
    this.GetListLayoutDiv = function () { return listLayoutDiv; }
    this.GetListLayoutToolbarTab = function () { return listLayoutToolbarTab; }
    this.GetOC = function () { return oc; }
    this.CheckSize = function () { return resizeLayout(); }
    this.ResizeListLayout = function () { return resizeListLayout(); }
    this.GetCenterPanel = function () { return centerPanel; }
    this.GetLeftBotPanel = function () { return leftTopBotLayout.GetBot(); }
    this.GetLeftTopPanel = function () { return leftTopBotLayout.GetTop(); }
    this.GetRightBotPanel = function () { return rightTopBotLayout.GetBot(); }
    this.GetRightTopPanel = function () { return rightTopBotLayout.GetTop(); }
    this.OnMapsCreated = function () { return onMapsCreated(); }
    this.GetAppSizer = function () { return appContainerSizer; }
    this.SetFIUBusCounter = function (count) { return updateCounter( fiuBusCounter, count); }
    this.SetMDTBusCounter = function (count) { return updateCounter(mdtBusCounter, count); }
    this.SetStopsCounter = function (count) { return updateCounter(stopsCounter, count); }
    this.SetETAsCounter = function (count) { return updateCounter(ETAsCounter, count); }
    this.UpdateServices = function (items) { return updateServices(items); }

    function setShowingServerStatus(setBool) {
        if ((setBool = !!setBool) != showingServerStatus) {
            var contentDiv = topTabDiv.contentDiv;
            if (showingServerStatus = setBool) {
                liveFeeds.Stop();
                liveVideoFeedsDiv.GetHTMLElement().style.display = 'none';
                dataGatheringDiv.GetHTMLElement().style.display = 'block';
                serverServicesDiv.GetHTMLElement().style.display = 'block';
            }
            else {
                liveVideoFeedsDiv.GetHTMLElement().style.display = 'block';
                dataGatheringDiv.GetHTMLElement().style.display = 'none';
                serverServicesDiv.GetHTMLElement().style.display = 'none';
                liveFeeds.Play();
            }
            updateTopButtons();
            resizeListLayout();
        }
    }

    var serviceSample =
[{
    "last_updated": "2016-08-20 14:19:43.0",
    "name": "FHP INC",
    "remarks": "1.93 sec i=15"
}, {
    "last_updated": "2016-08-20 14:19:49.0",
    "name": "FIU BUS|ETA|PLAT",
    "remarks": "1.09 sec b=0 e=0"
}, {
    "last_updated": "2016-08-20 14:19:05.0",
    "name": "FL511 AVGSP",
    "remarks": "128.33 sec"
}, {
    "last_updated": "2016-08-20 14:19:34.0",
    "name": "FL511 MSG",
    "remarks": "5.4 sec m=187"
}, {
    "last_updated": "2016-08-20 14:19:49.0",
    "name": "MDT BUS",
    "remarks": "1.46 sec b=54"
}, {
    "last_updated": "2016-08-20 14:19:50.0",
    "name": "MDT ETA",
    "remarks": "123.79 sec at 64 etas=78 errors=1 inactives=22"
}, {
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/user/list",
    "count": 0
}, {
    track:true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/incidents",
    "count": 798
}, /*{
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/garages/occupancy",
    "count": 25
}, */{
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/notifications/active",
    "count": 1148
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/user/access",
    "count": 0
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/garages",
    "count": 25
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/routes/c",
    "count": 0
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/buses",
    "count": 17145
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/buses/etas",
    "count": 2169
}, {
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/routes/largec",
    "count": 0
}, {
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/devices/getactivity",
    "count": 0
}, {
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/routes/large",
    "count": 0
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/routes",
    "count": 25
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/platforms",
    "count": 25
}, {
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/notifications/add",
    "count": 0
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/devices/logactivity",
    "count": 1149
}, {
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/services/list",
    "count": 859
}, {
    track: true,
    "is_service": true,
    "last_updated": "2016-08-20 14:19:50.574",
    "name": "/messages",
    "count": 419
}];

    function toastRefreshingLines() { toaster.Toast({ text: "Updating Bus Lines" }); }
    function refreshRoutesAndStops() { toaster.Toast({ text: "Updating Bus Lines and Stops" }); if (routesList) { routesList.RefreshNow(); } if (stopsList) { stopsList.RefreshNow(); } }
    function refreshGarages() { toaster.Toast({ text: "Updating Parking Sites" }); garageList.RefreshNow(); if (occList) { occList.RefreshNow(); } }
    function refreshRoutes() { if (routesList) { toastRefreshingLines(); routesList.RefreshNow(); } }

    function checkRefreshRoutesLines(serviceData) {
        if (!!routesList) {
            if (oldRouteLinesServiceCount != undefined && oldRouteLinesServiceCount < serviceData.count) { setTimeout(refreshRoutes, 500); }
            oldRouteLinesServiceCount = serviceData.count;
        }
    }

    function checkRefreshGarages(serviceData) {
        if (oldGarageServiceCount != undefined && oldGarageServiceCount < serviceData.count) { setTimeout(refreshGarages, 500); }
        oldGarageServiceCount = serviceData.count;
    }

    function checkRefreshRouteStops(serviceData) {
        if (oldRouteStopsServiceCount != undefined && oldRouteStopsServiceCount < serviceData.count) { setTimeout(refreshRoutesAndStops, 500); }
        oldRouteStopsServiceCount = serviceData.count;
    }

    function updateServices(items) {
        var timeNow = new Date(), timeServer = timeNow;

        for (var i in items) {
            var item = items[i], d = item.GetData();
            switch (d.name) {
                case serverTimeServiceName: timeServer = tf.js.GetDateFromTimeStamp(d.last_updated); break;
                case routeStopsUpdateServiceName: if (routeStopsCheck) { checkRefreshRouteStops(d); } break;
                case routeLinesUpdateServiceName: if (routeLinesCheck) { checkRefreshRoutesLines(d); } break;
                case garageAddServiceName: if (garageCheck) { checkRefreshGarages(d); } break;
                default: break;
            }
        }

        for (var i in items) {
            var item = items[i], d = item.GetData();
            var sli = serviceListItem[d.name];
            var dateTime = tf.js.GetDateFromTimeStamp(d.last_updated);

            if (!!sli) {
                var color = "#f00";
                var maxDifference = 3 * 60 * 1000;
                var difference = tf.js.GetFloatNumberInRange(timeServer - dateTime, 0, maxDifference, 0);
                var h = Math.floor(120 - (difference * 120 / maxDifference));
                var left = Math.floor(((120 - h) / 120) * 25 + 60);
                var sliCSE = sli.colorStatus.GetHTMLElement();

                setListItemColorStatusColor(sli, "hsl(" + h + ", 100%, 50%)");
                sliCSE.style.left = left + "%";
                sliCSE.title = d.last_updated + ' - ' + d.remarks;
            }
            else {
                sli = serverServiceItem[d.name];
                if (!!sli) {
                    var item = sli.listItem;
                    var counter = item.counter;
                    var color = "#000";
                    var innerHTML = '' + d.count;
                    var historyLen = sli.history.length;
                    if (historyLen > 0) {
                        var oldest = sli.history[0];
                        var countDiff = d.count - oldest.count;
                        if (countDiff < 0) { sli.history = []; }
                        else {
                            var timeDiff = dateTime - oldest.updated;
                            if (timeDiff > 0) {
                                if (historyLen > 0 && timeDiff > maxHistoryAge) { sli.history = sli.history.slice(1); }
                                var rateName = "s", rate = countDiff / (timeDiff / 1000), actualRate = rate;

                                if (sli.lastRate != undefined) {
                                    var rateRate = sli.lastRate / actualRate;
                                    if (rateRate > 1.15) { color = "#0c0"; } else if (rateRate < 0.85) { color = "#f00"; }
                                }

                                if (rate < 0.01) { rate *= 3600; rateName = "h"; } else if (rate < 0.1) { rate *= 60; rateName = "m"; }

                                var rateStr = rate != 0 ? rate.toFixed(1) + '' : '0';

                                innerHTML = rateStr + " / " + rateName + " (" + countDiff + ")";
                                sli.lastRate = actualRate;
                            }
                        }
                    }
                    sli.history.push({ count: d.count, updated: dateTime });
                    var counterE = counter.GetHTMLElement();
                    counterE.innerHTML = innerHTML;
                    counterE.style.color = color;
                }
            }
        }
    }

    function updateCounter(counter, count) { count = Math.round(tf.js.GetFloatNumber(count)); if (count != counter.count) { counter.spanE.innerHTML = '' + (counter.count = count); } }

    function resizeListLayout() {
        if (!!listLayoutDiv) {
            var winDims = tf.dom.GetWindowDims();
            var winW = winDims[0], winH = winDims[1];
            var topRight = theThis.GetRightTopPanel();
            var topRightE = topRight.GetHTMLElement();
            var botRight = theThis.GetRightBotPanel();
            var botRightE = botRight.GetHTMLElement();

            //var botH = winH - topRightE.clientHeight - marginPxNumber * 2 + 18;
            var botH = winH - topRightE.clientHeight - marginPxNumber * 2 + 12;

            if (botH < 0) { botH = 0; }

            botRightE.style.height = botH + 'px';

            var listLayoutDivE = listLayoutDiv.GetHTMLElement();
            var listLayoutDivES = listLayoutDivE.style;
            var listLayoutTabE = listLayoutToolbarTab.GetHTMLElement();

            var MAGIC_number_of_pixels = listIsMaximized ? 48 : 54;
            var listH = botH - listLayoutTabE.clientHeight - MAGIC_number_of_pixels;

            if (listH < 0) { listH = 0; }

            listLayoutDivES.height = listH + 'px';

            //console.log(winH);
            //console.log(topRightE.clientHeight);
            //console.log(botRightE.clientHeight);
            //console.log(listH);
        }
    }

    function resizeLayout() {
        if (!!topLayout) {
            var winDims = tf.dom.GetWindowDims();
            var winW = winDims[0], winH = winDims[1];
            var winWpx = winW + "px";
            var winHpx = winH + "px";
            var layoutContainerStyle = topLayout.GetHTMLElement().style;
            layoutContainerStyle.maxWidth = layoutContainerStyle.width = winWpx;
            layoutContainerStyle.maxHeight = layoutContainerStyle.height = winHpx;
            resizeListLayout();
            if (!!onResizeCallBack) { onResizeCallBack(theThis); }
        }
    }

    function createTopLayout() {
        topLayout = new tf.layout.LeftMidRight ();
        var containerDiv = topLayout.GetHTMLElement();
        var left = topLayout.GetLeft();
        var right = topLayout.GetRight();
        var mid = topLayout.GetMid();
        var leftStyle = left.GetHTMLElement().style, rightStyle = right.GetHTMLElement().style, midStyle = mid.GetHTMLElement().style;

        containerDiv.style.zIndex = '10';
        containerDiv.style.font = "font-family: Roboto Condensed;";

        centerPanel = new tf.dom.Div();

        var centerPanelStyle = centerPanel.GetHTMLElement().style;
        var marginPx = marginPxNumber + "px";
        var marginPx2 = (marginPxNumber * 2) + "px";

        var leftWidth = "500px";
        var rightWidth = "396px"; // also change ioc.css .floatEditorWrapper right margin

        centerPanelStyle.marginTop = centerPanelStyle.marginBottom = marginPx;
        centerPanelStyle.backgroundColor = panelBkColor;
        centerPanelStyle.height = 'calc(100% - ' + marginPx2 + ')';
        centerPanelStyle.position = 'relative';
        //centerPanelStyle.height = '100%';

        containerDiv.style.backgroundColor = panelBkColor;

        leftStyle.backgroundColor = panelBkColor;
        leftStyle.width = leftWidth;

        midStyle.backgroundColor = panelBkColor;

        rightStyle.width = rightWidth;
        rightStyle.backgroundColor = panelBkColor;

        mid.AddContent(centerPanel);

        topLayout.AppendTo(document.body);
    }

    function createTopBotLayout(heightTop, bkgTop, bkgBot) {
        var topBotLayout = new tf.layout.TopBot();
        var top = topBotLayout.GetTop();
        var bot = topBotLayout.GetBot();
        var topStyle = top.GetHTMLElement().style, botStyle = bot.GetHTMLElement().style;
        var marginPx = marginPxNumber + "px";
        var marginPx3 = (marginPxNumber * 3) + "px";

        botStyle.overflow = topStyle.overflow = "hidden";

        //topStyle.borderRadius = botStyle.borderRadius = "10px";
        topStyle.backgroundColor = bkgTop;
        topStyle.margin = botStyle.margin = marginPx;
        if (heightTop == "auto") {
            //botStyle.height = "auto";
            //botStyle.display = "table-row";
            //botStyle.verticalAlign = "bottom";
            //botStyle.height = "1px";
        }
        else {
            topStyle.height = heightTop;
            botStyle.height = 'calc(100% - ' + heightTop + ' - ' + marginPx3 + ')';
        }
        botStyle.backgroundColor = bkgBot;

        return topBotLayout;
    }

    function createLeftRightSubLayouts() {
        topLayout.GetLeft().AddContent(leftTopBotLayout = createTopBotLayout("186px", panelBkColor, panelBkColor));
        topLayout.GetRight().AddContent(rightTopBotLayout = createTopBotLayout("auto", panelBkColor, panelBkColor));
        /*var smallMapLayout = theThis.GetLeftBotPanel();
        var smallMapLayoutES = smallMapLayout.GetHTMLElement().style;
        smallMapLayoutES.borderRadius = "6px";
        smallMapLayoutES.overflow = "hidden";*/
    }

    function createOpCenterTopDiv() {
        return new tf.dom.Div({ cssClass: "oc-top-div" });
    }

    function createOpCenterStatus() {
        var statusDiv = new tf.dom.Div({cssClass:"oc-status-div"});
        var titleTextWrapperDiv = new tf.dom.Div({cssClass: "oc-title-text-wrapper-div"});
        var ocBarImg = new tf.dom.Img({ cssClass: "oc-bar-img", src: "images/OpCenterBar.png" });
        var ocBarCornerImg = new tf.dom.Img({ cssClass: "oc-bar-corner-img", src: "images/OpCenterCorner.png" });
        var itpaTitle = new tf.dom.Div({cssClass: "oc-itpa-title"});
        var ocTitle = new tf.dom.Div({cssClass:"oc-ioc-title"});
        var progDiv = new tf.dom.Div({ cssClass: "oc-progress-div" });
        var progTitle = new tf.dom.Div({ cssClass: "oc-progress-title" });
        var progress = document.createElement('progress');

        progress.className = "oc-progress-bar";
        progress.value = "50";
        progress.max = "100";

        itpaTitle.GetHTMLElement().innerHTML = "ITPA";
        ocTitle.GetHTMLElement().innerHTML = "INTERACTIVE<br/>OPERATIONS<br/>CENTER";
        progTitle.GetHTMLElement().innerHTML = "CONTINUOUSLY UPDATED";

        progDiv.AddContent(progTitle, progress);
        titleTextWrapperDiv.AddContent(itpaTitle, ocTitle);
        statusDiv.AddContent(ocBarImg, ocBarCornerImg, titleTextWrapperDiv, progDiv);
        return statusDiv;
    }

    function createCounterBox(contentStyle, footerStyle, footerImage, footerText) {
        var box = new tf.dom.Div({ cssClass: "counter-box" });
        var boxContent = new tf.dom.Div({ cssClass: "counter-box-content" }), boxContentE = boxContent.GetHTMLElement();
        var boxFooter = new tf.dom.Div({ cssClass: "counter-box-footer" }), boxFooterE = boxFooter.GetHTMLElement();
        var boxFooterImg = new tf.dom.Img({ src: footerImage });
        var boxFooterSpan = document.createElement('span');

        boxContentE.style = contentStyle;
        boxFooterE.style = footerStyle;

        boxContentE.innerHTML = "0";
        boxFooterSpan.innerHTML = footerText;

        boxFooter.AddContent(boxFooterImg, boxFooterSpan);

        box.AddContent(boxContent, boxFooter);
        return { box: box, spanE: boxContentE, count: 0 };
    }

    function createOcCenterCountersDiv() {
        var topDiv = new tf.dom.Div({ cssClass: "oc-counter-top-div" });
        var countersDiv = new tf.dom.Div({ cssClass: "oc-counter-counters-div" });
    
        fiuBusCounter = createCounterBox("", "background: rgb(0, 68, 153); color: white;", "images/busWhitish.svg", "FIU");
        mdtBusCounter = createCounterBox("color: #646464;", "background: #646464; color: #fff;", "images/busWhitish.svg", "MDT");
        stopsCounter = createCounterBox("color: #997a00;", "background: #997a00; color: #fff;", "images/stopWhitish2.svg", "Stops");
        ETAsCounter = createCounterBox("color: #997a00;", "background: #997a00; color: #fff;", "images/recent.svg", "ETAs");

        countersDiv.AddContent(fiuBusCounter.box, mdtBusCounter.box, stopsCounter.box, ETAsCounter.box);
        topDiv.AddContent(countersDiv);
        return topDiv;
    }

    function createOpCenterLayout() {
        var parentLayout = theThis.GetLeftTopPanel();
        var topDiv = createOpCenterTopDiv();
        var statusDiv = createOpCenterStatus();
        var countersDiv = createOcCenterCountersDiv();
        topDiv.AddContent(statusDiv, countersDiv);
        parentLayout.AddContent(topDiv);
    }

    function createListItem(title, isLast) {
        var listItemRowWrapper = new tf.dom.Div({ cssClass: isLast ? "list-item-row-wrapper-last" : "list-item-row-wrapper" });
        var listItemRow = new tf.dom.Div({ cssClass: "list-item-row" });
        var listItemTitle = new tf.dom.Div({ cssClass: "list-item-title" });
        listItemTitle.GetHTMLElement().innerHTML = title;
        listItemRow.AddContent(listItemTitle);
        listItemRowWrapper.AddContent(listItemRow);
        return { wrapper: listItemRowWrapper, row: listItemRow };
    }

    function setListItemColorStatusColor(listItem, color) {
        listItem.colorStatus.GetHTMLElement().style.backgroundColor = color;
    }

    function createColorStatus(parentDiv) {
        var colorStatusDiv = new tf.dom.Div({ cssClass: "color-status-div" });
        var colorStatusWrapperDiv = new tf.dom.Div({ cssClass: "color-status-wrapper-div" });
        colorStatusWrapperDiv.AddContent(colorStatusDiv);
        parentDiv.AddContent(colorStatusWrapperDiv);
        return colorStatusDiv;
    }

    function createListItemWithColorStatus(title, isLast) {
        var listItem = createListItem(title, isLast);
        listItem.colorStatus = createColorStatus(listItem.row);
        return listItem;
    }

    function createCounter(parentDiv) {
        var statusDiv = new tf.dom.Div({ cssClass: "counter-status-div" });
        var statusDivWrapper = new tf.dom.Div({ cssClass: "counter-status-wrapper-div" });
        statusDivWrapper.AddContent(statusDiv);
        parentDiv.AddContent(statusDivWrapper);
        return statusDiv;
    }

    function createListItemWithCounter(title, isLast) {
        var listItem = createListItem(title, isLast);
        listItem.counter = createCounter(listItem.row);
        return listItem;
    }

    function createListDivTabHeader(title, imgSrc) {
        var listTabHeader = new tf.dom.Div({ cssClass: "list-tab-header" });
        var listBarImg = new tf.dom.Img({ cssClass: "oc-bar-img", src: "images/OpCenterBar.png" });
        var listBarCornerImg = new tf.dom.Img({ cssClass: "oc-bar-corner-img", src: "images/OpCenterCorner.png" });
        var listIcon = new tf.dom.Img({ cssClass: "list-icon-img", src: imgSrc });
        var listTitle = new tf.dom.Div({ cssClass: "list-title" });
        listTitle.GetHTMLElement().innerHTML = title;
        listTabHeader.AddContent(listBarImg, listBarCornerImg, listIcon, listTitle);
        return { tabHeader: listTabHeader, tabTitle: listTitle };
    }

    function createListDiv(title, imgSrc) {
        var listDivWrapper = new tf.dom.Div({ cssClass: "list-div-wrapper" });
        var listDiv = new tf.dom.Div({ cssClass: "list-div" });
        var listItemsDiv = new tf.dom.Div({ cssClass: "list-items-div" });
        var listTabHeader = createListDivTabHeader(title, imgSrc);

        listDiv.AddContent(listTabHeader.tabHeader, listItemsDiv);
        listDivWrapper.AddContent(listDiv);

        return { wrapper: listDivWrapper, items: listItemsDiv, tabHeader: listTabHeader.tabHeader, tabTitle: listTabHeader.tabTitle };
    }

    function createDataGatheringDiv() {
        var listDivWrapper = createListDiv("Data gathering", "images/reload.svg");
        var items = listDivWrapper.items;

        serviceListItem = {};

        serviceListItem["FIU BUS|ETA|PLAT"] = createListItemWithColorStatus("fiu buses&etas");
        serviceListItem["MDT BUS"] = createListItemWithColorStatus("mdt buses");
        serviceListItem["MDT ETA"] = createListItemWithColorStatus("mdt etas");
        serviceListItem["FHP INC"] = createListItemWithColorStatus("fhp incidents");
        serviceListItem["FL511 MSG"] = createListItemWithColorStatus("fl511 messages", true);

        for (var i in serviceListItem) { items.AddContent(serviceListItem[i].wrapper); }

        return listDivWrapper.wrapper;
    }

    function createServerServicesDiv() {
        var listDivWrapper = createListDiv("Server activity", "images/reload.svg");
        var items = listDivWrapper.items;

        serverServiceItem = {};
        var serviceNames = [];
        for (var i in serviceSample) { var ss = serviceSample[i]; if (ss.track) { serviceNames.push(ss.name); } }
        serviceNames.sort();
        var snLen = serviceNames.length, last = snLen - 1;
        for (var i = 0 ; i < snLen ; ++i) {
            var sn = serviceNames[i];
            var item = { listItem: createListItemWithCounter(sn, i == last), history: [] };
            serverServiceItem[sn] = item;
        }

        for (var i in serverServiceItem) { items.AddContent(serverServiceItem[i].listItem.wrapper); }

        listDivWrapper.wrapper.GetHTMLElement().style.paddingBottom = "0px";

        return listDivWrapper.wrapper;
    }

    function showVideoArchiveApp() {
        //var videoArchiveURL = "http://131.94.133.214";
        var videoArchiveURL = "http://utma-video.cs.fiu.edu";
        var videoArchiveAppWindow = window.open(videoArchiveURL + "/mvideo/", "_blank");
        if (!!videoArchiveAppWindow) { videoArchiveAppWindow.focus(); }
    }

    function createLiveVideoFeedsDiv() {
        var topTabDiv = new tf.dom.Div(), topTabDivE = topTabDiv.GetHTMLElement(), topTabDivES = topTabDivE.style;
        topTabDivES.display = 'block';
        topTabDivES.width = "100%";
        topTabDivES.height = "400px";
        topTabDivES.position = "relative";
        //topTabDivES.backgroundColor = "red";
        return topTabDiv;
    }

    function createTopTabDiv() {
        var topTabDiv = new tf.dom.Div({ cssClass: 'topTabDiv' });
        var tabsDiv = new tf.dom.Div({ cssClass: 'topTabsDiv' });
        var contentDiv = new tf.dom.Div({ cssClass: 'topContentDiv' });
        var buttonDim = "1.4rem";
        
        serverStatusButton = new tf.ui.TextBtn({
            style: showingServerStatus, label: "Server Status", dim: buttonDim, tooltip: "View server status", onClick: function (notification) {
                setShowingServerStatus(true);
            }
        });
        liveVideoFeedsButton = new tf.ui.TextBtn({
            style: !showingServerStatus, label: "Live Feeds", dim: buttonDim, tooltip: "View live video feeds", onClick: function (notification) {
                setShowingServerStatus(false);
            }
        });
        var historyVideosButton = new tf.ui.TextBtn({
            style: false, label: "Archived", dim: buttonDim, tooltip: "View archived bus feeds", onClick: function (notification) {
                showVideoArchiveApp();
            }
        });

        tabsDiv.GetHTMLElement().style.textAlign = "center";

        tabsDiv.AddContent(
            styles.AddButtonDivMargins(liveVideoFeedsButton),
            styles.AddButtonDivMargins(historyVideosButton),
            styles.AddButtonDivMargins(serverStatusButton));
        topTabDiv.AddContent(tabsDiv, contentDiv);

        return { topTabDiv: topTabDiv, contentDiv: contentDiv };
    }

    function updateTopButtons() {
        serverStatusButton.SetStyle(showingServerStatus);
        liveVideoFeedsButton.SetStyle(!showingServerStatus);
        serverStatusButton.ChangeToolTip(showingServerStatus ? 'Displaying Server Status' : 'Click to Display Server Status');
        liveVideoFeedsButton.ChangeToolTip(showingServerStatus ? 'Click to Display Live Video Feeds' : 'Displaying Live Video Feeds');
    }

    function createServicesLayout() {
        var parentLayout = theThis.GetRightTopPanel();

        dataGatheringDiv = createDataGatheringDiv();
        serverServicesDiv = createServerServicesDiv();

        if (showLiveVideoFeeds) {
            liveFeeds = new ITPA.OC.LiveFeeds({ oc: settings.oc });
            liveVideoFeedsDiv = createLiveVideoFeedsDiv();
            liveVideoFeedsDiv.AddContent(liveFeeds.GetTopDiv());
            topTabDiv = createTopTabDiv();
            parentLayout.AddContent(topTabDiv.topTabDiv);
            parentLayout.AddContent(dataGatheringDiv, serverServicesDiv, liveVideoFeedsDiv);
            setShowingServerStatus(false);
        }
        else {
            parentLayout.AddContent(dataGatheringDiv, serverServicesDiv);
        }
    }

    function createToolBarListDiv() {
        var listDivWrapper = new tf.dom.Div({ cssClass: "list-div-wrapper" });
        var listDiv = new tf.dom.Div({ cssClass: "list-div" });
        var listTabHeader = createListDivTabHeader("ITPA Assets", "images/reload.svg");
        var listToolbarTab = new tf.dom.Div({ cssClass: "list-tab-header" });
        var listItemsDiv = new tf.dom.Div({ cssClass: "list-items-div" });

        var tabTitle = listTabHeader.tabTitle;

        listDiv.AddContent(listTabHeader.tabHeader, listToolbarTab, listItemsDiv);
        listDivWrapper.AddContent(listDiv);

        tf.dom.AddCSSClass(tabTitle, "list-item-title-select");

        listTabTitleE = tabTitle.GetHTMLElement();
        listTabTitleE.style.cursor = 'pointer';
        listTabTitleE.addEventListener('click', function (event) { theThis.ToggleListMaximized(); return false; });
        listTabTitleE.title = restoredTitle;

        return { wrapper: listDivWrapper, items: listItemsDiv, toolbarTab: listToolbarTab, tabHeader: listTabHeader.tabHeader, tabTitle: tabTitle };
    }

    function createItemsListLayout() {
        var listDivWrapper = createToolBarListDiv();

        listLayoutDiv = listDivWrapper.items;
        listLayoutToolbarTab = listDivWrapper.toolbarTab;

        var listLayoutDivE = listLayoutDiv.GetHTMLElement();
        var listLayoutDivES = listLayoutDivE.style;

        //listLayoutDivES.overflowY = "scroll";
        listLayoutDivES.marginTop = "6px";
        listLayoutDivES.marginLeft = listLayoutDivES.marginRight = "0px";

        return listDivWrapper.wrapper;
    }

    function createListLayout() {
        var parentLayout = theThis.GetRightBotPanel();
        var itemsListLayout = createItemsListLayout();
        parentLayout.AddContent(itemsListLayout);
    }

    function createLayouts() {
        createTopLayout();
        createLeftRightSubLayouts();
        createOpCenterLayout();
        createServicesLayout();
        createListLayout();
        resizeLayout();
    }

    function onLinesListRefresh(notification) {
        if (!!busList) { busList.SetForceUpdate(); busList.RefreshNow(); }
    }

    function onMapsCreated() {
        var maps = oc.GetMaps();
        core = oc.GetCore();
        if (!!liveFeeds) {
            liveFeeds.Start({ core: core });
        }
        garageList = core.GetGarageList();
        occList = core.GetOccupancyList();
        routesList = core.GetRouteList();
        stopsList = core.GetPlatformList();
        busList = core.GetBusList();
        garageCheck = !!garageList && !!occList;
        routeStopsCheck = !!routesList || !!stopsList;
        routeLinesCheck = !!routesList;
        if (routesList) { routesList.AddPreRefreshListener(onLinesListRefresh); }

        serverTimeServiceName = 'time';
        garageAddServiceName = "/garages/add";
        routeStopsUpdateServiceName = "/routes/updatestops";
        routeLinesUpdateServiceName = "/routes/updatelines";

        appContainerSizer.AddMap(maps.GetSmallMap());
        appContainerSizer.AddMap(maps.GetLargeMap());
        resizeLayout();
    }

    function initialize() {
        //showLiveVideoFeeds = !!settings.showLiveVideoFeeds;
        if (showLiveVideoFeeds = !!settings.showLiveVideoFeeds) {
            /*tf.dom.AddScript("./js/jquery-1.9.1.min.js", function () {
                tf.dom.AddScript("./js/jwplayer.js", function () {
                    //console.log('player scripts are loaded');
                });
            });*/
        }
        showingServerStatus = undefined;
        maximizedTitle = 'Click to Restore';
        restoredTitle = 'Click to Maximize';
        oc = settings.oc;
        appStyles = oc.GetAppStyles();
        styles = appStyles.TFStyles;
        styles.AddBodyStyle();
        panelBkColor = appStyles.PanelBkColor;
        onResizeCallBack = tf.js.GetFunctionOrNull(settings.onResize);
        listIsMaximized = false;
        createLayouts();
        appContainerSizer = new tf.layout.AppContainerSizer({
            app: oc, documentTitle: appStyles.DocumentTitle, onResize: resizeLayout, container: topLayout, fitContainerToWindow: true
        });

        //var toasterStyle = { zIndex: 20, position: "absolute", left: "6px", top: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)" };
        //toaster = new tf.ui.Toaster({ container: centerPanel, timeout: 2000, className: "tableToastStyle", style: toasterStyle });

        var toasterStyle = { zIndex: 20, position: "absolute", left: "0px", top: "0px" };
        toaster = new tf.ui.Toaster({
            container: centerPanel, timeout: 2000, className: "", style: toasterStyle, toastClassName: "tableToastStyle", toastStyle: {
                display: "block", margin: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)"
            }, addBefore: true
        });
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
