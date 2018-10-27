"use strict";

ITPA.OC.InPlaceTextArea = function (settings) {
    var theThis, styles, topContainer, text, curParent, topDiv, topDivE, textAreaDivE, onCloseCB, isSingleLine, controlParent;
    var onUpdatePosDelayCallBack;

    this.SetText = function (text) { return setText(text); }
    this.GetText = function () { return getText(); }
    this.RevertText = function () { return revertText(); }

    this.Attach = function (parent, className) { return Attach(parent, className); }
    this.Detach = function () { return detach(); }
    this.IsAttached = function () { return !!curParent; }
    this.UpdatePos = function() { return updatePos(); }

    function detach() {
        if (!!curParent) {
            curParent = undefined;
            controlParent = undefined;
            styles.ChangeOpacityVisibilityClass(topDiv, false);
            notifyClose();
        }
    }

    function notifyClose() {
        if (!!onCloseCB) {
            onCloseCB({ sender: theThis, text: getText() });
        }
    }

    function updatePos() {
        if (!!controlParent) {
            var parentRect = controlParent.getBoundingClientRect();
            topDivE.style.left = (parentRect.left - 1) + 'px';
            topDivE.style.top = (parentRect.top - 1) + 'px';
            textAreaDivE.style.width = parentRect.width + 'px';
            textAreaDivE.style.height = parentRect.height + 'px';
        }
    }

    function Attach(parent, className) {
        detach();
        controlParent = tf.dom.GetHTMLElementFrom(parent);
        if (!!controlParent) {
            if (className == undefined) { className = "in-place-textarea"; }
            else { className = "in-place-textarea " + className; }
            textAreaDivE.className = className;
            updatePos();
            textAreaDivE.style.fontFamily = controlParent.style.fontFamily;
            if (!!(curParent = topContainer.GetHTMLElement())) {
                styles.ChangeOpacityVisibilityClass(topDiv, true);
                textAreaDivE.focus();
            }
        }
    }

    function getText() { return (text = textAreaDivE.value).trim(); }

    function revertText() { setText(text); }

    function setText(newText) {
        text = tf.js.GetNonEmptyString(newText, "");
        text.trim();
        textAreaDivE.value = text;
    }

    function getKeyNumFromEvent(e) { return (typeof e === "object") ? (window.event && e.keyCode) ? e.keyCode : (e.which ? e.which : 0) : 0; }

    function create() {
        var keyConfirmName = isSingleLine ? 'ENTER' : 'TAB';
        topDiv = new tf.dom.Div({ cssClass: "in-place-textarea-div" });
        topDivE = topDiv.GetHTMLElement();
        textAreaDivE = document.createElement('textarea');
        textAreaDivE.className = "in-place-textarea";
        if (isSingleLine) {
            textAreaDivE.rows = 1;
            textAreaDivE.style.overflow = 'hidden';
            textAreaDivE.style.whiteSpace = 'nowrap';
        }
        textAreaDivE.title = 'press ' + keyConfirmName + ' to confirm or ESC to cancel';
        textAreaDivE.addEventListener('keydown', function (event) {
            var key = getKeyNumFromEvent(event);
            if (key == 27) { revertText(); detach(); }
            else if (key == 9 || (isSingleLine && key == 13)) { detach(); }
            return false;
        });
        if (!settings.noFocusOut) {
            textAreaDivE.addEventListener('focusout', function (event) {
                if (!!settings.revertOnFocusOut) {
                    revertText();
                }
                detach(); return true;
            });
        }
        topDiv.AddContent(textAreaDivE);
        styles.ChangeOpacityVisibilityClass(topDiv, false);
    }

    function initialize() {
        styles = tf.GetStyles();
        topContainer = settings.oc.GetAppLayout().GetTopLayout().GetContainer();
        onCloseCB = tf.js.GetFunctionOrNull(settings.onClose);
        isSingleLine = !!settings.singleLine;
        text = "";
        create();
        topContainer.GetHTMLElement().appendChild(topDivE);
        onUpdatePosDelayCallBack = new tf.events.DelayedCallBack(250, updatePos);
        tf.events.AddDOMEventListener(window, tf.consts.DOMEventNamesResize, onUpdatePosDelayCallBack.DelayCallBack);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

