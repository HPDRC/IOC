"use strict";

ITPA.OC.ExtLineShapeLoader = function (settings) {
    var theThis, itpaLineKeyedList, shapesKeyedList, isRefreshing, onRefreshCB;
    var itpaLargeRouteServiceURL;
    var MDTServiceAPI, fiuLinesAreLoaded;
    var mdtShapeCoordinatesByShapeId, nMDTShapes;
    var fiuShapeCoordinatesByShapeId, nFIUShapes;
    var newLineItems;
    var errorLoadingFIU, errorLoadingMDT;
    var polyCode, itpaEncodePrecision;
    var fiuRoutesByRouteId, nFIURoutes;

    this.Refresh = function () { return refresh(); }
    this.GetIsRefreshing = function () { return isRefreshing; }

    this.GetHasErrors = function () { return theThis.GetHasFIUErrors() || theThis.GetHasMDTErrors(); }
    this.GetHasFIUErrors = function () { return errorLoadingFIU; }
    this.GetHasMDTErrors = function () { return errorLoadingMDT; }

    this.GetShapesForITPALineItem = function (ITPALineItem) { return getShapesForITPALineItem(ITPALineItem); }

    this.GetFIULineByFleetId = function (fleetId) { return fiuRoutesByRouteId[tf.js.MakeObjectKey(fleetId)]; }

    this.GetMDTShapeById = function (shapeId) { return getMDTShapeByID(shapeId); }
    this.GetFIUShapeById = function (shapeId) { return getFIUShapeByID(shapeId); }

    function setShapeByID(isFIUBool, shapeId, value) {
        var collection = isFIUBool ? fiuShapeCoordinatesByShapeId : mdtShapeCoordinatesByShapeId;
        var key = tf.js.MakeObjectKey(shapeId);
        var item = { coordinates: value, shape: polyCode.EncodeLineString(polyCode.Flipped(value), itpaEncodePrecision) };
        collection[key] = item;
    }

    function getShapeByID(isFIUBool, shapeId) {
        var collection = isFIUBool ? fiuShapeCoordinatesByShapeId : mdtShapeCoordinatesByShapeId;
        var key = tf.js.MakeObjectKey(shapeId);
        return collection[key];
    }

    function getFIUShapeByID(shapeId) { return getShapeByID(true, shapeId); }
    function setFIUShapeByID(shapeId, value) { return setShapeByID(true, shapeId, value); }

    function getMDTShapeByID(shapeId) { return getShapeByID(false, shapeId); }
    function setMDTShapeByID(shapeId, value) { return setShapeByID(false, shapeId, value); }

    function getShapesForITPALineItem(ITPALineItem) { return !!ITPALineItem ? shapesKeyedList.GetItem(ITPALineItem.GetKey()) : undefined; }

    function checkIfShapesChanged() {
        var nLineItems = itpaLineKeyedList.GetItemCount();

        if (nLineItems > 0) {
            var lineItems = itpaLineKeyedList.GetKeyedItemList();

            for (var i in lineItems) {
                var lineItem = lineItems[i], d = lineItem.GetData(), p = d;
                var lineIndent = p.fleet + ' ' + p.fleet_id;
                var lineShapes = getShapesForITPALineItem(lineItem);

                p.changedShape = false;

                if (!!lineShapes) {
                    var lineShapesData = lineShapes.GetData();
                    var newCoords = lineShapesData.shapes;
                    var nowCoords = JSON.parse(p.shape);
                    var nownSegs = nowCoords.length;
                    var changed = true;

                    if (newCoords.length == nownSegs) {
                        changed = false;
                        for (var j = 0 ; !changed && j < nownSegs ; ++j) {
                            var nowSeg = nowCoords[j];
                            var nowSegLen = nowSeg.length;
                            changed = true;
                            for (var k = 0; k < nownSegs && changed ; ++k) {
                                var newSeg = newCoords[k].shape;
                                var newSegLen = newSeg.length;
                                if (newSeg == nowSeg) { changed = false; }
                            }
                        }
                    }

                    lineShapesData.changedShape = p.changedShape = changed;

                    /*if (changed) { console.log('shapes changed for line ' + lineIndent); } else { console.log('same shape for line ' + lineIndent); }*/
                }
                else {
                    console.log('shapes missing for line ' + lineIndent);
                }
            }
        }
    }

    function onRefreshEnd() {
        for (var i in newLineItems) {
            var nli = newLineItems[i];
            var isFIU = nli.isFIU;
            var shape_ids = nli.shapeIds;

            for (var j in shape_ids) {
                var shape_id = shape_ids[j];
                var shape = getShapeByID(isFIU, shape_id);
                if (!!shape) { nli.shapes.push(shape); }
                else {
                    console.log('line ' + nlt.fleet + ' ' + nli.fleet_id + ' is limissing shape id: ' + shape_id);
                }
            }
        }

        shapesKeyedList.UpdateFromNewData(newLineItems);
        newLineItems = [];

        checkIfShapesChanged();
    }

    function checkRefreshEnded() {
        if (isRefreshing && fiuLinesAreLoaded && !MDTServiceAPI.GetHasRequestsPending()) {
            onRefreshEnd();
            isRefreshing = false;
            if (onRefreshCB) { onRefreshCB({ sender: theThis }); }
            //console.log('refresh ended');
        }
        return !isRefreshing;
    }

    function createLineShapeItem(fleet_id, fleet, lineItem, isFIU, shapeIds) {
        return { fleet_id: fleet_id, fleet: fleet, lineItem: lineItem, isFIU: isFIU, shapeIds: shapeIds, shapes: [] };
    }

    function loadFIULines() {
        var nLineItems = itpaLineKeyedList.GetItemCount();

        if (nLineItems > 0) {
            var url = "http://feeds.transloc.com/segments.json?agencies=571";
            new tf.ajax.JSONGet().Request(url, function (notification) {
                var data = notification.data;
                //console.log(JSON.stringify(data));
                if (!!data && !!data.success && tf.js.GetIsNonEmptyArray(data.routes) && tf.js.GetIsNonEmptyArray(data.segments)) {

                    nFIUShapes = data.segments.length;

                    for (var i = 0 ; i < nFIUShapes ; ++i) {
                        var seg = data.segments[i];
                        var id = seg.id;
                        var points = polyCode.Flipped(polyCode.DecodeLineString(seg.points));
                        setFIUShapeByID(id, points);
                    }

                    nFIURoutes = data.routes.length;
                    fiuRoutesByRouteId = {};

                    for (var i = 0 ; i < nFIURoutes ; ++i) {
                        var route = data.routes[i];
                        var id = route.id;
                        var shapeIds = [], shapes = [];
                        if (tf.js.GetIsNonEmptyArray(route.segments)) {

                            for (var j in route.segments) {
                                var seg = route.segments[j];
                                var shape = getFIUShapeByID(seg);
                                if (shape == undefined) {
                                    if (seg < 0) {
                                        var positiveShape = getFIUShapeByID(-seg);
                                        if (!!positiveShape) {
                                            var points = positiveShape.coordinates.slice(0);
                                            points = points.reverse();
                                            setFIUShapeByID(seg, points)
                                            shape = getFIUShapeByID(seg);
                                        }
                                    }
                                }
                                if (shape != undefined) { shapeIds.push(seg); shapes.push(shape); }
                                else {
                                    errorLoadingFIU = true;
                                    console.log('transloc service does not include segment shape "' + seg + '" for fiu line ' + id);
                                }
                            }
                        }
                        route.shapes = shapes;
                        route.shapeIds = shapeIds;
                        fiuRoutesByRouteId[tf.js.MakeObjectKey(id)] = route;
                    }

                    var lineItems = itpaLineKeyedList.GetKeyedItemList();

                    for (var i in lineItems) {
                        var lineItem = lineItems[i], d = lineItem.GetData(), p = d;
                        var fleetLower = p.fleet.toLowerCase();
                        var isFIU = false;
                        switch (fleetLower) {
                            case 'fiu': isFIU = true; break;
                            case 'mdt': break;
                            default:
                                console.log('unexpected value for "fleet": ' + p.fleet);
                                break;
                        }
                        if (isFIU) {
                            var fiuRoute = fiuRoutesByRouteId[tf.js.MakeObjectKey(p.fleet_id)];
                            if (!!fiuRoute) {
                                newLineItems.push(createLineShapeItem(p.fleet_id, p.fleet, lineItem, isFIU, fiuRoute.shapeIds));
                            }
                            else {
                                errorLoadingFIU = true;
                                console.log('transloc service does not include shape for fiu line ' + p.fleet_id);
                            }
                        }
                    }
                }
                else {
                    errorLoadingFIU = true;
                    console.log('failed to load data from transloc service');
                }
                fiuLinesAreLoaded = true;
                checkRefreshEnded();
            });
        }
        else {
            fiuLinesAreLoaded = true;
            checkRefreshEnded();
        }
    }

    function loadMDTShape(shapeId) {
        MDTServiceAPI.GetShapeForShapeId(shapeId, function (data) {
            //console.log(JSON.stringify(data));
            //var sample = { "Record": [{ "Latitude": "25.789036", "Longitude": "-80.38302" }, { "Latitude": "25.789182", "Longitude": "-80.382919" }] };
            data = (!!data && !!data.Record) ? data.Record : undefined;
            /*if (shapeId == "142460") {
                console.log('here');
            }*/
            if (tf.js.GetIsNonEmptyArray(data)) {
                var coordinates = [], len = data.length;
                for (var i = 0 ; i < len ; ++i) {
                    var d = data[i], lat = parseFloat(d.Latitude), lon = parseFloat(d.Longitude);
                    coordinates.push([lon, lat]);
                }
                ++nMDTShapes;
                setMDTShapeByID(shapeId, coordinates);
                checkRefreshEnded();
            }
            else {
                errorLoadingMDT = true;
                console.log('failed to load shape id ' + shapeId + ' data from MDT service');
            }
        });
    }

    function loadMDTLine(lineItem) {
        if (!!lineItem) {
            var d = lineItem.GetData(), p = d;
            MDTServiceAPI.GetShapeIdsForRouteIdAndDirection(p.fleet_id, p.direction, function (data) {
                //console.log(JSON.stringify(data));
                //var sample = { "Record": [{ "ShapeID": "142134" }, { "ShapeID": "142135" }, { "ShapeID": "142133" }] };
                data = (!!data && !!data.Record) ? data.Record : undefined;
                if (!!data) {
                    /*if (p.fleet_id == "150") {
                        console.log('here');
                    }*/
                    if (!tf.js.GetIsNonEmptyArray(data)) { data = [data]; }
                    var shapeIds = [];
                    for (var i in data) {
                        var d = data[i], shape_id = '' + d.ShapeID;
                        var shape = getMDTShapeByID(shape_id);
                        if (shape == undefined) { loadMDTShape(shape_id); }
                        shapeIds.push(shape_id);
                    }
                    newLineItems.push(createLineShapeItem(p.fleet_id, p.fleet, lineItem, false, shapeIds));
                }
                else {
                    errorLoadingMDT = true;
                    console.log('failed to shape ids data for line ' + p.fleet_id + ' and direction ' + p.direction + ' from MDT service');
                }
                checkRefreshEnded();
            });
        }
    }

    function refresh() {
        if (!isRefreshing) {

            isRefreshing = true;

            errorLoadingFIU = errorLoadingMDT = false;

            fiuLinesAreLoaded = false;

            mdtShapeCoordinatesByShapeId = {};
            nMDTShapes = 0;

            fiuShapeCoordinatesByShapeId = {};
            nFIUShapes = 0;

            fiuRoutesByRouteId = {};
            nFIURoutes = 0;

            newLineItems = [];

            new tf.ajax.JSONGet().Request(itpaLargeRouteServiceURL, function (notification) {
                var data = notification.data;

                if (!!data) {
                    itpaLineKeyedList.UpdateFromNewData(data);

                    var nLineItems = itpaLineKeyedList.GetItemCount();

                    if (nLineItems > 0) {
                        var lineItems = itpaLineKeyedList.GetKeyedItemList();

                        for (var i in lineItems) {
                            var lineItem = lineItems[i], d = lineItem.GetData(), p = d;
                            var fleetLower = p.fleet.toLowerCase();
                            switch (fleetLower) {
                                case 'fiu': break;
                                case 'mdt': loadMDTLine(lineItem); break;
                                default:
                                    console.log('unexpected value for "fleet": ' + p.fleet);
                                    break;
                            }
                        }

                        loadFIULines();
                        checkRefreshEnded();
                    }
                }
                else {
                    errorLoadingFIU = errorLoadingMDT = true;
                    console.log('failed to get large compressed routes from service ' + itpaLargeRouteServiceURL);
                    fiuLinesAreLoaded = true;
                    checkRefreshEnded();
                }
            });
        }
    }

    function initialize() {
        onRefreshCB = tf.js.GetFunctionOrNull(settings.onRefresh);
        MDTServiceAPI = new tf.services.MDTServiceAPI({});
        polyCode = new tf.map.PolyCode();
        itpaEncodePrecision = 7;
        itpaLargeRouteServiceURL = settings.serviceURL != undefined ? settings.serviceURL : 'http://utma-api.cs.fiu.edu/api/v1/routes/largec';
        fiuRoutesByRouteId = {};
        nFIURoutes = 0;
        isRefreshing = false;

        itpaLineKeyedList = new tf.js.KeyedList({
            name: "itpalines",
            getKeyFromItemData: function (data) {
                return !!data ? data.line_id : undefined;
            },
            filterAddItem: function (itemData) { return true; },
            needsUpdateItemData: function (updateObj) { return true; }
        });

        shapesKeyedList = new tf.js.KeyedList({
            name: "lineshapes",
            getKeyFromItemData: function (data) {
                return (!!data && !!data.lineItem) ? data.lineItem.GetKey() : undefined;
            },
            filterAddItem: function (itemData) { return true; },
            needsUpdateItemData: function (updateObj) { return true; }
        });
        refresh();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
