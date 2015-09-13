var audioContext = new AudioContext();
var timeDomainBuffer = new Uint8Array(4096);

var currentPeak = 0;
var currentPeakTime = 0;

var transcript = [];

function getUserMedia(dictionary, callback) {
  try {
    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;
    navigator.getUserMedia(dictionary, callback, error);
  } catch (e) {
    alert('getUserMedia threw exception :' + e);
  }
}

function error() {
  alert("getUserMedia error");
}

function gotStream(stream) {
  src = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;
  src.connect(analyser);
  requestAnimationFrame(rmsLoop);
}

function rmsLoop() {
  analyser.getByteTimeDomainData(timeDomainBuffer);

  var rms = 0;
  for (var i = 0; i < timeDomainBuffer.length; i++) {
    rms += timeDomainBuffer[i] * timeDomainBuffer[i];
  }
  rms /= timeDomainBuffer.length;
  rms = Math.sqrt(rms);

  currentRMS = rms;

  var now = Date.now();
  if (currentRMS > currentPeak || (now - currentPeakTime)/1000 > 4) {
    currentPeak = currentRMS;
    currentPeakTime = now;
  }

  requestAnimationFrame(rmsLoop);
}

function updateTranscript(event) {
  var newResults = event.results;
  var lastIndex = 0;

  var toRemove = [];
  
  for (var i = 0; i < transcript.length; i++) {
    var tPhrase = transcript[i][0];
    var found = false;
    
    for (var j = lastIndex; j < newResults.length; j++) {
      var nPhrase = newResults[j][0].transcript;
      if (nPhrase === tPhrase) {
        found = true;
        lastIndex = j+1;
        break;
      }
    }

    if (!found) {
      toRemove.push(i);
    }
  }

  for (var i = toRemove.length-1; i >= 0; i--) {
    transcript.splice(toRemove[i], 1);
  }

  lastIndex = 0;
  for (var i = 0; i < newResults.length; i++) {
    var nPhrase = newResults[i][0].transcript;
    var found = false;
    
    for (var j = lastIndex; j < transcript.length; j++) {
      var tPhrase = transcript[j][0];
      if (tPhrase === nPhrase) {
        found = true;
        lastIndex = j+1;
        break;
      }
    }

    if (!found) {
      transcript.push([nPhrase, currentPeak]);
    }
  }
}

function renderTranscript() {
  var parent = document.getElementById("transcript");
  parent.innerHTML = "";
  
  for (var i = 0; i < transcript.length; i++) {
    var phrase = transcript[i][0];
    var loudness = transcript[i][1];
    var fontSize = (loudness - 126)*6 + "px";
    var el = document.createElement('span');
    el.innerHTML = phrase;
    el.style.fontSize = fontSize;
    parent.appendChild(el);
  }
}

var recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en";
recognition.onerror = function(error) {
  console.log("error: " + error);
}
recognition.onresult = function(event) {
  updateTranscript(event);
  renderTranscript();
}

recognition.start();

getUserMedia({"audio": true}, gotStream);
