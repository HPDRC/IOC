"use strict";

ITPA.OC.FullScreenBusLineJSON = function (settings) {
    var theThis, fullScreenDiv, routeShapeEditor, onCloseRSECB, onFSDResize, onConfirmCB, onConfirmUseCB, isShowing, jsonInput, jsonInputToaster, routesKeyedList, polyCode;

    this.GetIsShowing = function () { return isShowing; }
    this.Show = function (optionalAlternativeOnConfirm) { show(optionalAlternativeOnConfirm); }

    function show(optionalAlternativeOnConfirm) {
        if (!isShowing) {
            if (!(onConfirmUseCB = tf.js.GetFunctionOrNull(optionalAlternativeOnConfirm))) { onConfirmUseCB = onConfirmCB; }
            if (onConfirmCB) {
                isShowing = true;
                jsonInput.Edit({
                    text: '', title: "Type or paste JSON data", saveText: "OK", cancelText: "Cancel", saveToolTip: "Update Bus Line Shapes from JSON", cancelToolTip: "Cancel update",
                    nRows: 30
                });
            }
        }
    }

    function initialize() {
        settings = tf.js.GetValidObjectFrom(settings);

        polyCode = new tf.map.PolyCode();

        routesKeyedList = settings.routesKeyedList;

        onConfirmCB = tf.js.GetFunctionOrNull(settings.onConfirm);

        jsonInput = new tf.ui.FullScreenMultiLineInput({
            fullScreenSettings: { customStyle: { backgroundColor: "rgba(0,0,0,0.3)" } },
            multiLineInputSettings: {
                validator: function (notification) {
                    var isValid = false, props, text = notification.text.trim();
                    var msg = undefined;

                    if (tf.js.GetIsNonEmptyString(text)) {
                        var list = tf.js.JSONParse(text);

                        if (tf.js.GetIsNonEmptyArray(list)) {
                            isValid = true;

                            for (var i in list) {
                                var item = list[i];
                                isValid = false;
                                if (item.id != undefined) {
                                    var routeItem;
                                    
                                    if (!!routesKeyedList) {
                                        if (!(routeItem = routesKeyedList.GetItem(item.id))) {
                                            msg = 'item with invalid id detected: ' + item.id;
                                        }
                                    }
                                    
                                    if (msg == undefined) {
                                        if (tf.js.GetIsNonEmptyString(item.shape)) {
                                            var shape_sm_c = tf.js.JSONParse(item.shape);
                                            if (!!shape_sm_c) {
                                                var geometry = polyCode.ToGeoJSONMultiLineString(shape_sm_c, 7);
                                                if (!!geometry) {
                                                    isValid = true;
                                                    item.shape_sm_c = shape_sm_c;
                                                    item.geometry = geometry;
                                                    item.routeItem = routeItem;
                                                }
                                                else { msg = 'item with invalid multilinestring geometry detected: ' + item.id; }
                                            }
                                            else { msg = 'item with invalid shape detected: ' + item.id; }
                                            if (!isValid) { break; }
                                        }
                                        else { msg = 'item without shape detected: ' + item.id; }
                                    }
                                }
                                else { msg = 'an item without id was detected'; }
                            }
                        }
                        else { msg = 'Text must parse to a non-empty JSON array'; }

                        if (isValid) { notification.list = list; }
                    }
                    else { msg = 'Text cannot be empty'; }

                    if (msg != undefined) { jsonInputToaster.Toast({ text: msg }); }

                    return isValid;
                },
                onClose: function (notification) {
                    isShowing = false;
                    if (notification.isConfirmed) {
                        var list = !!notification ? notification.list : undefined;
                        var len = !!list ? list.length : 0;
                        if (len > 0) { onConfirmUseCB({ sender: theThis, list: list }); }
                    }
                }
            }
        });

        var toasterStyle = { zIndex: 20, position: "absolute", right: "0px", bottom: "0px" };

        jsonInputToaster = new tf.ui.Toaster({
            container: jsonInput.GetTopDiv(), timeout: 2000, className: "", style: toasterStyle, toastClassName: "tableToastStyle", toastStyle: {
                display: "inline-block", marginRight: "10px", marginBottom: "50px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)"
            }, addBefore: false//, closeOnClick: false
        });

        isShowing = false;
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

