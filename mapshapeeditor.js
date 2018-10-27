"use strict";

ITPA.OC.GarageShapeEditor = function (settings) {

    var theThis, styles, oc, mapEventHandler, tables, map, layer, isShowing, notifyCB;
    var statusButtonEnabledClasses, statusButtonDisabledClasses;
    var controlWrapper, saveButton, identBtn, editInstructionsDivE;
    var garageEditing;
    var featureIsMoving;
    var shapeVertexFeatures, shapeEdgeFeatures;
    var data, props, geom;
    var shapeCoordsSaved, shapeCoordsEdit;
    var isAdding, clickedStart;
    var lineStyle, lineHoverStyle;
    var minZIndex;

    this.GetWrapperDiv = function () { return controlWrapper; }

    this.Edit = function (garageItem) { return edit(garageItem); }

    this.Close = function (confirmedBool) { return !!confirmedBool ? theThis.Confirm() : theThis.Cancel(); }

    this.Confirm = function () { return confirm(); }
    this.Cancel = function () { return cancel(); }

    function checkState() {
        saveButton.GetHTMLElement().style.display = !featureIsMoving ? 'inline-block' : 'none';

        var instructionsStr;

        if (!!featureIsMoving) {
            instructionsStr = 'Click Map to position Vertex';
            if (isAdding && !!shapeCoordsEdit && shapeCoordsEdit.length > 3) {
                instructionsStr += '<br />' + 'Click 1st Vertex to Close';
            }
        }
        else {
            instructionsStr =
                'Click Vertex to start moving it' + '<br />' +
                'Click Edge to add new Vertex' + '<br />' +
                'Double click Vertex to delete it';
        }

        editInstructionsDivE.innerHTML = instructionsStr;
    }

    function setFeatureIsMoving(newFeatureIsMoving) {
        featureIsMoving = newFeatureIsMoving;
        refreshSegmentStyles();
    }

    function disposeVertexFeatures() {
        if (!!layer) {
            if (!!shapeVertexFeatures || !!shapeEdgeFeatures) {
                for (var i in shapeVertexFeatures) { layer.DelMapFeature(shapeVertexFeatures[i], true); }
                for (var i in shapeEdgeFeatures) { layer.DelMapFeature(shapeEdgeFeatures[i], true); }
                layer.DelWithheldFeatures();
                shapeVertexFeatures = undefined;
                shapeEdgeFeatures = undefined;
                //shapeCoordsEdit = undefined;
                featureIsMoving = undefined;
            }
        }
    }

    function updateSegments() {
        if (!!featureIsMoving) {
            var vertexIndex = featureIsMoving.garageVertexIndex;
            var pointCoords = featureIsMoving.GetPointCoords();
            var garageBeforeEdgeIndex = featureIsMoving.garageBeforeEdgeIndex;
            var beforeEdge = shapeEdgeFeatures[garageBeforeEdgeIndex];
            var afterEdge = shapeEdgeFeatures[vertexIndex];
            shapeCoordsEdit[vertexIndex] = pointCoords;
            if (!!beforeEdge) {
                beforeEdge.SetGeom(new tf.map.FeatureGeom({ type: 'linestring', coordinates: [shapeCoordsEdit[garageBeforeEdgeIndex], pointCoords] }));
            }
            if (!!afterEdge) {
                afterEdge.SetGeom(new tf.map.FeatureGeom({ type: 'linestring', coordinates: [pointCoords, shapeCoordsEdit[afterEdge.garageVertexNextIndex]] }));
            }
        }
    }

    function refreshSegmentStyles() { for (var i in shapeEdgeFeatures) { shapeEdgeFeatures[i].RefreshStyle(); } }

    function getLineStyle(isHover) {
        return function (mapFeature) {
            return isHover && !featureIsMoving ? lineHoverStyle : lineStyle;
        }
    }

    function createVertexFeatures() {
        disposeVertexFeatures();
        isAdding = false;
        if (!!layer) {
            if (!!shapeCoordsEdit) {
                var len = shapeCoordsEdit.length;
                if (len > 0) {
                    var style = {
                        shape: true, shape_npoints: 4, shape_radius: 10, fill: true, fill_color: "#fff", fill_opacity: 40, line: true, line_width: 2, line_color: "#000",
                        zindex: minZIndex + 5, rotation_rad: Math.PI / 4, snaptopixel: false
                    };
                    var hoverStyle = tf.js.ShallowMerge(style, { shape_radius: 12, zindex: minZIndex + 6 });

                    shapeVertexFeatures = [];
                    shapeEdgeFeatures = [];

                    isAdding = len < 3 || !clickedStart;

                    for (var i = 0 ; i < len ; ++i) {
                        var thisZIndex = i == 0 ? minZIndex + 8 : minZIndex + 5;
                        var fill_color = i == 0 && isAdding ? "#ff0" : "#fff";
                        var styleUse = tf.js.ShallowMerge(style, { zindex: thisZIndex, fill_color: fill_color });
                        var hoverStyleUse = tf.js.ShallowMerge(hoverStyle, { zindex: thisZIndex + 1, fill_color: fill_color });

                        if (i == 0 && isAdding && len > 3) { hoverStyleUse = [hoverStyleUse, { marker: true, label: "Close" }]; }

                        var mapFeature = new tf.map.Feature({
                            type: 'point', coordinates: shapeCoordsEdit[i],
                            style: styleUse, hoverStyle: hoverStyleUse
                        });

                        shapeVertexFeatures.push(mapFeature);

                        mapFeature.isGarageShapeVertex = true;
                        mapFeature.garageVertexIndex = i;
                        mapFeature.garageBeforeEdgeIndex = i == 0 ? len - 1 : i - 1;

                        layer.AddMapFeature(mapFeature, true);
                    }

                    for (var i = 0 ; i < len; ++i) {
                        var nextIndex = i == len - 1 ? 0 : 1 + i;
                        var mapFeature = new tf.map.Feature({
                            type: 'linestring', coordinates: [shapeCoordsEdit[i], shapeCoordsEdit[nextIndex]],
                            style: getLineStyle(false), hoverStyle: getLineStyle(true)
                        });

                        shapeEdgeFeatures.push(mapFeature);

                        mapFeature.isGarageShapeEdge = true;
                        mapFeature.garageEdgeIndex = i;
                        mapFeature.garageVertexNextIndex = nextIndex;

                        layer.AddMapFeature(mapFeature, true);
                    }

                    layer.AddWithheldFeatures();

                    if (isAdding) {
                        setFeatureIsMoving(shapeVertexFeatures[len - 1]);
                    }
                }
            }
        }
    }

    function notify(isConfirmed) {
        if (!!garageEditing) {
            var geSaved = garageEditing;
            if (!isConfirmed) { updateShapeCoords(shapeCoordsSaved); }
            garageEditing = undefined;
            if (mapEventHandler.GetMouseMoveClickHandler() == mouseMoveClickHandler) { mapEventHandler.SetMouseMoveClickHandler(undefined); }

            disposeVertexFeatures();

            if (!!notifyCB) { notifyCB({ sender: theThis, isConfirmed: isConfirmed, garageEditing: geSaved }); }
        }
    }

    function cancel() { return notify(false); }
    function confirm() { return notify(true); }

    function mouseMoveClickHandler(notification) {
        if (notification.isActive) {
            var mapNotification = notification.mapNotification;
            if (!!mapNotification) {
                var eventCoords = mapNotification.eventCoords;
                if (!!eventCoords) {
                    var isDoubleClick, isClick, isFeature;

                    switch (mapNotification.eventName) {
                        case tf.consts.mapDblClickEvent:
                            isDoubleClick = true;
                            break;
                        case tf.consts.mapClickEvent:
                            isClick = true;
                            break;
                        case tf.consts.mapFeatureDblClickEvent:
                            isDoubleClick = true;
                            isFeature = true;
                            break;
                        case tf.consts.mapFeatureClickEvent:
                            isClick = true;
                            isFeature = true;
                            break;
                    }

                    if (!!featureIsMoving) {
                        featureIsMoving.SetPointCoords(eventCoords);
                        updateSegments();
                        updateShapeCoordsFromFeature();
                    }

                    if (isClick) {
                        if (!!featureIsMoving) { setFeatureIsMoving(undefined); }
                        else {
                            if (isFeature && mapNotification.mapFeature.isGarageShapeVertex) {
                                setFeatureIsMoving(mapNotification.mapFeature);
                            }
                        }
                        if (!featureIsMoving) {
                            var processed;
                            if (isFeature) {
                                if (mapNotification.mapFeature.isGarageShapeEdge) {
                                    //var edgeIndex = mapNotification.mapFeature.garageEdgeIndex;
                                    var insertIndex = mapNotification.mapFeature.garageVertexNextIndex;
                                    //console.log('edge index: ' + edgeIndex + ' insert index: ' + insertIndex);
                                    shapeCoordsEdit.splice(insertIndex, 0, eventCoords);
                                    createVertexFeatures();
                                    updateShapeCoordsFromFeature();
                                    setFeatureIsMoving(shapeVertexFeatures[insertIndex]);
                                    processed = true;
                                }
                                else if (mapNotification.mapFeature.isGarageShapeVertex) {
                                    if (mapNotification.mapFeature.garageVertexIndex == 0) {
                                        if (!clickedStart) {
                                            if (clickedStart = shapeCoordsEdit.length > 3) {
                                                shapeCoordsEdit.pop();
                                                createVertexFeatures();
                                                updateShapeCoordsFromFeature();
                                                processed = true;
                                            }
                                        }
                                    }
                                }
                            }
                            if (!processed) {
                                if (isAdding) {
                                    shapeCoordsEdit.push(eventCoords);
                                    createVertexFeatures();
                                    updateShapeCoordsFromFeature();
                                }
                            }
                        }
                        checkState();
                    }

                    if (!isAdding && isDoubleClick && isFeature) {
                        if (mapNotification.mapFeature.isGarageShapeVertex) {
                            shapeCoordsEdit.splice(mapNotification.mapFeature.garageVertexIndex, 1);
                            if (shapeCoordsEdit.length < 3) { clickedStart = false; }
                            createVertexFeatures();
                            updateShapeCoordsFromFeature();
                            checkState();
                        }
                    }
                }
            }
        }
        else { notify(notification.isConfirmed); }
    }

    function updateShapeCoords(shapeCoords) {
        if (!!garageEditing) {
            if (shapeCoords != undefined) {
                if (!geom.coordinates) { geom.coordinates = [shapeCoords.slice(0)]; }
                else { geom.coordinates[0] = shapeCoords.slice(0); }
            }
            else { geom.coordinates = undefined; }
            garageEditing.NotifyUpdated();
            /*var feature = oc.GetKeyedFeatureFromKeyedItem(garageEditing);
            if (!!feature) { feature.RefreshStyle(); }*/
        }
    }

    function updateShapeCoordsFromFeature() {
        if (!!shapeVertexFeatures) {
            var points = [];
            for (var i in shapeVertexFeatures) {
                var point = shapeVertexFeatures[i].GetPointCoords();
                points.push(point);
            }
            if (points.length) {
                points.push(points[0]);
                updateShapeCoords(points);
            }
        }
    }

    function edit(garageItem) {
        if (garageItem == garageEditing) { return; }
        cancel();
        if (!!garageItem) {

            garageEditing = garageItem;
            data = garageEditing.GetData();
            props = data.properties;
            geom = data.geometry;

            identBtn.SetText(props.identifier);
            mapEventHandler.SetMouseMoveClickHandler(mouseMoveClickHandler);

            shapeCoordsSaved = !!geom.coordinates && geom.coordinates.length > 0 && geom.coordinates[0].length > 0 ? geom.coordinates[0].slice(0) : undefined;

            shapeCoordsEdit = [];

            if (!!shapeCoordsSaved) {
                var len = shapeCoordsSaved.length;

                if (len > 1) {
                    var last = shapeCoordsSaved[len - 1];
                    var first = shapeCoordsSaved[0];
                    if (last[0] == first[0] && last[1] == first[1]) { --len; }
                }

                var extent;

                for (var i = 0 ; i < len ; ++i) {
                    var thisCoord = shapeCoordsSaved[i].slice(0);
                    shapeCoordsEdit.push(thisCoord);
                    if (extent == undefined) { extent = [thisCoord[0], thisCoord[1], thisCoord[0], thisCoord[1]]; }
                    else { extent = tf.js.UpdateMapExtent(extent, thisCoord); }
                }

                if (!!extent) {
                    extent = tf.js.ScaleMapExtent(extent, 1.4);
                    map.SetVisibleExtent(extent);
                }

            }
            else {
                shapeCoordsEdit.push(map.GetCenter());
            }

            clickedStart = shapeCoordsEdit.length > 2;

            createVertexFeatures();

            checkState();
        }
    }

    function getOnStopEdit(confirmed) { return function (notification) { return confirmed ? confirm() : cancel(); } }

    function createControl() {
        var buttonDim = "18px", textDim = buttonDim;

        controlWrapper = new tf.dom.Div({ cssClass: "editCentroidWrapper" });

        var editCentroidTitleDiv = new tf.dom.Div({ cssClass: "editCentroidTitleDiv" });
        var editCentroidTitleDivE = editCentroidTitleDiv.GetHTMLElement();

        editCentroidTitleDivE.innerHTML = 'Parking Site Shape';

        var editCentroidIdentDiv = new tf.dom.Div({ cssClass: "editCentroidIdentDiv" });

        identBtn = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: buttonDim, style: true, label: '', tooltip: "Show on list", onClick: function () { tables.GoTo(garageEditing); }
        }));

        editCentroidIdentDiv.AddContent(identBtn);

        var editCentroidInstructionsDiv = new tf.dom.Div({ cssClass: "editCentroidInstructionsDiv" });
        editInstructionsDivE = editCentroidInstructionsDiv.GetHTMLElement();

        var editCentroidButtonsDiv = new tf.dom.Div({ cssClass: "editCentroidButtonsDiv" });

        saveButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: statusButtonEnabledClasses, label: 'Save', tooltip: "Save Centroid", onClick: getOnStopEdit(true)
        }));

        var cancelButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: statusButtonDisabledClasses, label: 'Cancel', tooltip: "Cancel", onClick: getOnStopEdit(false)
        }));

        tf.dom.AddCSSClass(saveButton, "textShadowBlack");
        tf.dom.AddCSSClass(cancelButton, "textShadowBlack");

        editCentroidButtonsDiv.AddContent(saveButton, cancelButton);

        controlWrapper.AddContent(editCentroidTitleDiv, editCentroidIdentDiv, editCentroidInstructionsDiv, editCentroidButtonsDiv)
    }

    function initialize() {
        styles = tf.GetStyles();
        statusButtonEnabledClasses = styles.CreateTextDivBtnClasses("white", "green", "white", "darkgreen");
        statusButtonDisabledClasses = styles.CreateTextDivBtnClasses("white", "red", "white", "darkred");
        minZIndex = 10;
        lineStyle = [{
            line: true, line_width: 7, line_color: "#000", zindex: minZIndex + 0, snaptopixel: false
        }, {
            line: true, line_width: 3, line_color: "#fff", zindex: minZIndex + 1, snaptopixel: false
        }];

        lineHoverStyle = [{
            line: true, line_width: 9, line_color: "#000", zindex: minZIndex + 2, snaptopixel: false
        }, {
            line: true, line_width: 3, line_color: "#fff", zindex: minZIndex + 3, snaptopixel: false, line_dash: [20, 10]
        }];

        tables = settings.tables;
        notifyCB = tf.js.GetFunctionOrNull(settings.onNotify);
        oc = tables.GetOC();
        mapEventHandler = oc.GetMapEventHandler();
        map = tables.GetMap();
        layer = oc.GetMaps().GetLargeMapLayer(ITPA.Core.GarageListName);
        createControl();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
