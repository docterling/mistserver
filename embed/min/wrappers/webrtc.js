mistplayers.webrtc={name:"WebRTC player",mimes:["webrtc"],priority:MistUtil.object.keys(mistplayers).length+1,isMimeSupported:function(e){return this.mimes.indexOf(e)==-1?false:true},isBrowserSupported:function(e,t,n){if(!("WebSocket"in window)||!("RTCPeerConnection"in window)){return false}if(location.protocol.replace(/^http/,"ws")!=MistUtil.http.url.split(t.url.replace(/^http/,"ws")).protocol){n.log("HTTP/HTTPS mismatch for this source");return false}return true},player:function(){}};var p=mistplayers.webrtc.player;p.prototype=new MistPlayer;p.prototype.build=function(e,t){var n=this;if(typeof WebRTCBrowserEqualizerLoaded=="undefined"||!WebRTCBrowserEqualizerLoaded){var i=document.createElement("script");i.src=e.urlappend(e.options.host+"/webrtc.js");e.log("Retrieving webRTC browser equalizer code from "+i.src);document.head.appendChild(i);i.onerror=function(){e.showError("Failed to load webrtc browser equalizer",{nextCombo:5})};i.onload=function(){n.build(e,t)};return}var r=document.createElement("video");var s=["autoplay","loop","poster"];for(var o in s){var c=s[o];if(e.options[c]){r.setAttribute(c,e.options[c]===true?"":e.options[c])}}if(e.options.muted){r.muted=true}if(e.info.type=="live"){r.loop=false}if(e.options.controls=="stock"){r.setAttribute("controls","")}r.setAttribute("crossorigin","anonymous");this.setSize=function(e){r.style.width=e.width+"px";r.style.height=e.height+"px"};MistUtil.event.addListener(r,"loadeddata",v);MistUtil.event.addListener(r,"seeked",v);var a=0;var l=false;var u=[];this.listeners={on_connected:function(){a=0;l=false;this.webrtc.play();MistUtil.event.send("webrtc_connected",null,r)},on_disconnected:function(){MistUtil.event.send("webrtc_disconnected",null,r);e.log("Websocket sent on_disconnect");if(l){e.showError("Connection to media server ended unexpectedly.")}r.pause()},on_answer_sdp:function(t){if(!t.result){e.showError("Failed to open stream.");this.on_disconnected();return}e.log("SDP answer received")},on_time:function(t){var n=a;a=t.current*.001-r.currentTime;if(Math.abs(n-a)>1){v()}if((!("paused"in t)||!t.paused)&&r.paused){r.play()}var i=t.end==0?Infinity:t.end*.001;if(i!=p){p=i;MistUtil.event.send("durationchange",i,r)}if(u!=t.tracks){var s=MistUtil.tracks.parse(e.info.meta.tracks);for(var o in t.tracks){if(u.indexOf(t.tracks[o])<0){var c;for(var l in s){if(t.tracks[o]in s[l]){c=l;break}}if(!c){continue}MistUtil.event.send("playerUpdate_trackChanged",{type:c,trackid:t.tracks[o]},e.video)}}u=t.tracks}},on_seek:function(e){var t=this;MistUtil.event.send("seeked",a,r);if(e.live_point){t.webrtc.playbackrate("auto")}if("seekPromise"in this.webrtc.signaling){r.play().then(function(){if("seekPromise"in t.webrtc.signaling){t.webrtc.signaling.seekPromise.resolve("Play promise resolved")}}).catch(function(){if("seekPromise"in t.webrtc.signaling){t.webrtc.signaling.seekPromise.reject("Play promise rejected")}})}else{r.play()}},on_speed:function(e){this.webrtc.play_rate=e.play_rate_curr;MistUtil.event.send("ratechange",e,r)},on_stop:function(){e.log("Websocket sent on_stop");MistUtil.event.send("ended",null,r);l=true}};function f(){this.peerConn=null;this.localOffer=null;this.isConnected=false;this.isConnecting=false;this.play_rate="auto";var t=this;this.on_event=function(i){switch(i.type){case"on_connected":{t.isConnected=true;t.isConnecting=false;break}case"on_answer_sdp":{t.peerConn.setRemoteDescription({type:"answer",sdp:i.answer_sdp}).then(function(){},function(e){console.error(e)});break}case"on_disconnected":{t.isConnected=false;break}}if(i.type in n.listeners){return n.listeners[i.type].call(n,i)}e.log("Unhandled WebRTC event "+i.type+": "+JSON.stringify(i));return false};this.connect=function(e){t.isConnecting=true;t.signaling=new d(t.on_event);t.peerConn=new RTCPeerConnection;t.peerConn.ontrack=function(t){r.srcObject=t.streams[0];if(e){e()}}};this.play=function(){if(!this.isConnected){throw"Not connected, cannot play"}this.peerConn.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true}).then(function(e){t.localOffer=e;t.peerConn.setLocalDescription(e).then(function(){t.signaling.sendOfferSDP(t.localOffer.sdp)},function(e){console.error(e)})},function(e){throw e})};this.stop=function(){if(!this.isConnected){throw"Not connected, cannot stop."}this.signaling.send({type:"stop"})};this.seek=function(e){var n=new Promise(function(n,i){if(!t.isConnected||!t.signaling){return i("Failed seek: not connected")}t.signaling.send({type:"seek",seek_time:e=="live"?"live":e*1e3});if("seekPromise"in t.signaling){t.signaling.seekPromise.reject("Doing new seek")}t.signaling.seekPromise={resolve:function(e){n("seeked");delete t.signaling.seekPromise},reject:function(e){i("Failed to seek: "+e);delete t.signaling.seekPromise}}});return n};this.pause=function(){if(!this.isConnected){throw"Not connected, cannot pause."}this.signaling.send({type:"pause"})};this.setTrack=function(e){if(!this.isConnected){throw"Not connected, cannot set track."}e.type="tracks";this.signaling.send(e)};this.playbackrate=function(e){if(typeof e=="undefined"){return n.webrtc.play_rate=="auto"?1:n.webrtc.play_rate}if(!this.isConnected){throw"Not connected, cannot change playback rate."}this.signaling.send({type:"set_speed",play_rate:e})};this.getStats=function(e){this.peerConn.getStats().then(function(t){var n={};var i=Array.from(t.entries());for(var r in i){var s=i[r];if(s[1].type=="inbound-rtp"){n[s[0]]=s[1]}}e(n)})};this.connect()}function d(t){this.ws=null;this.ws=new WebSocket(e.source.url.replace(/^http/,"ws"));this.ws.onopen=function(){t({type:"on_connected"})};this.ws.onmessage=function(e){try{var n=JSON.parse(e.data);t(n)}catch(t){console.error("Failed to parse a response from MistServer",t,e.data)}};this.ws.onclose=function(e){switch(e.code){default:{t({type:"on_disconnected"});break}}};this.sendOfferSDP=function(e){this.send({type:"offer_sdp",offer_sdp:e})};this.send=function(e){if(!this.ws){throw"Not initialized, cannot send "+JSON.stringify(e)}this.ws.send(JSON.stringify(e))}}this.webrtc=new f;this.api={};var p;Object.defineProperty(this.api,"duration",{get:function(){return p}});Object.defineProperty(this.api,"currentTime",{get:function(){return a+r.currentTime},set:function(e){a=e-r.currentTime;r.pause();n.webrtc.seek(e);MistUtil.event.send("seeking",e,r)}});Object.defineProperty(this.api,"playbackRate",{get:function(){return n.webrtc.playbackrate()},set:function(e){return n.webrtc.playbackrate(e)}});function h(e){Object.defineProperty(n.api,e,{get:function(){return r[e]},set:function(t){return r[e]=t}})}var w=["volume","muted","loop","paused",,"error","textTracks","webkitDroppedFrameCount","webkitDecodedFrameCount"];for(var o in w){h(w[o])}function b(e){if(e in r){n.api[e]=function(){return r[e].call(r,arguments)}}}var w=["load","getVideoPlaybackQuality"];for(var o in w){b(w[o])}n.api.play=function(){var t;if(n.api.currentTime){t=n.api.currentTime}if(e.info&&e.info.type=="live"){t="live"}if(t){var i=new Promise(function(i,r){if(!n.webrtc.isConnected&&n.webrtc.peerConn.iceConnectionState!="completed"){if(!n.webrtc.isConnecting){e.log("Received call to play while not connected, connecting "+n.webrtc.peerConn.iceConnectionState);n.webrtc.connect(function(){n.webrtc.seek(t).then(function(e){i("played "+e)}).catch(function(e){r(e)})})}else{r("Still connecting")}}else{n.webrtc.seek(t).then(function(e){i("played "+e)}).catch(function(e){r(e)})}});return i}else{return r.play()}};n.api.pause=function(){r.pause();try{n.webrtc.pause()}catch(e){}MistUtil.event.send("paused",null,r)};n.api.setTracks=function(e){if(n.webrtc.isConnected){n.webrtc.setTrack(e)}else{var t=function(){n.webrtc.setTrack(e);MistUtil.event.removeListener({type:"webrtc_connected",callback:t,element:r})};MistUtil.event.addListener(r,"webrtc_connected",t)}};function v(){if(!n.api.textTracks[0]){return}var e=n.api.textTracks[0].currentOffset||0;if(Math.abs(a-e)<1){return}var t=[];for(var i=n.api.textTracks[0].cues.length-1;i>=0;i--){var r=n.api.textTracks[0].cues[i];n.api.textTracks[0].removeCue(r);if(!("orig"in r)){r.orig={start:r.startTime,end:r.endTime}}r.startTime=r.orig.start-a;r.endTime=r.orig.end-a;t.push(r)}for(var i in t){n.api.textTracks[0].addCue(t[i])}n.api.textTracks[0].currentOffset=a}n.api.setSubtitle=function(e){var t=r.getElementsByTagName("track");for(var n=t.length-1;n>=0;n--){r.removeChild(t[n])}if(e){var i=document.createElement("track");r.appendChild(i);i.kind="subtitles";i.label=e.label;i.srclang=e.lang;i.src=e.src;i.setAttribute("default","");i.onload=v}};MistUtil.event.addListener(r,"ended",function(){if(n.api.loop){n.webrtc.connect()}});if("decodingIssues"in e.skin.blueprints){var g=["nackCount","pliCount","packetsLost","packetsReceived","bytesReceived"];for(var k in g){n.api[g[k]]=0}var y=function(){e.timers.start(function(){n.webrtc.getStats(function(e){for(var t in e){for(var i in g){if(g[i]in e[t]){n.api[g[i]]=e[t][g[i]]}}break}});y()},1e3)};y()}n.api.unload=function(){try{n.webrtc.stop()}catch(e){}};t(r)};