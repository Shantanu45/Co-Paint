var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
let colorPicker = document.getElementById('pickerInput')
let clearBtn = document.getElementById('clearButton')
let color = 'black'

colorPicker.addEventListener('change', () => {
    color = colorPicker.value
    ball.color = color
    console.log(color)
})

clearBtn.addEventListener('click', clear)

function getMousePositionX(canvas, event) {
    let rect = canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    return x
}

function getMousePositionY(canvas, event) {
    let rect = canvas.getBoundingClientRect();
    let y = event.clientY - rect.top;
    return y;
}

var raf;
var painting = false;
var ball = {
    x: 100,
    y: 100,
    vx: 5,
    vy: 1,
    radius: 20,
    color: colorPicker.value,
    draw: function() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }
};

function clear() {
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
}

function draw() {
    ball.draw();
    raf = window.requestAnimationFrame(draw);
}

canvas.addEventListener('mousedown', function(e) {
    if (!painting) {
        painting = true;
    }
});

canvas.addEventListener('mouseup', function(e) {
    if (painting) {
        painting = false;
    }
});

canvas.addEventListener('mouseout', function(e) {
    window.cancelAnimationFrame(raf);
    running = false;
});



let divSelectRoom = document.getElementById('selectRoom')
let inputRoomNumber = document.getElementById('roomNumber')
let btnGoRoom = document.getElementById('goRoom')


let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller, dataChannel


// Setting ICE Servers
const iceServers = {
    'iceServer': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'}
    ]
}

// Setting Stream Options
const streamConstraints = {
    audio: true,
    video: true
}

// SOCKET
const socket = io()

// When clicked on button, emits 'create or join'
btnGoRoom.onclick = () => {
    if(inputRoomNumber.value === ''){
        alert("please type a room number")
    }else{
        roomNumber = inputRoomNumber.value
        socket.emit('create or join', roomNumber)
        divSelectRoom.style.display = "none";
    }
}

canvas.addEventListener('mousemove', function(e) {
    if(dataChannel){
        dataChannel.send([getMousePositionX(canvas, e), getMousePositionY(canvas, e), color])
        clear()
            ball.x = getMousePositionX(canvas, e);
            ball.y = getMousePositionY(canvas, e);
            ball.color = color
            colorPicker.value = color
            ball.draw();
    }
})


socket.on('created', room => {
    // if you are the caller, means you are the first to join, means room is created by you
     isCaller = true
})

socket.on('joined', room => {
    // if you joined already existing room
    // Emitting ready, showing that client is ready for connection as getting media went successful for both ends.
    socket.emit('ready', roomNumber)
})

// Listening for 'ready'
socket.on('ready', () => {
    // if I'm a caller, means I created the room
    if(isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        // when ICE candidate is received
        rtcPeerConnection.onicecandidate = onIceCandidate
        // Creating an Offer
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                console.log('sending offer', sessionDescription)
                rtcPeerConnection.setLocalDescription(sessionDescription);
                // Emitting an 'offer'
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                })
            })
            .catch(err => {
                console.log(err)
            })
        dataChannel = rtcPeerConnection.createDataChannel(roomNumber)
        dataChannel.onmessage = event => {
            let data = event.data.split(',')
            clear();
            ball.x = data[0]
            ball.y = data[1]
            ball.color = data[2]
            colorPicker.value = data[2]
            ball.draw()
        }
    }
})

// Listening for 'offer'
socket.on('offer', (event) => {
    // If not Caller, means I joined the room that was already Created
    if(!isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        // when ICE candidate is received
        rtcPeerConnection.onicecandidate = onIceCandidate
        console.log('received offer', event)
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
        // Replying to an 'offer' event
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                console.log('sending answer', sessionDescription)
                rtcPeerConnection.setLocalDescription(sessionDescription)
                // Emitting an 'answer'
                socket.emit('answer', {
                    type: 'answer',
                    sdp: sessionDescription,
                    room: roomNumber
                })
            })
            .catch(err => {
                console.log(err)
            })
        rtcPeerConnection.ondatachannel = event => {
            dataChannel = event.channel
            dataChannel.onmessage = event => {
                let data = event.data.split(',')
                clear();
                ball.x = data[0]
                ball.y = data[1]
                ball.color = data[2]
                colorPicker.value = data[2]
                ball.draw() }
        }
    }
})

// Listening for an 'answer'
socket.on('answer', event => {
    // Handling an 'answer'
    console.log('received answer', event)
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

// Listening for 'candidate'
socket.on('candidate', event => {
    const candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    console.log('received candidate', candidate)
    rtcPeerConnection.addIceCandidate(candidate);
})

function onIceCandidate(event) {
    if(event.candidate){
        console.log('sending ice candidate', event.candidate)
        // Emitting 'candidate'
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}