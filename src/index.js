const path = require('path')//ok
const http = require('http')
const express = require('express') //ok
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage , generateLocationMessage} = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const app = express() //ok
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
// Define paths por Express config
const publicDirectory = path.join(__dirname, '../public/') //ok
//Setup static directory to serve
app.use(express.static(publicDirectory)) //ok

let count = 0

io.on('connection', (socket) => {
    console.log('New WebSocket connection')
    
    socket.on('join', (options, callback) => { // options = { username, room}
        const { error, user } = addUser({ id: socket.id, ...options}) // spread

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', `Welcome, ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))  
        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
        //socket.emit : send an event 
        //io.emit
        //socket.broadcast.emit: send an event to everybody except the sender
        //io.to.emit - it emit an event to everybody in a specific room
        //socket.broadcast.to.emit - send an event to everybody except the sender in a specific room

    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }
        
        io.to(user.room).emit('message', generateMessage(user.username, message) )
        callback('Delivered!') //this is for acknowledgment 
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        let url = `https://www.google.com/maps?q=${location.lat},${location.long}`
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, url))
        callback('Location Shared!')
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})
