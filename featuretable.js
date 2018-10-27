"use strict";

ITPA.OC.FeatureTable = function (settings) {
    var theThis, scrollerDiv, scrollerDivE, tables, table, featureName, coreList, keyedList, featureList, tableSettings, rowSettings, getRowContent, onTableChanged, isShowing, onScrollCB;

    this.Show = function (showBool) { return show(showBool); }
    this.GetIsShowing = function () { return isShowing; }
    this.GetKeyedList = function () { return keyedList; }
    this.GetTableParent = function () { return scrollerDiv; }
    this.GetTable = function () { return table; }
    this.GoTo = function (keyedItem) { return goTo(keyedItem); }
    this.GetSelKeyedItem = function () { var tableRow = table.GetTable().GetSelectedRow(); return !!tableRow ? tableRow.GetKeyedItem() : undefined; }

    function show(showBool) { if (isShowing != (showBool = !!showBool)) { var display = (isShowing = showBool) ? "block" : "none"; scrollerDivE.style.display = display; } }
    function goTo(keyedItem) { if (!!keyedItem && !!table) { var row = table.GetRowFromKeyedItem(keyedItem); if (!!row) { row.Select(true, true); } } }

    function createTable() {
        var settings = {
            keyedList: keyedList, optionalScope: theThis, tableSettings: tableSettings, rowSettings: rowSettings,
            properties: {}, getRowContent: getRowContent, onContentChange: onTableChanged
        };
        table = new tf.ui.KeyedTable(settings)
        scrollerDiv = new tf.dom.Div({ cssClass: "tableScrollerDiv" });
        scrollerDiv.AddContent(table);
        scrollerDivE = scrollerDiv.GetHTMLElement();
        if (!!onScrollCB) { scrollerDivE.addEventListener('scroll', function (event) { onScrollCB({ sender: theThis }); }, false); }
    }

    function initialize() {
        tables = settings.tables;
        featureName = settings.featureName;
        coreList = settings.coreList;
        keyedList = coreList.GetKeyedList();
        featureList = settings.featureList;
        tableSettings = settings.tableSettings;
        rowSettings = settings.rowSettings;
        getRowContent = settings.getRowContent;
        onTableChanged = settings.onTableChanged;
        onScrollCB = tf.js.GetFunctionOrNull(settings.onScroll);
        createTable();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

