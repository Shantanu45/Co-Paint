const express = require('express')
const app = express()
let http = require('http').Server(app)

const port = process.env.PORT || 3000

// IO
let io = require('socket.io')(http)

app.use(express.static('public'))

http.listen(port, () => {
    console.log('listening on ', port)
})

io.on('connection', socket => {
    console.log('listening on', port)
    // Listening for 'create or join' event
    // room = roomNumber
    socket.on('create or join', room => {
        console.log('create or join to room', room)
        const myRoom = io.sockets.adapter.rooms[room] || {length: 0}
        const numClients = myRoom.length
        console.log(room, 'has', numClients, 'clients')

        if(numClients == 0){
            // if No one joined the room
            // then creating the room
            // emitting 'created'
            socket.join(room)
            socket.emit('created', room)
        }else if(numClients == 1){
            // if there is already a caller for this room, means number of clients is already One
            // then don't create new room, just JOIN.
            // emitting 'joined'
            socket.join(room)
            socket.emit('joined', room)
        }else{
            socket.emit('full', room)
        }
    })

    socket.on('ready', room => {
        // let other know that I'm ready
        socket.broadcast.to(room).emit('ready')
    })

    socket.on('candidate', event => {
        //  let other know about my 'candidate'
        socket.broadcast.to(event.room).emit('candidate', event)
    })

    socket.on('offer', event => {
        //  let other know about my 'offer'
        socket.broadcast.to(event.room).emit('offer', event.sdp)
    })

    socket.on('answer', event => {
        // Let other know about my 'answer'
        socket.broadcast.to(event.room).emit('answer', event.sdp)
    })
})
