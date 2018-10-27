"use strict";

//var serverURLUTMA = 'http://192.168.0.105:8080/v1/';
//var serverURLUTMA = 'http://192.168.0.81/api/v1/';
var serverURLUTMA = 'http://utma-api.cs.fiu.edu/api/v1/';

var serverURLFIU = 'http://utma-api2.cs.fiu.edu/api/v1/';

var mvideoURLFIU = "http://131.94.133.214";
var mvideoURLUTMA = "http://utma-video.cs.fiu.edu";

var theOC;

(function initializeIOC() {
    var defaultParams;
    var params = tf.urlapi.ParseURLParameters(window.location.href, defaultParams);
    var useFIUServer = !!params.fiuserver;
    var serverURL = useFIUServer ? serverURLFIU : serverURLUTMA;
    var serverServicesURL = serverURL;
    var mvideoServerURL = useFIUServer ? mvideoURLFIU : mvideoURLUTMA;
    theOC = new ITPA.OC.OC({ serverURL: serverURL, serverServicesURL: serverServicesURL, mvideoServerURL: mvideoServerURL });
})();
