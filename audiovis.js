var canvas, ctx, date; //canvas stuff

var audio, acontext, analyser, source, micsource, micstream; //Actual Web Audio API elements
var fileinput, micinput, supportedformats, nowplaying, webaudioapi; //DOM elements

var npstring = "Now playing: "; //
var formats = ["audio/aac", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "AAC", "M4A", "MP3", "OGG", "WAV", "WebM"]; //JS doesn't have dictionaries, so I'm pretending. See lines 26 to 31

var pixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
var adjCanvasHeight = 0, adjCanvasWidth = 0;

window.addEventListener("load", function(e) {
	canvas = document.getElementsByTagName("canvas")[0];
	canvas.height = canvas.offsetHeight * pixelRatio;
	canvas.width = canvas.offsetWidth * pixelRatio; //sorta kinda retinafying the canvas so it doesn't look like utter shit
	ctx = canvas.getContext("2d");
	ctx.strokeStyle = "#fff"; //white lines for use on dark background
	
	audio = document.getElementsByTagName("audio")[0];
	fileinput = document.getElementById("fileinput");
	micinput = document.getElementById("mic");
	supportedformats = document.getElementById("supportedformats");
	nowplaying = document.getElementById("nowplaying");
	webaudioapi = document.getElementById("webaudioapi");
	
	sf = []; //creating an empty array to hold supported formats
	for(var i = 0; i < formats.length / 2; i++) {
		if(!!audio.canPlayType(formats[i])) //!! to do magic and make the result of canPlayType a boolean instead of wonky string shit: https://twitter.com/SamusAranX/status/440503385956311040
			sf.push(formats[i + formats.length / 2]);
			//because formats.length is divisible by two, I can do just that and add it to the index to get the file extensions
	}
	supportedformats.innerHTML += sf.join(", "); //one, two, three
	
	if (!Uint8Array.prototype.slice && 'subarray' in Uint8Array.prototype) //'renaming' .subarray to .slice because the creator of Uint8Arrays is fucking stupid
		Uint8Array.prototype.slice = Uint8Array.prototype.subarray;
	
	links = document.getElementsByClassName("ex"); //Adding functionality for the music links inside the <ul>
	for (var i = 0; i < links.length; i++) {
		links[i].addEventListener("click", function(e) {
			newsrc = e.srcElement.getAttribute("data-audio");
			nowplaying.innerHTML = npstring + e.srcElement.innerHTML;
			
			if(audio.src == newsrc) {
				audio.currentTime = 0;
				audio.play();
			} else {
				audio.src = newsrc;
				audio.play();
			}
		}, false);
	}
	
	document.getElementsByClassName("stop")[0].addEventListener("click", function() { //Adding functionality for the 'Stop Playback' link
		audio.src = "";
		nowplaying.innerHTML = npstring;
	}, false);
	
	audio.addEventListener("ended", function(e) { //Clean up when a track has finished playing
		audio.src = "";
		nowplaying.innerHTML = npstring;
	}, false);
	
	fileinput.addEventListener("change", function(e) { //a file was dragged onto the file input or selected through the dialog
		var file = e.srcElement.files[0]; //don't accept multi input
		if (file.type.match(/audio.*/)) { //only accept audio files
			fileinput.value = ""; //if I don't do this, you won't be able to select the same file twice in a row
			var reader = new FileReader();
			reader.onload = function(d) {
				audio.src = ""; //resetting the audio source
				audio.src = d.target.result; //setting the audio source again
				nowplaying.innerHTML = npstring + file.name; //'Now playing: Example Track 01'
				//console.log(file);
			};
			reader.readAsDataURL(file); //hopefully trigger the above onload event
		}
	}, false);
	
	micinput.addEventListener("change", function(e) { //'Enable microphone input' change event
		if(e.srcElement.checked) {
			try {
				navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.getUserMedia; //Compatibility with WebKit only. Other browsers are a PITA atm.
				navigator.getUserMedia({audio: true}, //I'm not interested in the user's webcam
					function(stream) { //success callback
						micstream = stream;
						micsource = acontext.createMediaStreamSource(micstream); //create a Web Audio API compatible stream source
						micsource.connect(analyser); //connect it to the analyser node
					},
					function(error) { //error callback
						alert("Microphone input couldn't be enabled. Did you deny access?");
						//I'm not checking for a specific error code here. MDN states there should be a 'code' argument, but WebKit doesn't give any shits
						//https://developer.mozilla.org/en-US/docs/Web/API/Navigator.getUserMedia#errorCallback
					});
			} catch(e) {
				alert("Error: " + e); //kaboom
			}
		} else {
			micsource.disconnect(); 
			micstream.stop(); //always clean up behind yourself
			//if microphone access wasn't allowed, this will throw an error "can't call method 'disconnect' of undefined"
			//but I guess you can safely ignore that
		}
	}, false);
	
	try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext; //see line 81's comment
		if(window.AudioContext) { //only do stuff if the Web Audio API is actually supported
			acontext = new AudioContext(); //create an AudioContext
			analyser = acontext.createAnalyser(); //create an AnalyserNode
			source = acontext.createMediaElementSource(audio); //create a source from the audio element
			source.connect(analyser); //connect said source to the AnalyserNode
			analyser.connect(acontext.destination); //finally, connect the AnalyserNode to the destination.
			//The audio route looks like this: MediaElementSource -> AnalyserNode -> Destination
		} else {
			webaudioapi.className = "visible"; //if the Web Audio API isn't supported, display an error message
		}	
	} catch(e) {
		webaudioapi.className = "visible"; //if an error occurs, display an error message
	}
	
	if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) //Don't use Safari.
		document.getElementById("safari").className = "visible"; //Seriously, don't.
	
	if(window.location.hash)
		audio.src = window.location.hash.substring(1); //If there's a hash attached to the URL, take it and make it the audio element's source
		//goto fail;
	
	step(); //start rendering
}, false);

window.addEventListener("hashchange", function(e) { //the hash value has changed, take it and make it the audio element's source
	hashindex = e.newURL.indexOf("#");
	hashvalue = e.newURL.substring(hashindex + 1);
	console.log(hashvalue);
	if(hashvalue.trim() != "") //but only if it isn't ""
		audio.src = hashvalue;
});

function splitArray(a, n) { //split array a into n equally sized chunks
	var len = a.length,out = [], i = 0;
	while (i < len) {
		var size = Math.round((len - i) / n--);
		out.push(a.slice(i, i += size));
	}
	return out;
}

var bar_num = 640; //number of bars to draw
var osc_start = 32; //oscilloscope start point
var osc_height = 64; //oscilloscope total height
function step() {
	var bar_width = canvas.width / bar_num; //calculating bar width
	
	ctx.clearRect(0, 0, canvas.width, canvas.height); //clear the canvas every frame
	ctx.shadowBlur = 0; //I don't want any blurring yet
	
	var freqData = new Uint8Array(analyser.frequencyBinCount);
	var freqDomain = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(freqData); //get and assign frequency data
	analyser.getByteTimeDomainData(freqDomain); //get and assign time domain data
	
	freqData = splitArray(freqData, bar_num);
	freqDomain = splitArray(freqDomain, bar_num); //split the arrays into bar_num parts
	
	for (var i = 0; i < bar_num; i++) { //for each bar
		hue = 360 * (i / bar_num); //calculate hue
		ctx.fillStyle = "hsl(" + hue + ",100%,10%)";
		ctx.fillRect(i * bar_width, canvas.height, bar_width, -canvas.height); //draw rainbow background
		
		freq = 0;
		for (var j = 0; j < freqData[i].length; j++)
			freq += freqData[i][j]; //get frequency values from array chunks
		freq = Math.floor(freq / freqData[i].length / 256 * canvas.height); 
		//calculate average value, divide it by 256 and multiply by canvas.height
		
		ctx.fillStyle = "hsl(" + hue + ",100%,50%)";
		ctx.fillRect(i * bar_width, canvas.height, bar_width, -freq); //then draw the actual bar
	}
	
	ctx.moveTo(0, osc_start); //start the oscilloscope
	ctx.beginPath();
	for (var i = 0; i < bar_num; i++) {
		freqd = 0;
		
		for(var j = 0; j < freqDomain[i].length; j++)
			freqd += freqDomain[i][j]; //get time domain values from array chunks
		freqd = (freqd / freqDomain[i].length / 256 - .5) * 2; 
		//calculate average value, divide it by 256, subtract .5 to get a range from -0.5 to 0.5, then multiply by 2 to get a range from -1 to 1.
		
		y = osc_height / 2 + osc_start * freqd; //Divide the oscilloscope's height by 2, then add the oscilloscope's start point multiplied by freqd ([-1, 1])
		
		ctx.lineTo(i * bar_width, y); //draw the oscilloscope line
	}
	ctx.lineTo(bar_num * bar_width + 1000, osc_start); //adding 1000 because otherwise the line doesn't extend to the rightmost pixel
	ctx.shadowColor = "#fff"; //white blur
	ctx.shadowBlur = 16; //16px blur radius
	ctx.stroke(); //blurred lines
	//ba dum tss
	
	requestAnimationFrame(step); //lather, rinse, repeat
}
