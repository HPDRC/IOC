"use strict";

ITPA.OC.TripsEd = function (settings) {
    var theThis, styles, urlapiApp, appSpecs;
    var polyCode;
    var singleAppHCFOnTheSide, singleAppMapContentOnTheSide, twoHorPaneLayout, HCFLayout, dLayers, appSizer, map;
    var routesKeyedList, routeTable, stopsKeyedList, stopsTable, servicesKeyedList, servicesTable;
    var serverURL;
    var routes, routesAreLoaded, stops, stopsAreLoaded, services, servicesAreLoaded;
    var lastSelectedRoute;
    var MDTServiceAPI;
    var linesByMDTRouteId;

    function deSelectLastSelected() {
        if (!!lastSelectedRoute) {
            lastSelectedRoute = undefined;
            routeTable.GetTable().UnselectRow();
            stopsTable.GetTable().UnselectRow();
            servicesTable.GetTable().UnselectRow();
        }
    }

    function onRefresh() {
        linesByMDTRouteId = {};
        routesAreLoaded = stopsAreLoaded = servicesAreLoaded = false;
        loadRoutes();
        loadStops();
        loadServices();
    }

    function checkAllLoaded() {
        if (routesAreLoaded && stopsAreLoaded && servicesAreLoaded) {
            for (var i in services) {
                var service = services[i];
                var serviceRoute = service.RouteID;
                if (linesByMDTRouteId[serviceRoute] != undefined) {
                    var serviceItem = servicesKeyedList.GetItem(service.ServiceID);
                    for (var j in linesByMDTRouteId[serviceRoute]) {
                        var lineObj = linesByMDTRouteId[serviceRoute][j];
                        lineObj.lineItem.services.push({ serviceItem: serviceItem, serviceName: service.ServiceName })
                        serviceItem.lines.push({ lineItem: lineObj.lineItem });
                    }
                }
            }

            var stopsCount = stopsKeyedList.GetItemCount();
            var linesCount = routesKeyedList.GetItemCount();
            if (stopsCount > 0 && linesCount > 0) {
                var lineItems = routesKeyedList.GetKeyedItemList();
                var stopItems = stopsKeyedList.GetKeyedItemList();
                var lineCount = 0;

                for (var i in stopItems) {
                    var item = stopItems[i];
                    item.nLines = 0;
                    item.lines = {};
                }

                for (var i in lineItems) {
                    var lineItem = lineItems[i], lineData = lineItem.GetData(), lineProperties = lineData, platformIds = lineProperties.platform_ids, line_id = lineProperties.line_id;
                    lineItem.lineIndex = lineCount++;
                    var lineKey = lineItem.GetKey();
                    var nplats = !!platformIds ? platformIds.length : 0;
                    for (var j = 0 ; j < nplats ; ++j) {
                        var platId = platformIds[j];
                        var platItem = stopsKeyedList.GetItem(platId);
                        if (!!platItem) {
                            var p = platItem.GetData().properties;
                            if (platItem.lines[lineKey] == undefined) {
                                lineItem.stopItems.push({ stopItem: platItem, mdtStopId: p.fleet_id });
                                platItem.lines[lineKey] = { lineItem: lineItem, index: j };
                                ++platItem.nLines;
                            }
                            else {
                                if (platItem.lines[lineKey].index == 0 && j == nplats - 1) {
                                    //console.log('LINKING STOPS AND LINES: platform ' + platId + ' is LOOP begin/end for ' + lineKey);
                                    platItem.isLoop = true;
                                } else { console.log('LINKING STOPS AND LINES: platform ' + platId + ' added twice to line ' + lineKey); }
                            }
                        } else { console.log('LINKING STOPS AND LINES: line ' + i + ' is missing platform [' + j + '] = id = ' + platId); }
                    }
                }
            }

            routesKeyedList.NotifyItemsUpdated();
            servicesKeyedList.NotifyItemsUpdated();
            stopsKeyedList.NotifyItemsUpdated();
        }
    }

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

                divAllWrapper.AddContent(divLineWrapper);
                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
            }

            var title = 'Name: ' + p.ServiceName + '<br/>' + 'Id: ' + p.ServiceID + '<br/>' + 'Order: ' + p.ServiceOrder;
            keyedItem.title = title;
            for (var i in keyedItem.lines) {
                var lineItem = keyedItem.lines[i].lineItem, d = lineItem.GetData(), p = d;
                var lineName = p.fleet.toUpperCase() + ' ' + p.fleet_id + ' - ' + p.identifier + ' (' + p.direction + ')';
                title += '<br/>' + lineName;
            }
            keyedItem.divLineWrapperE.innerHTML = title;
            //keyedItem.divAllWrapperE.style.backgroundColor = keyedItem.divLineWrapperE.style.backgroundColor = p.color;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    }

    function getStopRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var p = data.properties;

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

            var title = p.fleet.toUpperCase() + ' ' + p.fleet_id;
            keyedItem.title = title;
            keyedItem.divLineWrapperE.innerHTML = title;
            //keyedItem.divAllWrapperE.style.backgroundColor = keyedItem.divLineWrapperE.style.backgroundColor = p.color;
            keyedItem.divLineWrapperE.title = title;
        }

        return { sender: theThis, content: content };
    }

    function getRouteRowContent(notification) {
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

                divAllWrapper.AddContent(divLineWrapper);
                content.AddContent(divAllWrapper);

                keyedItem.divAllWrapperE = divAllWrapperE;
                keyedItem.divLineWrapperE = divLineWrapperE;
                keyedItem.divStopsWrapperE = divStopsWrapperE;
            }

            var title = p.fleet.toUpperCase() + ' ' + p.fleet_id + ' - ' + p.identifier + ' (' + p.direction + ')';
            keyedItem.title = title;
            for (var i in keyedItem.services) {
                var serviceObj = keyedItem.services[i];
                var serviceName = serviceObj.serviceName;
                title += '<br/>' + serviceName;
            }
            if (keyedItem.stopItems != undefined) {
                var stopsStr = '';
                var nStops = keyedItem.stopItems.length;
                if (nStops > 0) {
                    stopsStr += '<br/>';
                }
                for (var i = 0 ; i < nStops ; ++i) {
                    var stopObj = keyedItem.stopItems[i];
                    var mdtStopId = stopObj.mdtStopId;
                    if (i > 0) { stopsStr += ','; }
                    stopsStr += mdtStopId;
                }
                keyedItem.divStopsWrapperE.innerHTML = stopsStr;
            }
            keyedItem.divLineWrapperE.innerHTML = title;
            keyedItem.divAllWrapperE.style.backgroundColor = keyedItem.divLineWrapperE.style.backgroundColor = p.color;
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
        var fleetA = a.fleet;
        var fleetB = b.fleet;
        if (fleetA != fleetB) { return fleetA < fleetB ? -1 : 1; }
        var fleetIdA = parseInt(a.fleet_id, 10);
        var fleetIdB = parseInt(b.fleet_id, 10);
        return fleetIdA - fleetIdB;
    }

    function createTables(tables) {
        var tableSettings = tf.js.ShallowMerge(appSpecs.routeTableStyle, { selectOnHover: appSpecs.routeTableSelectOnHover, onSelect: onRouteRowSelect });
        routeTable = createTable(tables, routesKeyedList, tableSettings, { style: appSpecs.routeTableRowStyle, selectedStyle: appSpecs.routeTableRowHoverStyle }, getRouteRowContent, 0, "Bus Lines");
        stopsTable = createTable(tables, stopsKeyedList, tableSettings, { style: appSpecs.routeTableRowStyle, selectedStyle: appSpecs.routeTableRowHoverStyle }, getStopRowContent, 0, "Bus Stops");
        servicesTable = createTable(tables, servicesKeyedList, tableSettings, { style: appSpecs.routeTableRowStyle, selectedStyle: appSpecs.routeTableRowHoverStyle }, getServiceRowContent, 0, "Bus Line Services");
        routeTable.SetSort(compareRoutes);
    }

    function onRouteRowSelect(notification) {
        if (!!notification.isClick) {
            if (!!notification.selected) {
                var selItem = notification.selected.GetKeyedItem();
                if (selItem != lastSelectedRoute) {
                    var d = selItem.GetData();
                    lastSelectedRoute = selItem;
                }
            }
        }
        return true;
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

    function loadRoutes() {
        deSelectLastSelected();
        var url = serverURL + 'routes/allshapes';
        new tf.ajax.JSONGet().Request(url, function (notification) {
            var data = !!notification ? notification.data : undefined;
            if (!!data) {
                for (var i in data) {
                    var d = data[i];
                    d.geometry = polyCode.ToGeoJSONMultiLineString(tf.js.JSONParse(d.shape_sm_c), 7);
                    d.largeGeometry = polyCode.ToGeoJSONMultiLineString(tf.js.JSONParse(d.shape_c), 7);
                }
            }
            routes = data;
            routesKeyedList.UpdateFromNewData(routes);
            urlapiApp.UpdateCurTableFooter();
            var keyedItems = routesKeyedList.GetKeyedItemList();
            for (var i in keyedItems) {
                var item = keyedItems[i], d = item.GetData();
                var mdtRouteID = d.fleet_id;
                if (linesByMDTRouteId[mdtRouteID] == undefined) { linesByMDTRouteId[mdtRouteID] = []; }
                linesByMDTRouteId[mdtRouteID].push({ lineItem: item, lineItemData: d });
                item.services = [];
                item.stopItems = [];
            }
            routesAreLoaded = true;
            checkAllLoaded();
        }, undefined, undefined, false, undefined, undefined, undefined);
    }

    function loadStops() {
        deSelectLastSelected();
        var url = serverURL + 'platforms';
        new tf.ajax.JSONGet().Request(url, function (notification) {
            var data = !!notification ? notification.data.features : undefined;
            stops = data;
            stopsKeyedList.UpdateFromNewData(stops);
            urlapiApp.UpdateCurTableFooter();
            stopsAreLoaded = true;
            checkAllLoaded();
        }, undefined, undefined, false, undefined, undefined, undefined);
    }

    function loadServices() {
        MDTServiceAPI.GetRouteServices(function (notification) {
            services = !!notification ? notification.Record : undefined;
            servicesKeyedList.UpdateFromNewData(services);
            urlapiApp.UpdateCurTableFooter();
            var keyedItems = servicesKeyedList.GetKeyedItemList();
            for (var i in keyedItems) {
                var item = keyedItems[i];
                item.lines = [];
            }
            servicesAreLoaded = true;
            checkAllLoaded();
        });
    }

    function initialize() {
        styles = tf.GetStyles(tf.styles.GetGraphiteAPIStyleSpecifications());
        polyCode = new tf.map.PolyCode();
        serverURL = tf.js.GetNonEmptyString(settings.serverURL, "http://192.168.0.81/api/v1/");
        MDTServiceAPI = new ITPA.OC.MDTServiceAPI();
        routesKeyedList = new tf.js.KeyedList({
            name: "routes",
            getKeyFromItemData: function (itemData) { return itemData.line_id; },
            needsUpdateItemData: function (itemData) { return true; },
            filterAddItem: function (itemData) { return itemData.fleet.toLowerCase() == 'mdt'; }
        });
        stopsKeyedList = new tf.js.KeyedList({
            name: "stops",
            getKeyFromItemData: function (itemData) { return itemData.properties.platform_id; },
            needsUpdateItemData: function (itemData) { return true; },
            filterAddItem: function (itemData) { return itemData.properties.fleet.toLowerCase() == 'mdt'; }
        });
        servicesKeyedList = new tf.js.KeyedList({
            name: "services",
            getKeyFromItemData: function (itemData) { return itemData.ServiceID; },
            needsUpdateItemData: function (itemData) { return true; },
            filterAddItem: function (itemData) { return true; }
        });

        createApplication();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
